import test from 'node:test';
import assert from 'node:assert/strict';
import {chargeBoard,chargeState,CHARGE_ATOMS} from '../public/labs/matter-zoom/teaching-board.mjs';
import {freshExplorer,restoreExplorer} from '../public/labs/matter-zoom/exploration.mjs';
import {freshChem,restoreChem,chemistryAction,glossaryView,formulasView,GLOSSARY} from '../public/labs/matter-zoom/chemistry.mjs';
import {periodicExplorer} from '../public/labs/matter-zoom/periodic-view.mjs';

test('neutrality models show actual protons and electrons without removing balanced particles',()=>{
 for(const z of CHARGE_ATOMS)for(const variant of ['neutral','lost','gained']){
  const s={...freshExplorer(),chargeZ:z,chargeVariant:variant};
  const {p,e,q}=chargeState(s);assert.equal(p,z);assert.equal(e,z+(variant==='lost'?-1:variant==='gained'?1:0));assert.equal(q,p-e);
  const atom=chargeBoard(s),pairs=chargeBoard({...s,chargeView:'pairs'});
  assert.equal((atom.match(/data-particle-kind="protons"/g)||[]).length,p);
  assert.equal((atom.match(/data-particle-kind="electrons"/g)||[]).length,e);
  assert.equal((pairs.match(/data-charge-particle="proton"/g)||[]).length,p);
  assert.equal((pairs.match(/data-charge-particle="electron"/g)||[]).length,e);
  assert.equal((pairs.match(/charge-column unpaired/g)||[]).length,Math.abs(q));
  assert.match(pairs,/입자가 붙거나 사라지는 과정이 아닙니다/);
 }
});
test('periodic table, property animations and atomic number each have a separate scene',()=>{
 for(let z=1;z<=20;z++){
  const args={z,observedZ:z};
  const table=periodicExplorer({...args,view:'table'});assert.equal((table.match(/class="element-cell /g)||[]).length,20);assert.ok(!table.includes('class="element-motion'));
  const feature=periodicExplorer({...args,view:'feature'});assert.match(feature,/class="element-motion/);assert.ok(!feature.includes('class="element-cell '));
  const number=periodicExplorer({...args,view:'number'});assert.equal((number.match(/class="dot p"/g)||[]).length,z);
 }
});
test('every glossary entry remains reachable after changing to paged definitions',()=>{
 const s=freshChem();
 for(let i=0;i<GLOSSARY.length;i++){chemistryAction(s,'chem-glossary',String(i));const html=glossaryView(s);assert.ok(html.includes(GLOSSARY[i][1]));assert.ok(html.includes(GLOSSARY[i][2]));assert.ok(!html.includes('undefined'));}
 chemistryAction(s,'chem-glossary','-1');assert.match(glossaryView(s),/원자 · 분자 · 이온/);
});
test('formula builders and supplementary models switch pages without losing chosen counts',()=>{
 const s=freshChem();chemistryAction(s,'chem-count','m0:1');
 chemistryAction(s,'chem-formula-view','notation');assert.match(formulasView(s),/아래 숫자 · 앞 숫자 · 위 숫자/);
 chemistryAction(s,'chem-formula-view','builder');assert.deepEqual(s.counts,[2,1]);assert.ok(!formulasView(s).includes('notation-model-grid'));
 chemistryAction(s,'chem-kind','ionic');chemistryAction(s,'chem-salt','mgcl2');chemistryAction(s,'chem-salt-inspect','negative');
 assert.match(formulasView(s),/MgCl<sub>2<\/sub>/);assert.match(formulasView(s),/염화 이온 하나의 내부/);
 chemistryAction(s,'chem-formula-view','builder');assert.equal(s.positive,1);assert.equal(s.negative,1);
});
test('board selections restore safely and preserve existing observations',()=>{
 const s=freshExplorer();s.material='water';s.records=['structure'];s.chargeZ=8;s.chargeVariant='gained';s.chargeView='pairs';s.tableView='feature';s.compareView='electrons';s.chem.glossaryIndex=12;s.chem.formulaView='notation';
 const restored=restoreExplorer(JSON.stringify(s));assert.equal(restored.chargeZ,8);assert.equal(restored.chargeVariant,'gained');assert.equal(restored.chargeView,'pairs');assert.equal(restored.tableView,'feature');assert.equal(restored.compareView,'electrons');assert.equal(restored.chem.glossaryIndex,12);assert.equal(restored.chem.formulaView,'notation');assert.deepEqual(restored.records,['structure']);
 const invalid=restoreChem({glossaryIndex:99,formulaView:'<script>'});assert.equal(invalid.glossaryIndex,-1);assert.equal(invalid.formulaView,'builder');
});
