import test from 'node:test';
import assert from 'node:assert/strict';
import {createPresentation} from '../public/labs/matter-zoom/presentation.mjs';

test('presentation keeps both scroll offsets when rerender temporarily empties its content',()=>{
 const oldDocument=globalThis.document,oldWindow=globalThis.window;
 const content={scrollTop:0,scrollLeft:0,insertBefore(node){node.parentNode=this;},set innerHTML(value){this.scrollTop=0;this.scrollLeft=0;}};
 const control={setAttribute(){},focus(){}};
 const toolbar={innerHTML:'',querySelector(){return control;}};
 const dialog={open:false,dataset:{},classList:{toggle(){}},addEventListener(){},showModal(){this.open=true;},close(){this.open=false;},querySelector:s=>s==='.presentation-content'?content:toolbar};
 const home={insertBefore(node){if(node.parentNode===content){content.scrollTop=0;content.scrollLeft=0;}node.parentNode=this;}};
 const node=()=>({parentNode:home,getAnimations:()=>[],before(marker){marker.parentNode=this.parentNode;}});
 let liveNode=node();
 globalThis.document={querySelector:s=>s==='#presentation'?dialog:s==='#app .concept-drawer'?liveNode:null,createComment:()=>({parentNode:null,remove(){this.parentNode=null;}}),body:{classList:{add(){},remove(){}}},documentElement:{},fullscreenEnabled:false};
 globalThis.window={scrollY:40,scrollTo(){}};
 try{
  const presentation=createPresentation(()=>({numberZ:1}));
  presentation.handle('present','concept',control);
  content.scrollTop=420;content.scrollLeft=35;
  presentation.beforeRender();assert.equal(content.scrollTop,0,'moving the only child collapses the scroll range');
  liveNode=node();presentation.afterRender();
  assert.equal(content.scrollTop,420);assert.equal(content.scrollLeft,35);
  content.scrollTop=275;presentation.beforeRender();liveNode=node();presentation.afterRender();assert.equal(content.scrollTop,275);
  presentation.handle('presentation-close','',control);assert.equal(presentation.active,'');
 }finally{globalThis.document=oldDocument;globalThis.window=oldWindow;}
});
