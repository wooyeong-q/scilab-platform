// Class links carry public labels and lesson settings, not teacher authentication.
// A lesson ID separates browser-local, individual progress. It is not a server
// room, a shared class record, or an access-control token.
const LESSON_ID = /^[a-f0-9]{32}$/;
const PERSONAL = 'personal';

export function normalizeMode(value) {
  return value === 'high' ? 'high' : 'middle';
}

function normalizeClassLabel(value) {
  // Keep Unicode text, but remove control/format characters (including bidi
  // overrides). This is not HTML escaping: render the label using textContent
  // or the application's escaping helper, never raw innerHTML.
  const text = String(value ?? '').replace(/[\p{Cc}\p{Cf}]/gu, '').trim();
  return Array.from(text).slice(0, 40).join('');
}

export function readContext(search = '') {
  const params = new URLSearchParams(search);
  const suppliedId = params.get('lesson');
  return {
    mode: normalizeMode(params.get('mode')),
    lessonId: LESSON_ID.test(suppliedId ?? '') ? suppliedId : PERSONAL,
    classLabel: normalizeClassLabel(params.get('class')),
  };
}

export function createLessonId() {
  if (typeof globalThis.crypto?.getRandomValues !== 'function') {
    throw new Error('수업 링크를 만들려면 안전한 난수 기능이 필요합니다.');
  }
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

export function makeLessonLink(baseUrl, {mode, classLabel} = {}, lessonId) {
  const id = lessonId === undefined ? createLessonId() : lessonId;
  if (typeof id !== 'string' || !LESSON_ID.test(id)) {
    throw new TypeError('수업 ID는 소문자 16진수 32자리여야 합니다.');
  }
  const url = new URL(baseUrl);
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new TypeError('수업 링크에는 http 또는 https 주소가 필요합니다.');
  }
  // Do not forward unrelated student settings, query parameters, or fragments.
  url.search = '';
  url.hash = '';
  url.searchParams.set('mode', normalizeMode(mode));
  url.searchParams.set('lesson', id);
  const label = normalizeClassLabel(classLabel);
  if (label) url.searchParams.set('class', label);
  return url.href;
}

export function storageKey(context = {}) {
  const id = context.lessonId ?? PERSONAL;
  if (id !== PERSONAL && (typeof id !== 'string' || !LESSON_ID.test(id))) {
    throw new TypeError('유효한 수업 범위가 필요합니다.');
  }
  return `scilab-matter-zoom-v2:${id}:${normalizeMode(context.mode)}`;
}
