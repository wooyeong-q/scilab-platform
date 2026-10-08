const fs=require('node:fs'),ts=require('typescript');
const city=ts.transpileModule(fs.readFileSync('lib/quiz-rally-city.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}}).outputText;
const js=ts.transpileModule(fs.readFileSync('lib/quiz-rally-arena.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}}).outputText;
fs.writeFileSync('public/labs/quiz-rally/arena-model.js','// Generated from lib/quiz-rally-arena.ts and lib/quiz-rally-city.ts.\n(()=>{const city={};((exports)=>{\n'+city+'\n})(city);const exports={},require=name=>{if(name==="./quiz-rally-city")return city;throw Error("Unknown arena module");};\n'+js+'\nwindow.quizArenaModel=exports;})();\n');
