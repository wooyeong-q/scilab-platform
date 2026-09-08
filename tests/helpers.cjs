const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { PGlite } = require('@electric-sql/pglite');
const root = path.resolve(__dirname, '..');

async function harness() {
  const pg = await PGlite.create();
  await pg.exec(fs.readFileSync(path.join(root, 'scripts/schema.sql'), 'utf8'));
  const queries = [], paths = [], cookies = new Map(), cache = new Map(), modules = new Map();
  let fail = false;
  const sql = (strings, ...params) => sql.query(strings.reduce((s, part, i) => s + (i ? '$' + i : '') + part, ''), params);
  sql.query = async (query, params = [], options) => {
    queries.push({ query, params, options });
    if (/\b(CREATE|ALTER|TRUNCATE|DROP)\b/.test(query)) throw new Error('Runtime DDL is forbidden');
    if (fail) throw new Error('Simulated database outage');
    return (await pg.query(query, params)).rows;
  };
  const nextCache = {
    unstable_cache: (fn, key, options) => (...args) => {
      const id = JSON.stringify([key, args]);
      if (!cache.has(id)) cache.set(id, { options, value: fn(...args).catch(error => { cache.delete(id); throw error; }) });
      return cache.get(id).value;
    },
    revalidateTag: tag => { for (const [key, item] of cache) if (item.options.tags.includes(tag)) cache.delete(key); },
    revalidatePath: (...args) => paths.push(args),
  };
  const mocks = {
    '@neondatabase/serverless': { neon: () => sql },
    'next/cache': nextCache,
    'next/headers': { cookies: async () => ({ get: key => cookies.get(key), set: (key, value, options) => cookies.set(key, { value, options }) }) },
  };
  function load(file) {
    file = path.resolve(root, file);
    if (!path.extname(file)) file += '.ts';
    if (modules.has(file)) return modules.get(file).exports;
    const mod = { exports: {} }; modules.set(file, mod);
    const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    const localRequire = name => mocks[name] || (name.startsWith('@/') ? load(name.slice(2)) : name.startsWith('.') ? load(path.resolve(path.dirname(file), name)) : require(name));
    new Function('require', 'module', 'exports', compiled)(localRequire, mod, mod.exports);
    return mod.exports;
  }
  return { pg, sql, queries, paths, cookies, cache, load, outage: value => { fail = value; }, close: () => pg.close() };
}

function request(body, method = 'POST') {
  return new Request('http://localhost/test', { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
}
const params = id => ({ params: Promise.resolve({ id }) });
module.exports = { harness, request, params, root };
