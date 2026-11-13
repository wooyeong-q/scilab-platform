const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
test('all four gender pairings keep the recipient outside the four playable roles',async()=>{
 const {HEROES,RECIPIENTS,DEFAULT_ACTORS,castForHero,normalizeHero,normalizeCasting,characterText,characterDialogue}=await import('../public/labs/first-love/characters.mjs');
 const story=await import('../public/labs/first-love/escape-story.mjs');
 assert.equal(HEROES.length,8);assert.equal(RECIPIENTS.length,2);assert.equal(normalizeHero('seoa'),'yunjae');assert.equal(normalizeHero('doyun'),'yunjae');
 for(const role of [1,2,3,4])assert.deepEqual(HEROES.filter(h=>h.roleNo===role).map(h=>h.gender).sort(),['남학생','여학생']);
 const sequences=[story.OPENING,...Object.values(story.BEFORE),...Object.values(story.AFTER),story.WALK_TO_YOU,story.CONFESSION];
 for(const lead of ['yunjae','harin'])for(const target of ['seoa','doyun'])for(let mask=0;mask<8;mask++){
  const actors=[lead,...['soyeon','jian','naeun'].map((id,n)=>mask&(1<<n)?id:DEFAULT_ACTORS[n+1])],selection=normalizeCasting({actors,recipient:target}),cast=castForHero(selection);
  assert.equal(cast.length,5);assert.equal(cast[0].id,lead);assert.equal(cast[1].id,target);assert.equal(new Set(cast.map(c=>c.id)).size,5);
  assert.ok(!selection.actors.some(id=>RECIPIENTS.some(r=>r.id===id)));
  assert.equal(characterText('윤재, 도하, 시우, 민우',selection),[cast[0],cast[2],cast[3],cast[4]].map(c=>c.short).join(', '));
  assert.equal(characterText('서윤재 / 강도하 / 차시우 / 정민우 / 한서아',selection),[cast[0],cast[2],cast[3],cast[4],cast[1]].map(c=>c.name).join(' / '));
  for(const list of sequences){const adapted=characterDialogue(list,selection);assert.deepEqual(adapted.map(l=>l[0]),list.map(l=>l[0]));for(const [who,,o={}]of adapted){if(who>=0)assert.ok(cast[who]);if(o.expression)assert.ok(cast[who].moods.includes(o.expression),o.expression);}}
 }
 const selected={actors:['harin','soyeon','jian','naeun'],recipient:'doyun'};
 assert.equal(characterText('서아야, 윤재가 도하와 민우를 찾았어.',selected),'도윤아, 하린이 소연과 나은을 찾았어.');
 assert.equal(characterText('서아는 윤재의 편지를 읽는다.',selected),'도윤은 하린의 편지를 읽는다.');
 assert.deepEqual(normalizeCasting({actors:['seoa','harin','doyun','evil'],recipient:'unknown'}),{actors:DEFAULT_ACTORS,recipient:'seoa'});
});
test('every selectable actor has a usable portrait and each recipient has three distinct ending expressions',async()=>{
 const {HEROES,RECIPIENTS,portraitHTML}=await import('../public/labs/first-love/characters.mjs');
 for(const actor of [...HEROES,...RECIPIENTS]){
  for(const asset of [actor.atlas,actor.sheet,actor.endingAsset].filter(Boolean))assert.ok(fs.statSync(`public/labs/first-love/assets/${asset}.webp`).size>1000,asset);
  assert.match(portraitHTML(actor),new RegExp(actor.atlas));
  for(const mood of ['neutral','nervous','surprised','smile'])assert.ok(portraitHTML(actor,'',mood).includes('data-expression="'+mood+'"'));
 }
 for(const target of RECIPIENTS){const frames=['smile','surprised','disgust'].map(m=>portraitHTML(target,'',m));assert.equal(new Set(frames).size,3);assert.ok(!frames.some(h=>h.includes('undefined')));}
});
