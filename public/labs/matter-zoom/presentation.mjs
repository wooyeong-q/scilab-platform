// Move the live view, rather than copying it: selections and playback stay live.
import {ELEMENTS} from './data.mjs';

export function createPresentation(getState) {
  const dialog=document.querySelector('#presentation');
  const content=dialog.querySelector('.presentation-content');
  const toolbar=dialog.querySelector('.presentation-toolbar');
  const targets={observation:['.observation-panel','.model-caption'],table:['.table-axis-choices','.periodic-panel'],feature:['.element-feature'],concept:['.concept-drawer']};
  const titles={observation:'확대 관찰',table:'주기율표',feature:'원소 특징 관찰',concept:'함께 비교하기'};
  let scope='',moved=[],opener=null,ownsFullscreen=false,fullscreenPending=false,large=false,scrollY=0;
  const button=(label,action,value='')=>`<button data-action="${action}" data-value="${value}">${label}</button>`;
  function move(node,parent,before=null){
    const times=node.getAnimations({subtree:true}).map(a=>({target:a.effect?.target,name:a.animationName,time:a.currentTime}));
    parent.insertBefore(node,before);
    for(const saved of times){
      const a=saved.target?.getAnimations().find(item=>item.animationName===saved.name);
      if(a&&typeof saved.time==='number')a.currentTime=saved.time;
    }
  }
  function restore(){
    for(const {node,marker} of moved){if(marker.parentNode){move(node,marker.parentNode,marker);marker.remove();}}
    moved=[];
  }
  function controls(){
    const {numberZ}=getState();
    toolbar.innerHTML=`<strong id="presentation-title">${titles[scope]}</strong><div class="presentation-navigation">${scope==='feature'?`<label class="sr-only" for="presentation-element">볼 원소 선택</label><select id="presentation-element" data-change="presentation-element">${ELEMENTS.map(a=>`<option value="${a.z}" ${a.z===numberZ?'selected':''}>${a.z} · ${a.symbol} ${a.name}</option>`).join('')}</select>${button('주기율표 보기','present','table')}`:scope==='table'?button('선택 원소 모션 보기','present','feature'):''}</div><div class="presentation-actions">${button(large?'글씨 기본':'글씨 더 크게','presentation-type')}${document.fullscreenEnabled?button('전체 화면','presentation-fullscreen'):''}${button('✕ 닫기','presentation-close')}</div>`;
    toolbar.querySelector('[data-action="presentation-type"]').setAttribute('aria-pressed',String(large));
  }
  function attach(){
    if(!scope)return;
    const nodes=targets[scope].map(selector=>document.querySelector('#app '+selector)).filter(Boolean);
    if(!nodes.length){close();return;}
    content.innerHTML='';
    for(const node of nodes){const marker=document.createComment('presentation return');node.before(marker);moved.push({node,marker});move(node,content);}
    dialog.dataset.scope=scope;dialog.classList.toggle('large-type',large);controls();
  }
  async function fullscreen(){
    if(!fullscreenPending&&!document.fullscreenElement&&document.documentElement.requestFullscreen){
      fullscreenPending=true;
      try{
        await document.documentElement.requestFullscreen();
        if(scope)ownsFullscreen=true;
        else if(document.fullscreenElement)await document.exitFullscreen();
      }catch{/* The dialog still fills the available viewport. */}
      finally{fullscreenPending=false;}
    }
  }
  function open(next,trigger){
    if(!targets[next])return;
    if(!scope){opener=trigger;scrollY=window.scrollY;document.body.classList.add('presenting');}
    restore();scope=next;
    if(!dialog.open)dialog.showModal();
    attach();
    if(!scope)return;
    toolbar.querySelector('[data-action="presentation-close"]').focus({preventScroll:true});
    content.scrollTop=0;
    fullscreen();
  }
  function close(){
    if(!scope)return;
    const oldScope=scope;restore();scope='';dialog.close();document.body.classList.remove('presenting');
    if(ownsFullscreen&&document.fullscreenElement)document.exitFullscreen().catch(()=>{});
    ownsFullscreen=false;
    window.scrollTo({top:scrollY,behavior:'instant'});
    const back=opener?.isConnected?opener:document.querySelector(`[data-action="present"][data-value="${oldScope}"]`);
    back?.focus({preventScroll:true});
  }
  dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
  dialog.addEventListener('keydown',e=>{
    if(e.key!=='Tab')return;
    const items=[...dialog.querySelectorAll('button:not([disabled]),select,input:not([disabled]),a[href],[tabindex]:not([tabindex="-1"])')].filter(el=>el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden');
    const first=items[0],last=items.at(-1);
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
  });
  return {
    get active(){return scope;},
    beforeRender:restore,
    afterRender:attach,
    handle(action,value,trigger){
      if(action==='present')open(value,trigger);
      else if(action==='presentation-close')close();
      else if(action==='presentation-fullscreen')fullscreen();
      else if(action==='presentation-type'){large=!large;dialog.classList.toggle('large-type',large);controls();toolbar.querySelector('[data-action="presentation-type"]').focus();}
      else return false;
      return true;
    },
  };
}
