import test from 'node:test';
import assert from 'node:assert/strict';
import {IONS,MOLECULES,SALTS,freshChem,restoreChem,ionState,ionFormula,saltResult,chemistryAction,ionsView,formulasView,glossaryView} from '../public/labs/matter-zoom/chemistry.mjs';
import {freshExplorer,restoreExplorer} from '../public/labs/matter-zoom/exploration.mjs';
const examples=[['Na',11,10,'Na<sup>+</sup>'],['Mg',12,10,'Mg<sup>2+</sup>'],['Al',13,10,'Al<sup>3+</sup>'],['Ca',20,18,'Ca<sup>2+</sup>'],['Cl',17,18,'Cl<sup>−</sup>'],['O',8,10,'O<sup>2−</sup>'],['F',9,10,'F<sup>−</sup>']];
for(const [symbol,p,e,formula] of examples)test(symbol+' electrons, charge, notation and step guard',()=>{
 const s=freshChem();chemistryAction(s,'chem-ion',symbol);chemistryAction(s,'chem-ion-step','2');assert.equal(s.ionStep,0);
 for(let i=0;i<Math.abs(p-e);i++)chemistryAction(s,'chem-electron','');
 chemistryAction(s,'chem-electron','');assert.equal(s.moved,Math.abs(p-e));assert.equal(IONS[symbol].p,p);assert.equal(ionFormula(symbol),formula);
 chemistryAction(s,'chem-ion-step','2');assert.equal(s.ionStep,2);
 chemistryAction(s,'chem-magnitude',String(Math.abs(p-e)));chemistryAction(s,'chem-sign',p>e?'+':'−');assert.equal(chemistryAction(s,'chem-ion-check','').record,'ionNotation');
 assert.match(ionsView(s),new RegExp('전자 '+e+'개'));assert.ok(ionsView(s).includes(formula));
 const restored=restoreChem(JSON.parse(JSON.stringify(s)));assert.equal(restored.moved,Math.abs(p-e));assert.equal(restored.ionStep,2);
});
test('nonrepresentative ion gives feedback without credit',()=>{const s=freshChem();chemistryAction(s,'chem-ion','O');chemistryAction(s,'chem-electron-adjust','1');chemistryAction(s,'chem-electron-adjust','1');chemistryAction(s,'chem-magnitude','1');assert.equal(s.electronCount,9);assert.equal(chemistryAction(s,'chem-ion-check','').record,null);assert.match(s.ionFeedback,/다시/);});
for(const [key,c1,c2,text] of [['nacl',1,1,'NaCl'],['mgcl2',1,2,'MgCl<sub>2</sub>'],['cacl2',1,2,'CaCl<sub>2</sub>'],['na2o',2,1,'Na<sub>2</sub>O'],['mgo',1,1,'MgO'],['al2o3',2,3,'Al<sub>2</sub>O<sub>3</sub>']])test(key+' charge balance and simplest ratio',()=>{
 assert.deepEqual(saltResult(key,c1,c2),{charge:0,balanced:true,simplest:true,formula:text});
 const doubled=saltResult(key,c1*2,c2*2);assert.equal(doubled.balanced,true);assert.equal(doubled.simplest,false);
 const s=freshChem();s.salt=key;s.positive=c1;s.negative=c2;assert.equal(chemistryAction(s,'chem-salt-check','').record,'ionicFormula');s.positive*=2;s.negative*=2;assert.equal(chemistryAction(s,'chem-salt-check','').record,null);assert.match(s.formulaFeedback,/줄일/);
});
test('all molecule builders use actual atom counts and omit one',()=>{
 const expected={water:'H<sub>2</sub>O',hydrogen:'H<sub>2</sub>',oxygen:'O<sub>2</sub>',nitrogen:'N<sub>2</sub>',co2:'CO<sub>2</sub>',ammonia:'NH<sub>3</sub>',methane:'CH<sub>4</sub>'};
 for(const [key,m] of Object.entries(MOLECULES)){const s=freshChem();chemistryAction(s,'chem-molecule',key);for(let i=0;i<m.parts.length;i++)for(let n=1;n<m.parts[i][1];n++)chemistryAction(s,'chem-count','m'+i+':1');assert.equal(chemistryAction(s,'chem-molecule-check','').record,'molecularFormula');assert.ok(s.formulaFeedback.includes(expected[key]));assert.equal(s.formulaStep,2);assert.ok(!formulasView(s).includes('undefined'));}
});
test('old observation records migrate and new learning progress survives reload',()=>{const s=freshExplorer();s.version=5;s.material='water';s.level=4;s.deepest=4;s.records=['structure'];delete s.chem;const restored=restoreExplorer(JSON.stringify(s));assert.equal(restored.level,4);assert.deepEqual(restored.records,['structure']);assert.equal(restored.chem.ion,'Na');restored.drawer='ions';restored.records.push('ionNotation');chemistryAction(restored.chem,'chem-ion','Mg');chemistryAction(restored.chem,'chem-electron-adjust','-1');chemistryAction(restored.chem,'chem-electron-adjust','-1');chemistryAction(restored.chem,'chem-ion-step','2');const again=restoreExplorer(JSON.stringify(restored));assert.equal(again.drawer,'ions');assert.equal(again.chem.electronCount,10);assert.equal(again.chem.moved,2);assert.ok(again.records.includes('ionNotation'));});
test('invalid stored/input state is bounded',()=>{const s=restoreChem({ion:'<script>',moved:999,ionStep:2,magnitude:-1,counts:[100],salt:'constructor'});assert.equal(s.ion,'Na');assert.equal(s.moved,0);assert.equal(s.ionStep,0);assert.deepEqual(s.counts,[1,1]);for(let i=0;i<20;i++)chemistryAction(s,'chem-count','positive:1');assert.equal(s.positive,6);chemistryAction(s,'chem-count','__proto__:1');assert.ok(!ionsView(s).includes('undefined'));assert.ok(glossaryView().includes('원소 기호'));});

const {particleModel,conceptComparison,notationComparison}=await import('../public/labs/matter-zoom/chemistry-models.mjs');
test('particle diagrams contain the exact proton, neutron and electron counts',()=>{
 for(const [symbol,a] of Object.entries(IONS))for(const e of [a.p,a.p-a.charge]){
  const svg=particleModel({symbol,p:a.p,n:a.n,e});
  for(const [type,count] of [['protons',a.p],['neutrons',a.n],['electrons',e]])assert.equal((svg.match(new RegExp('data-particle-kind="'+type+'"','g'))||[]).length,count,symbol+' '+type);
 }
});
test('charge emphasis identifies exactly the net charge without changing the nucleus',()=>{
 for(const [symbol,a] of Object.entries(IONS)){
  const svg=particleModel({symbol,p:a.p,n:a.n,e:a.p-a.charge,focus:'charge'});
  assert.equal((svg.match(/is-emphasized/g)||[]).length,Math.abs(a.charge),symbol);
 }
});
test('formula selections highlight matching atoms and preserve saved progress',()=>{
 const s=freshChem();chemistryAction(s,'chem-atom-focus','H');assert.equal(s.atomFocus,'H');
 const html=formulasView(s);assert.equal((html.match(/model-molecule-atom is-emphasized/g)||[]).length,2);
 chemistryAction(s,'chem-notation-focus','coefficient');assert.equal(restoreChem(s).notationFocus,'coefficient');
 chemistryAction(s,'chem-salt-focus','negative');s.formulaKind='ionic';assert.match(formulasView(s),/염화 이온 하나의 내부/);
 chemistryAction(s,'chem-molecule','co2');assert.equal(s.atomFocus,'');
 const restored=restoreChem({...s,atomFocus:'<script>',modelFocus:'bad',saltFocus:'bad'});assert.equal(restored.atomFocus,'');assert.equal(restored.modelFocus,'all');assert.equal(restored.saltFocus,'positive');
});
test('oxygen comparison distinguishes molecule subscript and ion superscript',()=>{
 const html=conceptComparison();assert.ok(html.includes('O<sub>2</sub>'));assert.ok(html.includes('O<sup>2−</sup>'));assert.match(html,/원자 2개로 된 분자 1개/);assert.match(html,/이온 1개/);
 assert.equal((notationComparison('coefficient').match(/class="water-unit"/g)||[]).length,3);
});

function assertLiveModel(s,e,q){
 const a=IONS[s.ion],html=ionsView(s);
 const cards=[...html.matchAll(/<article class="atom-comparison-card[\s\S]*?<\/article>/g)].map(m=>m[0]);
 assert.equal(cards.length,2);
 for(const [card,electrons] of [[cards[0],a.p],[cards[1],e]]){
  for(const [kind,count] of [['protons',a.p],['neutrons',a.n],['electrons',electrons]])assert.equal((card.match(new RegExp('data-particle-kind="'+kind+'"','g'))||[]).length,count,s.ion+' '+kind);
 }
 assert.equal(ionState(s).e,e);assert.equal(ionState(s).q,q);
 assert.ok(cards[1].includes('<div class="model-formula">'+ionFormula(s.ion,q)+'</div>'));
 assert.ok(html.includes('<dd>'+e+'</dd>'));assert.equal(s.magnitude,Math.abs(q));
}
test('Na charge selection and each added electron update the actual diagram together',()=>{
 const s=freshChem();assertLiveModel(s,11,0);
 chemistryAction(s,'chem-electron-adjust','-1');chemistryAction(s,'chem-ion-step','2');
 for(const q of [1,2,3]){chemistryAction(s,'chem-magnitude',String(q));assertLiveModel(s,11-q,q);}
 for(const [e,q] of [[9,2],[10,1],[11,0],[12,-1]]){chemistryAction(s,'chem-electron-adjust','1');assertLiveModel(s,e,q);}
 chemistryAction(s,'chem-electron-adjust','-1');assertLiveModel(s,11,0);
 chemistryAction(s,'chem-magnitude','3');chemistryAction(s,'chem-sign','−');assertLiveModel(s,14,-3);
 chemistryAction(s,'chem-neutral','');assertLiveModel(s,11,0);
});
test('adding electrons forms oxygen ions without changing either nucleus',()=>{
 const s=freshChem();chemistryAction(s,'chem-ion','O');assertLiveModel(s,8,0);
 chemistryAction(s,'chem-electron-adjust','1');assertLiveModel(s,9,-1);
 chemistryAction(s,'chem-electron-adjust','1');assertLiveModel(s,10,-2);
 chemistryAction(s,'chem-electron-adjust','-1');assertLiveModel(s,9,-1);
});
test('all selectable charges stay synchronized at control limits and after reload',()=>{
 for(const symbol of Object.keys(IONS)){
  const s=freshChem();chemistryAction(s,'chem-ion',symbol);const p=IONS[symbol].p;
  for(const sign of ['+','−'])for(const magnitude of [1,2,3]){
   chemistryAction(s,'chem-sign',sign);chemistryAction(s,'chem-magnitude',String(magnitude));
   const q=(sign==='+'?1:-1)*magnitude;assertLiveModel(s,p-q,q);assertLiveModel(restoreChem(JSON.parse(JSON.stringify(s))),p-q,q);
  }
  for(let i=0;i<10;i++)chemistryAction(s,'chem-electron-adjust','1');assertLiveModel(s,p+3,-3);
  assert.match(ionsView(s),/data-action="chem-electron-adjust" data-value="1"[^>]*disabled/);
  for(let i=0;i<10;i++)chemistryAction(s,'chem-electron-adjust','-1');assertLiveModel(s,p-3,3);
  assert.match(ionsView(s),/data-action="chem-electron-adjust" data-value="-1"[^>]*disabled/);
 }
});
test('legacy ion answers migrate from actual electron movement, removing inconsistent notation',()=>{
 const restored=restoreChem({ion:'Na',moved:1,ionStep:2,sign:'+',magnitude:3});
 assertLiveModel(restored,10,1);assert.equal(restored.ionStep,2);
 const current=restoreChem({...restored,electronCount:13,moved:1,sign:'+',magnitude:1});assertLiveModel(current,13,-2);
});
test('single-screen charge buttons synchronize all models, including neutral',()=>{
 const s=freshChem();
 for(const symbol of Object.keys(IONS)){
  chemistryAction(s,'chem-ion',symbol);
  for(const q of [-3,-2,-1,0,1,2,3]){chemistryAction(s,'chem-charge',String(q));assertLiveModel(s,IONS[symbol].p-q,q);}
 }
 const before=s.electronCount;chemistryAction(s,'chem-charge','9');assert.equal(s.electronCount,before);
});
