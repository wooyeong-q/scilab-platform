// One compositor-only halo: no layout reads, no network, and no intercepted clicks.
const toggle=document.getElementById('pointer-toggle');
const fine=matchMedia('(any-pointer:fine)');
const halo=document.createElement('div');halo.className='pointer-halo';halo.setAttribute('aria-hidden','true');document.body.append(halo);
let enabled=true,frame=0,x=0,y=0,visible=false,clickTimer=0;
try{enabled=localStorage.getItem('circulation-pointer')!=='off';}catch{}
function apply(){document.documentElement.classList.toggle('pointer-emphasis',enabled&&fine.matches);toggle.setAttribute('aria-pressed',String(enabled));toggle.textContent=enabled?'✓ 포인터 강조':'포인터 강조';if(!enabled)hide();}
function hide(){visible=false;halo.classList.remove('visible','clicked');}
toggle.addEventListener('click',()=>{enabled=!enabled;try{localStorage.setItem('circulation-pointer',enabled?'on':'off');}catch{}apply();});
fine.addEventListener('change',apply);
document.addEventListener('pointermove',e=>{if(!enabled||e.pointerType==='touch'||!fine.matches){hide();return;}x=e.clientX;y=e.clientY;visible=true;if(frame)return;frame=requestAnimationFrame(()=>{frame=0;halo.style.transform=`translate3d(${x-22}px,${y-22}px,0)`;halo.classList.toggle('visible',visible);});},{passive:true});
document.addEventListener('pointerdown',e=>{if(!enabled||e.pointerType==='touch'||!fine.matches)return;halo.classList.remove('clicked');requestAnimationFrame(()=>halo.classList.add('clicked'));clearTimeout(clickTimer);clickTimer=setTimeout(()=>halo.classList.remove('clicked'),500);},{passive:true});
halo.addEventListener('animationend',()=>halo.classList.remove('clicked'));
document.addEventListener('pointerout',e=>{if(!e.relatedTarget)hide();},{passive:true});
document.addEventListener('keydown',hide,{passive:true});window.addEventListener('blur',hide);document.addEventListener('visibilitychange',()=>{if(document.hidden)hide();});
apply();
