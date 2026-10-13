import test from 'node:test';
import assert from 'node:assert/strict';
import {IONS,MOLECULES,SALTS,freshChem,restoreChem,ionFormula,saltResult,chemistryAction,ionsView,formulasView,glossaryView} from '../public/labs/matter-zoom/chemistry.mjs';
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
test('incorrect ion notation gives feedback without credit',()=>{const s=freshChem();chemistryAction(s,'chem-ion','O');chemistryAction(s,'chem-electron','');chemistryAction(s,'chem-electron','');assert.equal(chemistryAction(s,'chem-ion-check','').record,null);assert.match(s.ionFeedback,/다시/);});
for(const [key,c1,c2,text] of [['nacl',1,1,'NaCl'],['mgcl2',1,2,'MgCl<sub>2</sub>'],['cacl2',1,2,'CaCl<sub>2</sub>'],['na2o',2,1,'Na<sub>2</sub>O'],['mgo',1,1,'MgO'],['al2o3',2,3,'Al<sub>2</sub>O<sub>3</sub>']])test(key+' charge balance and simplest ratio',()=>{
 assert.deepEqual(saltResult(key,c1,c2),{charge:0,balanced:true,simplest:true,formula:text});
 const doubled=saltResult(key,c1*2,c2*2);assert.equal(doubled.balanced,true);assert.equal(doubled.simplest,false);
 const s=freshChem();s.salt=key;s.positive=c1;s.negative=c2;assert.equal(chemistryAction(s,'chem-salt-check','').record,'ionicFormula');s.positive*=2;s.negative*=2;assert.equal(chemistryAction(s,'chem-salt-check','').record,null);assert.match(s.formulaFeedback,/줄일/);
});
test('all molecule builders use actual atom counts and omit one',()=>{
 const expected={water:'H<sub>2</sub>O',hydrogen:'H<sub>2</sub>',oxygen:'O<sub>2</sub>',nitrogen:'N<sub>2</sub>',co2:'CO<sub>2</sub>',ammonia:'NH<sub>3</sub>',methane:'CH<sub>4</sub>'};
 for(const [key,m] of Object.entries(MOLECULES)){const s=freshChem();chemistryAction(s,'chem-molecule',key);for(let i=0;i<m.parts.length;i++)for(let n=1;n<m.parts[i][1];n++)chemistryAction(s,'chem-count','m'+i+':1');assert.equal(chemistryAction(s,'chem-molecule-check','').record,'molecularFormula');assert.ok(s.formulaFeedback.includes(expected[key]));assert.equal(s.formulaStep,2);assert.ok(!formulasView(s).includes('undefined'));}
});
test('old observation records migrate and new learning progress survives reload',()=>{const s=freshExplorer();s.version=5;s.material='water';s.level=4;s.deepest=4;s.records=['structure'];delete s.chem;const restored=restoreExplorer(JSON.stringify(s));assert.equal(restored.level,4);assert.deepEqual(restored.records,['structure']);assert.equal(restored.chem.ion,'Na');restored.drawer='ions';restored.records.push('ionNotation');restored.chem.ion='Mg';restored.chem.moved=2;restored.chem.ionStep=2;const again=restoreExplorer(JSON.stringify(restored));assert.equal(again.drawer,'ions');assert.equal(again.chem.moved,2);assert.ok(again.records.includes('ionNotation'));});
test('invalid stored/input state is bounded',()=>{const s=restoreChem({ion:'<script>',moved:999,ionStep:2,magnitude:-1,counts:[100],salt:'constructor'});assert.equal(s.ion,'Na');assert.equal(s.moved,0);assert.equal(s.ionStep,0);assert.deepEqual(s.counts,[1,1]);for(let i=0;i<20;i++)chemistryAction(s,'chem-count','positive:1');assert.equal(s.positive,6);chemistryAction(s,'chem-count','__proto__:1');assert.ok(!ionsView(s).includes('undefined'));assert.ok(glossaryView().includes('원소 기호'));});
