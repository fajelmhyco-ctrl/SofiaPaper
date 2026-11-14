/* ============================================================
   DALUM-AWIT · Storybook dialogue engine
   ============================================================ */
(function () {
  'use strict';

  const U = window.DalumUtils;

  const SCENE_LABELS = {
    'field-morning': 'Sa gitna ng palayan · Umaga',
    'field-afternoon': 'Sa gilid ng palayan · Hapon',
    'home': 'Bahay nina Mutya · Hapon',
    'dawn': 'Bukid · Bukas na umaga'
  };

  const SCENE_CLASSES = ['scene-field-morning', 'scene-field-afternoon', 'scene-home', 'scene-dawn'];

  function speakerName(speaker, characters) {
    if (speaker === 'narrator') return 'Tagapagsalaysay';
    if (speaker === 'nanay') return 'Nanay';
    if (speaker === 'tatay') return 'Tatay';
    if (characters[speaker] && characters[speaker].name) return characters[speaker].name;
    return speaker;
  }

  function create(mount, options) {
    const station = options.station;
    const stationId = station.id;
    const characters = options.characters || {};
    const lines = Array.isArray(station.dialogue) ? station.dialogue : [];

    if (!mount || !lines.length) return null;

    const savedIndex = typeof options.getSavedIndex === 'function'
      ? options.getSavedIndex()
      : window.AppState.getState().dialogue[stationId] || 0;
    let index = U.clamp(Number(savedIndex) || 0, 0, lines.length - 1);
    let done = typeof options.isDone === 'function'
      ? Boolean(options.isDone())
      : window.AppState.isDialogueDone(stationId);
    let currentScene = '';

    mount.innerHTML = [
      '<div class="story-stage" data-dialogue-stage>',
      '  <div class="scene-sun" aria-hidden="true"></div>',
      '  <div class="scene-cloud cloud-1" aria-hidden="true"></div>',
      '  <div class="scene-cloud cloud-2" aria-hidden="true"></div>',
      '  <div class="scene-hill hill-1" aria-hidden="true"></div>',
      '  <div class="scene-hill hill-2" aria-hidden="true"></div>',
      '  <div class="scene-field" aria-hidden="true"></div>',
      '  <div class="stage-vignette" aria-hidden="true"></div>',
      '  <span class="stage-label"></span>',
      '  <div class="sprite sprite-left" data-sprite="mutya" aria-hidden="true"><img alt="" draggable="false"></div>',
      '  <div class="sprite sprite-right" data-sprite="isko" aria-hidden="true"><img alt="" draggable="false"></div>',
      '  <div class="sprite sprite-right sprite-parents" data-sprite="parents" aria-hidden="true"><img alt="" draggable="false"></div>',
      '  <div class="dialogue-panel" data-dialogue-panel role="group" aria-label="' + U.escapeHtml(options.ariaLabel || 'Usapan ng mga tauhan') + '">',
      '    <div class="dialogue-meter" aria-hidden="true"><span></span></div>',
      '    <span class="speaker-tag"></span>',
      '    <p class="dialogue-text" aria-live="polite"></p>',
      '    <div class="dialogue-controls">',
      '      <button class="dialogue-btn dialogue-prev" type="button">',
      '        <svg class="icon" aria-hidden="true"><use href="#i-arrow-left"></use></svg>',
      '        <span>Bumalik</span>',
      '      </button>',
      '      <span class="dialogue-count" aria-hidden="true"></span>',
      '      <button class="dialogue-btn dialogue-next" type="button">',
      '        <span class="dialogue-next-label">Susunod</span>',
      '        <svg class="icon" aria-hidden="true"><use href="#i-arrow-right"></use></svg>',
      '      </button>',
      '    </div>',
      '  </div>',
      '</div>'
    ].join('');

    const stage = mount.querySelector('[data-dialogue-stage]');
    const panel = mount.querySelector('[data-dialogue-panel]');
    const textEl = mount.querySelector('.dialogue-text');
    const speakerEl = mount.querySelector('.speaker-tag');
    const countEl = mount.querySelector('.dialogue-count');
    const meterEl = mount.querySelector('.dialogue-meter span');
    const prevBtn = mount.querySelector('.dialogue-prev');
    const nextBtn = mount.querySelector('.dialogue-next');
    const nextLabel = mount.querySelector('.dialogue-next-label');
    const stageLabel = mount.querySelector('.stage-label');

    const mutyaEl = mount.querySelector('[data-sprite="mutya"]');
    const iskoEl = mount.querySelector('[data-sprite="isko"]');
    const parentsEl = mount.querySelector('[data-sprite="parents"]');

    function setSprite(el, file) {
      if (!el) return;
      const img = el.querySelector('img');
      if (!file) {
        el.classList.add('is-hidden');
        el.classList.remove('is-speaking', 'is-listening');
        return;
      }
      el.classList.remove('is-hidden');
      const src = U.imagePath(file);
      if (img.getAttribute('src') !== src) img.src = src;
    }

    function resolveMutya(line) {
      if (line.mutya && characters.mutya && characters.mutya.sprites[line.mutya]) {
        return characters.mutya.sprites[line.mutya];
      }
      if (line.speaker === 'mutya' && characters.mutya) {
        return characters.mutya.sprites.nagsasalita;
      }
      return characters.mutya ? characters.mutya.sprites.nakatayo : null;
    }

    function resolveIsko(line) {
      if (line.isko && characters.isko && characters.isko.sprites[line.isko]) {
        return characters.isko.sprites[line.isko];
      }
      return null;
    }

    function setActive(el, isSpeaking, isVisible) {
      if (!el) return;
      el.classList.toggle('is-speaking', Boolean(isVisible && isSpeaking));
      el.classList.toggle('is-listening', Boolean(isVisible && !isSpeaking));
    }

    function render() {
      const line = lines[index];
      if (!line) return;

      const scene = line.scene || station.scene || 'field-morning';
      if (scene !== currentScene) {
        currentScene = scene;
        stage.classList.remove.apply(stage.classList, SCENE_CLASSES);
        stage.classList.add('scene-' + scene);
        stage.dataset.scene = scene;
        stageLabel.textContent = SCENE_LABELS[scene] || 'Sa bukid';
      }

      const hasParents = Boolean(line.parents);
      const mutyaFile = resolveMutya(line);
      const iskoFile = resolveIsko(line);

      setSprite(mutyaEl, mutyaFile);
      setSprite(iskoEl, hasParents ? null : iskoFile);
      setSprite(parentsEl, hasParents && characters.parents ? characters.parents.sprite : null);
      stage.classList.toggle('has-parents', hasParents);

      const speaker = line.speaker;
      setActive(mutyaEl, speaker === 'mutya', Boolean(mutyaFile));
      if (hasParents) {
        setActive(parentsEl, speaker === 'nanay' || speaker === 'tatay', true);
        setActive(iskoEl, false, false);
      } else {
        setActive(iskoEl, speaker === 'isko', Boolean(iskoFile));
        setActive(parentsEl, false, false);
      }

      panel.dataset.speaker = speaker;
      panel.classList.toggle('is-narration', speaker === 'narrator');
      speakerEl.textContent = speakerName(speaker, characters);
      textEl.textContent = line.text;

      countEl.textContent = (index + 1) + ' / ' + lines.length;
      meterEl.style.width = (((index + 1) / lines.length) * 100) + '%';

      prevBtn.disabled = index === 0;

      if (index === lines.length - 1) {
        nextBtn.classList.add('is-finish');
        if (done) {
          nextLabel.textContent = options.completedLabel || 'Tapos na';
          nextBtn.disabled = true;
        } else {
          nextLabel.textContent = options.finishLabel || 'Tapusin ang usapan';
          nextBtn.disabled = false;
        }
      } else {
        nextBtn.classList.remove('is-finish');
        nextLabel.textContent = 'Susunod';
        nextBtn.disabled = false;
      }

      panel.classList.remove('is-updating');
      void panel.offsetWidth;
      panel.classList.add('is-updating');
    }

    function goTo(nextIndex) {
      const target = U.clamp(Number(nextIndex) || 0, 0, lines.length - 1);
      if (target === index) return;
      index = target;
      if (typeof options.setIndex === 'function') options.setIndex(index);
      else window.AppState.setDialogueIndex(stationId, index);
      render();
    }

    function finish() {
      if (!done) {
        done = true;
        if (typeof options.markDone === 'function') options.markDone();
        else window.AppState.markDialogueDone(stationId);
        if (typeof options.onComplete === 'function') {
          options.onComplete({ stationId: stationId, station: station });
        }
      }
      render();
    }

    function next() {
      if (index >= lines.length - 1) {
        finish();
        return;
      }
      goTo(index + 1);
    }

    function prev() {
      if (index <= 0) return;
      goTo(index - 1);
    }

    prevBtn.addEventListener('click', prev);
    nextBtn.addEventListener('click', next);

    function onKeydown(event) {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      if (event.target && event.target.closest && event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (document.querySelector('dialog[open]')) return;
      if (mount.offsetParent === null) return;

      event.preventDefault();
      if (event.key === 'ArrowLeft') prev();
      if (event.key === 'ArrowRight') next();
    }

    document.addEventListener('keydown', onKeydown);

    render();

    return {
      stationId: stationId,
      next: next,
      prev: prev,
      goTo: goTo,
      isDone: function () { return done; },
      getIndex: function () { return index; },
      refresh: render,
      element: stage
    };
  }

  window.DialogueEngine = {
    create: create
  };
})();
