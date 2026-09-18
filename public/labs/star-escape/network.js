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
  async function request(url, options) {
    var read = !options || !options.method || options.method === 'GET';
    var tries = read ? 2 : 1;
    for (var attempt = 0; attempt < tries; attempt++) {
      if (!available()) {
        report('인터넷 연결 끊김 · 화면을 유지하고 있습니다. 연결되면 자동 동기화합니다.');
        throw connectionError('인터넷 연결을 확인해 주세요. 진행 기록은 초기화하지 않았습니다.');
      }
      var controller = new AbortController();
      var timer = setTimeout(function () { controller.abort(); }, 12000);
      try {
        var response = await fetch(url, Object.assign({cache:'no-store'}, options || {}, {signal:controller.signal}));
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
        if (read && attempt + 1 < tries) {
          clearTimeout(timer);
          await new Promise(function (resolve) { setTimeout(resolve, 1200 + Math.random() * 800); });
          continue;
        }
        failures++;
        retryAt = Date.now() + Math.min(30000, 2500 * Math.pow(2, Math.min(failures, 4))) + Math.random() * 1000;
        report('연결 확인 중 · 화면을 유지하며 자동으로 다시 연결합니다.');
        // A lost write response may already be committed: never submit it twice automatically.
        throw connectionError(read ? '상태를 불러오지 못했습니다. 자동으로 다시 연결합니다.' : '저장 결과를 확인하지 못했습니다. 연결 복구 후 반영 여부를 확인해 주세요.');
      } finally { clearTimeout(timer); }
    }
  }
  window.StarEscapeNetwork = {
    request:request,
    canPoll:function () { return available() && Date.now() >= retryAt; },
    resume:function () { retryAt = 0; },
    offline:function () { report('인터넷 연결 끊김 · 연결되면 자동 동기화합니다.'); }
  };
})();
