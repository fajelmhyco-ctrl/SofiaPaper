/* ============================================================
   DALUM-AWIT · Shared station quiz renderer
   ============================================================ */
(function () {
  'use strict';

  const U = window.DalumUtils;
  const LETTERS = ['A', 'B', 'C', 'D', 'E'];

  let story = null;
  let questionsByStation = {};
  let questionsById = {};

  function normalizeQuestions(station) {
    if (!station || !station.quiz) return [];
    if (Array.isArray(station.quiz.questions)) return station.quiz.questions;
    if (station.quiz.question && Array.isArray(station.quiz.options)) {
      return [{
        id: 'station-' + station.id + '-question-1',
        number: 1,
        question: station.quiz.question,
        options: station.quiz.options
      }];
    }
    return [];
  }

  function questionsFor(stationId) {
    return questionsByStation[Number(stationId)] || [];
  }

  function answerFor(questionId) {
    return window.AppState.getQuizAnswer(questionId);
  }

  function answeredCount(stationId) {
    return questionsFor(stationId).filter(function (question) {
      return Boolean(answerFor(question.id));
    }).length;
  }

  function isStationComplete(stationId) {
    const questions = questionsFor(stationId);
    return Boolean(questions.length) && answeredCount(stationId) === questions.length;
  }

  function allQuestions() {
    return story ? story.stations.reduce(function (list, station) {
      return list.concat(questionsFor(station.id));
    }, []) : [];
  }

  function isAllComplete() {
    const questions = allQuestions();
    return Boolean(questions.length) && questions.every(function (question) {
      return Boolean(answerFor(question.id));
    });
  }

  function optionMarkup(question, option, index) {
    return [
      '<button class="quiz-option" type="button" data-option="' + U.escapeHtml(option.id) + '" aria-pressed="false">',
      '  <span class="quiz-option-letter" aria-hidden="true">' + (LETTERS[index] || String(index + 1)) + '</span>',
      '  <span class="quiz-option-text">' + U.escapeHtml(option.text) + '</span>',
      '  <span class="quiz-option-mark" aria-hidden="true"></span>',
      '</button>'
    ].join('');
  }

  function questionMarkup(question, index, total) {
    const titleId = 'quiz-title-' + question.id;
    const questionNumber = question.number || (index + 1);
    const assessmentTotal = allQuestions().length || total;
    return [
      '<article class="activity-card quiz-card" data-quiz-question="' + U.escapeHtml(question.id) + '">',
      '  <div class="card-kicker">',
      '    <svg class="icon" aria-hidden="true"><use href="#i-spark"></use></svg>',
      '    <span>Tanong ' + questionNumber + ' ng ' + assessmentTotal + '</span>',
      '  </div>',
      '  <h2 id="' + U.escapeHtml(titleId) + '">' + U.escapeHtml(question.question) + '</h2>',
      '  <div class="quiz-options" role="group" aria-labelledby="' + U.escapeHtml(titleId) + '">',
      question.options.map(function (option, optionIndex) {
        return optionMarkup(question, option, optionIndex);
      }).join(''),
      '  </div>',
      '  <div class="quiz-feedback" role="status" hidden></div>',
      '</article>'
    ].join('');
  }

  function feedbackMarkup(question, answer) {
    const selected = question.options.find(function (option) { return option.id === answer.answerId; });
    const correct = question.options.find(function (option) { return option.correct; });
    const correctIndex = question.options.indexOf(correct);
    const detail = selected && selected.feedback
      ? selected.feedback
      : answer.correct
        ? 'Naitala ang iyong sagot.'
        : 'Ang tamang sagot ay ' + (LETTERS[correctIndex] || '') + '. ' + (correct ? correct.text : '');

    return [
      '<span class="feedback-icon" aria-hidden="true">',
      '  <svg class="icon"><use href="#' + (answer.correct ? 'i-check' : 'i-close') + '"></use></svg>',
      '</span>',
      '<div class="feedback-copy">',
      '  <strong>' + (answer.correct ? 'Tama ang iyong sagot.' : 'Naitala ang iyong sagot.') + '</strong>',
      '  <p>' + U.escapeHtml(detail) + '</p>',
      '</div>'
    ].join('');
  }

  function paintQuestion(card, question) {
    const answer = answerFor(question.id);
    const feedback = card.querySelector('.quiz-feedback');

    card.querySelectorAll('.quiz-option').forEach(function (button) {
      const option = question.options.find(function (item) { return item.id === button.dataset.option; });
      const selected = Boolean(answer && answer.answerId === button.dataset.option);
      const showCorrect = Boolean(answer && option && option.correct);

      button.classList.toggle('is-selected', selected);
      button.classList.toggle('is-wrong', Boolean(selected && !answer.correct));
      button.classList.toggle('is-correct', showCorrect);
      button.setAttribute('aria-pressed', String(selected));
      button.disabled = Boolean(answer);
    });

    if (answer) {
      feedback.hidden = false;
      feedback.className = 'quiz-feedback ' + (answer.correct ? 'is-correct' : 'is-wrong');
      feedback.innerHTML = feedbackMarkup(question, answer);
    } else {
      feedback.hidden = true;
      feedback.className = 'quiz-feedback';
      feedback.innerHTML = '';
    }
  }

  function paintStation(stationId) {
    const stationNumber = Number(stationId);
    const mount = document.querySelector('[data-station-quiz="' + stationNumber + '"]');
    if (!mount) return;

    const questions = questionsFor(stationNumber);
    mount.querySelectorAll('[data-quiz-question]').forEach(function (card) {
      const question = questionsById[card.dataset.quizQuestion];
      if (question) paintQuestion(card, question);
    });

    const progress = mount.querySelector('[data-quiz-progress]');
    if (progress) {
      progress.textContent = answeredCount(stationNumber) + ' / ' + questions.length + ' nasagutan';
    }
  }

  function announceProgress(stationId) {
    document.dispatchEvent(new CustomEvent('dalum:quiz-progress', {
      detail: {
        stationId: Number(stationId),
        complete: isStationComplete(stationId),
        allComplete: isAllComplete()
      }
    }));
  }

  function choose(question, option) {
    const saved = window.AppState.setQuizAnswer(
      question.id,
      question.stationId,
      option.id,
      option.correct
    );
    if (!saved) return;

    paintStation(question.stationId);
    announceProgress(question.stationId);

    if (isAllComplete()) {
      const newlySubmitted = window.AppState.markAssessmentSubmitted();
      if (window.ResultsStore) window.ResultsStore.syncNow(story, window.AppState.getState());
      if (newlySubmitted && window.App) {
        window.App.showToast('Naisumite na ang lahat ng iyong sagot. Mahusay!');
      }
    } else if (isStationComplete(question.stationId) && window.App) {
      window.App.showToast('Nasagutan mo na ang lahat ng tanong sa istasyong ito.');
    }
  }

  function renderStation(station) {
    const mount = document.querySelector('[data-station-quiz="' + station.id + '"]');
    const questions = questionsFor(station.id);
    if (!mount || !questions.length) return;

    const label = station.quiz.label || ('Mga Tanong sa Station ' + station.id);
    mount.classList.add('station-quiz-set');
    mount.innerHTML = [
      '<div class="quiz-set-heading">',
      '  <div>',
      '    <div class="card-kicker"><svg class="icon" aria-hidden="true"><use href="#i-spark"></use></svg><span>Pagsusulit</span></div>',
      '    <h2>' + U.escapeHtml(label) + '</h2>',
      '  </div>',
      '  <span class="quiz-set-progress" data-quiz-progress>0 / ' + questions.length + ' nasagutan</span>',
      '</div>',
      '<div class="quiz-set-list">',
      questions.map(function (question, index) {
        return questionMarkup(question, index, questions.length);
      }).join(''),
      '</div>'
    ].join('');

    mount.querySelectorAll('[data-quiz-question]').forEach(function (card) {
      const question = questionsById[card.dataset.quizQuestion];
      card.querySelectorAll('.quiz-option').forEach(function (button) {
        button.addEventListener('click', function () {
          const option = question.options.find(function (item) { return item.id === button.dataset.option; });
          if (option) choose(question, option);
        });
      });
    });

    paintStation(station.id);
  }

  function init(storyData) {
    story = storyData;
    questionsByStation = {};
    questionsById = {};

    story.stations.forEach(function (station) {
      questionsByStation[station.id] = normalizeQuestions(station).map(function (question) {
        question.stationId = station.id;
        questionsById[question.id] = question;
        return question;
      });
    });

    story.stations.forEach(renderStation);
  }

  window.QuizManager = {
    init: init,
    questionsFor: questionsFor,
    answeredCount: answeredCount,
    isStationComplete: isStationComplete,
    isAllComplete: isAllComplete,
    paintStation: paintStation,
    totalQuestions: function () { return allQuestions().length; }
  };
})();
