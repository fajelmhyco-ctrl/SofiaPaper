/* ============================================================
   DALUM-AWIT · Station 4 — issue selection + OO/HINDI reflection
   ============================================================ */
(function () {
  'use strict';

  const U = window.DalumUtils;
  const MIN_REFLECTION = 40;

  const ICONS = {
    peso: 'i-peso',
    tools: 'i-tools',
    weather: 'i-weather'
  };

  let story = null;
  let issues = [];
  let els = {};

  function currentIssue() {
    const issueId = window.AppState.getState().station4.issue;
    return issues.find(function (issue) { return issue.id === issueId; }) || null;
  }

  function issueMarkup(issue) {
    return [
      '<button class="issue-card issue-' + U.escapeHtml(issue.id) + '" type="button" data-issue="' + U.escapeHtml(issue.id) + '" aria-pressed="false">',
      '  <span class="issue-top">',
      '    <span class="issue-letter" aria-hidden="true">' + U.escapeHtml(issue.letter) + '</span>',
      '    <span class="issue-icon" aria-hidden="true"><svg class="icon"><use href="#' + (ICONS[issue.icon] || 'i-leaf') + '"></use></svg></span>',
      '  </span>',
      '  <span class="issue-tag">' + U.escapeHtml(issue.tag) + '</span>',
      '  <span class="issue-title">' + U.escapeHtml(issue.title) + '</span>',
      '  <span class="issue-summary">' + U.escapeHtml(issue.summary) + '</span>',
      '  <span class="issue-select-label">',
      '    <span>Suriin ang isyung ito</span>',
      '    <svg class="icon" aria-hidden="true"><use href="#i-arrow-right"></use></svg>',
      '  </span>',
      '  <span class="issue-check" aria-hidden="true"><svg class="icon"><use href="#i-check"></use></svg></span>',
      '</button>'
    ].join('');
  }

  function syncSelection() {
    const issueId = window.AppState.getState().station4.issue;
    els.grid.querySelectorAll('.issue-card').forEach(function (card) {
      const selected = card.dataset.issue === issueId;
      card.classList.toggle('is-selected', selected);
      card.setAttribute('aria-pressed', String(selected));
    });
  }

  function reflectionLength(value) {
    return String(value || '').trim().length;
  }

  function updateNext() {
    const state = window.AppState.getState();
    const issue = currentIssue();
    const answer = issue ? window.AppState.getAnswer(issue.id) : { decision: null, reflection: '' };
    const length = reflectionLength(answer.reflection);
    const reflectionComplete = Boolean(issue && answer.decision && length >= MIN_REFLECTION);
    const quizComplete = window.QuizManager.isStationComplete(4);
    const complete = reflectionComplete && quizComplete;

    els.next.disabled = !complete;

    if (!issue) {
      els.hint.textContent = 'Pumili ng isyu, sagutin ang tanong, at magbigay ng paliwanag.';
    } else if (!answer.decision) {
      els.hint.textContent = 'Sagutin ang tanong gamit ang OO o HINDI.';
    } else if (length < MIN_REFLECTION) {
      els.hint.textContent = 'Kailangan pa ng ' + (MIN_REFLECTION - length) + ' karakter sa iyong paliwanag.';
    } else if (!quizComplete) {
      els.hint.textContent = 'Sagutan ang lahat ng tanong sa Station 4.';
    } else {
      els.hint.textContent = 'Kumpleto na ang iyong mga sagot. Maaari nang magpatuloy sa Station 5.';
    }

    return complete;
  }

  function updateCharCount() {
    const issue = currentIssue();
    if (!issue) return;
    const answer = window.AppState.getAnswer(issue.id);
    const length = reflectionLength(answer.reflection);
    const met = length >= MIN_REFLECTION;

    els.charCount.textContent = length + ' / ' + MIN_REFLECTION + ' min.';
    els.charCount.classList.toggle('is-met', met);
    els.reflectionStatus.classList.toggle('is-met', met);

    if (!answer.decision) {
      els.reflectionStatus.textContent = 'Pumili muna ng OO o HINDI, pagkatapos ay ipaliwanag.';
    } else if (!length) {
      els.reflectionStatus.textContent = 'Isulat ang iyong paliwanag.';
    } else if (!met) {
      els.reflectionStatus.textContent = 'Kailangan pa ng ' + (MIN_REFLECTION - length) + ' karakter.';
    } else {
      els.reflectionStatus.textContent = 'Sapat na ang haba ng iyong paliwanag.';
    }
  }

  function syncDecisionButtons() {
    const issue = currentIssue();
    if (!issue) return;
    const answer = window.AppState.getAnswer(issue.id);

    els.decisionRow.querySelectorAll('[data-decision]').forEach(function (button) {
      const selected = button.dataset.decision === answer.decision;
      button.classList.toggle('is-selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
  }

  function renderWorkspace(issue) {
    if (!issue) {
      els.workspace.hidden = true;
      return;
    }

    const answer = window.AppState.getAnswer(issue.id);

    els.workspace.dataset.issue = issue.id;
    els.workspaceLetter.textContent = issue.letter;
    els.workspaceLetter.className = 'workspace-letter issue-' + issue.id;
    els.workspaceTag.textContent = issue.tag;
    els.workspaceTitle.textContent = issue.title;
    els.workspaceDetail.textContent = issue.detail;
    els.workspacePoints.innerHTML = issue.keyPoints.map(function (point) {
      return '<li>' + U.escapeHtml(point) + '</li>';
    }).join('');

    els.question.textContent = issue.question;
    els.prompt.textContent = issue.prompt;
    els.textarea.value = answer.reflection || '';
    els.workspace.hidden = false;

    syncDecisionButtons();
    updateCharCount();
    updateNext();
  }

  function selectIssue(issueId, shouldScroll) {
    const issue = issues.find(function (item) { return item.id === issueId; });
    if (!issue) return;

    window.AppState.selectIssue(issueId);
    syncSelection();
    renderWorkspace(issue);

    if (shouldScroll && !document.body.classList.contains('station-viewport')) {
      window.setTimeout(function () {
        els.workspace.scrollIntoView({
          behavior: window.App.prefersReducedMotion() ? 'auto' : 'smooth',
          block: 'start'
        });
      }, 100);
    }
  }

  function bindEvents() {
    els.grid.querySelectorAll('.issue-card').forEach(function (card) {
      card.addEventListener('click', function () {
        selectIssue(card.dataset.issue, true);
      });
    });

    els.decisionRow.querySelectorAll('[data-decision]').forEach(function (button) {
      button.addEventListener('click', function () {
        const issue = currentIssue();
        if (!issue) return;
        window.AppState.setDecision(issue.id, button.dataset.decision);
        syncDecisionButtons();
        updateCharCount();
        updateNext();
      });
    });

    els.textarea.addEventListener('input', function () {
      const issue = currentIssue();
      if (!issue) return;
      window.AppState.setReflection(issue.id, els.textarea.value);
      updateCharCount();
      updateNext();
    });

    els.next.addEventListener('click', function () {
      if (els.next.disabled) return;
      window.App.completeStation(4);
    });
  }

  function setActivityVisible(visible) {
    els.activity.hidden = !visible;
    if (visible) {
      syncSelection();
      window.QuizManager.paintStation(4);
      const issue = currentIssue();
      if (issue) renderWorkspace(issue);
      else updateNext();
    }
  }

  function reveal(shouldScroll) {
    setActivityVisible(true);
    if (shouldScroll && !document.body.classList.contains('station-viewport')) {
      window.setTimeout(function () {
        els.activity.scrollIntoView({
          behavior: window.App.prefersReducedMotion() ? 'auto' : 'smooth',
          block: 'start'
        });
      }, 140);
    }
  }

  function onShow() {
    setActivityVisible(window.AppState.isDialogueDone(4));
  }

  function init(storyData) {
    story = storyData;
    issues = story.issues || [];

    els.activity = document.getElementById('station4Activity');
    els.grid = document.getElementById('issueGrid');
    els.workspace = document.getElementById('issueWorkspace');
    els.workspaceLetter = document.getElementById('workspaceLetter');
    els.workspaceTag = document.getElementById('workspaceTag');
    els.workspaceTitle = document.getElementById('workspaceTitle');
    els.workspaceDetail = document.getElementById('workspaceDetail');
    els.workspacePoints = document.getElementById('workspacePoints');
    els.question = document.getElementById('issueQuestion');
    els.prompt = document.getElementById('reflectionPrompt');
    els.textarea = document.getElementById('reflectionInput');
    els.decisionRow = document.getElementById('decisionRow');
    els.charCount = document.getElementById('charCount');
    els.reflectionStatus = document.getElementById('reflectionStatus');
    els.next = document.getElementById('station4Next');
    els.hint = document.getElementById('station4Hint');

    els.grid.innerHTML = issues.map(issueMarkup).join('');
    bindEvents();
    syncSelection();

    const issue = currentIssue();
    if (issue) renderWorkspace(issue);
    updateNext();

    document.addEventListener('dalum:quiz-progress', function (event) {
      if (event.detail && event.detail.stationId === 4) updateNext();
    });
  }

  window.Station4 = {
    init: init,
    onShow: onShow,
    reveal: reveal
  };
})();
