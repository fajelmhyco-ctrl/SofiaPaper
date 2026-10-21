/* ============================================================
   DALUM-AWIT · Station 1 — comprehension check
   ============================================================ */
(function () {
  'use strict';

  const U = window.DalumUtils;
  const LETTERS = ['A', 'B', 'C', 'D'];

  let station = null;
  let quiz = null;
  let els = {};

  function feedbackFor(option) {
    if (!option) return '';
    return [
      '<span class="feedback-icon" aria-hidden="true">',
      '  <svg class="icon"><use href="#' + (option.correct ? 'i-check' : 'i-close') + '"></use></svg>',
      '</span>',
      '<div class="feedback-copy">',
      '  <strong>' + (option.correct ? 'Tama ang iyong sagot.' : 'Subukan muli.') + '</strong>',
      '  <p>' + U.escapeHtml(option.feedback) + '</p>',
      '</div>'
    ].join('');
  }

  function updateNext() {
    const state = window.AppState.getState();
    const isCorrect = Boolean(state.station1.quizCorrect);
    const dialogueDone = window.AppState.isDialogueDone(1);

    els.next.disabled = !isCorrect;
    els.hint.textContent = !dialogueDone
      ? 'Tapusin muna ang usapan.'
      : isCorrect
        ? 'Handa ka nang magpatuloy sa Station 2.'
        : 'Sagutin nang tama ang tsek upang magpatuloy.';
  }

  function paint() {
    const state = window.AppState.getState();
    const selectedId = state.station1.quizAnswer;
    const isCorrect = Boolean(state.station1.quizCorrect);

    els.options.querySelectorAll('.quiz-option').forEach(function (button) {
      const id = button.dataset.option;
      const option = quiz.options.find(function (item) { return item.id === id; });
      const isSelected = id === selectedId;

      button.classList.toggle('is-selected', isSelected);
      button.classList.toggle('is-correct', Boolean(isSelected && isCorrect));
      button.classList.toggle('is-wrong', Boolean(isSelected && !isCorrect));
      button.setAttribute('aria-pressed', String(isSelected));
      button.disabled = isCorrect;
    });

    if (selectedId) {
      const option = quiz.options.find(function (item) { return item.id === selectedId; });
      els.feedback.hidden = false;
      els.feedback.className = 'quiz-feedback ' + (isCorrect ? 'is-correct' : 'is-wrong');
      els.feedback.innerHTML = feedbackFor(option);
    } else {
      els.feedback.hidden = true;
      els.feedback.innerHTML = '';
    }

    updateNext();
  }

  function choose(optionId) {
    const state = window.AppState.getState();
    if (state.station1.quizCorrect) return;

    const option = quiz.options.find(function (item) { return item.id === optionId; });
    if (!option) return;

    window.AppState.setQuizAnswer(option.id, option.correct);

    paint();
    if (option.correct) {
      window.App.showToast('Tama! Nabuksan mo ang susunod na bahagi ng paglalakbay.');
    }
  }

  function renderOptions() {
    els.options.innerHTML = quiz.options.map(function (option, index) {
      return [
        '<button class="quiz-option" type="button" data-option="' + U.escapeHtml(option.id) + '" aria-pressed="false">',
        '  <span class="quiz-option-letter" aria-hidden="true">' + LETTERS[index] + '</span>',
        '  <span class="quiz-option-text">' + U.escapeHtml(option.text) + '</span>',
        '  <span class="quiz-option-mark" aria-hidden="true"></span>',
        '</button>'
      ].join('');
    }).join('');

    els.options.querySelectorAll('.quiz-option').forEach(function (button) {
      button.addEventListener('click', function () {
        choose(button.dataset.option);
      });
    });
  }

  function onShow() {
    const dialogueDone = window.AppState.isDialogueDone(1);
    els.activity.hidden = !dialogueDone;
    if (dialogueDone) paint();
  }

  function init(storyData) {
    station = storyData.stations.find(function (item) { return item.id === 1; });
    quiz = station.quiz;

    els.activity = document.getElementById('station1Activity');
    els.options = document.getElementById('quizOptions');
    els.feedback = document.getElementById('quizFeedback');
    els.next = document.getElementById('station1Next');
    els.hint = document.getElementById('station1Hint');
    els.review = document.getElementById('station1Review');

    document.getElementById('quizQuestion').textContent = quiz.question;
    renderOptions();

    els.next.addEventListener('click', function () {
      if (els.next.disabled) return;
      window.App.completeStation(1);
    });

    els.review.addEventListener('click', function () {
      const mount = document.getElementById('stage-1');
      if (!mount) return;
      mount.scrollIntoView({ behavior: window.App.prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
    });

    window.AppState.subscribe(function () {
      const current = window.AppState.getState();
      if (current.currentStation === 1) updateNext();
    });
  }

  window.Station1 = {
    init: init,
    onShow: onShow
  };
})();
