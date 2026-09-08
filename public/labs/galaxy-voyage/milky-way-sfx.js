(() => {
  const params = new URLSearchParams(window.location.search);
  if (params.get('experience') !== 'milky-way-objects' || window.__scilabMilkyWaySfxLoaded) return;
  window.__scilabMilkyWaySfxLoaded = true;

  const storageKey = 'scilab-milky-way-sfx-muted';
  let muted = false;
  try { muted = window.localStorage.getItem(storageKey) === '1'; } catch {}

  const sources = {
    click: './sfx/click.mp3',
    discovery: './sfx/discovery.mp3',
    ufo: './sfx/ufo-hit.mp3',
    correct: './sfx/correct.mp3',
    wrong: './sfx/wrong.mp3'
  };
  const volumes = { click: .58, discovery: .76, ufo: .76, correct: .72, wrong: .72 };
  const templates = Object.fromEntries(Object.entries(sources).map(([name, src]) => {
    const audio = new Audio(src);
    audio.preload = 'auto';
    audio.volume = volumes[name] ?? .7;
    return [name, audio];
  }));

  let unlocked = false;
  function unlockAudio() {
    if (unlocked) return;
    unlocked = true;
    Object.values(templates).forEach(audio => {
      const volume = audio.volume;
      audio.volume = 0;
      audio.play().then(() => {
        audio.pause();
        audio.currentTime = 0;
        audio.volume = volume;
      }).catch(() => { audio.volume = volume; });
    });
  }
  document.addEventListener('pointerdown', unlockAudio, { once: true, capture: true });
  document.addEventListener('keydown', unlockAudio, { once: true, capture: true });

  function play(name) {
    if (muted) return;
    const template = templates[name];
    if (!template) return;
    const audio = template.cloneNode(true);
    audio.volume = volumes[name] ?? .7;
    audio.play().catch(() => {});
  }

  function updateSoundButton(button) {
    button.textContent = muted ? '🔇' : '🔊';
    button.setAttribute('aria-pressed', String(muted));
    button.setAttribute('aria-label', muted ? '효과음 켜기' : '효과음 끄기');
    button.title = muted ? '효과음 켜기' : '효과음 끄기';
  }

  const shipMeta = document.querySelector('.shipMeta');
  const motionButton = document.getElementById('motionButton');
  if (shipMeta && motionButton && !document.getElementById('scilabSoundButton')) {
    const soundButton = document.createElement('button');
    soundButton.type = 'button';
    soundButton.className = 'soundButton';
    soundButton.id = 'scilabSoundButton';
    updateSoundButton(soundButton);
    soundButton.addEventListener('click', event => {
      event.stopPropagation();
      muted = !muted;
      try { window.localStorage.setItem(storageKey, muted ? '1' : '0'); } catch {}
      updateSoundButton(soundButton);
      if (!muted) play('click');
    });
    shipMeta.insertBefore(soundButton, motionButton);
  }

  document.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;

    const visitor = target.closest('.spaceVisitor');
    if (visitor) {
      const wasEncountered = visitor.classList.contains('encountered');
      window.setTimeout(() => {
        if (!wasEncountered && visitor.classList.contains('encountered')) play('ufo');
      }, 40);
      return;
    }

    const classBin = target.closest('.classBin');
    if (classBin) {
      const selected = document.querySelector('.sampleCard.selected');
      const selectedId = selected?.getAttribute('data-id');
      if (selectedId) {
        window.setTimeout(() => {
          const safeId = window.CSS?.escape ? CSS.escape(selectedId) : selectedId.replace(/"/g, '\\"');
          const card = document.querySelector(`.sampleCard[data-id="${safeId}"]`);
          if (card?.classList.contains('assigned')) play('correct');
          else if (card?.classList.contains('wrong')) play('wrong');
        }, 60);
      }
      return;
    }

    const ufoChoice = target.closest('.ufoChoice');
    if (ufoChoice) {
      window.setTimeout(() => {
        if (ufoChoice.classList.contains('correct')) play('correct');
        else if (ufoChoice.classList.contains('wrong')) play('wrong');
      }, 50);
      return;
    }

    const clickable = target.closest('button, a');
    if (!clickable || clickable.id === 'scilabSoundButton') return;
    play('click');
  });

  const toast = document.querySelector('.toast');
  if (toast) {
    let lastDiscovery = '';
    const checkToast = () => {
      const text = (toast.textContent || '').trim();
      if (toast.classList.contains('show') && text.includes('새 천체 발견') && text !== lastDiscovery) {
        lastDiscovery = text;
        play('discovery');
      }
    };
    new MutationObserver(checkToast).observe(toast, {
      attributes: true,
      childList: true,
      characterData: true,
      subtree: true
    });
  }
})();
