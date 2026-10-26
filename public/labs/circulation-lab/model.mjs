// Blood-flow rules shared by the lesson, maze editor and solver.
export const PARTS = [
  {id:'rv',name:'우심실',short:'우심실',color:'blue',role:'허파로 내보내는 방',text:'우심방에서 받은 혈액을 폐동맥으로 내보냅니다.',why:'심실은 혈액을 심장 밖으로 내보내는 방이에요.'},
  {id:'pa',name:'폐동맥',short:'폐동맥',color:'blue',role:'심장 → 폐',text:'우심실에서 나온 혈액이 폐로 이동하는 혈관입니다.',why:'동맥은 심장에서 나가는 혈관이에요. 산소가 적어도 동맥입니다.'},
  {id:'lung',name:'폐의 모세혈관',short:'폐',color:'exchange',role:'산소를 받고, 이산화 탄소를 내보내요',text:'폐의 모세혈관을 지나는 동안 혈액은 산소를 받고 이산화 탄소를 내보냅니다.',why:'혈액과 폐 사이에서 기체가 교환돼요.'},
  {id:'pv',name:'폐정맥',short:'폐정맥',color:'red',role:'폐 → 심장',text:'폐에서 산소를 받은 혈액이 좌심방으로 돌아오는 혈관입니다.',why:'정맥은 심장으로 들어오는 혈관이에요. 산소가 많아도 정맥입니다.'},
  {id:'la',name:'좌심방',short:'좌심방',color:'red',role:'폐에서 돌아온 혈액을 받아요',text:'폐정맥에서 들어온 혈액을 받아 좌심실로 보냅니다.',why:'심방은 심장으로 들어오는 혈액을 받는 방이에요.'},
  {id:'lv',name:'좌심실',short:'좌심실',color:'red',role:'온몸으로 내보내는 방',text:'혈액을 대동맥으로 내보내 온몸으로 보냅니다. 우심실보다 벽이 두껍습니다.',why:'온몸까지 혈액을 보내려면 더 큰 힘이 필요해요.'},
  {id:'ao',name:'대동맥',short:'대동맥',color:'red',role:'심장 → 온몸',text:'좌심실에서 나온 혈액이 온몸으로 이동하는 큰 동맥입니다.',why:'혈액은 온몸의 모세혈관으로 이동해요.'},
  {id:'body',name:'온몸의 모세혈관',short:'온몸',color:'exchange',role:'세포에 산소와 영양소를 전달해요',text:'혈액은 세포에 산소와 영양소를 전달하고, 세포에서 생긴 이산화 탄소 등을 받습니다.',why:'모세혈관의 얇은 벽을 사이에 두고 물질이 이동해요.'},
  {id:'vc',name:'대정맥',short:'대정맥',color:'blue',role:'온몸 → 심장',text:'온몸을 지난 혈액이 우심방으로 돌아오는 큰 정맥입니다.',why:'심장으로 돌아온 뒤 다시 폐로 이동할 준비를 해요.'},
  {id:'ra',name:'우심방',short:'우심방',color:'blue',role:'온몸에서 돌아온 혈액을 받아요',text:'대정맥에서 들어온 혈액을 받아 우심실로 보냅니다.',why:'우심방 다음은 우심실이에요. 좌심방으로 바로 이동하지 않아요.'},
];
export const CYCLE = PARTS.map(p=>p.id);
export const BY_ID = Object.fromEntries(PARTS.map(p=>[p.id,p]));
export const ROUTES = {
  all:{name:'전체 순환',ids:[...CYCLE,'rv']},
  pulmonary:{name:'허파순환',ids:['rv','pa','lung','pv','la']},
  systemic:{name:'온몸순환',ids:['lv','ao','body','vc','ra']},
};
export const nextPart = id => CYCLE[(CYCLE.indexOf(id)+1)%CYCLE.length];
export function neighbors(i,n=6){
  const a=[]; if(i>=n)a.push(i-n);if(i%n<n-1)a.push(i+1);if(i<n*(n-1))a.push(i+n);if(i%n>0)a.push(i-1);return a;
}
const shuffled = (a,rng=Math.random) => {const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[b[i],b[j]]=[b[j],b[i]];}return b;};
export function validateBoard(board){
  return !!board && board.v===1 && board.n===6 && CYCLE.includes(board.start) && Array.isArray(board.cells) && board.cells.length===36 && board.cells.every(c=>CYCLE.includes(c)) && board.cells[0]===board.start;
}
export function solveMaze(board,limit=2){
  if(!validateBoard(board))return {count:0,path:[],limited:false};
  let count=0, path=[], visits=0, limited=false;
  const used=new Set([0]),current=[0],goal=35;
  function walk(i){
    if(count>=limit || limited)return;
    if(++visits>150000){limited=true;return;}
    if(i===goal){count++;if(count===1)path=[...current];return;}
    const required=nextPart(board.cells[i]);
    for(const j of neighbors(i))if(!used.has(j)&&board.cells[j]===required){
      used.add(j);current.push(j);walk(j);current.pop();used.delete(j);
    }
  }
  walk(0);return {count,path,limited};
}
export function createPath(rng=Math.random,length=21){
  if(![11,21,31].includes(length))throw Error('한 바퀴 이상인 경로를 사용해 주세요.');
  for(let attempt=0;attempt<30;attempt++){
    const used=new Set([0]),path=[0];let budget=120000;
    function walk(i){
      if(--budget<0)return false;
      const left=length-path.length,dist=10-Math.floor(i/6)-i%6;
      if(dist>left || (left-dist)%2)return false;
      if(i===35)return path.length===length;
      if(!left)return false;
      for(const j of shuffled(neighbors(i),rng))if(!used.has(j)){
        used.add(j);path.push(j);if(walk(j))return true;path.pop();used.delete(j);
      }
      return false;
    }
    if(walk(0))return path;
  }
  // Deterministic fallbacks preserve the requested number of complete circuits.
  return length===11?[0,1,2,3,4,5,11,17,23,29,35]:length===31?[0,1,2,3,4,5,11,10,9,8,7,6,12,18,24,30,31,25,19,13,14,15,16,17,23,22,21,27,28,29,35]:[0,1,2,3,4,5,11,10,9,8,7,6,12,18,19,20,21,22,23,29,35];
}
export function fillPath(path,start='rv',rng=Math.random){
  if(!CYCLE.includes(start)||!Array.isArray(path)||path[0]!==0||path.at(-1)!==35||![11,21,31].includes(path.length)||new Set(path).size!==path.length||path.some((p,i)=>!Number.isInteger(p)||p<0||p>35||(i&&!neighbors(path[i-1]).includes(p))))throw Error('시작에서 끝까지 11·21·31칸을 상하좌우로 연결해 주세요.');
  const cells=Array.from({length:36},()=>CYCLE[Math.floor(rng()*10)]);
  const offset=CYCLE.indexOf(start);path.forEach((p,i)=>{cells[p]=CYCLE[(offset+i)%10];});
  return {v:1,n:6,start,cells};
}
export function generateMaze(start='rv',rng=Math.random,path=null){
  for(let layout=0;layout<(path?1:25);layout++){
    const route=path||createPath(rng);
    for(let trial=0;trial<120;trial++){
      const board=fillPath(route,start,rng),solution=solveMaze(board);
      if(solution.count===1&&!solution.limited)return {board,path:route};
    }
  }
  throw Error('이 경로는 다른 정답길도 생겨요. 경로를 조금 바꿔 주세요.');
}
export function encodeMaze(board){
  if(!validateBoard(board))throw Error('미로 형식이 올바르지 않아요.');
  const packed={v:1,n:6,s:CYCLE.indexOf(board.start),c:board.cells.map(c=>CYCLE.indexOf(c))};
  return btoa(JSON.stringify(packed)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
export function decodeMaze(code){
  if(typeof code!=='string'||code.length>1800||!code.length||!/^[A-Za-z0-9_-]+$/.test(code))throw Error('미로 링크가 올바르지 않아요.');
  try{
    const p=JSON.parse(atob(code.replace(/-/g,'+').replace(/_/g,'/')));
    if(p.v!==1||p.n!==6||!Number.isInteger(p.s)||p.s<0||p.s>9||!Array.isArray(p.c)||p.c.length!==36||p.c.some(v=>!Number.isInteger(v)||v<0||v>9))throw Error();
    const board={v:1,n:6,start:CYCLE[p.s],cells:p.c.map(c=>CYCLE[c])};
    if(!validateBoard(board))throw Error();
    const s=solveMaze(board);if(s.count!==1||s.limited)throw Error();
    return board;
  }catch{throw Error('완성된 정답길이 하나인 미로 링크인지 확인해 주세요.');}
}
export function checkStep(board,path,index){
  if(!validateBoard(board)||!Array.isArray(path)||!path.length||!Number.isInteger(index)||index<0||index>35)return {ok:false,reason:'invalid'};
  const at=path.indexOf(index);if(at!==-1)return {ok:true,path:path.slice(0,at+1),back:true};
  if(!neighbors(path.at(-1)).includes(index))return {ok:false,reason:'adjacent'};
  if(board.cells[index]!==nextPart(board.cells[path.at(-1)]))return {ok:false,reason:'order'};
  return {ok:true,path:[...path,index],complete:index===35};
}
