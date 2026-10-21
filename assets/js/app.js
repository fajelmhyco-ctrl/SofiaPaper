/* ============================================================
   DALUM-AWIT · Application controller
   ============================================================ */
(function () {
  'use strict';

  const U = window.DalumUtils;

  let story = null;
  let modules = {};
  let engines = {};
  let activeStation = 1;
  let toastTimer = null;

  const App = {
    prefersReducedMotion() {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    },

    showToast(message, duration) {
      const toast = document.getElementById('toast');
      if (!toast) return;

      window.clearTimeout(toastTimer);
      toast.textContent = message;
      toast.classList.add('is-visible');

      toastTimer = window.setTimeout(function () {
        toast.classList.remove('is-visible');
      }, duration || 3600);
    },

    getStory() {
      return story;
    },

    goToStation(stationId, options) {
      return showStation(stationId, options || {});
    },

    completeStation(stationId) {
      if (!canComplete(stationId)) {
        App.showToast(completionHint(stationId));
        return false;
      }

      window.AppState.markComplete(stationId);
      refreshStepper();

      if (stationId < 5) {
        showStation(stationId + 1, { focus: true, scroll: true });
      }

      return true;
    },

    openResetDialog() {
      const dialog = document.getElementById('resetDialog');
      if (!dialog) return;
      if (typeof dialog.showModal === 'function') {
        if (!dialog.open) dialog.showModal();
      } else {
        dialog.setAttribute('open', '');
      }
    },

    refreshStepper: refreshStepper
  };

  window.App = App;

  /* ------------------------------------------------------------
     Data loading
     ------------------------------------------------------------ */
  async function loadStoryData() {
    if (window.location.protocol === 'file:' && window.DALUM_AWIT_DATA) {
      return window.DALUM_AWIT_DATA;
    }

    try {
      const response = await fetch('data/storyData.json', { cache: 'no-store' });
      if (response.ok) {
        const parsed = await response.json();
        if (parsed && Array.isArray(parsed.stations) && parsed.stations.length === 5) {
          return parsed;
        }
      }
    } catch (error) {
      /* file:// or no server: fall back to the generated JS mirror below. */
    }

    if (window.DALUM_AWIT_DATA && Array.isArray(window.DALUM_AWIT_DATA.stations)) {
      return window.DALUM_AWIT_DATA;
    }

    throw new Error('Hindi mahanap ang storyData.json o storyData.js.');
  }

  /* ------------------------------------------------------------
     Rendering: station headers and stepper
     ------------------------------------------------------------ */
  function renderHeaders() {
    story.stations.forEach(function (station) {
      const section = document.getElementById('station-' + station.id);
      if (!section) return;
      const header = section.querySelector('[data-station-header]');
      if (!header) return;

      header.innerHTML = [
        '<div class="station-heading-main">',
        '  <p class="eyebrow">',
        '    <span class="eyebrow-index">Station ' + station.id + '</span>',
        '    <span class="eyebrow-sep" aria-hidden="true"></span>',
        '    <span>' + U.escapeHtml(station.eyebrow) + '</span>',
        '  </p>',
        '  <h1 id="station-' + station.id + '-title" tabindex="-1">' + U.escapeHtml(station.title) + '</h1>',
        '  <p class="station-lede">' + U.escapeHtml(station.lede) + '</p>',
        '</div>',
        '<aside class="objective-card" aria-label="Layunin ng istasyon">',
        '  <span class="objective-label"><svg class="icon" aria-hidden="true"><use href="#i-target"></use></svg> Layunin</span>',
        '  <p>' + U.escapeHtml(station.objective) + '</p>',
        '</aside>'
      ].join('');
    });
  }

  function buildStepper() {
    const stepper = document.getElementById('stepper');
    if (!stepper) return;

    stepper.innerHTML = story.stations.map(function (station) {
      return [
        '<li class="step" data-step-station="' + station.id + '">',
        '  <button class="step-button" type="button" data-step="' + station.id + '">',
        '    <span class="step-dot">',
        '      <span class="step-number" aria-hidden="true">' + station.id + '</span>',
        '      <svg class="icon step-icon-check" aria-hidden="true"><use href="#i-check"></use></svg>',
        '      <svg class="icon step-icon-lock" aria-hidden="true"><use href="#i-lock"></use></svg>',
        '    </span>',
        '    <span class="step-label">' + U.escapeHtml(station.stepLabel || station.title) + '</span>',
        '    <span class="sr-only">— Station ' + station.id + ': ' + U.escapeHtml(station.title) + '</span>',
        '  </button>',
        '</li>'
      ].join('');
    }).join('');

    stepper.querySelectorAll('.step-button').forEach(function (button) {
      button.addEventListener('click', function () {
        const stationId = Number(button.dataset.step);
        const state = window.AppState.getState();

        if (stationId > state.unlockedStation) {
          App.showToast('Sunod-sunod ang mga istasyon. Tapusin muna ang Station ' + state.unlockedStation + '.');
          return;
        }

        showStation(stationId, { focus: true, scroll: true });
      });
    });
  }

  function refreshStepper() {
    if (!story) return;

    const state = window.AppState.getState();
    const current = window.AppState.getState().currentStation;
    const total = story.stations.length;
    const progress = total > 1 ? ((current - 1) / (total - 1)) * 80 : 0;

    document.querySelectorAll('.step').forEach(function (step) {
      const id = Number(step.dataset.stepStation);
      const button = step.querySelector('.step-button');
      const isCurrent = id === current;
      const isDone = state.completed.indexOf(id) !== -1;
      const isUnlocked = id <= state.unlockedStation;

      step.classList.toggle('is-current', isCurrent);
      step.classList.toggle('is-done', isDone);
      step.classList.toggle('is-locked', !isUnlocked);

      if (isCurrent) {
        button.setAttribute('aria-current', 'step');
      } else {
        button.removeAttribute('aria-current');
      }

      button.setAttribute('aria-disabled', String(!isUnlocked));
    });

    const fill = document.getElementById('stepperFill');
    if (fill) fill.style.width = progress + '%';

    const currentStation = story.stations.find(function (station) { return station.id === current; });
    const caption = document.getElementById('stepperCaption');
    if (caption && currentStation) {
      caption.textContent = 'Station ' + current + ' ng ' + total + ' · ' + currentStation.title;
    }

    document.title = 'Station ' + current + ' · DALUM-AWIT — ' + (currentStation ? currentStation.title : 'Ang Paglalakbay ni Mutya');
  }

  /* ------------------------------------------------------------
     Navigation and completion checks
     ------------------------------------------------------------ */
  function canComplete(stationId) {
    const state = window.AppState.getState();

    if (stationId === 1) {
      return window.AppState.isDialogueDone(1) && state.station1.quizCorrect;
    }

    if (stationId === 2) {
      const lyrics = story.stations[1].lesson.lyrics;
      return lyrics.every(function (lyric) {
        return state.station2.opened.indexOf(lyric.id) !== -1;
      });
    }

    if (stationId === 3) {
      return window.AppState.isDialogueDone(3);
    }

    if (stationId === 4) {
      if (!state.station4.issue) return false;
      const answer = window.AppState.getAnswer(state.station4.issue);
      return Boolean(answer.decision) && String(answer.reflection || '').trim().length >= 40;
    }

    return false;
  }

  function completionHint(stationId) {
    if (stationId === 1) return 'Tapusin muna ang usapan at sagutin nang tama ang tsek ng pag-unawa.';
    if (stationId === 2) return 'Buksan muna ang lahat ng pagsusuri sa mga linya ng awit.';
    if (stationId === 3) return 'Tapusin muna ang usapan nina Mutya at Mang Isko.';
    if (stationId === 4) return 'Pumili ng isyu, sagutin ang OO o HINDI, at magbigay ng paliwanag na may 40 karakter.';
    return '';
  }

  function showStation(stationId, options) {
    if (!story) return false;

    const opts = options || {};
    const id = U.clamp(Number(stationId) || 1, 1, 5);
    const state = window.AppState.getState();

    if (id > state.unlockedStation) {
      App.showToast('Tapusin muna ang Station ' + state.unlockedStation + ' upang magpatuloy.');
      return false;
    }

    const sections = document.querySelectorAll('.station-view');
    const target = document.getElementById('station-' + id);
    if (!target) return false;

    sections.forEach(function (section) {
      section.hidden = section !== target;
      section.classList.remove('is-active');
    });

    target.hidden = false;
    void target.offsetWidth;
    target.classList.add('is-active');

    window.AppState.setStation(id);
    activeStation = id;
    refreshStepper();

    const module = modules[id];
    if (module && typeof module.onShow === 'function') {
      module.onShow();
    }

    if (opts.scroll !== false) {
      window.scrollTo({
        top: 0,
        behavior: App.prefersReducedMotion() ? 'auto' : 'smooth'
      });
    }

    if (opts.focus !== false) {
      const heading = target.querySelector('h1');
      if (heading) {
        window.setTimeout(function () {
          heading.focus({ preventScroll: true });
        }, 80);
      }
    }

    return true;
  }

  function onDialogueComplete(stationId) {
    const module = modules[stationId];
    if (module && typeof module.onShow === 'function') {
      module.onShow();
    }

    const activity = document.getElementById('station' + stationId + 'Activity');
    if (activity && !activity.hidden) {
      window.setTimeout(function () {
        activity.scrollIntoView({
          behavior: App.prefersReducedMotion() ? 'auto' : 'smooth',
          block: 'start'
        });
      }, 180);
    }
  }

  /* ------------------------------------------------------------
     Module and dialogue initialisation
     ------------------------------------------------------------ */
  function initModules() {
    window.Station1.init(story);
    window.Station2.init(story);
    window.Station3.init(story);
    window.Station4.init(story);
    window.Station5.init(story);

    modules = {
      1: window.Station1,
      2: window.Station2,
      3: window.Station3,
      4: window.Station4,
      5: window.Station5
    };
  }

  function initDialogues() {
    const station1 = story.stations.find(function (item) { return item.id === 1; });
    const station3 = story.stations.find(function (item) { return item.id === 3; });
    const station4 = story.stations.find(function (item) { return item.id === 4; });

    engines[1] = window.DialogueEngine.create(document.getElementById('stage-1'), {
      station: station1,
      characters: story.characters,
      onComplete: function () { onDialogueComplete(1); }
    });

    engines[3] = window.DialogueEngine.create(document.getElementById('stage-3'), {
      station: station3,
      characters: story.characters,
      onComplete: function () { onDialogueComplete(3); }
    });

    engines[4] = window.DialogueEngine.create(document.getElementById('stage-4'), {
      station: station4,
      characters: story.characters,
      onComplete: function () { onDialogueComplete(4); }
    });
  }

  function preloadImages() {
    const files = [];
    Object.keys(story.characters).forEach(function (key) {
      const character = story.characters[key];
      if (character.sprite) files.push(character.sprite);
      if (character.sprites) {
        Object.keys(character.sprites).forEach(function (stateKey) {
          files.push(character.sprites[stateKey]);
        });
      }
    });

    files.forEach(function (file) {
      const image = new Image();
      image.src = U.imagePath(file);
    });
  }

  /* ------------------------------------------------------------
     Global UI: dialogs, back buttons, brand
     ------------------------------------------------------------ */
  function openDialog(dialog) {
    if (!dialog) return;
    if (typeof dialog.showModal === 'function') {
      if (!dialog.open) dialog.showModal();
    } else {
      dialog.setAttribute('open', '');
    }
  }

  function closeDialog(dialog) {
    if (!dialog) return;
    if (typeof dialog.close === 'function' && dialog.open) dialog.close();
    else dialog.removeAttribute('open');
  }

  function bindGlobalUI() {
    const helpDialog = document.getElementById('helpDialog');
    const resetDialog = document.getElementById('resetDialog');

    document.getElementById('helpBtn').addEventListener('click', function () {
      openDialog(helpDialog);
    });

    document.getElementById('resetBtn').addEventListener('click', function () {
      openDialog(resetDialog);
    });

    document.querySelectorAll('[data-close-dialog]').forEach(function (button) {
      button.addEventListener('click', function () {
        closeDialog(button.closest('dialog'));
      });
    });

    [helpDialog, resetDialog].forEach(function (dialog) {
      if (!dialog) return;
      dialog.addEventListener('click', function (event) {
        if (event.target === dialog) closeDialog(dialog);
      });
    });

    document.getElementById('confirmReset').addEventListener('click', function () {
      window.AppState.reset();
      window.location.reload();
    });

    document.getElementById('brandHome').addEventListener('click', function (event) {
      event.preventDefault();
      showStation(1, { focus: true, scroll: true });
    });

    document.querySelectorAll('[data-back]').forEach(function (button) {
      button.addEventListener('click', function () {
        showStation(Number(button.dataset.back), { focus: true, scroll: true });
      });
    });
  }

  /* ------------------------------------------------------------
     Boot
     ------------------------------------------------------------ */
  async function init() {
    try {
      story = await loadStoryData();
    } catch (error) {
      document.querySelectorAll('.station-view').forEach(function (section) {
        section.hidden = true;
      });
      const errorPanel = document.getElementById('loadError');
      if (errorPanel) errorPanel.hidden = false;
      return;
    }

    window.STORY = story;

    renderHeaders();
    buildStepper();
    initModules();
    initDialogues();
    preloadImages();
    bindGlobalUI();

    const saved = window.AppState.getState();
    showStation(saved.currentStation || 1, { scroll: false, focus: false });
    refreshStepper();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
