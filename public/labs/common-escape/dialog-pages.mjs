// Native multi-column layout paginates documents without a scrollable reading area.
// Moving between pages keeps the original controls and their draft state intact.
let currentTitle='',page=0,frame=0;
export function fitDialog(dialog,content){
 const body=content.querySelector('.modal-body'),flow=content.querySelector('.modal-flow');
 if(!body?.getBoundingClientRect||!flow)return;
 dialog._pageCleanup?.();
 if(dialog.matches('.curriculum-dialog,.lock-dialog')){
  // A puzzle is one workspace: its clues never move to another page.
  dialog.classList.add('puzzle-screen');
  flow.querySelector('.preview-navigation')?.remove();
  const clues=flow.querySelector('.puzzle-clues');
  if(clues){
   const reference=flow.querySelector('.puzzle-task > small');
   if(reference){reference.classList.add('puzzle-reference');clues.append(reference);}
   const intro=flow.querySelector(':scope > .story-text');
   if(intro){intro.classList.add('puzzle-context');clues.append(intro);}
   const hints=flow.querySelector('.puzzle-hints');
   if(hints){
    // Optional help opens over the board without pushing the puzzle offscreen.
    hints.classList.add('puzzle-help');hints.setAttribute('popover','auto');
    hints.setAttribute('aria-label','확인한 힌트');
    const close=document.createElement('button');close.type='button';close.className='ghost-button';close.textContent='문제로 돌아가기';
    close.onclick=()=>hints.hidePopover();hints.append(close);content.append(hints);
   }
  }
  const footer=flow.querySelector('.puzzle-footer');
  if(footer){
   const instruction=flow.querySelector('.puzzle-instruction');
   const feedback=footer.querySelector('#puzzle-feedback');
   if(instruction){if(feedback.textContent==='자료를 서로 설명하며 장치를 맞춰 보세요.'){feedback.textContent=instruction.textContent;feedback.classList.add('default-feedback');}instruction.remove();}
   content.querySelector('.modal-dock').append(footer);
   const actions=content.querySelector('.modal-actions');
   if(actions){footer.querySelector('div').append(...actions.children);actions.remove();}
  }
  content.querySelector('.page-controls').hidden=true;
  return;
 }
 const title=content.querySelector('#dialog-title')?.textContent;
 if(title!==currentTitle){page=0;currentTitle=title;}
 const footer=flow.querySelector('.puzzle-footer');
 if(footer)content.querySelector('.modal-dock').append(footer);
 const nav=content.querySelector('.page-controls');
 const canCompact=!dialog.matches('.curriculum-dialog,.lock-dialog');
 let sizePending=true;
 const refresh=()=>{
  if(!dialog.open||!body.isConnected)return;
  if(sizePending){
   sizePending=false;
   // Short inspections should frame their text, not an empty screen.
   // Measure at a comfortable reading width before falling back to pages.
   if(canCompact){
    dialog.classList.add('compact-dialog');
    flow.style.columnWidth='';flow.style.height='';nav.hidden=true;
   }
  }
  if(dialog.classList.contains('compact-dialog')){
   if(dialog.scrollHeight<=dialog.clientHeight+1){
    page=0;body.scrollLeft=0;
    nav.querySelector('[data-page-label]').textContent='1 / 1';
    nav.querySelector('[data-page-prev]').disabled=true;
    nav.querySelector('[data-page-next]').disabled=true;
    return;
   }
   dialog.classList.remove('compact-dialog');
  }
  const width=body.clientWidth;
  flow.style.columnWidth=width+'px';flow.style.height=body.clientHeight+'px';
  // Imported lessons may contain much longer records than the sample.
  // Keep the selectable card compact and retain its full text on reading pages.
  flow.querySelectorAll('.puzzle-card,.slot-target,.circuit-lamp,.broadcast-line').forEach(card=>{
   if(card.scrollHeight<=body.clientHeight-8||card.dataset.pagedRecord)return;
   const text=card.querySelector('.material-text')||card.querySelector(':scope > span:nth-child(2)');
   if(!text)return;
   card.dataset.pagedRecord='true';
   const section=document.createElement('section');section.className='long-record';
   const heading=document.createElement('h3');heading.textContent=card.querySelector('strong,small')?.textContent||'기록 전문';
   const note=document.createElement('small');note.textContent='긴 기록 · 뒤쪽 자료 페이지에서 전문 확인';
   text.replaceWith(note);section.append(heading,text);
   const image=card.querySelector('.material-image');if(image)section.append(image);
   flow.append(section);
  });
  const count=Math.max(1,Math.ceil((flow.scrollWidth-1)/(width+24)));
  page=Math.min(page,count-1);
  body.scrollLeft=page*(width+24);
  nav.querySelector('[data-page-label]').textContent=`${page+1} / ${count}`;
  nav.querySelector('[data-page-prev]').disabled=page===0;
  nav.querySelector('[data-page-next]').disabled=page===count-1;
  nav.hidden=count===1;
 };
 const schedule=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(refresh);};
 const resize=()=>{sizePending=true;schedule();};
 nav.onclick=e=>{if(e.target.closest('[data-page-prev]'))page--;else if(e.target.closest('[data-page-next]'))page++;else return;refresh();};
 // Do not let wheel/trackpad or a focused off-page control move the document.
 body.addEventListener('wheel',e=>e.preventDefault(),{passive:false});
 body.addEventListener('keydown',e=>{if(e.key==='PageDown'||e.key==='PageUp'){e.preventDefault();const button=nav.querySelector(e.key==='PageDown'?'[data-page-next]':'[data-page-prev]');if(!button.disabled)button.click();}});
 body.addEventListener('focusin',e=>{const r=e.target.getBoundingClientRect(),b=body.getBoundingClientRect();if(r.left<b.left||r.right>b.right){page=Math.max(0,Math.round(body.scrollLeft/(body.clientWidth+24)));refresh();}});
 flow.querySelectorAll('img').forEach(img=>img.addEventListener('load',resize,{once:true}));
 const observer=new ResizeObserver(schedule);observer.observe(body);
 window.addEventListener('resize',resize);
 const cleanup=()=>{observer.disconnect();window.removeEventListener('resize',resize);dialog.removeEventListener('close',cleanup);};
 dialog.addEventListener('close',cleanup,{once:true});
 // A subsequent render replaces this body while the dialog remains open.
 dialog._pageCleanup?.();dialog._pageCleanup=cleanup;
 refresh();schedule();
}
