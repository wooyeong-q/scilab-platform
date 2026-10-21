// Native multi-column layout paginates documents without a scrollable reading area.
// Moving between pages keeps the original controls and their draft state intact.
let currentTitle='',page=0,frame=0;
export function fitDialog(dialog,content){
 const body=content.querySelector('.modal-body'),flow=content.querySelector('.modal-flow');
 if(!body?.getBoundingClientRect||!flow)return;
 const title=content.querySelector('#dialog-title')?.textContent;
 if(title!==currentTitle){page=0;currentTitle=title;}
 if(dialog.classList.contains('curriculum-dialog')){flow.querySelector('.preview-navigation')?.remove();const intro=flow.querySelector(':scope > .story-text');if(intro)flow.append(intro);}
 const footer=flow.querySelector('.puzzle-footer');
 if(footer)content.querySelector('.modal-dock').append(footer);
 const nav=content.querySelector('.page-controls');
 const refresh=()=>{
  if(!dialog.open||!body.isConnected)return;
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
 nav.onclick=e=>{if(e.target.closest('[data-page-prev]'))page--;else if(e.target.closest('[data-page-next]'))page++;else return;refresh();};
 // Do not let wheel/trackpad or a focused off-page control move the document.
 body.addEventListener('wheel',e=>e.preventDefault(),{passive:false});
 body.addEventListener('keydown',e=>{if(e.key==='PageDown'||e.key==='PageUp'){e.preventDefault();const button=nav.querySelector(e.key==='PageDown'?'[data-page-next]':'[data-page-prev]');if(!button.disabled)button.click();}});
 body.addEventListener('focusin',e=>{const r=e.target.getBoundingClientRect(),b=body.getBoundingClientRect();if(r.left<b.left||r.right>b.right){page=Math.max(0,Math.round(body.scrollLeft/(body.clientWidth+24)));refresh();}});
 flow.querySelectorAll('img').forEach(img=>img.addEventListener('load',schedule,{once:true}));
 const observer=new ResizeObserver(schedule);observer.observe(body);
 dialog.addEventListener('close',()=>observer.disconnect(),{once:true});
 // A subsequent render replaces this body while the dialog remains open.
 const previous=dialog._pageObserver;previous?.disconnect();dialog._pageObserver=observer;
 refresh();schedule();
}
