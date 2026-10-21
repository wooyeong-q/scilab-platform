// Resolve presentation only. Puzzle progress and private clues remain in engine.mjs.
export function dialogueFrame(list,index,fallbackRoom='classroom'){
 const safeIndex=Math.min(Math.max(Number(index)||0,0),Math.max(0,list.length-1));
 const [who,text,options={}]=list[safeIndex]||[-1,''];
 let room=fallbackRoom;const expressions={};
 for(const [actor,,o={}]of list.slice(0,safeIndex+1)){if(o.room)room=o.room;if(actor>=0&&o.expression&&!o.channel)expressions[actor]=o.expression;}
 const channel=options.channel||'scene';
 const messages=[];
 if(channel==='phone'){
  let first=safeIndex;
  while(first>0&&list[first-1][2]?.channel==='phone')first--;
  for(let n=first;n<=safeIndex;n++)messages.push({who:list[n][0],text:list[n][1],current:n===safeIndex});
 }
 return {who,text,options,room,channel,messages,expressions,index:safeIndex};
}

export function restoreStoryUI(saved,version){
 const value=saved&&typeof saved==='object'?saved:{};
 return {...value,seen:Array.isArray(value.seen)?value.seen:[],history:Array.isArray(value.history)?value.history:[],storyVersion:version,
  dialogue:value.dialogue?{...value.dialogue,index:value.storyVersion===version?value.dialogue.index:0}:null};
}
