const {test}=require('node:test'),assert=require('node:assert/strict');
test('every selected lead keeps all four boys and the heroine in the story',async()=>{
 const {HEROES,castForHero,normalizeHero,characterText,characterDialogue}=await import('../public/labs/first-love/characters.mjs');
 const {OPENING,BEFORE,AFTER,WALK_TO_YOU,CONFESSION}=await import('../public/labs/first-love/story.mjs');
 const {dialogueFrame}=await import('../public/labs/first-love/narrative.mjs');
 const expectedIds=HEROES.map(h=>h.id).sort();
 const sequences=[OPENING,...Object.values(BEFORE),...Object.values(AFTER),WALK_TO_YOU,CONFESSION];
 assert.equal(HEROES.length,4);assert.equal(normalizeHero('seoa'),'yunjae');
 for(const hero of HEROES){
  const cast=castForHero(hero.id);
  assert.equal(cast.length,5);assert.equal(cast[0].id,hero.id);assert.equal(cast[1].short,'서아');
  assert.equal(new Set(cast.map(c=>c.name)).size,5);
  assert.deepEqual(cast.filter((c,i)=>i!==1).map(c=>c.id).sort(),expectedIds);
  assert.equal(cast.filter(c=>c.id===hero.id).length,1);
  assert.equal(characterText('윤재, 도하, 시우, 민우',hero.id),[cast[0],cast[2],cast[3],cast[4]].map(c=>c.short).join(', '));
  assert.equal(characterText('서윤재 / 강도하 / 차시우 / 정민우 / 한서아',hero.id),[cast[0],cast[2],cast[3],cast[4],cast[1]].map(c=>c.name).join(' / '));
  const speakers=new Set();
  for(const list of sequences){
   const adapted=characterDialogue(list,hero.id);assert.deepEqual(adapted.map(l=>l[0]),list.map(l=>l[0]));
   adapted.forEach(([who,,o={}],index)=>{
    if(who<0)return;
    assert.ok(cast[who],`Unknown story actor ${who}`);
    if(!o.channel)speakers.add(cast[who].name);
    if(o.expression)assert.ok(cast[who].moods.includes(o.expression));
    if(who===4&&!o.channel){
     const frame=dialogueFrame(adapted,index);
     assert.equal(frame.portraitActor,4);
     assert.ok(cast[frame.portraitActor].sheet);
     assert.ok(cast[frame.portraitActor].expressionFrames[frame.expressions[4]||'neutral']>=0);
    }
   });
  }
  assert.deepEqual([...speakers].sort(),cast.map(c=>c.name).sort(),'Every cast member must actually appear and speak, not only exist in the selector');
 }
});
test('all redesigned portraits and emotion atlases exist without old male assets',async()=>{
 const {HEROES}=await import('../public/labs/first-love/characters.mjs');const fs=require('node:fs');
 for(const hero of HEROES){for(const asset of [hero.asset,hero.sheet])assert.ok(fs.statSync(`public/labs/first-love/assets/${asset}.webp`).size>1000);assert.equal(hero.sheetSplit,512);for(const mood of hero.moods)assert.ok(hero.expressionFrames[mood]>=0&&hero.expressionFrames[mood]<=3);}
});
