// A single authored city route. Seeded supply caches vary by room, not by player.
export type CityArena={version:1|2;length:number;seed:number;combat:boolean;supplies?:2;course?:3|4};
type Strip={start:number;end:number;width:number;offset:number};
type Gate={y:number;offset:number;width:number;amplitude:number;period:number;phase:number};
type Rotor={x:number;y:number;length:number;r:number;period:number;phase:number;arms:number};
type Ball={x:number;y:number;r:number;amplitude:number;period:number;phase:number};
type Wall={x:number;y:number;w:number;depth:number;height:number};
type Piston={x:number;y:number;r:number;period:number;phase:number};
type Fan={start:number;end:number;force:number;phase:number};
type Belt={start:number;end:number;vx:number;vy:number};
type Tile={y:number;row:number;safe:number;period:number;phase:number};
type Bumper={x:number;y:number;r:number};
type Beam={x:number;y:number;w:number;period:number;phase:number};
export type CityLayout={strips:Strip[];gates:Gate[];rotors:Rotor[];balls:Ball[];walls:Wall[];pistons:Piston[];fans:Fan[];belts:Belt[];tiles:Tile[];bumpers:Bumper[];beams:Beam[];gaps:{start:number;end:number}[];checkpoints:number[];boxes:{id:number;x:number;y:number;r:number}[]};
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
export function cityRegion(y:number,arena:CityArena){const reference=y/arena.length*CITY_LENGTH;let i=CITY_REGIONS.length-1;while(i>0&&reference<CITY_REGIONS[i].start)i--;const lesson=(arena.course||0)>=3?[
 ['출발 연습장','먼저 이동하고 낮은 턱을 점프해 보세요'],['기초 조작길','넓은 문을 지나며 방향 전환과 대시 연습'],['풍력 지붕','짧은 틈부터 점프! 바람은 조금씩 강해져요'],['프레스 공장','노란 경고를 보고 피하기 · 전기 장벽은 점프'],['회전 타워','회전봉과 범퍼를 차례로 넘어가세요'],['붕괴 스카이웨이','안전한 발판을 골라 점프를 이어가세요'],['시티 코어','최종 도전 · 배운 조작을 조합해 결승으로!'],
 ][i]:null;return{...CITY_REGIONS[i],...(lesson?{name:lesson[0],hint:lesson[1]}:{}),stage:i,index:i,round:0};}
export function cityLayout(arena:CityArena):CityLayout{
 const key=arena.length+':'+arena.seed+':'+(arena.supplies||1)+':'+(arena.course||2);if(cache.has(key))return cache.get(key)!;
 const scale=arena.length/CITY_LENGTH,Y=(y:number)=>Math.round(y*scale),X=(x:number,y:number)=>center(Y(y))+x;
 const l:CityLayout={strips:[],gates:[],rotors:[],balls:[],walls:[],pistons:[],fans:[],belts:[],tiles:[],bumpers:[],beams:[],gaps:[],checkpoints:[],boxes:[]};
 const strip=(a:number,b:number,w:number,offset=0)=>l.strips.push({start:Y(a),end:Y(b),width:w,offset});
 const wall=(y:number,x:number,w:number,height=72)=>l.walls.push({y:Y(y),x:X(x,y),w,depth:34,height});
 const gate=(y:number,width:number,phase:number,amplitude=175,period=1250)=>l.gates.push({y:Y(y),offset:0,width,phase:phase+arena.seed%17,amplitude,period});
 const rotor=(y:number,x:number,length:number,period:number,arms=1)=>l.rotors.push({y:Y(y),x:X(x,y),length,r:17,period,phase:y*.013+arena.seed%11,arms});
 const gap=(y:number,width:number)=>l.gaps.push({start:Y(y),end:Y(y)+width});
 const ball=(y:number,r:number,period:number,phase:number)=>l.balls.push({y:Y(y),x:X(0,y),r,amplitude:240,period,phase});
 const piston=(y:number,x:number,r:number,phase:number,period=2700)=>l.pistons.push({y:Y(y),x:X(x,y),r,period,phase});
 const bumper=(y:number,x:number,r=34)=>l.bumpers.push({y:Y(y),x:X(x,y),r});
 const beam=(y:number,x:number,w:number,period:number,phase:number)=>l.beams.push({y:Y(y),x:X(x,y),w,period,phase});
 const fan=(a:number,b:number,force:number)=>l.fans.push({start:Y(a),end:Y(b),force,phase:a/700});
 const belt=(a:number,b:number,vx:number,vy=0)=>l.belts.push({start:Y(a),end:Y(b),vx,vy});
 const tiles=(start:number,count:number,phase:number)=>{for(let row=0;row<Math.max(3,Math.round(count*scale));row++)l.tiles.push({y:Y(start)+row*95,row,safe:(row*2+Math.floor(phase))%5,period:3400,phase:phase*1000+row*390});};

 if(arena.course!==3&&arena.course!==4){
 // Existing rooms retain their geometry and supply IDs during deployment.
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
 }else{
 // First fifth: wide stable ground, a bypassable low hurdle, then a slow door.
 // No wind, holes, knockback or timed disappearing ground during practice.
 wall(1050,-170,230,22);wall(2100,150,240,24);
 gate(2850,285,.4,65,2400);wall(3620,-160,280);
 gate(4550,250,1.8,85,2100);

 // Introduce one new demand at a time before combining any of them.
 strip(5470,6450,340,35);fan(5650,6270,-35);gap(6180,60);
 strip(6660,7480,300,-50);gap(7000,70);
 strip(7770,8710,280,55);fan(7870,8550,55);gap(8390,78);
 wall(8890,85,230,26);
 belt(9380,9900,45);piston(9550,-155,52,0,3400);
 beam(10180,-80,300,4000,300);
 belt(10600,11100,-55,10);piston(10810,125,58,400,3200);
 bumper(11440,-120);bumper(11440,140);
 rotor(11900,0,175,1300);ball(12500,34,1300,1.7);
 gate(13000,205,3.2,125,1700);

 if(arena.course===3){
 // Keep the previously published course unchanged for rooms already in play.
 wall(13800,125,320);rotor(14300,-45,200,-1150);
 strip(14680,15250,400,15);rotor(15000,15,175,1050);
 beam(15600,0,420,3500,800);
 rotor(16150,-75,200,-950,2);bumper(16620,135,38);
 gate(17000,175,5.1,145,1450);

 tiles(17680,5,.2);gap(18600,86);strip(18840,19700,260,-65);
 fan(19020,19590,75);gap(19450,88);tiles(19980,6,1.8);
 gate(21060,160,2.7,155,1350);gap(21630,92);

 // Final fifth: faster timings, tighter lanes, alternating combinations.
 // Recovery checkpoints separate encounters; the finish itself stays clear.
 belt(22200,22900,-75,-25);piston(22420,125,72,250);
 piston(22750,-120,72,1500);beam(23200,0,500,2900,400);
 bumper(23500,-170,39);bumper(23500,170,39);
 ball(23800,42,850,0);gate(24250,140,5.7,178,1120);
 rotor(24800,0,225,-800,2);strip(25150,25900,230,0);
 gap(25400,98);gap(25800,102);wall(26200,-140,300,28);
 l.checkpoints=[100,700,1600,2530,3250,4150,5250,6500,7600,9020,9940,10450,11200,12250,12750,13450,14700,15340,16400,17200,18400,19750,20800,21850,23000,23950,24550,25150,26000,26400].map(y=>y===100?100:Y(y));
 }else{
 // Tower: the practice half is over. Narrow decks prevent walking around
 // the rotors; alternating walls require deliberate changes of direction.
 wall(13650,130,390);
 strip(14000,14800,310,-15);rotor(14360,-15,185,-800,2);
 beam(14980,0,580,2800,600);
 strip(15200,16080,280,35);
 rotor(15460,35,175,760);rotor(15880,35,175,-720);
 gate(16450,140,5.1,145,1050);
 wall(16820,-140,390);bumper(16820,175,38);
 beam(17050,0,580,2500,300);

 // Skyway: choose a safe tile lane, then steer a much narrower wind bridge.
 // Gaps stay jumpable at low charge; difficulty comes from timing/steering.
 strip(17500,18380,340);tiles(17680,6,.2);gap(18600,100);
 strip(18840,19760,190,-85);fan(18960,19630,100);gap(19450,102);
 strip(19900,20800,300,40);tiles(20020,7,1.8);
 gate(21100,125,2.7,145,900);gap(21600,104);

 // Core: three continuous encounters, with recovery only between them.
 // (1) The belt feeds alternating presses and a double rotor on a narrow deck.
 strip(22100,23150,300);belt(22200,22800,-55,-24);
 piston(22400,-65,64,0,2400);piston(22730,65,64,1200,2400);
 rotor(23000,0,190,-630,2);
 // (2) A full-width beam leads into a small moving opening and paired bumpers.
 strip(23500,24300,200);beam(23700,0,580,2300,400);
 gate(24050,110,2.2,55,950);bumper(24240,-70,32);bumper(24240,70,32);
 // (3) A left/right slalom, electric hurdle and two jumps on a 170-wide bridge.
 wall(24680,-115,390);wall(25020,115,390);
 beam(25280,0,580,2300,1100);strip(25400,26350,170);
 gap(25600,104);gap(26030,104);
 l.checkpoints=[100,700,1600,2530,3250,4150,5250,6500,7600,9020,9940,10450,11200,12250,12750,13450,15080,17200,18380,19800,20860,21880,23400,24500,26400].map(y=>y===100?100:Y(y));
 }
 }
 // Cache before scattering so layout queries remain bounded and deterministic.
 cache.set(key,l);if(cache.size>24)cache.delete(cache.keys().next().value!);
 const rng=random(arena.seed^0x5ca1ab);let cursor=300;
 while(cursor<arena.length-280){
  for(let attempt=0;attempt<(arena.supplies===2?16:9);attempt++){
   const y=cursor+attempt*19,road=track(l,y),x=road.center+(rng()-.5)*Math.max(0,road.width-150);
   const unsafe=l.gaps.some(g=>y>g.start-105&&y<g.end+105)||l.gates.some(g=>Math.abs(g.y-y)<130)||l.walls.some(w=>Math.abs(w.y-y)<120&&Math.abs(w.x-x)<w.w/2+85)||l.rotors.some(s=>Math.hypot(s.x-x,s.y-y)<s.length+95)||l.pistons.some(p=>Math.hypot(p.x-x,p.y-y)<p.r+95)||l.tiles.some(t=>y>t.y-85&&y<t.y+160)||l.fans.some(f=>y>f.start-80&&y<f.end+80)||l.belts.some(b=>y>b.start-60&&y<b.end+60);
   const newHazard=l.beams.some(b=>Math.abs(y-b.y)<125)||l.bumpers.some(b=>Math.hypot(x-b.x,y-b.y)<b.r+95);
   if(!unsafe&&!newHazard&&y<arena.length-220&&(!l.boxes.length||Math.hypot(x-l.boxes.at(-1)!.x,y-l.boxes.at(-1)!.y)>135)){l.boxes.push({id:l.boxes.length,x,y,r:27});break;}
  }
  cursor+=arena.supplies===2?170+rng()*180:300+rng()*340;
 }
 // A failed wind crossing always has a refill at its preceding safe checkpoint.
 // Append IDs so existing rooms keep the identity of every scattered box.
 for(const wind of [...l.fans,...(arena.course===4?l.belts:[])]){const y=l.checkpoints.filter(cp=>cp<wind.start).at(-1)!,x=track(l,y).center;
  if(!l.boxes.some(b=>Math.hypot(b.x-x,b.y-y)<100))l.boxes.push({id:l.boxes.length,x,y,r:27});
 }
 return l;
}
export function cityTrack(y:number,a:CityArena){return track(cityLayout(a),y);}
export function cityTileDanger(x:number,y:number,t:number,a:CityArena){const row=cityLayout(a).tiles.find(r=>y>=r.y&&y<r.y+95);if(!row)return 0;const road=cityTrack(y,a),col=Math.max(0,Math.min(4,Math.floor((x-road.center+road.width/2)/(road.width/5))));if(col===row.safe||col===(row.safe+1)%5)return 0;const phase=((t+row.phase+col*260)%row.period)/row.period;return phase>.68?2:phase>.45?1:0;}
export function cityPistons(t:number,a:CityArena,near:number,far:number){return cityLayout(a).pistons.filter(p=>p.y+p.r>=near&&p.y-p.r<=far).map(p=>{const phase=((t+p.phase)%p.period)/p.period,state=phase>=.65&&phase<.86?2:phase>=.45&&phase<.65?1:0;const lift=phase<.6?145:phase<.65?145*(.65-phase)/.05:phase<.86?0:145*(phase-.86)/.14;return{...p,state,lift};});}
// The warning, activation and collider all use this same room clock.
export function cityBeams(t:number,a:CityArena,near:number,far:number){return cityLayout(a).beams.filter(b=>b.y+30>=near&&b.y-30<=far).map(b=>{const phase=((t+b.phase)%b.period)/b.period;return{...b,state:phase>=.7&&phase<.9?2:phase>=.4&&phase<.7?1:0};});}
