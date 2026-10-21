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
