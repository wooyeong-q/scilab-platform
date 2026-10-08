// A single authored city route. Seeded supply caches vary by room, not by player.
export type CityArena={version:1|2;length:number;seed:number;combat:boolean};
type Strip={start:number;end:number;width:number;offset:number};
type Gate={y:number;offset:number;width:number;amplitude:number;period:number;phase:number};
type Rotor={x:number;y:number;length:number;r:number;period:number;phase:number;arms:number};
type Ball={x:number;y:number;r:number;amplitude:number;period:number;phase:number};
type Wall={x:number;y:number;w:number;depth:number;height:number};
type Piston={x:number;y:number;r:number;period:number;phase:number};
type Fan={start:number;end:number;force:number;phase:number};
type Belt={start:number;end:number;vx:number;vy:number};
type Tile={y:number;row:number;safe:number;period:number;phase:number};
export type CityLayout={strips:Strip[];gates:Gate[];rotors:Rotor[];balls:Ball[];walls:Wall[];pistons:Piston[];fans:Fan[];belts:Belt[];tiles:Tile[];gaps:{start:number;end:number}[];checkpoints:number[];boxes:{id:number;x:number;y:number;r:number}[]};
export const CITY_LENGTH=27000;
export const CITY_REGIONS=[
 {start:0,name:'출발 광장',hint:'문제 상자를 찾아 아이템을 준비하세요',color:0},
 {start:1600,name:'네온 골목',hint:'막힌 길을 돌아 움직이는 틈으로!',color:1},
 {start:5200,name:'풍력 지붕',hint:'바람을 버티고 끊어진 지붕을 점프!',color:2},
 {start:9000,name:'프레스 공장',hint:'노란 경고 뒤 내려오는 프레스를 피하세요',color:3},
 {start:13300,name:'회전 타워',hint:'엇갈리는 회전봉을 보고 점프하세요',color:4},
 {start:17300,name:'붕괴 스카이웨이',hint:'깜빡이는 발판을 피하고 안전한 길로!',color:5},
 {start:21900,name:'시티 코어',hint:'마지막 복합 장애물! 결승까지 이어 달리세요',color:6},
];
const center=(y:number)=>Math.sin(y/660)*65;
const cache=new Map<string,CityLayout>();
const smooth=(x:number)=>{const n=Math.max(0,Math.min(1,x));return n*n*(3-2*n);};
function random(seed:number){let n=seed|0;return()=>{n=(n+0x6D2B79F5)|0;let t=n;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
function track(layout:CityLayout,y:number){let width=620,offset=0;for(const s of layout.strips){if(y<s.start||y>s.end)continue;const blend=smooth(Math.min(y-s.start,s.end-y)/Math.min(150,(s.end-s.start)/3));width=620+(s.width-620)*blend;offset=s.offset*blend;break;}return{center:center(y)+offset,width};}
export function cityRegion(y:number,arena:CityArena){const reference=y/arena.length*CITY_LENGTH;let i=CITY_REGIONS.length-1;while(i>0&&reference<CITY_REGIONS[i].start)i--;return{...CITY_REGIONS[i],stage:i,index:i,round:0};}
export function cityLayout(arena:CityArena):CityLayout{
 const key=arena.length+':'+arena.seed;if(cache.has(key))return cache.get(key)!;
 const scale=arena.length/CITY_LENGTH,Y=(y:number)=>Math.round(y*scale),X=(x:number,y:number)=>center(Y(y))+x;
 const l:CityLayout={strips:[],gates:[],rotors:[],balls:[],walls:[],pistons:[],fans:[],belts:[],tiles:[],gaps:[],checkpoints:[],boxes:[]};
 const strip=(a:number,b:number,w:number,offset=0)=>l.strips.push({start:Y(a),end:Y(b),width:w,offset});
 const wall=(y:number,x:number,w:number,height=72)=>l.walls.push({y:Y(y),x:X(x,y),w,depth:34,height});
 const gate=(y:number,width:number,phase:number,amplitude=175,period=1250)=>l.gates.push({y:Y(y),offset:0,width,phase:phase+arena.seed%17,amplitude,period});
 const rotor=(y:number,x:number,length:number,period:number,arms=1)=>l.rotors.push({y:Y(y),x:X(x,y),length,r:17,period,phase:y*.013+arena.seed%11,arms});
 const gap=(y:number,width:number)=>l.gaps.push({start:Y(y),end:Y(y)+width});
 const ball=(y:number,r:number,period:number,phase:number)=>l.balls.push({y:Y(y),x:X(0,y),r,amplitude:240,period,phase});
 const piston=(y:number,x:number,r:number,phase:number)=>l.pistons.push({y:Y(y),x:X(x,y),r,period:2700,phase});
 const fan=(a:number,b:number,force:number)=>l.fans.push({start:Y(a),end:Y(b),force,phase:a/700});
 const belt=(a:number,b:number,vx:number,vy=0)=>l.belts.push({start:Y(a),end:Y(b),vx,vy});
 const tiles=(start:number,count:number,phase:number)=>{for(let row=0;row<Math.max(3,Math.round(count*scale));row++)l.tiles.push({y:Y(start)+row*95,row,safe:(row*2+Math.floor(phase))%5,period:3400,phase:phase*1000+row*390});};

 // Plaza: readable first obstacles, followed by an alternating street slalom.
 wall(850,-125,370,27);gate(1240,184,.4,135,1500);
 wall(1920,-120,380);wall(2360,120,380);gate(2860,150,1.8);
 wall(3480,-110,400,27);gate(3900,142,3.1,190,1180);rotor(4340,50,215,-1000);gate(4860,144,4.5,180,1160);

 // Rooftops: crosswinds on offset narrow decks and deliberately jumpable gaps.
 strip(5470,6450,220,70);fan(5650,6270,-90);gap(6180,88);
 strip(6660,7480,185,-105);gap(6880,92);gap(7240,96);
 strip(7770,8710,200,105);fan(7870,8550,110);gap(8390,96);wall(8890,85,250,27);

 // Factory: opposing belts feed interleaved presses and rolling machinery.
 belt(9380,9950,92,-26);piston(9550,-165,67,0);piston(9820,85,72,1050);
 belt(10320,11100,-104,20);piston(10500,160,75,1500);piston(10810,-100,78,400);
 rotor(11650,-110,200,810);rotor(11990,95,205,-870);ball(12410,42,870,1.7);gate(13000,140,3.2,175,1100);

 // Tower: each rotor encounter has a different approach and timing.
 wall(13800,115,390);rotor(14200,-50,236,-820,2);
 strip(14600,15250,370,15);rotor(14900,15,180,690);
 rotor(15800,-120,178,780);rotor(16190,118,184,-710);gate(16820,136,5.1,185,1120);

 // Skyway: staggered warning panels, jumps, wind and moving openings.
 tiles(17680,6,.2);gap(18600,100);strip(18840,19700,215,-85);
 fan(19020,19590,96);gap(19450,94);tiles(19980,7,1.8);
 gate(21060,134,2.7,190,1150);gap(21630,104);

 // Core: a final mixed gauntlet, followed by an unobstructed finish straight.
 belt(22300,23000,-75,-35);piston(22460,125,80,250);piston(22760,-120,80,1500);
 wall(23320,-125,370,27);ball(23720,44,780,0);ball(24080,40,730,2.8);
 gate(24650,136,5.7,178,1070);rotor(25120,25,232,-700,2);
 strip(25300,26040,230,0);gap(25660,102);wall(26200,-140,340,27);

 l.checkpoints=[100,620,1540,2640,3250,4590,5250,6500,7600,9020,10100,11250,12700,13450,14600,15420,17100,18400,19750,20800,21850,23100,24350,25400,26120].map(y=>y===100?100:Y(y));
 // Cache before scattering so layout queries remain bounded and deterministic.
 cache.set(key,l);if(cache.size>24)cache.delete(cache.keys().next().value!);
 const rng=random(arena.seed^0x5ca1ab);let cursor=300;
 while(cursor<arena.length-280){
  for(let attempt=0;attempt<9;attempt++){
   const y=cursor+attempt*19,road=track(l,y),x=road.center+(rng()-.5)*Math.max(0,road.width-150);
   const unsafe=l.gaps.some(g=>y>g.start-105&&y<g.end+105)||l.gates.some(g=>Math.abs(g.y-y)<130)||l.walls.some(w=>Math.abs(w.y-y)<120&&Math.abs(w.x-x)<w.w/2+85)||l.rotors.some(s=>Math.hypot(s.x-x,s.y-y)<s.length+95)||l.pistons.some(p=>Math.hypot(p.x-x,p.y-y)<p.r+95)||l.tiles.some(t=>y>t.y-85&&y<t.y+160)||l.fans.some(f=>y>f.start-80&&y<f.end+80)||l.belts.some(b=>y>b.start-60&&y<b.end+60);
   if(!unsafe&&y<arena.length-220){l.boxes.push({id:l.boxes.length,x,y,r:27});break;}
  }
  cursor+=300+rng()*340;
 }
 return l;
}
export function cityTrack(y:number,a:CityArena){return track(cityLayout(a),y);}
export function cityTileDanger(x:number,y:number,t:number,a:CityArena){const row=cityLayout(a).tiles.find(r=>y>=r.y&&y<r.y+95);if(!row)return 0;const road=cityTrack(y,a),col=Math.max(0,Math.min(4,Math.floor((x-road.center+road.width/2)/(road.width/5))));if(col===row.safe||col===(row.safe+1)%5)return 0;const phase=((t+row.phase+col*260)%row.period)/row.period;return phase>.68?2:phase>.45?1:0;}
export function cityPistons(t:number,a:CityArena,near:number,far:number){return cityLayout(a).pistons.filter(p=>p.y+p.r>=near&&p.y-p.r<=far).map(p=>{const phase=((t+p.phase)%p.period)/p.period,state=phase>=.65&&phase<.86?2:phase>=.45&&phase<.65?1:0;const lift=phase<.6?145:phase<.65?145*(.65-phase)/.05:phase<.86?0:145*(phase-.86)/.14;return{...p,state,lift};});}
