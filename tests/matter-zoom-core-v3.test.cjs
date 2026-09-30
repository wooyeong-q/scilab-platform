const {test}=require('node:test');
const assert=require('node:assert/strict');
const corePath='../public/labs/matter-zoom/core.mjs';

test('matter zoom v3: scoped v2 observations migrate without inheriting obsolete task completion',async()=>{
 const {fresh,restore}=await import(corePath);
 const saved={...fresh(),version:2,chapter:6,unlocked:6,material:'water',level:4,deepest:5,z:8,
  visited:['water','hydrogen'],seen:['8:p','8:e'],conceptAnswers:{water:{atoms:'3',types:'2'}},
  shellDone:[8,12],tableSeen:[1,8],records:['water','compare','number','neutral','table','final','shells'],
  answers:{identity:'p',isotope:'same'},evidence:{identity:'protons',neutral:'same-count',shells:'second-shell',final:'protons'},
  identityConfirmed:true,groupChecked:['p','e','n'],order:[1,2,6,8],orderChecked:true,numberConfirmed:true,
  chargeConfirmed:true,done:true,mission:{neutral:'yes',number:'9',element:'9',shells:'2,7'}};
 const result=restore(JSON.stringify(saved));
 assert.equal(result.version,3);assert.equal(result.upgraded,true);assert.equal(result.chapter,0);assert.equal(result.unlocked,0);
 assert.equal(result.material,'water');assert.equal(result.level,4);assert.equal(result.deepest,5);
 assert.deepEqual(result.visited,['water','hydrogen']);assert.deepEqual(result.seen,['8:p','8:e']);
 assert.deepEqual(result.conceptAnswers,saved.conceptAnswers);assert.deepEqual(result.shellDone,[8,12]);assert.deepEqual(result.tableSeen,[1,8]);
 assert.deepEqual(result.records,['water','shells']);assert.equal(result.answers.identity,undefined);
 assert.deepEqual(result.evidence,{shells:'second-shell'});assert.deepEqual(result.mission,{});
 assert.deepEqual(result.groupChecked,[]);assert.equal(result.identityConfirmed,false);assert.equal(result.orderChecked,false);
 assert.equal(result.numberConfirmed,false);assert.equal(result.chargeConfirmed,false);assert.equal(result.done,false);
 assert.deepEqual(restore(JSON.stringify(saved),'high'),fresh('high'));
});

test('matter zoom v3: discovery gates are restored only from consistent evidence',async()=>{
 const {fresh,restore}=await import(corePath);
 const saved={...fresh(),groupCriterion:'n',groupChecked:['p','e','n','p'],identityRule:'p',identityConfirmed:true,
  order:[1,2,6,8],orderChecked:true,numberRule:'p',numberPrediction:'7',numberConfirmed:true,numberStage:9,
  mapFound:[12,20,12,99],chargeAnswers:{na:'neutral','na-plus':'positive','cl-minus':'negative'},chargeConfirmed:true};
 const result=restore(JSON.stringify(saved));
 assert.deepEqual(result.groupChecked,['p','e','n']);assert.equal(result.identityConfirmed,true);
 assert.equal(result.orderChecked,true);assert.equal(result.numberConfirmed,true);assert.equal(result.numberStage,2);
 assert.deepEqual(result.mapFound,[12,20]);assert.equal(result.chargeConfirmed,true);
 const missingGrouping=restore(JSON.stringify({...saved,groupChecked:['p','n']}));
 assert.equal(missingGrouping.identityConfirmed,false);assert.equal(missingGrouping.numberConfirmed,false);assert.equal(missingGrouping.numberStage,1);
 const wrongOrdering=restore(JSON.stringify({...saved,order:[2,1,6,8]}));
 assert.equal(wrongOrdering.orderChecked,false);assert.equal(wrongOrdering.numberConfirmed,false);assert.equal(wrongOrdering.numberStage,0);
 const wrongRule=restore(JSON.stringify({...saved,numberRule:'e'}));
 assert.equal(wrongRule.numberConfirmed,false);assert.equal(wrongRule.numberStage,1);
 assert.equal(restore(JSON.stringify({...saved,numberPrediction:'8'})).numberConfirmed,false);
 assert.equal(restore(JSON.stringify({...saved,chargeAnswers:{...saved.chargeAnswers,'na-plus':'negative'}})).chargeConfirmed,false);
});

test('matter zoom v3: new answers are whitelisted and the high-level shell track cannot be skipped',async()=>{
 const {fresh,restore}=await import(corePath);
 const saved={...fresh(),chapter:88,unlocked:99,groupCriterion:'<svg>',groupChecked:['p','<script>','n'],
  identityRule:'<img>',order:[1,1,2,6,8,79],numberRule:'<svg>',numberPrediction:'21',numberStage:-1,
  mapFound:['12',12,20,79],chargeAnswers:{na:'<svg>','na-plus':'positive',unknown:'negative'},chargeConfirmed:true,shellTrack:'<script>'};
 const result=restore(JSON.stringify(saved));
 assert.equal(result.chapter,5);assert.equal(result.unlocked,5);assert.equal(result.groupCriterion,'e');
 assert.deepEqual(result.groupChecked,['p','n']);assert.equal(result.identityRule,'');assert.deepEqual(result.order,[1,2,6,8]);
 assert.equal(result.numberRule,'');assert.equal(result.numberPrediction,'');assert.equal(result.numberStage,0);
 assert.deepEqual(result.mapFound,[12,20]);assert.deepEqual(result.chargeAnswers,{'na-plus':'positive'});
 assert.equal(result.chargeConfirmed,false);assert.equal(result.shellTrack,'undecided');
 assert.equal(fresh('high').shellTrack,'explore');
 assert.equal(restore(JSON.stringify({...fresh('high'),shellTrack:'skip'}),'high').shellTrack,'explore');
});

test('matter zoom v3: optional middle-school shell exploration controls final assessment restoration',async()=>{
 const {fresh,restore}=await import(corePath);
 const {missionFor}=await import('../public/labs/matter-zoom/levels.mjs');
 const middleMission=missionFor('middle',0);
 const saved={...fresh(),done:true,shellTrack:'skip',evidence:{final:'protons'},mission:{
  neutral:middleMission.p===middleMission.e?'yes':'no',number:String(middleMission.z),element:String(middleMission.z)}};
 assert.equal(restore(JSON.stringify(saved)).done,true);
 assert.equal(restore(JSON.stringify({...saved,shellTrack:'explore'})).done,false);
 saved.mission.shells=middleMission.shells.join(',');
 assert.equal(restore(JSON.stringify({...saved,shellTrack:'explore'})).done,true);
 const highMission=missionFor('high',0);
 const high={...fresh('high'),done:true,shellTrack:'skip',evidence:{final:'protons'},mission:{
  neutral:highMission.p===highMission.e?'yes':'no',number:String(highMission.z),element:String(highMission.z)}};
 assert.equal(restore(JSON.stringify(high),'high').done,false);
 high.mission.shells=highMission.shells.join(',');
 assert.equal(restore(JSON.stringify(high),'high').done,true);
});
