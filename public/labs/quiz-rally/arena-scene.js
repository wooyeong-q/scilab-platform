/* Lightweight, procedural sky-city scenery. Decorations never change collision geometry. */
(()=>{'use strict';
const themes=[
 {sky:['#b5e4ee','#e7f5ec','#ffe8d5'],deck:'#80d7c4',inset:'#65c5b5',edge:'#f3f6d9',side:'#378d95',dark:'#296b81',accent:'#ffd77f',roof:'#ff9e91',label:'SUNRISE PLAZA'},
 {sky:['#8e92c4','#c6bfdf','#efd7e6'],deck:'#646faa',inset:'#586298',edge:'#c3ddf0',side:'#414c7c',dark:'#313b69',accent:'#ffbd82',roof:'#bd91d9',label:'NEON DISTRICT'},
 {sky:['#aecfe8','#e3ebf1','#ffead4'],deck:'#a1c9dd',inset:'#87b5cc',edge:'#f4e8c9',side:'#5e8fa9',dark:'#3d6686',accent:'#f6cc78',roof:'#e8a891',label:'WIND ROOFTOPS'},
 {sky:['#a8bace','#dde1e3','#f2dfcd'],deck:'#a8b4be',inset:'#91a0ad',edge:'#ffe0a4',side:'#606f84',dark:'#435369',accent:'#ffc866',roof:'#de936e',label:'POWER WORKS'},
 {sky:['#a7b2dc','#dedcf0','#f8e5ed'],deck:'#b4abd5',inset:'#9a91c2',edge:'#eee5ff',side:'#716694',dark:'#554c7c',accent:'#ffe6a5',roof:'#d9a1bf',label:'ORBIT TOWER'},
 {sky:['#9cc9df','#d6e8ee','#eae6f2'],deck:'#90bfd4',inset:'#77a9c3',edge:'#d6f8f2',side:'#4f789b',dark:'#3c587e',accent:'#ffcea5',roof:'#b3b0d6',label:'CLOUD SKYWAY'},
 {sky:['#edc7b3','#f6e4d3','#e7eff2'],deck:'#e8b49e',inset:'#dba18e',edge:'#ffebcc',side:'#a16e72',dark:'#70596f',accent:'#98e0d1',roof:'#82b9b6',label:'CITY CORE'},
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
function cloud(c,x,y,k,alpha){c.save();c.globalAlpha=alpha;ellipse(c,x+6*k,y+12*k,71*k,18*k,'#8da8c72b');for(const [dx,dy,r] of [[-43,0,28],[-12,-12,38],[28,-6,32],[51,7,22],[0,11,58]])ellipse(c,x+dx*k,y+dy*k,r*k,r*k*.56,'#ffffff');c.restore();}
function background(c,w,h,camX,camY,M,a){
 const q=theme(M,a,camY);c.fillStyle=gradient(c,0,0,h,q.sky);c.fillRect(0,0,w,h);
 const sun=c.createRadialGradient(w*.77,h*.22,4,w*.77,h*.22,h*.4);sun.addColorStop(0,'#fff7cebb');sun.addColorStop(1,'#fff7ce00');c.fillStyle=sun;c.fillRect(0,0,w,h);
 // Distant districts move slowly beneath the suspended raceway.
 for(let i=0;i<13;i++){
  const bw=45+noise(i+5)*72,bh=60+noise(i+12)*165;
  const x=((i*137+noise(i)*90-camX*.12)%(w+160)+w+160)%(w+160)-80;
  const y=h*.28+noise(i+19)*h*.64-((camY*.027)%100),k=.6+noise(i+30)*.25;
  c.save();c.globalAlpha=.3;
  poly(c,[{x:x-6,y:y+6},{x:x+bw+24,y:y+6},{x:x+bw+8,y:y+34},{x:x+12,y:y+34}],q.dark);
  c.fillStyle=i%2?'#9bacc7':'#a8bccb';c.fillRect(x,y-bh,bw,bh);
  poly(c,[{x,y:y-bh},{x:x+18,y:y-bh-12},{x:x+bw+18,y:y-bh-12},{x:x+bw,y:y-bh}],'#e3e8ee');
  poly(c,[{x:x+bw,y},{x:x+bw+18,y:y-12},{x:x+bw+18,y:y-bh-12},{x:x+bw,y:y-bh}],q.side);
  c.fillStyle='#f8f2d9';for(let row=0;row<Math.min(8,bh/24);row++)for(let col=0;col<3;col++)if(noise(i*101+row*4+col)>.22)c.fillRect(x+9+col*(bw-15)/3,y-bh+13+row*22,6*k+4,8*k+4);
  c.restore();
 }
 for(let i=0;i<7;i++){const x=((i*257+noise(i+60)*100-camX*.2)%(w+250)+w+250)%(w+250)-125,y=h*.25+noise(i+90)*h*.68-((camY*.055)%130);cloud(c,x,y,.5+noise(i+81)*.8,.48);}
}
function scenery(c,P,M,a,near,far,t,s){
 for(let high=Math.ceil(far/260)*260;high>near-180;high-=260){
  for(const side of [-1,1]){
   const seed=Math.floor(high/260)*17+(side+1)*3,y=high+noise(seed)*95,road=M.trackAt(y,a),q=theme(M,a,y),stage=M.stageAt(y,a).stage;
   const x=road.center+side*(road.width/2+83+noise(seed+4)*70),kind=Math.floor(noise(seed+8)*4);
   if(stage===0&&(kind<2)){
    block(c,P,x,y,64,48,15,[q.side,q.dark,q.edge],s);
    const p=P(x,y+24,32);line(c,P(x,y+24,15),P(x,y+24,65),'#89715e',8*s);
    ellipse(c,p.x-15*s,p.y-31*s,29*s,23*s,'#5d9f80');ellipse(c,p.x+11*s,p.y-46*s,31*s,26*s,'#79bd91');ellipse(c,p.x+29*s,p.y-22*s,25*s,22*s,'#a0d3a3');
    if(kind===0){const pp=P(x,y+18,86);ellipse(c,pp.x+9*s,pp.y,5*s,5*s,'#ffdfac');}
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
     if(z<13)continue;poly(c,[P(xx,y-.5,z),P(xx+10,y-.5,z),P(xx+10,y-.5,z-12),P(xx,y-.5,z-12)],stage===1?'#ffe6b4':'#c9edf0');
    }
    block(c,P,x+4,y+d*.45,bw*.38,20,height+10,[q.roof,q.side,q.edge],s,height);
    const mast=P(x-bw*.25,y+d*.5,height+38);line(c,P(x-bw*.25,y+d*.5,height),mast,q.dark,2*s);ellipse(c,mast.x,mast.y,3*s,3*s,q.accent);
    if(stage===1){const sign=P(x,y,Math.min(height-10,72));c.save();c.translate(sign.x,sign.y);c.fillStyle='#f2a8c5';c.fillRect(-bw*s*.44,-7*s,bw*s*.88,15*s);c.fillStyle='#594c7e';c.font=`800 ${9*s}px system-ui`;c.textAlign='center';c.fillText(kind%2?'PLAY':'SCI LAB',0,4*s);c.restore();}
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
   if(Math.floor(mid/50)%3===0){line(c,P(bottom.center-bottom.width/2+31,low),P(bottom.center+bottom.width/2-31,low),'#ffffff22',s);}
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
  for(const side of [-1,1]){const x=road.center+side*(road.width/2+8);block(c,P,x,cp-8,20,23,8,[q.side,q.dark,q.edge],s);const foot=P(x,cp),tip=P(x,cp,80);line(c,foot,tip,'#f2f0dd',4*s);poly(c,[tip,{x:tip.x+side*32*s,y:tip.y+5*s},{x:tip.x+side*29*s,y:tip.y+26*s},{x:tip.x,y:tip.y+20*s}],q.accent,'#fff9',s);}
 }
}
function supply(c,P,box,t,s){
 const base=P(box.x,box.y),p=P(box.x,box.y,29+Math.sin(t/680+box.id*1.7)*4);
 ellipse(c,base.x,base.y+5*s,33*s,12*s,'#21547720');
 c.strokeStyle='#d5fff4bb';c.lineWidth=2*s;c.beginPath();c.ellipse(base.x,base.y,30*s,11*s,0,0,Math.PI*2);c.stroke();
 c.save();c.translate(p.x,p.y);c.rotate(Math.sin(t/850+box.id)*.035);
 const r=22*s,d=9*s;c.fillStyle=gradient(c,0,-r,r,['#fff0a4','#ffd264']);c.strokeStyle='#fff5c1';c.lineWidth=2*s;
 c.beginPath();c.roundRect(-r,-r,2*r,2*r,6*s);c.fill();c.stroke();
 poly(c,[{x:-r+3*s,y:-r},{x:-r+d,y:-r-d},{x:r+d,y:-r-d},{x:r,y:-r}], '#fff7cf','#fff9',s);
 poly(c,[{x:r,y:-r},{x:r+d,y:-r-d},{x:r+d,y:r-d},{x:r,y:r}], '#e9b35c','#fff3',s);
 c.fillStyle='#ab702e';c.font=`900 ${32*s}px system-ui`;c.textAlign='center';c.fillText('?',0,11*s);
 for(const side of [-1,1]){c.fillStyle='#fff8d1';c.fillRect(side<0?-r+3*s:r-6*s,-r+5*s,3*s,5*s);}
 c.restore();
 for(let i=0;i<2;i++){const phase=t/1100+i*2.9+box.id,xx=p.x+Math.cos(phase)*34*s,yy=p.y+Math.sin(phase)*25*s;c.save();c.globalAlpha=.5+.35*Math.sin(phase*2);poly(c,[{x:xx,y:yy-4*s},{x:xx+3*s,y:yy},{x:xx,y:yy+4*s},{x:xx-3*s,y:yy}],'#fff3b9');c.restore();}
}
function wall(c,P,v,s){
 const left=v.x-v.w/2,right=v.x+v.w/2,y=v.y,z=v.height,low=z<40;
 block(c,P,v.x,y,v.w,v.depth,z,low?['#638ba7','#466881','#bad5df']:['#786ea2','#58517f','#aca0c7'],s);
 const a=P(left+10,y-.1,z-5),b=P(right-10,y-.1,z-5);line(c,a,b,low?'#ffe5a2':'#edc8f6',5*s);
 for(let x=left+25;x<right-15;x+=62){const p=P(x,y-.2,z*.45);ellipse(c,p.x,p.y,2.5*s,2.5*s,'#e9edf4b3');if(!low)line(c,P(x+12,y,12),P(x+12,y,z-16),'#504c7838',4*s);}
 if(low){for(const x of [v.x-28,v.x,v.x+28]){line(c,P(x-6,y,39),P(x,y,45),'#fff4c9',3*s);line(c,P(x,y,45),P(x+6,y,39),'#fff4c9',3*s);}}
}
window.quizArenaScene={background,scenery,surface,details,supply,wall};
})();
