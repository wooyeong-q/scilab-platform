const {test}=require('node:test'),assert=require('node:assert/strict');

test('resumed dialogue resolves its actual room and only the current phone exchange',async()=>{
 const {dialogueFrame,restoreStoryUI}=await import('../public/labs/first-love/narrative.mjs');
 const {OPENING,AFTER,BEFORE,STORY_VERSION}=await import('../public/labs/first-love/story.mjs');
 const {STAGES}=await import('../public/labs/first-love/content.mjs');
 for(const [n,list]of Object.entries(BEFORE))for(let i=0;i<list.length;i++)assert.equal(dialogueFrame(list,i,'bench').room,STAGES[n].room);
 const first=dialogueFrame(OPENING,0);assert.equal(first.channel,'phone');assert.equal(first.who,0);assert.match(first.text,/방과 후.*벚꽃/);
 const update=AFTER[8].findIndex(x=>x[2]?.channel==='phone');
 assert.equal(dialogueFrame(AFTER[8],update,'library').room,'classroom');
 assert.equal(dialogueFrame(AFTER[8],update).messages.length,1);
 assert.equal(dialogueFrame(AFTER[8],update+2).messages.length,3);
 const moved=dialogueFrame(AFTER[9],AFTER[9].length-1,'classroom');assert.equal(moved.room,'courtyard');
 const old={seen:['opening'],history:[[0,'이전 대화']],dialogue:{key:'after:9',index:100},storyVersion:3};
 const restored=restoreStoryUI(old,STORY_VERSION);assert.deepEqual(restored.seen,old.seen);assert.deepEqual(restored.history,old.history);assert.equal(restored.dialogue.index,0);
 const current=restoreStoryUI({...restored,dialogue:{key:'after:9',index:3}},STORY_VERSION);assert.equal(current.dialogue.index,3);
 assert.equal(dialogueFrame(AFTER[9],100).index,AFTER[9].length-1);
});

test('every physical speaker enters before speaking; remote heroine messages stay remote until the meeting',async()=>{
 const {OPENING,BEFORE,AFTER,WALK_TO_YOU,CONFESSION}=await import('../public/labs/first-love/story.mjs');
 const sequences=[OPENING];for(let n=0;n<10;n++){if(BEFORE[n])sequences.push(BEFORE[n]);sequences.push(AFTER[n]);}sequences.push(WALK_TO_YOU,CONFESSION);
 const present=new Set([0]);
 for(const list of sequences)for(const [who,text,options={}]of list){
  if(options.arrival!==undefined)for(const actor of [options.arrival].flat())present.add(actor);
  if(who>=0&&!options.channel)assert.ok(present.has(who),`No entrance before: ${text}`);
  if(options.exit!==undefined)for(const actor of [options.exit].flat())present.delete(actor);
 }
 assert.deepEqual([...present].sort(),[0,1]);
});
