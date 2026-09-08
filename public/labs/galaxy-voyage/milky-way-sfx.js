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

  const beaconContainer = document.getElementById('galaxyBeacons');
  if (beaconContainer) {
    const visitedKeys = new Set(
      [...beaconContainer.querySelectorAll('.galaxyBeacon.visited')]
        .map(beacon => beacon.getAttribute('data-key'))
        .filter(Boolean)
    );

    new MutationObserver(mutations => {
      for (const mutation of mutations) {
        if (mutation.type !== 'attributes' || mutation.attributeName !== 'class') continue;
        const beacon = mutation.target instanceof Element ? mutation.target.closest('.galaxyBeacon') : null;
        if (!beacon) continue;
        const key = beacon.getAttribute('data-key');
        if (!key) continue;
        const isVisited = beacon.classList.contains('visited');
        if (isVisited && !visitedKeys.has(key)) {
          visitedKeys.add(key);
          play('discovery');
        } else if (!isVisited) {
          visitedKeys.delete(key);
        }
      }
    }).observe(beaconContainer, {
      attributes: true,
      attributeFilter: ['class'],
      subtree: true
    });
  }

  const scoreElement = document.getElementById('expeditionScore');
  let pendingUfo = null;
  let lastScore = Number(scoreElement?.textContent || 0);

  document.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target : null;
    const visitor = target?.closest('.spaceVisitor');
    if (!visitor) return;

    pendingUfo = {
      visitor,
      scoreBefore: Number(scoreElement?.textContent || 0),
      armedAt: performance.now()
    };

    window.setTimeout(() => {
      if (pendingUfo?.visitor === visitor && !visitor.classList.contains('cooldown')) pendingUfo = null;
    }, 120);

    window.setTimeout(() => {
      if (pendingUfo?.visitor === visitor) pendingUfo = null;
    }, 8000);
  }, true);

  if (scoreElement) {
    new MutationObserver(() => {
      const nextScore = Number(scoreElement.textContent || 0);
      const changed = Number.isFinite(nextScore) && nextScore !== lastScore;

      if (
        changed &&
        pendingUfo &&
        pendingUfo.visitor?.classList.contains('cooldown') &&
        performance.now() - pendingUfo.armedAt < 8000
      ) {
        play('ufo');
        pendingUfo = null;
      }

      if (Number.isFinite(nextScore)) lastScore = nextScore;
    }).observe(scoreElement, {
      childList: true,
      characterData: true,
      subtree: true
    });
  }

  document.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;

    if (target.closest('.spaceVisitor')) return;

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
})();
