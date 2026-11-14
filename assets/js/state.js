/* ============================================================
   DALUM-AWIT · Shared utilities + state manager
   ============================================================ */
(function () {
  'use strict';

  const IMAGE_BASE = 'assets/images/';

  window.DalumUtils = {
    escapeHtml(value) {
      return String(value == null ? '' : value).replace(/[&<>"']/g, function (character) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character];
      });
    },

    imagePath(file) {
      return encodeURI(IMAGE_BASE + file);
    },

    formatDate(date) {
      const target = date instanceof Date ? date : new Date(date);
      try {
        return new Intl.DateTimeFormat('fil-PH', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        }).format(target);
      } catch (error) {
        return target.toLocaleDateString();
      }
    },

    debounce(fn, wait) {
      let timer = null;
      return function debounced() {
        const context = this;
        const args = arguments;
        window.clearTimeout(timer);
        timer = window.setTimeout(function () {
          fn.apply(context, args);
        }, wait);
      };
    },

    clamp(value, min, max) {
      return Math.min(Math.max(value, min), max);
    }
  };
})();

(function () {
  'use strict';

  const STORAGE_KEY = 'dalumAwit.state.v1';

  function createAttemptId() {
    try {
      if (window.crypto && typeof window.crypto.randomUUID === 'function') {
        return window.crypto.randomUUID();
      }
    } catch (error) {
      /* Fall through to a timestamp-based identifier. */
    }
    return 'attempt-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  function createDefaultState() {
    return {
      version: 2,
      attemptId: createAttemptId(),
      currentStation: 1,
      unlockedStation: 1,
      visited: [1],
      completed: [],
      pictureSlides: {
        index: 0,
        complete: false
      },
      assessment: {
        answers: {},
        submittedAt: null
      },
      dialogue: { 1: 0, 3: 0, 4: 0 },
      dialogueDone: {},
      station1: {
        quizAnswer: null,
        quizCorrect: false
      },
      station2: {
        opened: []
      },
      station3: {
        flowNode: 'pagtatanim'
      },
      station4: {
        issue: null,
        answers: {
          a: { decision: null, reflection: '' },
          b: { decision: null, reflection: '' },
          c: { decision: null, reflection: '' }
        }
      },
      student: {
        name: '',
        section: ''
      },
      finalInsight: '',
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  function isPlainObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  function mergeDefaults(base, saved) {
    if (Array.isArray(base)) {
      return Array.isArray(saved) ? saved.slice() : base.slice();
    }
    if (isPlainObject(base)) {
      const result = {};
      Object.keys(base).forEach(function (key) {
        result[key] = mergeDefaults(base[key], isPlainObject(saved) ? saved[key] : undefined);
      });
      if (isPlainObject(saved)) {
        Object.keys(saved).forEach(function (key) {
          if (!(key in result)) result[key] = saved[key];
        });
      }
      return result;
    }
    return saved === undefined || saved === null ? base : saved;
  }

  function loadState() {
    const defaults = createDefaultState();
    let saved = null;
    try {
      saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || 'null');
    } catch (error) {
      saved = null;
    }

    /* Version 2 introduces the required slide gate and 25-item assessment. */
    if (!isPlainObject(saved) || Number(saved.version) !== 2) saved = null;

    const state = mergeDefaults(defaults, saved);
    state.currentStation = window.DalumUtils.clamp(Number(state.currentStation) || 1, 1, 5);
    state.unlockedStation = window.DalumUtils.clamp(Number(state.unlockedStation) || 1, 1, 5);

    if (state.currentStation > state.unlockedStation) {
      state.currentStation = state.unlockedStation;
    }

    if (!Array.isArray(state.visited) || !state.visited.length) state.visited = [state.currentStation];
    if (!Array.isArray(state.completed)) state.completed = [];
    if (!Array.isArray(state.station2.opened)) state.station2.opened = [];
    if (!state.attemptId) state.attemptId = createAttemptId();
    if (!isPlainObject(state.pictureSlides)) state.pictureSlides = { index: 0, complete: false };
    state.pictureSlides.index = Math.max(0, Number(state.pictureSlides.index) || 0);
    state.pictureSlides.complete = Boolean(state.pictureSlides.complete);
    if (!isPlainObject(state.assessment)) state.assessment = { answers: {}, submittedAt: null };
    if (!isPlainObject(state.assessment.answers)) state.assessment.answers = {};

    return state;
  }

  let state = loadState();
  const listeners = new Set();
  let saveTimer = null;

  function persist() {
    state.updatedAt = new Date().toISOString();
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      /* Private browsing or a full storage quota: the app still works in-session. */
    }
  }

  function saveSoon() {
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(persist, 140);
  }

  function emit() {
    listeners.forEach(function (listener) {
      try {
        listener(state);
      } catch (error) {
        /* A broken subscriber must not stop the rest of the app. */
      }
    });
  }

  function commit() {
    saveSoon();
    emit();
  }

  function addUnique(list, value) {
    if (list.indexOf(value) === -1) list.push(value);
    return list;
  }

  window.AppState = {
    getState() {
      return state;
    },

    subscribe(listener) {
      listeners.add(listener);
      return function unsubscribe() {
        listeners.delete(listener);
      };
    },

    isUnlocked(stationId) {
      return stationId <= state.unlockedStation;
    },

    isComplete(stationId) {
      return state.completed.indexOf(stationId) !== -1;
    },

    completedCount() {
      return state.completed.length;
    },

    setStation(stationId) {
      const id = window.DalumUtils.clamp(Number(stationId) || 1, 1, 5);
      if (id > state.unlockedStation) return false;
      state.currentStation = id;
      addUnique(state.visited, id);
      commit();
      return true;
    },

    markComplete(stationId) {
      const id = window.DalumUtils.clamp(Number(stationId) || 1, 1, 5);
      addUnique(state.completed, id);
      state.unlockedStation = Math.max(state.unlockedStation, Math.min(5, id + 1));
      commit();
    },

    setDialogueIndex(stationId, index) {
      state.dialogue[stationId] = Math.max(0, Number(index) || 0);
      commit();
    },

    markDialogueDone(stationId) {
      state.dialogueDone[stationId] = true;
      commit();
    },

    isDialogueDone(stationId) {
      return Boolean(state.dialogueDone[stationId]);
    },

    setPictureSlideIndex(index) {
      state.pictureSlides.index = Math.max(0, Number(index) || 0);
      commit();
    },

    completePictureSlides() {
      state.pictureSlides.complete = true;
      commit();
    },

    isPictureSlidesComplete() {
      return Boolean(state.pictureSlides.complete);
    },

    setQuizAnswer(questionId, stationId, answerId, isCorrect) {
      const id = String(questionId || '');
      if (!id || state.assessment.answers[id]) return false;
      state.assessment.answers[id] = {
        stationId: Number(stationId) || 1,
        answerId: String(answerId || ''),
        correct: Boolean(isCorrect),
        answeredAt: new Date().toISOString()
      };
      commit();
      return true;
    },

    getQuizAnswer(questionId) {
      return state.assessment.answers[String(questionId || '')] || null;
    },

    markAssessmentSubmitted() {
      if (state.assessment.submittedAt) return false;
      state.assessment.submittedAt = new Date().toISOString();
      persist();
      emit();
      return true;
    },

    addOpenedLyric(lyricId) {
      addUnique(state.station2.opened, lyricId);
      commit();
    },

    openAllLyrics(lyricIds) {
      (lyricIds || []).forEach(function (lyricId) {
        addUnique(state.station2.opened, lyricId);
      });
      commit();
    },

    setFlowNode(nodeId) {
      state.station3.flowNode = nodeId;
      commit();
    },

    selectIssue(issueId) {
      state.station4.issue = issueId;
      commit();
    },

    getAnswer(issueId) {
      return state.station4.answers[issueId] || { decision: null, reflection: '' };
    },

    setDecision(issueId, decision) {
      if (!state.station4.answers[issueId]) {
        state.station4.answers[issueId] = { decision: null, reflection: '' };
      }
      state.station4.answers[issueId].decision = decision;
      commit();
    },

    setReflection(issueId, text) {
      if (!state.station4.answers[issueId]) {
        state.station4.answers[issueId] = { decision: null, reflection: '' };
      }
      state.station4.answers[issueId].reflection = String(text || '');
      commit();
    },

    setStudentField(field, value) {
      if (field !== 'name' && field !== 'section') return;
      state.student[field] = String(value || '');
      commit();
    },

    setFinalInsight(text) {
      state.finalInsight = String(text || '');
      commit();
    },

    saveNow() {
      window.clearTimeout(saveTimer);
      persist();
    },

    reset() {
      window.clearTimeout(saveTimer);
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch (error) {
        /* Ignore storage failures. */
      }
      state = createDefaultState();
      persist();
      emit();
    }
  };

  window.addEventListener('pagehide', persist);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') persist();
  });
})();
