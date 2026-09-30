const {test} = require('node:test');
const assert = require('node:assert/strict');
const {webcrypto} = require('node:crypto');

const session = import('../public/labs/matter-zoom/session.mjs');
const BASE = 'https://scilab-platform.vercel.app/labs/matter-zoom/index.html';
const A = '0123456789abcdef0123456789abcdef';
const B = 'fedcba9876543210fedcba9876543210';

test('class links isolate same-named classes, separate teachers, and learning levels', async () => {
  const {makeLessonLink, readContext, storageKey} = await session;
  const contexts = [
    readContext(new URL(makeLessonLink(BASE, {mode: 'middle', classLabel: '2학년 1반'}, A)).search),
    readContext(new URL(makeLessonLink(BASE, {mode: 'middle', classLabel: '2학년 1반'}, B)).search),
    readContext(new URL(makeLessonLink(BASE, {mode: 'high', classLabel: '2학년 1반'}, A)).search),
    readContext(''),
    readContext('?mode=high'),
  ];
  const keys = contexts.map(storageKey);
  assert.equal(new Set(keys).size, contexts.length);
  assert.equal(contexts[0].classLabel, contexts[1].classLabel);
  assert.equal(storageKey({...contexts[0], classLabel: '표시 이름만 수정'}), keys[0]);
  // Independent progress on this one device; there is no shared teacher setting.
  const local = new Map([[keys[0], {chapter: 3}], [keys[1], {chapter: 1}]]);
  local.delete(keys[0]);
  assert.deepEqual(local.get(keys[1]), {chapter: 1});
  assert.equal(local.has(keys[2]), false);
});

test('mode and malformed URL contexts use safe defaults', async () => {
  const {normalizeMode, readContext, storageKey} = await session;
  assert.equal(normalizeMode('high'), 'high');
  for (const mode of [undefined, null, '', 'middle', 'HIGH', '<script>', 1]) {
    assert.equal(normalizeMode(mode), 'middle');
  }
  assert.deepEqual(readContext(), {mode: 'middle', lessonId: 'personal', classLabel: ''});
  for (const id of ['', 'personal', '../other', A.toUpperCase(), A.slice(1), `${A}0`, '<script>']) {
    const params = new URLSearchParams({lesson: id, mode: 'high'});
    const context = readContext(params.toString());
    assert.equal(context.lessonId, 'personal');
    assert.equal(context.mode, 'high');
    assert.equal(storageKey(context), 'scilab-matter-zoom-v2:personal:high');
  }
  assert.throws(() => storageKey({lessonId: '../other'}), TypeError);
});

test('class metadata round-trips Unicode, strips controls, and requires caller escaping', async () => {
  const {makeLessonLink, readContext} = await session;
  const label = '김 선생님 / 2학년 3반 & 탐구 🔬';
  const context = readContext(new URL(makeLessonLink(BASE, {mode: 'middle', classLabel: label}, A)).search);
  assert.equal(context.classLabel, label);
  const dirty = `\u0000\n  2학년\u202e 1반\u007f\u0085\t  `;
  assert.equal(readContext(new URLSearchParams({class: dirty})).classLabel, '2학년 1반');
  const long = '🔬가'.repeat(30);
  const limited = readContext(new URLSearchParams({class: long})).classLabel;
  assert.equal(Array.from(limited).length, 40);
  assert.equal(limited, '🔬가'.repeat(20));
  // URL encoding is not HTML escaping. A text label must remain text at the UI.
  const hostile = '<img src=x onerror=alert(1)>';
  const url = makeLessonLink(BASE, {classLabel: hostile}, A);
  assert.equal(url.includes('<img'), false);
  assert.equal(readContext(new URL(url).search).classLabel, hostile);
});

test('generated links contain only the selected public lesson metadata', async () => {
  const {makeLessonLink, readContext} = await session;
  const url = new URL(makeLessonLink(`${BASE}?oldRoom=teacherA&mode=high&class=old#chapter6`, {mode: 'middle', classLabel: '새 반'}, A));
  assert.equal(url.origin + url.pathname, BASE);
  assert.equal(url.hash, '');
  assert.deepEqual([...url.searchParams.keys()], ['mode', 'lesson', 'class']);
  assert.deepEqual(readContext(url.search), {mode: 'middle', lessonId: A, classLabel: '새 반'});
  assert.equal(new URL(makeLessonLink(BASE, {}, A)).searchParams.has('class'), false);
  for (const id of [null, '', 'personal', '../other', A.toUpperCase(), A.slice(1)]) {
    assert.throws(() => makeLessonLink(BASE, {}, id), TypeError);
  }
  assert.throws(() => makeLessonLink('javascript:alert(1)', {}, A), TypeError);
});

test('fresh lesson IDs use 16 cryptographic random bytes and no predictable fallback', async () => {
  const {createLessonId, makeLessonLink} = await session;
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
  let calls = 0;
  try {
    Object.defineProperty(globalThis, 'crypto', {configurable: true, value: {
      getRandomValues(bytes) {
        calls++;
        assert.equal(bytes.byteLength, 16);
        assert.ok(bytes instanceof Uint8Array);
        for (let index = 0; index < bytes.length; index++) bytes[index] = index;
        return bytes;
      },
    }});
    assert.equal(createLessonId(), '000102030405060708090a0b0c0d0e0f');
    assert.equal(calls, 1);
    Object.defineProperty(globalThis, 'crypto', {configurable: true, value: undefined});
    assert.throws(createLessonId, /안전한 난수/);
    Object.defineProperty(globalThis, 'crypto', {configurable: true, value: webcrypto});
    const ids = Array.from({length: 128}, createLessonId);
    assert.ok(ids.every(id => /^[a-f0-9]{32}$/.test(id)));
    assert.equal(new Set(ids).size, ids.length);
    const first = new URL(makeLessonLink(BASE, {classLabel: '같은 반'})).searchParams.get('lesson');
    const second = new URL(makeLessonLink(BASE, {classLabel: '같은 반'})).searchParams.get('lesson');
    assert.notEqual(first, second);
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'crypto', descriptor);
    else delete globalThis.crypto;
  }
});
