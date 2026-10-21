const {test}=require('node:test'),assert=require('node:assert/strict');

test('every room keeps distinct, fully reachable markers on small phones and desktop',async()=>{
 const {spreadScenePoints}=await import('../public/labs/first-love/scene-points.mjs');
 const {EXPLORE,MAIN_SPOTS,PHOTO_SPOTS}=await import('../public/labs/first-love/exploration.mjs');
 for(const width of [320,375,390,700,1200])for(const [room,points] of Object.entries(EXPLORE)){
  const variants=[points];
  if(MAIN_SPOTS[room]){
   const [x,y]=MAIN_SPOTS[room];
   variants.push([...points.filter(p=>Math.hypot(p.x-x,p.y-y)>=8),{x,y}]);
  }
  if(room==='classroom')variants.push([...points.filter(p=>!PHOTO_SPOTS.some(photo=>photo.id===p.id)),...PHOTO_SPOTS]);
  for(const source of variants){
   const height=width*9/16,positions=spreadScenePoints(source,width,height);
   assert.equal(positions.length,source.length);
   positions.forEach((p,i)=>{
    assert.ok(p.left>=24&&p.left<=width-24&&p.top>=24&&p.top<=height-24,`${room} ${width}: target clipped`);
    // A finger can reach a whole 48px marker without touching its neighbor.
    for(const q of positions.slice(i+1))assert.ok(Math.hypot(q.left-p.left,q.top-p.top)>=51.9,`${room} ${width}: overlapping markers`);
    assert.ok(Math.hypot(p.left-source[i].x*width/100,p.top-source[i].y*height/100)<55,`${room} ${width}: marker too far from its object`);
   });
   assert.deepEqual(spreadScenePoints(source,width,height),positions,'same viewport must not move targets on repeated layout');
  }
 }
});

test('wide room framing fills the reported screen while every object remains reachable',async()=>{
 const {fitRoomFrame,spreadScenePoints}=await import('../public/labs/first-love/scene-points.mjs');
 const {EXPLORE}=await import('../public/labs/first-love/exploration.mjs');
 for(const [width,height]of [[1920,808],[1902,740],[1366,658],[1280,550],[844,306],[2560,900],[390,644],[320,450]])for(const [room,source]of Object.entries(EXPLORE)){
  const f=fitRoomFrame(source,width,height);
  assert.ok(Math.abs(f.width/f.height-16/9)<1e-6,'background proportions must not change');
  if(width===1920)assert.ok(f.width>=width*.99,`${room}: reported desktop screen must fill its width`);
  const anchors=source.map(p=>({x:(f.left+p.x*f.width/100)/width*100,y:(f.top+p.y*f.height/100)/height*100}));
  const targets=spreadScenePoints(anchors,width,height);
  for(let i=0;i<targets.length;i++){
   const p=targets[i];
   assert.ok(p.left>=24&&p.left<=width-24&&p.top>=24&&p.top<=height-24,`${room}: cropped control`);
   assert.ok(Math.hypot(p.left-anchors[i].x*width/100,p.top-anchors[i].y*height/100)<55,`${room}: control detached from object`);
   for(const q of targets.slice(i+1))assert.ok(Math.hypot(p.left-q.left,p.top-q.top)>=51.9,`${room}: enlarged controls overlap`);
  }
 }
});
