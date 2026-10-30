const {test}=require('node:test'),assert=require('node:assert/strict');
test('four male leads preserve heroine and unique story casting',async()=>{
 const {HEROES,castForHero,normalizeHero,characterText,characterDialogue}=await import('../public/labs/first-love/characters.mjs');
 const {OPENING,AFTER,CONFESSION}=await import('../public/labs/first-love/story.mjs');
 assert.equal(HEROES.length,4);assert.equal(normalizeHero('seoa'),'yunjae');
 for(const hero of HEROES){
  const cast=castForHero(hero.id);assert.equal(cast[0].id,hero.id);assert.equal(cast[1].short,'서아');assert.equal(new Set(cast.map(c=>c.name)).size,4);
  assert.equal(characterText('윤재, 도하, 시우',hero.id),[cast[0],cast[2],cast[3]].map(c=>c.short).join(', '));
  for(const list of [OPENING,...Object.values(AFTER),CONFESSION]){
   const adapted=characterDialogue(list,hero.id);assert.deepEqual(adapted.map(l=>l[0]),list.map(l=>l[0]));
   adapted.forEach(([who,,o={}])=>{if(who>=0&&o.expression)assert.ok(cast[who].moods.includes(o.expression));});
  }
 }
});
test('all redesigned portraits and emotion atlases exist without old male assets',async()=>{
 const {HEROES}=await import('../public/labs/first-love/characters.mjs');const fs=require('node:fs');
 for(const hero of HEROES){for(const asset of [hero.asset,hero.sheet])assert.ok(fs.statSync(`public/labs/first-love/assets/${asset}.webp`).size>1000);assert.equal(hero.sheetSplit,512);for(const mood of hero.moods)assert.ok(hero.expressionFrames[mood]>=0&&hero.expressionFrames[mood]<=3);}
});
