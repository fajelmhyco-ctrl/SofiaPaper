/* ============================================================
   DALUM-AWIT · Station 1 — comprehension check
   ============================================================ */
(function () {
  'use strict';

  let els = {};

  function updateNext() {
    const dialogueDone = window.AppState.isDialogueDone(1);
    const quizComplete = window.QuizManager.isStationComplete(1);
    const complete = dialogueDone && quizComplete;

    els.next.disabled = !complete;
    els.hint.textContent = !dialogueDone
      ? 'Tapusin muna ang larawang kuwento.'
      : quizComplete
        ? 'Handa ka nang magpatuloy sa Station 2.'
        : 'Sagutan ang lahat ng tanong upang magpatuloy.';
  }

  function onShow() {
    const dialogueDone = window.AppState.isDialogueDone(1);
    els.activity.hidden = !dialogueDone;
    if (dialogueDone) {
      window.QuizManager.paintStation(1);
      updateNext();
    }
  }

  function init() {
    els.activity = document.getElementById('station1Activity');
    els.next = document.getElementById('station1Next');
    els.hint = document.getElementById('station1Hint');
    els.review = document.getElementById('station1Review');

    els.next.addEventListener('click', function () {
      if (els.next.disabled) return;
      window.App.completeStation(1);
    });

    els.review.addEventListener('click', function () {
      const mount = document.getElementById('stage-1');
      if (!mount) return;
      mount.scrollIntoView({ behavior: window.App.prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
    });

    document.addEventListener('dalum:quiz-progress', function (event) {
      if (event.detail && event.detail.stationId === 1) updateNext();
    });
  }

  window.Station1 = {
    init: init,
    onShow: onShow
  };
})();
