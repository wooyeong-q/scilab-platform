/* City circuit scenery. Native Canvas geometry; decoration never changes collisions.
   The skyline is rasterized once per district/viewport, not rebuilt every frame. */
(()=>{'use strict';
const themes=[
 {sky:['#91aebb','#cad9dd','#e1e4df'],deck:'#536b78',inset:'#627c89',edge:'#c5d7d9',side:'#344e5d',dark:'#263c4d',accent:'#7ed6c5',roof:'#879ea6',label:'CENTRAL PLAZA'},
 {sky:['#526a80','#8e9faf','#b9beca'],deck:'#3e5368',inset:'#4d6177',edge:'#b0c9d6',side:'#2c3e55',dark:'#1d3046',accent:'#87cddd',roof:'#75889e',label:'NEON DISTRICT'},
 {sky:['#8caaba','#c6d6df','#e5e9e7'],deck:'#667f8c',inset:'#78909b',edge:'#d3e0df',side:'#405e70',dark:'#2d465b',accent:'#94d8d1',roof:'#9cadb4',label:'WIND ROOFTOPS'},
 {sky:['#8e9ba6','#c6cdd0','#dddcd2'],deck:'#6c7072',inset:'#7a8183',edge:'#d1d2c8',side:'#474d57',dark:'#333d48',accent:'#e7b477',roof:'#939a9c',label:'POWER WORKS'},
 {sky:['#7d90ab','#b6c1d0','#d7dee2'],deck:'#576478',inset:'#67778c',edge:'#c5d1df',side:'#3c495d',dark:'#2b354b',accent:'#acbecf',roof:'#919daf',label:'ORBIT TOWER'},
 {sky:['#88acbe','#c3d7e0','#e6eced'],deck:'#57778a',inset:'#6a8b9d',edge:'#cbdde2',side:'#36566e',dark:'#294255',accent:'#94e0d7',roof:'#96b2bc',label:'CLOUD SKYWAY'},
 {sky:['#b2a99e','#dbd2c5','#e9e6dc'],deck:'#6b7173',inset:'#7d8485',edge:'#e0d6c4',side:'#4a565d',dark:'#34444f',accent:'#e0b878',roof:'#a9b0ad',label:'CITY CORE'},
];
const theme=(M,a,y)=>themes[M.stageAt(Math.max(0,Math.min(y,a.length-1)),a).stage%7];
const noise=n=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v);};
function poly(c,points,fill,stroke,width=1){c.beginPath();points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}}
function line(c,a,b,color,width){c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();}
function ellipse(c,x,y,rx,ry,color){c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();}
function gradient(c,x,y,end,colors){const g=c.createLinearGradient(x,y,x,end);colors.forEach((color,i)=>g.addColorStop(i/(colors.length-1),color));return g;}
function block(c,P,x,y,w,d,z,colors,s,baseZ=0){
 const a=x-w/2,b=x+w/2;
 if(!baseZ)poly(c,[P(a,y),P(b,y),P(b,y+d),P(a,y+d)].map(p=>({x:p.x+12*s,y:p.y+11*s})),'#24456316');
 const top=P(x,y,z),foot=P(x,y,baseZ),front=gradient(c,0,top.y,foot.y,[colors[0],colors[1]]);
 poly(c,[P(a,y,baseZ),P(b,y,baseZ),P(b,y,z),P(a,y,z)],front);
 poly(c,[P(b,y,baseZ),P(b,y+d,baseZ),P(b,y+d,z),P(b,y,z)],colors[1]);
 poly(c,[P(a,y,z),P(b,y,z),P(b,y+d,z),P(a,y+d,z)],colors[2],'#ffffff60',s);
}
let skyLayer;
function background(c,w,h,camX,camY,M,a){
 const q=theme(M,a,camY),key=w+':'+h+':'+q.sky.join(',');
 if(skyLayer?.key!==key){
  const layer=document.createElement('canvas');layer.width=w;layer.height=h;const sky=layer.getContext('2d',{alpha:false});
  sky.fillStyle=gradient(sky,0,0,h,q.sky);sky.fillRect(0,0,w,h);
  const sun=sky.createRadialGradient(w*.78,h*.18,0,w*.78,h*.18,h*.6);sun.addColorStop(0,'#f9f0d842');sun.addColorStop(1,'#f9f0d800');sky.fillStyle=sun;sky.fillRect(0,0,w,h);
  const city=document.createElement('canvas');city.width=w+320;city.height=h+200;const bg=city.getContext('2d');
  // Detailed windows and roof structures cost only two cached image draws during play.
  for(let i=0;i<26;i++){
   const x=noise(i+71)*(w+320),base=h*.2+noise(i+19)*(h+160),bw=28+noise(i+5)*62,bh=75+noise(i+12)*185,d=10+noise(i+24)*12;
   bg.globalAlpha=.18+noise(i+50)*.15;
   bg.fillStyle=q.side;bg.fillRect(x,base-bh,bw,bh);
   poly(bg,[{x:x+bw,y:base},{x:x+bw+d,y:base-d},{x:x+bw+d,y:base-bh-d},{x:x+bw,y:base-bh}],q.dark);
   poly(bg,[{x,y:base-bh},{x:x+d,y:base-bh-d},{x:x+bw+d,y:base-bh-d},{x:x+bw,y:base-bh}],'#ecf0ea');
   bg.fillStyle='#dce8e6';for(let row=0;row<Math.min(12,bh/18);row++)for(let col=0;col<4;col++)if(noise(i*101+row*7+col)>.35)bg.fillRect(x+6+col*(bw-10)/4,base-bh+10+row*17,3,8);
   bg.fillStyle=q.dark;bg.fillRect(x+bw*.35,base-bh-8,bw*.35,8);
  }
  bg.globalAlpha=1;
  skyLayer={key,layer,city};
 }
 c.drawImage(skyLayer.layer,0,0,w,h);
 c.drawImage(skyLayer.city,-160-camX*.08,-80-Math.sin(camY/2600)*35);
}
function scenery(c,P,M,a,near,far,t,s){
 for(let high=Math.ceil(far/260)*260;high>near-180;high-=260){
  for(const side of [-1,1]){
   const seed=Math.floor(high/260)*17+(side+1)*3,y=high+noise(seed)*95,road=M.trackAt(y,a),q=theme(M,a,y),stage=M.stageAt(y,a).stage;
   const x=road.center+side*(road.width/2+83+noise(seed+4)*70),kind=Math.floor(noise(seed+8)*4);
   if(stage===0&&(kind<2)){
    block(c,P,x,y,64,48,15,[q.side,q.dark,q.edge],s);
    const p=P(x,y+24,32);line(c,P(x,y+24,15),P(x,y+24,65),'#58645e',6*s);
    poly(c,[{x:p.x-27*s,y:p.y-16*s},{x:p.x-23*s,y:p.y-51*s},{x:p.x+2*s,y:p.y-68*s},{x:p.x+31*s,y:p.y-49*s},{x:p.x+27*s,y:p.y-14*s}],'#618f81');
    poly(c,[{x:p.x+2*s,y:p.y-68*s},{x:p.x+31*s,y:p.y-49*s},{x:p.x+27*s,y:p.y-14*s},{x:p.x+2*s,y:p.y-29*s}],'#497467');
   }else if(stage===2&&kind<2){
    block(c,P,x,y,94,90,28,['#7799b0','#4f738c','#d9dfde'],s);
    for(let col=0;col<3;col++)for(let row=0;row<3;row++){const xx=x-40+col*28,yy=y+8+row*25;poly(c,[P(xx,yy,34),P(xx+24,yy,34),P(xx+24,yy+21,44),P(xx,yy+21,44)],'#507da8','#bedbea',s);}
   }else if(stage===3&&kind<2){
    block(c,P,x,y,85,65,56,[q.side,q.dark,'#bcc8cc'],s);
    for(const off of [-20,20]){const p=P(x+off,y+30,80),base=P(x+off,y+30,28);line(c,base,p,'#7495a6',21*s);ellipse(c,p.x,p.y,10.5*s,6*s,'#d6e4e7');line(c,{x:p.x-7*s,y:p.y+8*s},{x:p.x+7*s,y:p.y+8*s},'#ffc782',4*s);}
   }else{
    const height=55+noise(seed+30)*75,bw=61+noise(seed+31)*23,d=62+noise(seed+32)*25;
    block(c,P,x,y,bw,d,height,[q.side,q.dark,q.roof],s);
    for(let row=0;row<3;row++)for(let col=0;col<3;col++){
     const xx=x-bw/2+10+col*(bw-18)/3,z=height-16-row*24;
     if(z<13)continue;poly(c,[P(xx,y-.5,z),P(xx+7,y-.5,z),P(xx+7,y-.5,z-15),P(xx,y-.5,z-15)],noise(seed+row*3+col)>.25?(stage===1?'#d1e7d9':'#9cbfc7'):q.dark);
    }
    block(c,P,x+4,y+d*.45,bw*.38,20,height+10,[q.roof,q.side,q.edge],s,height);
    const mast=P(x-bw*.25,y+d*.5,height+38);line(c,P(x-bw*.25,y+d*.5,height),mast,q.dark,2*s);ellipse(c,mast.x,mast.y,3*s,3*s,q.accent);
    if(stage===1){const sign=P(x,y,Math.min(height-10,72));c.save();c.translate(sign.x,sign.y);c.fillStyle='#283e54';c.fillRect(-bw*s*.44,-7*s,bw*s*.88,15*s);c.fillStyle='#95d9d4';c.font=`600 ${8*s}px system-ui`;c.textAlign='center';c.fillText(kind%2?'METRO':'SCI LAB',0,3*s);c.restore();}
   }
  }
 }
}
function surface(c,P,M,a,near,far,t,s){
 const holes=M.gaps(a,near,far);
 for(let high=Math.ceil(far/50)*50;high>near;high-=50){
  const cuts=[high,high-50,...holes.flatMap(g=>[g.start,g.end]).filter(y=>y>high-50&&y<high)].sort((a,b)=>b-a);
  for(let i=0;i<cuts.length-1;i++){
   const y=cuts[i],low=cuts[i+1],mid=(y+low)/2;if(holes.some(g=>mid>g.start&&mid<g.end))continue;
   const q=theme(M,a,mid),top=M.trackAt(y,a),bottom=M.trackAt(low,a);
   const pts=[P(top.center-top.width/2,y),P(top.center+top.width/2,y),P(bottom.center+bottom.width/2,low),P(bottom.center-bottom.width/2,low)];
   const lower=pts.map(p=>({x:p.x,y:p.y+29*s}));poly(c,[pts[0],pts[1],lower[1],lower[0]],q.dark);
   poly(c,[pts[1],pts[2],lower[2],lower[1]],q.side);poly(c,[pts[0],pts[3],lower[3],lower[0]],q.side);
   poly(c,[pts[2],pts[3],lower[3],lower[2]],q.side);poly(c,pts,q.deck);
   for(const side of [-1,1]){
    const edge=(tr,inset)=>tr.center+side*(tr.width/2-inset);
    poly(c,[P(edge(top,4),y),P(edge(top,24),y),P(edge(bottom,24),low),P(edge(bottom,4),low)],q.edge);
    if(Math.floor(mid/100)%2===0)poly(c,[P(edge(top,10),y),P(edge(top,17),y),P(edge(bottom,17),low),P(edge(bottom,10),low)],q.accent);
   }
   const inset=40,inner=[P(top.center-top.width/2+inset,y),P(top.center+top.width/2-inset,y),P(bottom.center+bottom.width/2-inset,low),P(bottom.center-bottom.width/2+inset,low)];
   c.save();c.globalAlpha=.42;poly(c,inner,q.inset);c.restore();
   if(Math.floor(mid/50)%3===0){line(c,P(bottom.center-bottom.width/2+31,low),P(bottom.center+bottom.width/2-31,low),'#182f452b',s);}
   if(Math.floor(mid/50)%3!==0)for(const off of [-.2,.2])line(c,P(top.center+top.width*off,y),P(bottom.center+bottom.width*off,low),'#dce9ee13',s);
  }
 }
 for(let y=Math.ceil(near/210)*210;y<far;y+=210){
  const road=M.trackAt(y,a),q=theme(M,a,y);if(holes.some(g=>y>g.start-25&&y<g.end+25))continue;
  for(const side of [-1,1]){
   const x=road.center+side*(road.width/2-34),p=P(x,y);ellipse(c,p.x,p.y,5*s,3*s,'#294d762f');
   const light=P(x,y,5);ellipse(c,light.x,light.y,3*s,2*s,'#f8fff2');
  }
  if(road.width>350){for(const off of [-12,12]){const x=road.center+off;line(c,P(x-7,y-5),P(x,y+4),'#ffffff30',3*s);line(c,P(x,y+4),P(x+7,y-5),'#ffffff30',3*s);}}
 }
}
function details(c,P,M,a,near,far,t,s){
 for(const wall of M.barriers(a,near,far)){
  const road=M.trackAt(wall.y,a);for(const side of [-1,1]){const p=P(road.center+side*(road.width/2-43),wall.y-72);c.save();c.translate(p.x,p.y);poly(c,[{x:0,y:-10*s},{x:11*s,y:8*s},{x:-11*s,y:8*s}],'#fff0b8aa');c.fillStyle='#9e7867';c.font=`800 ${12*s}px system-ui`;c.textAlign='center';c.fillText('!',0,5*s);c.restore();}
 }
 for(const rotor of M.spinners(t,a,near,far)){
  const p=P(rotor.x,rotor.y);c.strokeStyle='#ffffff46';c.lineWidth=2*s;c.setLineDash([6*s,9*s]);c.beginPath();c.ellipse(p.x,p.y,rotor.length*s,rotor.length*s*.76,0,0,Math.PI*2);c.stroke();c.setLineDash([]);
 }
 // Small flags and inset checkpoint pads add depth without narrowing the road.
 for(const cp of M.checkpoints(a,near,far)){
  const road=M.trackAt(cp,a),q=theme(M,a,cp);
  for(const side of [-1,1]){const x=road.center+side*(road.width/2+8);block(c,P,x,cp-8,20,23,8,[q.side,q.dark,q.edge],s);const foot=P(x,cp),tip=P(x,cp,80);line(c,foot,tip,'#638593',4*s);line(c,P(x,cp,44),P(x,cp,76),'#a0eee0',5*s);}
 }
}
function supply(c,P,box,t,s,wait=0){
 const base=P(box.x,box.y),p=P(box.x,box.y,29+Math.sin(t/780+box.id*1.7)*2.5);
 if(wait>0){c.save();c.strokeStyle='#b4d3dbb0';c.lineWidth=2*s;c.setLineDash([4*s,4*s]);c.beginPath();c.ellipse(base.x,base.y,26*s,10*s,0,0,Math.PI*2);c.stroke();c.setLineDash([]);c.font=`600 ${Math.max(11,13*s)}px system-ui`;c.textAlign='left';c.fillStyle='#dfedf0';c.strokeStyle='#304b5c';c.lineWidth=3*s;const label=Math.ceil(wait/1000)+'초';c.strokeText(label,base.x+34*s,base.y+5*s);c.fillText(label,base.x+34*s,base.y+5*s);c.restore();return;}
 ellipse(c,base.x,base.y+5*s,29*s,10*s,'#162f4560');
 c.strokeStyle='#8de9d799';c.lineWidth=2*s;c.beginPath();c.ellipse(base.x,base.y,29*s,10*s,0,0,Math.PI*2);c.stroke();
 c.save();c.translate(p.x,p.y);
 const r=22*s,d=9*s;c.fillStyle='#2d6974';c.strokeStyle='#9ae6d8';c.lineWidth=1.5*s;
 c.beginPath();c.roundRect(-r,-r,2*r,2*r,3*s);c.fill();c.stroke();
 poly(c,[{x:-r,y:-r},{x:-r+d,y:-r-d},{x:r+d,y:-r-d},{x:r,y:-r}], '#91c7c1','#bbeadd',s);
 poly(c,[{x:r,y:-r},{x:r+d,y:-r-d},{x:r+d,y:r-d},{x:r,y:r}], '#204955','#83b8bb',s);
 c.fillStyle='#caffeb';c.font=`650 ${29*s}px system-ui`;c.textAlign='center';c.fillText('?',0,10*s);
 for(const side of [-1,1]){c.fillStyle='#83d7c8';c.fillRect(side<0?-r+3*s:r-5*s,-r+4*s,2*s,6*s);c.fillRect(side<0?-r+3*s:r-8*s,r-5*s,5*s,2*s);}
 c.restore();
}
function wall(c,P,v,s){
 const left=v.x-v.w/2,right=v.x+v.w/2,y=v.y,z=v.height,low=z<40;
 block(c,P,v.x,y,v.w,v.depth,z,low?['#4f6878','#293f52','#98afb8']:['#566374','#344353','#9aa6b1'],s);
 const a=P(left+10,y-.1,z-5),b=P(right-10,y-.1,z-5);line(c,a,b,'#e1b477',4*s);
 for(let x=left+25;x<right-15;x+=62){const p=P(x,y-.2,z*.45);ellipse(c,p.x,p.y,2*s,2*s,'#bfced4b3');if(!low)line(c,P(x+12,y,12),P(x+12,y,z-16),'#20334b55',3*s);}
 if(low){for(const x of [v.x-28,v.x,v.x+28]){line(c,P(x-6,y,39),P(x,y,45),'#fff4c9',3*s);line(c,P(x,y,45),P(x+6,y,39),'#fff4c9',3*s);}}
}
window.quizArenaScene={background,scenery,surface,details,supply,wall};
})();
