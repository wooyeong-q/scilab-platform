(function () {
  'use strict';
  if (window.SciLabClassroom) return;
  // Only user input renews this lease. Successful polls must not keep an
  // abandoned lesson (and its database compute) awake indefinitely.
  var idleMs = 20 * 60 * 1000, lastInput = Date.now(), sleeping = false, notice;
  var listeners = new Set();
  function canPoll() {
    if (document.hidden || navigator.onLine === false) return false;
    if (Date.now() - lastInput < idleMs) return true;
    sleeping = true;
    if (!notice && document.body) {
      notice = document.createElement('button');
      notice.type = 'button';
      notice.textContent = '20분간 조작이 없어 자동 연결을 쉬고 있어요. 눌러서 다시 연결';
      notice.setAttribute('aria-live', 'polite');
      notice.style.cssText = 'position:fixed;bottom:16px;left:50%;transform:translateX(-50%);z-index:2147483647;max-width:90vw;padding:12px 18px;border:1px solid #a5b4cc;border-radius:12px;background:#142338;color:white;font:14px/1.5 sans-serif;box-shadow:0 3px 18px #0005;cursor:pointer';
      document.body.appendChild(notice);
    }
    return false;
  }
  function resume() {
    if (!canPoll()) return;
    listeners.forEach(function (listener) { listener(); });
  }
  function input(event) {
    if (event.isTrusted === false) return;
    lastInput = Date.now();
    if (!sleeping) return;
    sleeping = false;
    if (notice) notice.remove();
    notice = null;
    resume();
  }
  ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(function (name) {
    document.addEventListener(name, input, {capture:true, passive:true});
  });
  document.addEventListener('visibilitychange', resume);
  window.addEventListener('online', resume);
  window.SciLabClassroom = {
    canPoll: canPoll,
    onResume: function (listener) { listeners.add(listener); return function () { listeners.delete(listener); }; }
  };
}());
