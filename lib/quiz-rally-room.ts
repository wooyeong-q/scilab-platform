// One serialized authority for a race. Persistence and transport are adapters;
// neither a database query nor a network request is part of a simulation tick.
import { QUIZ_QUESTIONS, QUESTION_MAP } from './quiz-rally-questions';
import type { CustomQuestion } from './quiz-rally-bank';
import { QuizError } from './quiz-rally-errors';
import { gameClock } from './quiz-rally-course';
import { advanceRunner, control, freshRunner, runnerState, type ArenaInput, type Runner } from './quiz-rally-arena';
import { resolveCombat, runnerPose } from './quiz-rally-combat';
import { robotFor, validateRobot } from './quiz-rally-robot';
import { assert, authenticate, avatarFor, deckFor, hash, modifyPlayer, notice, phase, publicPlayer, remember, textValue, turnFor, uuid, validToken, type Player, type Room, type QuizIdentity } from './quiz-rally-rules';

export const ROOM_TICK_MS = 50;
export const ROOM_FRAME_MS = 100;
export const INPUT_LEASE_MS = 750;
export type RoomRecord = {
  code: string; teacher_key_hash: string; expires_at: string;
  state: Room; question_bank: Record<string, CustomQuestion> | null;
  revision: number; savedAt: number;
};

export class QuizArenaRoom {
  record: RoomRecord;
  constructor(record: RoomRecord) {
    assert(record.state.arena && record.state.realtime?.version === 1, '실시간 경기 정보를 확인해 주세요.');
    this.record = structuredClone(record);
    for (const p of Object.values(this.room.players)) if (p.runner) p.runner = runnerState(p.runner);
  }
  get room() { return this.record.state; }
  authorize(who: QuizIdentity) {
    assert(Date.parse(this.record.expires_at) > Date.now(), '게임방 이용 기간이 끝났습니다.', 404);
    authenticate(this.record, who, this.room.players[who.playerId]);
  }
  private changed() { this.record.revision++; }
  private question(p: Player) { return this.record.question_bank?.[p.turn.id] || QUESTION_MAP.get(p.turn.id)!; }

  join(who: QuizIdentity, body: Record<string, unknown>) {
    assert(who.role === 'student' && uuid(who.playerId) && validToken(who.token), '참여 정보를 다시 만들어 주세요.');
    const existing = this.room.players[who.playerId];
    if (existing) { this.authorize(who); return; }
    assert(Date.parse(this.record.expires_at) > Date.now(), '게임방 이용 기간이 끝났습니다.', 404);
    assert(phase(this.room) !== 'ended', '이미 끝난 게임입니다.', 409);
    const nickname = textValue(body.nickname, 12);
    assert(nickname.length > 0 && /^[\p{L}\p{N} _-]+$/u.test(nickname), '닉네임은 글자와 숫자로 1~12자 입력해 주세요.');
    const all = Object.values(this.room.players), active = all.filter(p => !p.removed);
    assert(active.length < 40 && all.length < 80, '한 게임에는 최대 40명이 참여할 수 있습니다.', 409);
    assert(!active.some(p => p.nickname.toLocaleLowerCase() === nickname.toLocaleLowerCase()), '이미 사용 중인 닉네임입니다. 번호를 붙여 주세요.', 409);
    assert(body.avatar === undefined || Number.isInteger(body.avatar) && Number(body.avatar) >= 0 && Number(body.avatar) < 6, '캐릭터를 다시 선택해 주세요.');
    const deck = deckFor(this.room), avatar = body.avatar === undefined ? avatarFor({id:who.playerId}) : Number(body.avatar);
    const p: Player = {id:who.playerId, nickname, avatar, tokenHash:hash(who.token), version:0, removed:false,
      score:0, correct:0, attempted:0, inventory:{boost:0,hint:1,shield:0,steal:0}, boostActive:false, shieldActive:false,
      protectedUntil:0, deck, turn:turnFor(deck.shift()!), requests:[], stats:{}, notice:'', noticeId:'', gear:[],
      runner:freshRunner(gameClock(this.room), parseInt(hash(who.playerId).slice(0,4),16)%40),
      robot:body.robot === undefined ? robotFor(undefined,avatar) : validateRobot(body.robot)};
    this.room.players[p.id] = p;
    this.room.metaRevision++;
    this.changed();
  }

  // Inputs take effect on the common server clock. Client timestamps cannot
  // rewind a collision, manufacture distance, or retroactively change a finish.
  input(who: QuizIdentity, values: unknown[], revision?: number) {
    this.authorize(who);
    assert(who.role === 'student', '학생 조작 정보가 필요합니다.', 403);
    assert(this.room.status === 'running', '진행 중인 경기에서 조작할 수 있습니다.', 409);
    if (revision !== undefined) assert(revision === this.room.metaRevision, '경기 상태가 바뀌었습니다.', 409);
    assert(Array.isArray(values) && values.length > 0 && values.length <= 96, '조작 값을 확인해 주세요.');
    let last = -1;
    const inputs = values.map(value => {
      assert(value && typeof value === 'object' && !Array.isArray(value), '조작 값을 확인해 주세요.');
      const e = value as ArenaInput;
      assert(Number.isFinite(e.dx) && Number.isFinite(e.dy) && Math.abs(e.dx) <= 1 && Math.abs(e.dy) <= 1 && Number.isSafeInteger(e.seq) && e.seq >= 0 && e.seq > last && Number.isFinite(e.at), '조작 값을 확인해 주세요.');
      last = e.seq; return e;
    });
    const p = this.room.players[who.playerId];
    if (p.finish) return;
    const at = gameClock(this.room);
    for (const e of inputs) {
      if (e.seq <= p.runner!.seq) continue;
      const fresh = Math.abs(at - e.at) <= 1500;
      p.runner = runnerState(control(p.runner!, fresh ? e.dx : 0, fresh ? e.dy : 0, fresh && e.jump === true, fresh && e.dash === true, at, e.seq));
      p.runner.inputUntil = at + INPUT_LEASE_MS;
    }
    p.version++; this.changed();
  }

  tick(wall = Date.now()) {
    if (this.room.status !== 'running') return false;
    const clock = gameClock(this.room, wall), players = Object.values(this.room.players).filter(p => !p.removed && p.runner);
    const effects = (this.room.arenaEffects || []).filter(e => e.expires >= clock - 1000);
    // Traps as well as missiles are claimed once, in contact-time order.
    for (const effect of effects) if (effect.type !== 'field') effect.shared = true;
    const combat = resolveCombat(players as (Player & {runner:Runner})[], clock, this.room.arena!, effects);
    const effectChanged = Object.keys(combat.claims).length > 0 || effects.length !== (this.room.arenaEffects || []).length;
    this.room.arenaEffects = combat.effects;
    if (effectChanged) this.room.arenaRevision = (this.room.arenaRevision || 0) + 1;
    for (const p of players) if (!p.finish) {
      p.runner = runnerState(advanceRunner(p.runner!, clock, this.room.arena!, combat.effects, p.id));
      p.version++;
    }
    this.room.arenaCombatAt = clock;
    const arrived = players.filter(p => !p.finish && p.runner!.finishAt !== undefined)
      .sort((a,b) => a.runner!.finishAt! - b.runner!.finishAt! || a.id.localeCompare(b.id));
    for (const p of arrived) {
      const place = (this.room.finishers || []).length + 1;
      this.room.finishers = [...(this.room.finishers || []), p.id];
      p.finish = {place,bonus:0}; p.runner!.open = false;
      notice(p, `결승선 ${place}등 통과!`);
    }
    if (arrived.length) this.room.metaRevision++;
    const ended = this.room.endsAt !== null && this.room.endsAt <= wall;
    if (ended) { this.room.status='ended'; this.room.remainingMs=0; this.room.stoppedClock=clock; this.room.metaRevision++; }
    this.changed();
    return arrived.length > 0 || ended;
  }

  act(who: QuizIdentity, body: Record<string, unknown>) {
    this.authorize(who);
    assert(uuid(body.requestId), '요청 정보를 다시 만들어 주세요.');
    if (who.role === 'teacher') { this.control(body, body.requestId); return; }
    const p = this.room.players[who.playerId];
    if (p.requests.includes(body.requestId)) return;
    if (body.action === 'arena-input') { this.input(who, Array.isArray(body.inputs) ? body.inputs : [body]); return; }
    assert(phase(this.room) === 'running' || body.action === 'customize' && phase(this.room) !== 'ended', '진행 중인 경기에서 사용할 수 있습니다.', 409);
    if (Array.isArray(body.inputs) && body.inputs.length) this.input(who, body.inputs);
    // A rejected command must not partly consume a question, item, or effect.
    const next = structuredClone(this.room), player = next.players[who.playerId];
    modifyPlayer(next, player, {...body, inputs:undefined, at:gameClock(next)}, this.question(player));
    if (player.runner) player.runner = runnerState(player.runner);
    if (JSON.stringify(next.arenaEffects) !== JSON.stringify(this.room.arenaEffects)) next.arenaRevision = (next.arenaRevision || 0) + 1;
    remember(player, body.requestId);
    // A bounded retry history survives reconnects without growing checkpoints.
    player.requests = [...p.requests, body.requestId].slice(-512);
    this.record.state = next; this.changed();
  }

  private control(body: Record<string, unknown>, requestId: string) {
    const room = this.room, now = Date.now(), current = phase(room);
    if (room.requests.includes(requestId)) return;
    switch (body.action) {
      case 'start':
        assert(current === 'lobby', '이미 시작한 게임입니다.', 409);
        assert(Object.values(room.players).some(p => !p.removed), '학생이 참여하면 시작할 수 있습니다.');
        room.status='running'; room.endsAt=now+room.durationSeconds*1000;
        room.cityTarget=Object.values(room.players).filter(p => !p.removed).length*Math.max(3,Math.round(room.durationSeconds/80)); break;
      case 'pause':
        assert(current === 'running', '진행 중인 게임을 멈출 수 있습니다.', 409);
        room.remainingMs=Math.max(0,room.endsAt!-now); room.endsAt=null; room.status='paused'; this.stopInputs(); break;
      case 'resume':
        assert(current === 'paused', '멈춘 게임을 다시 시작할 수 있습니다.', 409);
        room.status='running'; room.endsAt=now+room.remainingMs; break;
      case 'end':
        room.stoppedClock=gameClock(room); room.status='ended'; room.remainingMs=0; room.endsAt=now; this.stopInputs(); break;
      case 'remove': {
        assert(uuid(body.playerId), '참여자를 확인해 주세요.');
        const p=room.players[body.playerId]; assert(p && !p.removed, '참여자를 찾을 수 없습니다.', 404);
        p.removed=true; p.version++; break;
      }
      default: throw new QuizError('지원하지 않는 교사 동작입니다.');
    }
    room.requests=[...room.requests,requestId].slice(-512); room.metaRevision++; this.changed();
  }

  stopInputs(playerId?: string) {
    for (const p of Object.values(this.room.players)) if ((!playerId || p.id === playerId) && p.runner) {
      Object.assign(p.runner,{dx:0,dy:0,dash:false,jumpQueuedUntil:0,inputUntil:p.runner.t});
      p.runner=runnerState(p.runner); p.version++;
    }
    this.changed();
  }
  recover() {
    // A process restart cannot silently replay several seconds of stale input.
    if (this.room.status === 'running') {
      this.room.remainingMs=Math.max(0,this.room.endsAt!-this.record.savedAt);
      this.room.endsAt=null; this.room.status='paused'; this.room.metaRevision++;
      for (const p of Object.values(this.room.players)) notice(p,'서버에 다시 연결했어요. 선생님이 계속하기를 누르면 이어집니다.');
      this.stopInputs();
      return true;
    }
    return false;
  }
  checkpoint() {
    this.record.savedAt=Date.now();
    this.room.realtime!.checkpoint=this.record.revision;
    return structuredClone(this.record);
  }

  snapshot(who: QuizIdentity, websocketUrl: string) {
    assert(Date.parse(this.record.expires_at)>Date.now(),'게임방 이용 기간이 끝났습니다.',404);
    const room=this.room, now=Date.now(), active=Object.values(room.players).filter(p=>!p.removed);
    if (who.role === 'public') return {code:this.record.code,title:room.title,status:phase(room,now),count:active.length};
    this.authorize(who);
    const ranking=active.map(p=>({id:p.id,version:p.version,nickname:p.nickname,avatar:avatarFor(p),robot:robotFor(p.robot,avatarFor(p)),finish:p.finish||null,runner:p.runner!,correct:p.correct,attempted:p.attempted,shield:p.shieldActive,protectedUntil:p.protectedUntil,activity:p.turn.correct?'ready':'solving'}))
      .sort((a,b)=>a.finish||b.finish?(a.finish?.place||999)-(b.finish?.place||999):b.runner.y-a.runner.y||a.id.localeCompare(b.id));
    const p=room.players[who.playerId], review:unknown[]=[];
    if (who.role==='student' && phase(room,now)==='ended') for (const [id,stat] of Object.entries(p.stats).filter(([,s])=>s[0]>s[1]).slice(0,6)) {
      const q=this.record.question_bank?.[id]||QUESTION_MAP.get(id); if(q) review.push({prompt:q.prompt,answer:q.options[q.answer],explanation:q.explanation});
    }
    return {code:this.record.code,roomRevision:room.metaRevision,arena:room.arena,arenaEffects:room.arenaEffects||[],arenaRevision:room.arenaRevision||0,course:null,raceClock:gameClock(room,now),raceGoal:room.raceGoal,finishers:room.finishers||[],finishPrizes:[],title:room.title,status:phase(room,now),durationSeconds:room.durationSeconds,endsAt:room.endsAt,remainingMs:room.remainingMs,serverNow:now,stealEnabled:room.stealEnabled,extension:room.extension,questionCount:room.questionIds?.length||QUIZ_QUESTIONS.filter(q=>room.extension||!q.extension).length,questionSetTitle:room.questionSetTitle||'중2 과학 · 물질의 구성',cityTarget:room.cityTarget||Math.max(1,ranking.length)*Math.max(3,Math.round(room.durationSeconds/80)),ranking,player:who.role==='student'?publicPlayer(p,this.question(p),this.record.code,review):null,realtime:{version:1,generation:room.realtime!.generation,url:websocketUrl}};
  }

  world(previous: Map<string, Runner>) {
    const players=Object.values(this.room.players).filter(p=>!p.removed);
    const poses=players.map(p=>({id:p.id,pose:runnerPose(p.runner!,this.room.arena!,previous.get(p.id))}));
    previous.clear(); for(const p of players) previous.set(p.id,p.runner!);
    return {type:'world',code:this.record.code,roomRevision:this.room.metaRevision,arenaRevision:this.room.arenaRevision||0,arenaEffects:this.room.arenaEffects||[],at:gameClock(this.room),through:gameClock(this.room),players:poses};
  }
}
