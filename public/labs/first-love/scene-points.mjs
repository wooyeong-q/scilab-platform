// Use one camera for a room in both dialogue and exploration. Fill wide screens
// as far as the room's interactive objects allow, without stretching the art.
export function fitRoomFrame(points,width,height){
 const ratio=16/9,contained=Math.min(width,height*ratio),cover=Math.max(width,height*ratio),margin=40;
 const xs=points.map(p=>p.x/100),ys=points.map(p=>p.y/100);
 const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
 const limitX=points.length>1?(width-2*margin)/(maxX-minX||1):cover;
 const limitY=points.length>1?(height-2*margin)/(maxY-minY||1)*ratio:cover;
 const w=width<=700?contained:Math.max(contained,Math.min(cover,contained*1.5,limitX,limitY)),h=w/ratio;
 const offset=(size,view,min,max)=>{
  const center=(view-size)/2;
  if(size<=view||!points.length)return center;
  const low=Math.max(view-size,margin-min*size),high=Math.min(0,view-margin-max*size);
  return low<=high?Math.max(low,Math.min(high,center)):center;
 };
 return {width:w,height:h,left:offset(w,width,minX,maxX),top:offset(h,height,minY,maxY)};
}

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
