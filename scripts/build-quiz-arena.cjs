const fs=require('node:fs'),ts=require('typescript');
const js=ts.transpileModule(fs.readFileSync('lib/quiz-rally-arena.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}}).outputText;
fs.writeFileSync('public/labs/quiz-rally/arena-model.js','// Generated from lib/quiz-rally-arena.ts; run scripts/build-quiz-arena.cjs.\n(()=>{const exports={};\n'+js+'\nwindow.quizArenaModel=exports;})();\n');
