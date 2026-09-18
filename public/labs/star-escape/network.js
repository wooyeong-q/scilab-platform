(function () {
  'use strict';
  var failures = 0, retryAt = 0;
  function report(message) {
    var node = document.getElementById('connectionStatus');
    if (node) { node.textContent = message; node.hidden = !message; }
  }
  function available() { return navigator.onLine !== false; }
  function connectionError(message) {
    var error = new Error(message); error.connection = true; return error;
  }
  function canPoll() { return available() && Date.now() >= retryAt; }
  function retryAfter(response) {
    var value = response.headers && response.headers.get('Retry-After');
    if (!value) return 0;
    var seconds = Number(value);
    return Math.max(0, Number.isFinite(seconds) ? seconds * 1000 : (Date.parse(value) || 0) - Date.now());
  }
  async function request(url, options) {
    var read = !options || !options.method || options.method === 'GET';
    if (!available()) {
      report('인터넷 연결 끊김 · 화면을 유지하고 있습니다. 연결되면 자동 동기화합니다.');
      throw connectionError('인터넷 연결을 확인해 주세요. 진행 기록은 초기화하지 않았습니다.');
    }
    // The scheduled poll is the retry. Manual refreshes and failed saves share
    // the same cooldown, so a classroom cannot create a second retry wave.
    if (!canPoll()) throw connectionError('연결 복구를 기다리고 있습니다. 잠시 후 다시 확인해 주세요.');
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, 12000);
    var serverDelay = 0;
    try {
      var response = await fetch(url, Object.assign({cache:'no-store'}, options || {}, {signal:controller.signal}));
      if (response.status === 429 || response.status === 503) serverDelay = retryAfter(response);
      var data = await response.json();
      if (!response.ok) {
        var error = new Error(data.error || '서버 요청을 처리하지 못했습니다.');
        error.http = true; error.status = response.status;
        throw error;
      }
      failures = 0; retryAt = 0; report('');
      return data;
    } catch (error) {
      if (error.http && error.status < 500 && error.status !== 429) throw error;
      failures++;
      retryAt = Date.now() + Math.max(serverDelay, Math.min(30000, 2500 * Math.pow(2, Math.min(failures, 4)))) + Math.random() * 1000;
      report('연결 확인 중 · 화면을 유지하며 자동으로 다시 연결합니다.');
      // A lost write response may already be committed: never submit it twice automatically.
      throw connectionError(read ? '상태를 불러오지 못했습니다. 자동으로 다시 연결합니다.' : '저장 결과를 확인하지 못했습니다. 연결 복구 후 반영 여부를 확인해 주세요.');
    } finally { clearTimeout(timer); }
  }
  // Wait for a response before starting the next polling delay. Each device
  // receives fresh jitter, including after Wi-Fi or tab visibility recovers.
  function createPoller(load, options) {
    var timer = 0, stopped = true, inFlight = false;
    function active() {
      return !stopped && !document.hidden && available() && (!options.enabled || options.enabled());
    }
    function pause() { clearTimeout(timer); timer = 0; }
    function schedule(delay) {
      pause();
      if (active()) timer = setTimeout(run, Math.max(delay, retryAt - Date.now()));
    }
    async function run() {
      timer = 0;
      if (!active()) return;
      if (inFlight) { schedule(400 + Math.random() * 400); return; }
      if (!canPoll()) { schedule(retryAt - Date.now()); return; }
      inFlight = true;
      try { await load(true); }
      catch (error) { /* The request reports connection failures; polling continues. */ }
      finally {
        inFlight = false;
        if (!timer) schedule(options.interval * (1 + Math.random() * 0.25));
      }
    }
    return {
      start:function () { stopped = false; schedule(0); },
      stop:function () { stopped = true; pause(); },
      pause:pause,
      resume:function () { schedule(300 + Math.random() * 1200); }
    };
  }
  window.StarEscapeNetwork = {
    request:request,
    canPoll:canPoll,
    createPoller:createPoller,
    resume:function () { retryAt = 0; },
    offline:function () { report('인터넷 연결 끊김 · 연결되면 자동 동기화합니다.'); }
  };
})();
