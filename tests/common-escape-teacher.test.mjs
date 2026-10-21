import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Author} from '../public/labs/common-escape/author.mjs';
import {SAMPLE} from '../public/labs/common-escape/sample.mjs';
import {fresh,progress,goal} from '../public/labs/common-escape/engine.mjs';
test('teacher details render and force action sends the displayed team, puzzle and revision only after confirmation',async()=>{
 globalThis.localStorage={getItem(){return null;}};
 let confirmed=false,requests=[];
 globalThis.window={confirm(){return confirmed;}};
 const root={innerHTML:'',querySelectorAll(){return[];},querySelector(){return null;}};
 const author=new Author(root,{home(){},preview(){}});author.active=true;
 const state=fresh();author.view={title:'관제 검사',code:'ABCDEFGH',status:'playing',lesson:SAMPLE,teams:[{number:2,revision:5,state,progress:progress(state),goal:goal(state),members:[]}]};
 author.api=async(method,data)=>{requests.push({method,data});return author.view;};
 await author.action('detail','2');assert.match(root.innerHTML,/현재 퍼즐 강제 통과/);assert.match(root.innerHTML,/마지막 진행/);
 await author.action('force','2');assert.equal(requests.length,0);
 confirmed=true;await author.action('force','2');assert.deepEqual(requests[0],{method:'POST',data:{action:'force',team:2,puzzle:'P1',revision:5}});
});
