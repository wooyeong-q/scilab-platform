(function () {
  'use strict';

  // A scene save can succeed while its separate answer request is lost.
  // Offer an explicit retry for that same question, including after a reload.
  // Story endings remain under their own recording / exit controls.
  function pendingAnswer(progress) {
    if (!progress || progress.completedAt) return '';
    var scene = progress.sceneState || {};
    var question = Number(progress.question);
    if (Number(progress.stage) === 3) {
      if (question === 1 && scene.p1Complete) return '654321';
      if (question === 2 && scene.q2Complete) return 'A';
      if (question === 3 && scene.q3Complete) return 'C';
    }
    if (Number(progress.stage) === 4) {
      if (question === 1 && scene.overlayComplete) return '반사판뒤';
      if (question === 2 && scene.nebulaComplete) return '성운분류완료';
      if (question === 3 && scene.lockerOpen) return '성단분류완료';
    }
    return '';
  }

  function renderRecovery(context) {
    var answer = pendingAnswer(context.state.progress);
    if (!answer) return;
    var panel = document.createElement('section');
    panel.className = 'escape-progress-recovery';
    panel.setAttribute('role', 'status');
    panel.innerHTML = '<div><b>문제 풀이 완료</b><p>다음 단계 연결을 확인해 주세요.</p><button class="primary" type="button">다음 단계로 이어가기</button></div>';
    var button = panel.querySelector('button');
    button.onclick = async function () {
      if (button.disabled) return;
      button.disabled = true;
      try { await context.submit(answer, button); }
      catch (error) { context.toast(error.message || '연결을 확인한 뒤 다시 눌러 주세요.', true); }
      finally { button.disabled = false; }
    };
    context.game.appendChild(panel);
  }

  window.StarEscapeProgress = { pendingAnswer: pendingAnswer, renderRecovery: renderRecovery };
})();
