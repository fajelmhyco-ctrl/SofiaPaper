/* ============================================================
   DALUM-AWIT · Application controller
   ============================================================ */
(function () {
  'use strict';

  const U = window.DalumUtils;

  let story = null;
  let modules = {};
  let engines = {};
  let pictureEngine = null;
  let dialoguesInitialized = false;
  let appEntered = false;
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
      return window.AppState.isDialogueDone(1) && window.QuizManager.isStationComplete(1);
    }

    if (stationId === 2) {
      const lyrics = story.stations[1].lesson.lyrics;
      const lessonComplete = lyrics.every(function (lyric) {
        return state.station2.opened.indexOf(lyric.id) !== -1;
      });
      return lessonComplete && window.QuizManager.isStationComplete(2);
    }

    if (stationId === 3) {
      return window.AppState.isDialogueDone(3) && window.QuizManager.isStationComplete(3);
    }

    if (stationId === 4) {
      if (!state.station4.issue) return false;
      const answer = window.AppState.getAnswer(state.station4.issue);
      return Boolean(answer.decision) &&
        String(answer.reflection || '').trim().length >= 40 &&
        window.QuizManager.isStationComplete(4);
    }

    return false;
  }

  function completionHint(stationId) {
    if (stationId === 1) return 'Tapusin muna ang larawang kuwento at sagutan ang lahat ng tanong.';
    if (stationId === 2) return 'Buksan ang lahat ng pagsusuri at sagutan ang lahat ng tanong.';
    if (stationId === 3) return 'Sagutan muna ang lahat ng tanong sa Station 3.';
    if (stationId === 4) return 'Kumpletuhin ang paliwanag at sagutan ang lahat ng tanong sa Station 4.';
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
    if (dialoguesInitialized) return;
    dialoguesInitialized = true;

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

  /* ------------------------------------------------------------
     Landing, audio, and required picture-slide gate
     ------------------------------------------------------------ */
  function pictureSlideLines() {
    const lines = [];

    story.stations.forEach(function (station) {
      if (Array.isArray(station.dialogue) && station.dialogue.length) {
        station.dialogue.forEach(function (line) {
          lines.push(Object.assign({}, line));
        });
        return;
      }

      if (station.id === 2 && station.lesson) {
        lines.push({
          speaker: 'narrator',
          text: station.lesson.intro,
          scene: station.scene || 'field-afternoon',
          mutya: 'nakatayo',
          isko: 'nagsasalita'
        });
      }

      if (station.id === 5) {
        if (station.opening) {
          lines.push({
            speaker: 'narrator',
            text: station.opening,
            scene: station.scene || 'dawn',
            mutya: 'nakatayo'
          });
        }
        if (station.banner && station.banner.quote) {
          lines.push({
            speaker: 'mutya',
            text: station.banner.quote,
            scene: station.scene || 'dawn',
            mutya: 'nagsasalita'
          });
        }
      }
    });

    return lines;
  }

  function markStationStoriesViewed() {
    story.stations.forEach(function (station) {
      if (!Array.isArray(station.dialogue) || !station.dialogue.length) return;
      window.AppState.setDialogueIndex(station.id, station.dialogue.length - 1);
      if (!window.AppState.isDialogueDone(station.id)) {
        window.AppState.markDialogueDone(station.id);
      }
    });
  }

  function enterStudentApp(options) {
    const opts = options || {};
    if (!window.AppState.isPictureSlidesComplete()) return;
    if (appEntered) return;

    markStationStoriesViewed();

    const landing = document.getElementById('landingScreen');
    const slides = document.getElementById('pictureSlidesScreen');
    if (landing) landing.hidden = true;
    if (slides) slides.hidden = true;
    document.body.classList.remove('is-landing', 'is-slides');

    appEntered = true;
    initDialogues();

    const saved = window.AppState.getState();
    showStation(saved.currentStation || 1, {
      scroll: opts.fromSlides ? false : opts.scroll,
      focus: opts.fromSlides ? false : opts.focus
    });
    refreshStepper();

    if (opts.fromSlides) {
      window.setTimeout(function () {
        const questionSection = document.getElementById('station1Quiz') || document.getElementById('station1Activity');
        if (questionSection) {
          questionSection.scrollIntoView({
            behavior: App.prefersReducedMotion() ? 'auto' : 'smooth',
            block: 'start'
          });
          const firstQuestion = questionSection.querySelector('h2');
          if (firstQuestion) {
            firstQuestion.setAttribute('tabindex', '-1');
            firstQuestion.focus({ preventScroll: true });
          }
        }
      }, 120);
    }
  }

  function completePictureSlides() {
    window.AppState.completePictureSlides();
    markStationStoriesViewed();
    enterStudentApp({ fromSlides: true });
  }

  function showPictureSlides() {
    const landing = document.getElementById('landingScreen');
    const slides = document.getElementById('pictureSlidesScreen');
    if (landing) landing.hidden = true;
    if (slides) slides.hidden = false;
    document.body.classList.remove('is-landing');
    document.body.classList.add('is-slides');

    if (!pictureEngine) {
      pictureEngine = window.DialogueEngine.create(document.getElementById('pictureSlidesMount'), {
        station: {
          id: 'picture-slides',
          scene: 'field-morning',
          dialogue: pictureSlideLines()
        },
        characters: story.characters,
        ariaLabel: 'Sunod-sunod na larawang kuwento',
        finishLabel: 'Pumunta sa mga tanong',
        completedLabel: 'Napanood na',
        getSavedIndex: function () {
          return window.AppState.getState().pictureSlides.index;
        },
        setIndex: function (index) {
          window.AppState.setPictureSlideIndex(index);
        },
        isDone: function () {
          return window.AppState.isPictureSlidesComplete();
        },
        markDone: function () {
          window.AppState.completePictureSlides();
        },
        onComplete: completePictureSlides
      });
    }

    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  function startAudio() {
    const audio = document.getElementById('backgroundAudio');
    if (!audio) return;
    audio.volume = 0.38;
    const playback = audio.play();
    if (playback && typeof playback.catch === 'function') {
      playback.catch(function () {
        /* The student flow still works while the MP3 is absent or unavailable. */
      });
    }
  }

  function bindEntryFlow() {
    const startButton = document.getElementById('startBtn');
    if (!startButton) return;
    startButton.disabled = false;
    startButton.addEventListener('click', function () {
      startAudio();
      if (window.AppState.isPictureSlidesComplete()) {
        enterStudentApp({ scroll: false, focus: false });
      } else {
        showPictureSlides();
      }
    });
  }

  function bindResultsSync() {
    if (!window.ResultsStore) return;
    window.AppState.subscribe(function (state) {
      window.ResultsStore.syncSoon(story, state);
    });
    window.addEventListener('pagehide', function () {
      window.ResultsStore.syncNow(story, window.AppState.getState());
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
      if (window.ResultsStore && story) {
        window.ResultsStore.syncNow(story, window.AppState.getState());
      }
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
      document.body.classList.remove('is-landing', 'is-slides');
      const landing = document.getElementById('landingScreen');
      const slides = document.getElementById('pictureSlidesScreen');
      if (landing) landing.hidden = true;
      if (slides) slides.hidden = true;
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
    window.QuizManager.init(story);
    initModules();
    preloadImages();
    bindGlobalUI();
    bindResultsSync();
    bindEntryFlow();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
