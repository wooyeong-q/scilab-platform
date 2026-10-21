// Keep the painting's anchors, separating only markers that would overlap.
export function spreadScenePoints(points,width,height,size=48,gap=4){
 const margin=size/2+2,distance=size+gap;
 const clamp=(n,limit)=>limit<margin*2?limit/2:Math.max(margin,Math.min(limit-margin,n));
 const placed=points.map(p=>({left:clamp(p.x*width/100,width),top:clamp(p.y*height/100,height)}));
 for(let pass=0;pass<60;pass++){
  let changed=false;
  for(let i=0;i<placed.length;i++)for(let j=i+1;j<placed.length;j++){
   const a=placed[i],b=placed[j],dx=b.left-a.left,dy=b.top-a.top,d=Math.hypot(dx,dy);
   if(d>=distance-.01)continue;
   const ux=d?dx/d:1,uy=d?dy/d:0,move=(distance-d)/2+.02;
   a.left=clamp(a.left-ux*move,width);a.top=clamp(a.top-uy*move,height);
   b.left=clamp(b.left+ux*move,width);b.top=clamp(b.top+uy*move,height);
   changed=true;
  }
  if(!changed)break;
 }
 return placed;
}
