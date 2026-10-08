// Generated from lib/quiz-rally-arena.ts and lib/quiz-rally-city.ts.
(()=>{const city={};((exports)=>{
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CITY_REGIONS = exports.CITY_LENGTH = void 0;
exports.cityRegion = cityRegion;
exports.cityLayout = cityLayout;
exports.cityTrack = cityTrack;
exports.cityTileDanger = cityTileDanger;
exports.cityPistons = cityPistons;
exports.CITY_LENGTH = 27000;
exports.CITY_REGIONS = [
    { start: 0, name: '출발 광장', hint: '문제 상자를 찾아 아이템을 준비하세요', color: 0 },
    { start: 1600, name: '네온 골목', hint: '막힌 길을 돌아 움직이는 틈으로!', color: 1 },
    { start: 5200, name: '풍력 지붕', hint: '바람을 버티고 끊어진 지붕을 점프!', color: 2 },
    { start: 9000, name: '프레스 공장', hint: '노란 경고 뒤 내려오는 프레스를 피하세요', color: 3 },
    { start: 13300, name: '회전 타워', hint: '엇갈리는 회전봉을 보고 점프하세요', color: 4 },
    { start: 17300, name: '붕괴 스카이웨이', hint: '깜빡이는 발판을 피하고 안전한 길로!', color: 5 },
    { start: 21900, name: '시티 코어', hint: '마지막 복합 장애물! 결승까지 이어 달리세요', color: 6 },
];
const center = (y) => Math.sin(y / 660) * 65;
const cache = new Map();
const smooth = (x) => { const n = Math.max(0, Math.min(1, x)); return n * n * (3 - 2 * n); };
function random(seed) { let n = seed | 0; return () => { n = (n + 0x6D2B79F5) | 0; let t = n; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function track(layout, y) { let width = 620, offset = 0; for (const s of layout.strips) {
    if (y < s.start || y > s.end)
        continue;
    const blend = smooth(Math.min(y - s.start, s.end - y) / Math.min(150, (s.end - s.start) / 3));
    width = 620 + (s.width - 620) * blend;
    offset = s.offset * blend;
    break;
} return { center: center(y) + offset, width }; }
function cityRegion(y, arena) { const reference = y / arena.length * exports.CITY_LENGTH; let i = exports.CITY_REGIONS.length - 1; while (i > 0 && reference < exports.CITY_REGIONS[i].start)
    i--; return { ...exports.CITY_REGIONS[i], stage: i, index: i, round: 0 }; }
function cityLayout(arena) {
    const key = arena.length + ':' + arena.seed + ':' + (arena.supplies || 1);
    if (cache.has(key))
        return cache.get(key);
    const scale = arena.length / exports.CITY_LENGTH, Y = (y) => Math.round(y * scale), X = (x, y) => center(Y(y)) + x;
    const l = { strips: [], gates: [], rotors: [], balls: [], walls: [], pistons: [], fans: [], belts: [], tiles: [], gaps: [], checkpoints: [], boxes: [] };
    const strip = (a, b, w, offset = 0) => l.strips.push({ start: Y(a), end: Y(b), width: w, offset });
    const wall = (y, x, w, height = 72) => l.walls.push({ y: Y(y), x: X(x, y), w, depth: 34, height });
    const gate = (y, width, phase, amplitude = 175, period = 1250) => l.gates.push({ y: Y(y), offset: 0, width, phase: phase + arena.seed % 17, amplitude, period });
    const rotor = (y, x, length, period, arms = 1) => l.rotors.push({ y: Y(y), x: X(x, y), length, r: 17, period, phase: y * .013 + arena.seed % 11, arms });
    const gap = (y, width) => l.gaps.push({ start: Y(y), end: Y(y) + width });
    const ball = (y, r, period, phase) => l.balls.push({ y: Y(y), x: X(0, y), r, amplitude: 240, period, phase });
    const piston = (y, x, r, phase) => l.pistons.push({ y: Y(y), x: X(x, y), r, period: 2700, phase });
    const fan = (a, b, force) => l.fans.push({ start: Y(a), end: Y(b), force, phase: a / 700 });
    const belt = (a, b, vx, vy = 0) => l.belts.push({ start: Y(a), end: Y(b), vx, vy });
    const tiles = (start, count, phase) => { for (let row = 0; row < Math.max(3, Math.round(count * scale)); row++)
        l.tiles.push({ y: Y(start) + row * 95, row, safe: (row * 2 + Math.floor(phase)) % 5, period: 3400, phase: phase * 1000 + row * 390 }); };
    // Plaza: readable first obstacles, followed by an alternating street slalom.
    wall(850, -125, 370, 27);
    gate(1240, 184, .4, 135, 1500);
    wall(1920, -120, 380);
    wall(2360, 120, 380);
    gate(2860, 150, 1.8);
    wall(3480, -110, 400, 27);
    gate(3900, 142, 3.1, 190, 1180);
    rotor(4340, 50, 215, -1000);
    gate(4860, 144, 4.5, 180, 1160);
    // Rooftops: crosswinds on offset narrow decks and deliberately jumpable gaps.
    strip(5470, 6450, 220, 70);
    fan(5650, 6270, -90);
    gap(6180, 88);
    strip(6660, 7480, 185, -105);
    gap(6880, 92);
    gap(7240, 96);
    strip(7770, 8710, 200, 105);
    fan(7870, 8550, 110);
    gap(8390, 96);
    wall(8890, 85, 250, 27);
    // Factory: opposing belts feed interleaved presses and rolling machinery.
    belt(9380, 9950, 92, -26);
    piston(9550, -165, 67, 0);
    piston(9820, 85, 72, 1050);
    belt(10320, 11100, -104, 20);
    piston(10500, 160, 75, 1500);
    piston(10810, -100, 78, 400);
    rotor(11650, -110, 200, 810);
    rotor(11990, 95, 205, -870);
    ball(12410, 42, 870, 1.7);
    gate(13000, 140, 3.2, 175, 1100);
    // Tower: each rotor encounter has a different approach and timing.
    wall(13800, 115, 390);
    rotor(14200, -50, 236, -820, 2);
    strip(14600, 15250, 370, 15);
    rotor(14900, 15, 180, 690);
    rotor(15800, -120, 178, 780);
    rotor(16190, 118, 184, -710);
    gate(16820, 136, 5.1, 185, 1120);
    // Skyway: staggered warning panels, jumps, wind and moving openings.
    tiles(17680, 6, .2);
    gap(18600, 100);
    strip(18840, 19700, 215, -85);
    fan(19020, 19590, 96);
    gap(19450, 94);
    tiles(19980, 7, 1.8);
    gate(21060, 134, 2.7, 190, 1150);
    gap(21630, 104);
    // Core: a final mixed gauntlet, followed by an unobstructed finish straight.
    belt(22300, 23000, -75, -35);
    piston(22460, 125, 80, 250);
    piston(22760, -120, 80, 1500);
    wall(23320, -125, 370, 27);
    ball(23720, 44, 780, 0);
    ball(24080, 40, 730, 2.8);
    gate(24650, 136, 5.7, 178, 1070);
    rotor(25120, 25, 232, -700, 2);
    strip(25300, 26040, 230, 0);
    gap(25660, 102);
    wall(26200, -140, 340, 27);
    l.checkpoints = [100, 620, 1540, 2640, 3250, 4590, 5250, 6500, 7600, 9020, 10100, 11250, 12700, 13450, 14600, 15420, 17100, 18400, 19750, 20800, 21850, 23100, 24350, 25400, 26120].map(y => y === 100 ? 100 : Y(y));
    // Cache before scattering so layout queries remain bounded and deterministic.
    cache.set(key, l);
    if (cache.size > 24)
        cache.delete(cache.keys().next().value);
    const rng = random(arena.seed ^ 0x5ca1ab);
    let cursor = 300;
    while (cursor < arena.length - 280) {
        for (let attempt = 0; attempt < (arena.supplies === 2 ? 16 : 9); attempt++) {
            const y = cursor + attempt * 19, road = track(l, y), x = road.center + (rng() - .5) * Math.max(0, road.width - 150);
            const unsafe = l.gaps.some(g => y > g.start - 105 && y < g.end + 105) || l.gates.some(g => Math.abs(g.y - y) < 130) || l.walls.some(w => Math.abs(w.y - y) < 120 && Math.abs(w.x - x) < w.w / 2 + 85) || l.rotors.some(s => Math.hypot(s.x - x, s.y - y) < s.length + 95) || l.pistons.some(p => Math.hypot(p.x - x, p.y - y) < p.r + 95) || l.tiles.some(t => y > t.y - 85 && y < t.y + 160) || l.fans.some(f => y > f.start - 80 && y < f.end + 80) || l.belts.some(b => y > b.start - 60 && y < b.end + 60);
            if (!unsafe && y < arena.length - 220 && (!l.boxes.length || Math.hypot(x - l.boxes.at(-1).x, y - l.boxes.at(-1).y) > 135)) {
                l.boxes.push({ id: l.boxes.length, x, y, r: 27 });
                break;
            }
        }
        cursor += arena.supplies === 2 ? 170 + rng() * 180 : 300 + rng() * 340;
    }
    return l;
}
function cityTrack(y, a) { return track(cityLayout(a), y); }
function cityTileDanger(x, y, t, a) { const row = cityLayout(a).tiles.find(r => y >= r.y && y < r.y + 95); if (!row)
    return 0; const road = cityTrack(y, a), col = Math.max(0, Math.min(4, Math.floor((x - road.center + road.width / 2) / (road.width / 5)))); if (col === row.safe || col === (row.safe + 1) % 5)
    return 0; const phase = ((t + row.phase + col * 260) % row.period) / row.period; return phase > .68 ? 2 : phase > .45 ? 1 : 0; }
function cityPistons(t, a, near, far) { return cityLayout(a).pistons.filter(p => p.y + p.r >= near && p.y - p.r <= far).map(p => { const phase = ((t + p.phase) % p.period) / p.period, state = phase >= .65 && phase < .86 ? 2 : phase >= .45 && phase < .65 ? 1 : 0; const lift = phase < .6 ? 145 : phase < .65 ? 145 * (.65 - phase) / .05 : phase < .86 ? 0 : 145 * (phase - .86) / .14; return { ...p, state, lift }; }); }

})(city);const exports={},require=name=>{if(name==="./quiz-rally-city")return city;throw Error("Unknown arena module");};
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ROUND_LENGTH = exports.center = exports.STAGES = exports.CHECKPOINTS = exports.MIN_ENERGY_SPEED = exports.ENERGY_CHARGE = exports.ENERGY_DRAIN = exports.COUNTDOWN = exports.RADIUS = exports.SPEED = exports.WIDTH = exports.GEAR_HELP = exports.GEAR_NAMES = void 0;
exports.energyValue = energyValue;
exports.energySpeed = energySpeed;
exports.freshRunner = freshRunner;
exports.raceLength = raceLength;
exports.stageAt = stageAt;
exports.boxes = boxes;
exports.checkpoints = checkpoints;
exports.gaps = gaps;
exports.conveyors = conveyors;
exports.tileRows = tileRows;
exports.gates = gates;
exports.spinners = spinners;
exports.balls = balls;
exports.bumpers = bumpers;
exports.trackAt = trackAt;
exports.barriers = barriers;
exports.fans = fans;
exports.pistons = pistons;
exports.missileDirection = missileDirection;
exports.couldFinish = couldFinish;
exports.floorAt = floorAt;
exports.tileDanger = tileDanger;
exports.effectPosition = effectPosition;
exports.control = control;
exports.advanceRunner = advanceRunner;
exports.progress = progress;
const quiz_rally_city_1 = require("./quiz-rally-city");
exports.GEAR_NAMES = { mine: '폭탄', missile: '미사일', banana: '바나나', field: '감속 영역', shield: '보호막', boost: '질주' };
exports.GEAR_HELP = { mine: '뒤에 설치 · 밟으면 밀려나고 0.85초 조작 불가', missile: '앞으로 발사 · 맞으면 밀려나고 0.85초 조작 불가', banana: '뒤에 놓기 · 밟으면 1.05초 미끄러집니다', field: '5초 유지 · 영역 안 친구의 이동 속도를 38%로 낮춤', shield: '4초 동안 공격을 막습니다', boost: '3초 동안 이동 속도 2배' };
exports.WIDTH = 620, exports.SPEED = 175, exports.RADIUS = 18, exports.COUNTDOWN = 3000;
exports.ENERGY_DRAIN = 4, exports.ENERGY_CHARGE = 45, exports.MIN_ENERGY_SPEED = .35;
function energyValue(r) { return Math.max(0, Math.min(100, r.energy ?? 100)); }
function energySpeed(r, arena) { return arena.energy ? exports.MIN_ENERGY_SPEED + (1 - exports.MIN_ENERGY_SPEED) * energyValue(r) / 100 : 1; }
function drainEnergy(r, end, arena) {
    if (!arena.energy || r.open || r.finishAt !== undefined)
        return energyValue(r);
    const seconds = Math.max(0, end - Math.max(r.t, exports.COUNTDOWN)) / 1000, start = energyValue(r), powered = Math.min(seconds, start / exports.ENERGY_DRAIN);
    r.energy = Math.max(0, start - seconds * exports.ENERGY_DRAIN);
    return seconds ? (start * powered - exports.ENERGY_DRAIN * powered * powered / 2) / seconds : start;
}
exports.CHECKPOINTS = [100, 690, 1350, 2060, 2700, 3350, 4010];
exports.STAGES = ['출발 광장', '움직이는 문', '회전봉 정원', '점프 브리지', '컨베이어 길', '볼링 대로', '사라지는 발판'];
const center = (y) => Math.sin(y / 660) * 65;
exports.center = center;
function freshRunner(clock = 0, slot = 0) { return { x: (0, exports.center)(100) + (slot % 8 - 3.5) * 48, y: 100 - Math.floor(slot / 8) * 20, z: 0, vz: 0, dx: 0, dy: 0, fx: 0, fy: 1, t: clock, seq: 0, inputUntil: 0, jumpAt: -2000, diveAt: -3000, diveUntil: 0, stunUntil: 0, immuneUntil: 0, boostUntil: 0, shieldUntil: 0, knockX: 0, knockY: 0, checkpoint: 100, fallUntil: 0, falls: 0, open: false, boxes: [], usedEffects: [], hits: [], energy: 100 }; }
exports.ROUND_LENGTH = 4700;
function raceLength(durationSeconds) { return Math.round(14000 + (durationSeconds - 300) * 13000 / 600); }
function stageAt(y, arena) { if (arena?.version === 2)
    return (0, quiz_rally_city_1.cityRegion)(y, arena); const round = Math.max(0, Math.floor(y / exports.ROUND_LENGTH)), stage = Math.min(6, Math.floor((y - round * exports.ROUND_LENGTH) / 670)); return { round, stage, index: round * 7 + stage, name: exports.STAGES[stage], hint: "결승선을 향해!", color: stage }; }
function bases(arena, near = 0, far = arena?.length || exports.ROUND_LENGTH) { const length = arena?.length || exports.ROUND_LENGTH, first = Math.max(0, Math.floor(near / exports.ROUND_LENGTH)), last = Math.min(Math.ceil(length / exports.ROUND_LENGTH) - 1, Math.floor(far / exports.ROUND_LENGTH)); return Array.from({ length: Math.max(0, last - first + 1) }, (_, i) => (first + i) * exports.ROUND_LENGTH); }
function boxes(arena, near = 0, far = arena?.length || exports.ROUND_LENGTH) { if (arena?.version === 2)
    return (0, quiz_rally_city_1.cityLayout)(arena).boxes.filter(b => b.y >= near && b.y <= far); return bases(arena, near, far).flatMap(base => [270, 640, 1270, 1950, 2590, 3220, 3900, 4480].flatMap((local, i) => [-150, 150].map((x, j) => { const y = base + local; return { id: base / exports.ROUND_LENGTH * 16 + i * 2 + j, x: (0, exports.center)(y) + x, y, r: 27 }; }))).filter(b => b.y >= near && b.y <= far); }
function checkpoints(arena, near = 0, far = arena?.length || exports.ROUND_LENGTH) { if (arena?.version === 2)
    return (0, quiz_rally_city_1.cityLayout)(arena).checkpoints.filter(b => b >= near && b <= far); return bases(arena, near, far).flatMap(base => exports.CHECKPOINTS.map(y => base + y)).filter(y => y >= near && y <= far); }
function gaps(arena, near = 0, far = arena?.length || exports.ROUND_LENGTH) { if (arena?.version === 2)
    return (0, quiz_rally_city_1.cityLayout)(arena).gaps.filter(b => b.end >= near && b.start <= far); return bases(arena, near, far).flatMap(base => [[2170, 2240], [2420, 2490]].map(([a, b]) => ({ start: base + a, end: base + b }))).filter(g => g.end >= near && g.start <= far); }
function conveyors(arena, near = 0, far = arena?.length || exports.ROUND_LENGTH) { if (arena?.version === 2)
    return (0, quiz_rally_city_1.cityLayout)(arena).belts.filter(b => b.end >= near && b.start <= far); return bases(arena, near, far).map(base => ({ start: base + 2800, end: base + 3140, vx: 0, vy: 0 })).filter(g => g.end >= near && g.start <= far); }
function tileRows(arena, near = 0, far = arena?.length || exports.ROUND_LENGTH) { if (arena?.version === 2)
    return (0, quiz_rally_city_1.cityLayout)(arena).tiles.filter(b => b.y + 95 >= near && b.y <= far); return bases(arena, near, far).flatMap(base => [0, 1, 2].map(row => ({ y: base + 4130 + row * 95, row }))).filter(r => r.y + 95 >= near && r.y <= far); }
function gates(clock, arena, near = 0, far = arena?.length || exports.ROUND_LENGTH) { if (arena?.version === 2)
    return (0, quiz_rally_city_1.cityLayout)(arena).gates.filter(g => g.y >= near && g.y <= far).map(g => ({ y: g.y, gap: (0, exports.center)(g.y) + g.offset + Math.sin(clock / g.period + g.phase) * g.amplitude, width: g.width })); return bases(arena, near, far).flatMap(base => [830, 1010, 1190].map((v, i) => { const y = base + v; return { y, gap: (0, exports.center)(y) + Math.sin(clock / 1100 + i * 1.9 + base / exports.ROUND_LENGTH) * 160, width: 180 }; })).filter(g => g.y >= near && g.y <= far); }
function spinners(clock, arena, near = 0, far = arena?.length || exports.ROUND_LENGTH) { if (arena?.version === 2)
    return (0, quiz_rally_city_1.cityLayout)(arena).rotors.filter(g => g.y + g.length >= near && g.y - g.length <= far).map(g => ({ ...g, angle: clock / g.period + g.phase })); return bases(arena, near - 200, far + 200).flatMap(base => [1530, 1770].map((v, i) => { const y = base + v; return { x: (0, exports.center)(y) + (i ? 100 : -95), y, angle: clock / (i ? 850 : -1000) + i + base / exports.ROUND_LENGTH, length: 185, r: 15, arms: 1 }; })).filter(g => g.y + 200 >= near && g.y - 200 <= far); }
function balls(clock, arena, near = 0, far = arena?.length || exports.ROUND_LENGTH) { if (arena?.version === 2)
    return (0, quiz_rally_city_1.cityLayout)(arena).balls.filter(g => g.y + g.r >= near && g.y - g.r <= far).map(g => ({ x: g.x + Math.sin(clock / g.period + g.phase) * g.amplitude, y: g.y, r: g.r })); return bases(arena, near, far).flatMap(base => [3510, 3690, 3850].map((v, i) => { const y = base + v; return { x: (0, exports.center)(y) + Math.sin(clock / (900 + i * 180) + i * 2 + base / exports.ROUND_LENGTH) * 250, y, r: 34 }; })).filter(g => g.y >= near && g.y <= far); }
function bumpers(arena, near = 0, far = arena?.length || exports.ROUND_LENGTH) { if (arena?.version === 2)
    return []; return bases(arena, near, far).flatMap(base => [{ x: -180, y: 2850 }, { x: 165, y: 3030 }, { x: -120, y: 3100 }].map(p => { const y = base + p.y; return { x: p.x + (0, exports.center)(y), y, r: 32 }; })).filter(g => g.y >= near && g.y <= far); }
function trackAt(y, arena) { return arena?.version === 2 ? (0, quiz_rally_city_1.cityTrack)(y, arena) : { center: (0, exports.center)(y), width: exports.WIDTH }; }
function barriers(arena, near = 0, far = arena.length) { return arena.version === 2 ? (0, quiz_rally_city_1.cityLayout)(arena).walls.filter(b => b.y + 40 >= near && b.y - 40 <= far) : []; }
function fans(arena, near = 0, far = arena.length) { return arena.version === 2 ? (0, quiz_rally_city_1.cityLayout)(arena).fans.filter(b => b.end >= near && b.start <= far) : []; }
function pistons(clock, arena, near = 0, far = arena.length) { return arena.version === 2 ? (0, quiz_rally_city_1.cityPistons)(clock, arena, near, far) : []; }
function missileDirection() { return { dx: 0, dy: 1 }; }
// A cheap conservative bound avoids simulating all classmates just to learn
// that nobody near the start can have reached the finish yet.
function couldFinish(r, clock, arena) { return r.finishAt !== undefined || Math.max(r.y, r.checkpoint) + (exports.SPEED * 3 + Math.abs(r.knockY)) * Math.min(6000, Math.max(0, clock - r.t)) / 1000 >= arena.length; }
function floorAt(x, y, clock, arena) {
    if (arena?.version === 2) {
        const road = trackAt(y, arena);
        return y >= 5 && Math.abs(x - road.center) <= road.width / 2 && !gaps(arena, y, y).length && tileDanger(x, y, clock, arena) !== 2;
    }
    if (y < 5 || Math.abs(x - (0, exports.center)(y)) > exports.WIDTH / 2)
        return false;
    const local = y % exports.ROUND_LENGTH;
    if ((local > 2170 && local < 2240) || (local > 2420 && local < 2490))
        return false;
    return tileDanger(x, y, clock) !== 2;
}
function tileDanger(x, y, clock, arena) { if (arena?.version === 2)
    return (0, quiz_rally_city_1.cityTileDanger)(x, y, clock, arena); const local = y % exports.ROUND_LENGTH; if (local < 4130 || local > 4410)
    return 0; const row = Math.floor((local - 4130) / 95), col = Math.max(0, Math.min(4, Math.floor((x - (0, exports.center)(y) + 310) / 124))); if ((row + col) % 3 !== 0)
    return 0; const phase = (clock / 1000 + row * .8 + col * .45) % 3.6; return phase > 2.4 ? 2 : phase > 1.8 ? 1 : 0; }
function effectPosition(e, t) { const dt = Math.max(0, t - e.born) / 1000; return e.type === 'missile' ? { x: e.x + e.dx * 460 * dt, y: e.y + e.dy * 460 * dt } : { x: e.x, y: e.y }; }
function segmentDistance(x, y, ax, ay, bx, by) { const dx = bx - ax, dy = by - ay, k = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1))); return Math.hypot(x - ax - k * dx, y - ay - k * dy); }
function knock(r, x, y, t, force = 190, stun = 600) { if (t < r.immuneUntil || r.open)
    return; const d = Math.hypot(r.x - x, r.y - y) || 1; r.knockX = (r.x - x) / d * force; r.knockY = (r.y - y) / d * force - 55; r.stunUntil = t + stun; r.immuneUntil = t + 1050; }
function control(source, dx, dy, jump, dive, clock, seq) {
    const r = { ...source };
    r.seq = seq;
    if (r.open || r.finishAt !== undefined)
        return r;
    const n = Math.max(1, Math.hypot(dx, dy));
    r.dx = dx / n;
    r.dy = dy / n;
    r.inputUntil = clock + 2200;
    if (dx || dy) {
        r.fx = dx / n;
        r.fy = dy / n;
    }
    if (jump && r.z <= .1 && !r.fallUntil && clock >= r.stunUntil && clock - r.jumpAt >= 880) {
        r.vz = 300;
        r.jumpAt = clock;
    }
    if (dive && clock >= r.stunUntil && !r.fallUntil && clock - r.diveAt >= 1800) {
        r.diveAt = clock;
        r.diveUntil = clock + 360;
        if (r.z > 0)
            r.vz = Math.min(r.vz, 20);
    }
    return r;
}
function advanceRunner(source, clock, arena, effects = [], id = '') {
    const r = { ...source, boxes: [...source.boxes], usedEffects: [...source.usedEffects], hits: [...source.hits] };
    if (r.finishAt !== undefined)
        return r;
    const end = Math.max(r.t, clock);
    let t = r.t;
    if (r.open) {
        r.t = end;
        r.dx = 0;
        r.dy = 0;
        return r;
    }
    if (!r.dx && !r.dy && !r.vz && !r.z && !r.knockX && !r.knockY && !r.fallUntil && r.diveUntil <= r.t && (arena.version === 2 ? r.y / (arena.length / 27000) : r.y % exports.ROUND_LENGTH) < 700 && floorAt(r.x, r.y, end, arena) && effects.every(e => e.owner === id || e.expires <= r.t || e.born > end)) {
        drainEnergy(r, end, arena);
        r.t = end;
        return r;
    }
    // No active input survives a disconnect. Skip long idle periods without thousands of steps.
    if (end - t > 6000 && r.inputUntil < t + 2500 && !r.open) {
        const cutoff = Math.min(end, t + 5000);
        const first = advanceRunner(r, cutoff, arena, effects, id), resume = Math.max(cutoff, end - 1000);
        drainEnergy(first, resume, arena);
        return advanceRunner({ ...first, t: resume }, end, arena, effects, id);
    }
    while (t < end - .001) {
        const dt = Math.min(20, end - t) / 1000;
        t += dt * 1000;
        const averageEnergy = drainEnergy(r, t, arena);
        r.t = t;
        if (t < exports.COUNTDOWN || r.open) {
            r.dx = 0;
            r.dy = 0;
            continue;
        }
        if (r.fallUntil) {
            if (t >= r.fallUntil) {
                r.x = trackAt(r.checkpoint, arena).center;
                r.y = r.checkpoint;
                r.z = 0;
                r.vz = 0;
                r.knockX = 0;
                r.knockY = 0;
                r.fallUntil = 0;
                r.immuneUntil = t + 1100;
            }
            else {
                r.z -= dt * 140;
                continue;
            }
        }
        const groundY = r.y % exports.ROUND_LENGTH, grounded = r.z <= 0, belt = conveyors(arena, r.y, r.y)[0];
        let slow = 1;
        for (const e of effects) {
            if (e.type === 'field' && e.owner !== id && e.born <= t && e.expires > t && t >= r.shieldUntil && Math.hypot(r.x - e.x, r.y - e.y) < 145)
                slow = .38;
        }
        if (arena.version === 1 && belt && r.x < (0, exports.center)(r.y) - 40 && grounded)
            slow = Math.min(slow, .65);
        const active = t < r.inputUntil && t >= r.stunUntil, fast = t < r.boostUntil ? 2 : 1, dive = t < r.diveUntil;
        // Charge affects running, diving, sprinting and ordinary airborne movement.
        // A local gap assist preserves required leaps without bypassing low charge
        // through repeated jumps on flat ground.
        const energyDrive = arena.energy ? exports.MIN_ENERGY_SPEED + (1 - exports.MIN_ENERGY_SPEED) * averageEnergy / 100 : 1;
        const gapAssist = energyDrive < .78 && (r.z > 0 || r.vz > 0) && gaps(arena, r.y - 15, r.y + 35).some(g => r.y >= g.start - 35 && r.y <= g.end + 15);
        const drive = gapAssist ? .78 : energyDrive;
        let vx = (active ? r.dx : 0) * exports.SPEED * fast * slow * drive, vy = (active ? r.dy : 0) * exports.SPEED * fast * slow * drive;
        if (dive) {
            vx = r.fx * exports.SPEED * 2 * drive;
            vy = r.fy * exports.SPEED * 2 * drive;
        }
        if (grounded && belt) {
            vx += arena.version === 1 ? (Math.floor((groundY - 2800) / 110) % 2 ? 75 : -75) : belt.vx;
            vy += belt.vy;
        }
        for (const wind of fans(arena, r.y, r.y))
            vx += wind.force * (.7 + .3 * Math.sin(t / 700 + wind.phase)) * (grounded ? 1 : .65);
        const previousY = r.y, previousX = r.x;
        r.x += (vx + r.knockX) * dt;
        r.y += (vy + r.knockY) * dt;
        r.knockX *= Math.pow(.04, dt);
        r.knockY *= Math.pow(.04, dt);
        // Integrate height analytically so 30/60/120 Hz rendering and server batches
        // produce the same jump arc, rather than a different height at every sync.
        r.z = Math.max(0, r.z + r.vz * dt - 340 * dt * dt);
        r.vz -= 680 * dt;
        if (r.z === 0)
            r.vz = 0;
        // Tall sliding gates cannot be jumped; find the moving opening.
        for (const gate of gates(t, arena, r.y - 70, r.y + 70))
            if (Math.abs(r.y - gate.y) < exports.RADIUS + 16 && Math.abs(r.x - gate.gap) > gate.width / 2 - exports.RADIUS) {
                r.y = previousY <= gate.y ? gate.y - exports.RADIUS - 17 : gate.y + exports.RADIUS + 17;
            }
        for (const wall of barriers(arena, r.y - 40, r.y + 40))
            if (r.z < wall.height && Math.abs(r.x - wall.x) < wall.w / 2 + exports.RADIUS && Math.abs(r.y - wall.y) < wall.depth / 2 + exports.RADIUS) {
                const edge = wall.depth / 2 + exports.RADIUS + .5;
                if (previousY <= wall.y - edge)
                    r.y = wall.y - edge;
                else if (previousY >= wall.y + edge)
                    r.y = wall.y + edge;
                else
                    r.x = wall.x + (previousX <= wall.x ? -1 : 1) * (wall.w / 2 + exports.RADIUS + .5);
            }
        for (const press of pistons(t, arena, r.y - 90, r.y + 90))
            if (press.state === 2 && Math.hypot(r.x - press.x, r.y - press.y) < press.r + exports.RADIUS)
                knock(r, press.x, press.y, t, 265, 780);
        if (r.z < 32) {
            for (const s of spinners(t, arena, r.y - 40, r.y + 40)) {
                for (let arm = 0; arm < s.arms; arm++) {
                    const angle = s.angle + arm * Math.PI / 2, a = Math.cos(angle) * s.length, b = Math.sin(angle) * s.length;
                    if (segmentDistance(r.x, r.y, s.x - a, s.y - b, s.x + a, s.y + b) < exports.RADIUS + s.r)
                        knock(r, s.x, s.y, t, 230);
                }
            }
            for (const b of [...balls(t, arena, r.y - 70, r.y + 70), ...bumpers(arena, r.y - 70, r.y + 70)])
                if (Math.hypot(r.x - b.x, r.y - b.y) < exports.RADIUS + b.r)
                    knock(r, b.x, b.y, t, 240);
        }
        for (const e of effects) {
            if (e.owner === id || e.born > t || e.expires <= t || e.victim && e.victim !== id || r.usedEffects.includes(e.id) || e.type === 'field' || e.type === 'boost' || e.type === 'shield')
                continue;
            if (e.type === 'mine' && t < e.born + 500)
                continue;
            if (r.z > (e.type === 'missile' ? 50 : 25))
                continue;
            const p = effectPosition(e, t), radius = e.type === 'missile' ? 34 : e.type === 'mine' ? 32 : 29;
            if (Math.hypot(r.x - p.x, r.y - p.y) < exports.RADIUS + radius) {
                r.usedEffects.push(e.id);
                r.usedEffects = r.usedEffects.slice(-80);
                r.hits.push({ id: e.id, t });
                r.hits = r.hits.slice(-12);
                if (t >= r.shieldUntil)
                    knock(r, p.x, p.y, t, e.type === 'banana' ? 115 : 280, e.type === 'banana' ? 1050 : 850);
            }
        }
        if (!floorAt(r.x, r.y, t, arena) && r.z <= 3) {
            r.fallUntil = t + 850;
            r.falls++;
            r.dx = 0;
            r.dy = 0;
            r.vz = 0;
            continue;
        }
        if (r.z < 2) {
            for (const cp of checkpoints(arena, r.y - 80, r.y))
                if (r.y >= cp && r.y < cp + 80 && cp > r.checkpoint)
                    r.checkpoint = cp;
        }
        if (r.y >= arena.length && Math.abs(r.x - (0, exports.center)(arena.length)) < exports.WIDTH / 2) {
            r.finishAt = t - dt * 1000 + Math.max(0, Math.min(1, (arena.length - previousY) / (r.y - previousY || 1))) * dt * 1000;
            r.y = arena.length;
            r.dx = 0;
            r.dy = 0;
            break;
        }
    }
    return r;
}
function progress(r) { return r.finishAt !== undefined ? Infinity : r.y; }

window.quizArenaModel=exports;})();
