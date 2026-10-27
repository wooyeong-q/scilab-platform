// A presentation aid only: pointer positions stay in the browser and never intercept input.
export function mountPointerEmphasis(button) {
  if (!button) return;
  const preference = 'digestion-pointer-emphasis';
  let enabled = true;
  try { enabled = localStorage.getItem(preference) !== 'off'; } catch {}
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const halo = document.createElement('div');
  halo.className = 'pointer-halo';
  halo.setAttribute('aria-hidden', 'true');
  halo.dataset.visible = 'false';
  const pulse = document.createElement('span');
  pulse.className = 'pointer-click-pulse';
  halo.appendChild(pulse);
  document.body.appendChild(halo);
  let point = null, frame = 0, pulseAnimation = null;

  function hide() {
    point = null;
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    halo.dataset.visible = 'false';
    halo.classList.remove('is-pressed');
  }
  function render() {
    frame = 0;
    if (!enabled || !point) return;
    halo.style.transform = `translate3d(${point.x}px,${point.y}px,0)`;
    halo.dataset.visible = 'true';
  }
  function move(event) {
    if (!enabled || !['mouse', 'pen'].includes(event.pointerType)) { hide(); return; }
    // Native dialogs occupy the top layer, so keep the aid inside the active dialog.
    const layer = event.target.closest?.('dialog[open]') || document.body;
    if (halo.parentElement !== layer) layer.appendChild(halo);
    point = { x: event.clientX, y: event.clientY };
    if (!frame) frame = requestAnimationFrame(render);
  }
  function refreshButton() {
    button.setAttribute('aria-pressed', String(enabled));
    button.setAttribute('aria-label', enabled ? '마우스 강조 끄기' : '마우스 강조 켜기');
    button.title = enabled ? '마우스 강조 끄기' : '마우스 강조 켜기';
  }
  button.addEventListener('click', () => {
    enabled = !enabled;
    try { localStorage.setItem(preference, enabled ? 'on' : 'off'); } catch {}
    if (!enabled) hide();
    else if (point) render();
    refreshButton();
  });
  document.addEventListener('pointermove', move, { passive: true });
  document.addEventListener('pointerdown', event => {
    move(event);
    if (!enabled || !['mouse', 'pen'].includes(event.pointerType)) return;
    halo.classList.add('is-pressed');
    pulseAnimation?.cancel();
    if (!reducedMotion.matches) {
      pulseAnimation = pulse.animate([
        { transform: 'scale(.8)', opacity: .9 },
        { transform: 'scale(1.7)', opacity: 0 },
      ], { duration: 420, easing: 'ease-out' });
    }
  }, { passive: true, capture: true });
  document.addEventListener('pointerup', () => halo.classList.remove('is-pressed'), { passive: true });
  document.addEventListener('pointercancel', hide, { passive: true });
  document.addEventListener('pointerout', event => { if (!event.relatedTarget) hide(); }, { passive: true });
  window.addEventListener('blur', hide);
  document.addEventListener('visibilitychange', () => { if (document.hidden) hide(); });
  refreshButton();
}
