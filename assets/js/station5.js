/* ============================================================
   DALUM-AWIT · Station 5 — synthesis, summary, submission
   ============================================================ */
(function () {
  'use strict';

  const U = window.DalumUtils;

  let story = null;
  let station = null;
  let issues = [];
  let synthesis = [];
  let els = {};
  let submitting = false;
  let submissionRequested = false;

  function selectedIssue() {
    const issueId = window.AppState.getState().station4.issue;
    return issues.find(function (issue) { return issue.id === issueId; }) || null;
  }

  function selectedAnswer() {
    const issue = selectedIssue();
    return issue ? window.AppState.getAnswer(issue.id) : { decision: null, reflection: '' };
  }

  function buildBanner() {
    const banner = station.banner || {};
    els.quote.textContent = banner.quote || '';
    els.attribution.textContent = banner.attribution || '';
    if (banner.sprite) {
      els.figure.innerHTML = '<img src="' + U.imagePath(banner.sprite) + '" alt="" draggable="false">';
    }
    els.opening.textContent = station.opening || '';
    document.getElementById('finalInsightLabel').textContent = station.reflectionLabel || 'Ang pinakamahalagang natutuhan ko';
    document.getElementById('finalInsightPrompt').textContent = station.reflectionPrompt || '';
    document.getElementById('finalInsight').placeholder = station.reflectionPrompt || 'Isulat ang iyong sintesis...';
  }

  function buildSynthesis() {
    els.diagram.innerHTML = synthesis.map(function (node, index) {
      const item = [
        '<div class="synthesis-item" data-synthesis="' + U.escapeHtml(node.id) + '">',
        '  <button class="synthesis-node" type="button" aria-expanded="false" aria-controls="synthesis-detail-' + U.escapeHtml(node.id) + '">',
        '    <span class="synthesis-number" aria-hidden="true">' + U.escapeHtml(node.number) + '</span>',
        '    <span class="synthesis-main">',
        '      <span class="synthesis-label">' + U.escapeHtml(node.label) + '</span>',
        '      <span class="synthesis-summary">' + U.escapeHtml(node.summary) + '</span>',
        '    </span>',
        '    <span class="synthesis-toggle" aria-hidden="true"><svg class="icon"><use href="#i-chevron"></use></svg></span>',
        '  </button>',
        '  <div class="synthesis-detail" id="synthesis-detail-' + U.escapeHtml(node.id) + '" aria-hidden="true">',
        '    <div class="synthesis-detail-inner">',
        '      <p>' + U.escapeHtml(node.detail) + '</p>',
        '      <blockquote>' + U.escapeHtml(node.evidence) + '</blockquote>',
        '    </div>',
        '  </div>',
        '</div>'
      ].join('');

      const connector = index < synthesis.length - 1
        ? '<span class="synthesis-connector" aria-hidden="true"><svg class="icon"><use href="#i-arrow-down"></use></svg></span>'
        : '';

      return item + connector;
    }).join('');

    els.diagram.querySelectorAll('.synthesis-node').forEach(function (button) {
      button.addEventListener('click', function () {
        const item = button.closest('.synthesis-item');
        const willOpen = !item.classList.contains('is-open');

        els.diagram.querySelectorAll('.synthesis-item').forEach(function (other) {
          other.classList.remove('is-open');
          other.querySelector('.synthesis-node').setAttribute('aria-expanded', 'false');
          other.querySelector('.synthesis-detail').setAttribute('aria-hidden', 'true');
        });

        if (willOpen) {
          item.classList.add('is-open');
          button.setAttribute('aria-expanded', 'true');
          item.querySelector('.synthesis-detail').setAttribute('aria-hidden', 'false');
        }
      });
    });
  }

  function syncSummary() {
    const state = window.AppState.getState();
    const issue = selectedIssue();
    const answer = selectedAnswer();
    const reflection = String(answer.reflection || '').trim();

    if (document.activeElement !== els.name) els.name.value = state.student.name || '';
    if (document.activeElement !== els.section) els.section.value = state.student.section || '';
    if (document.activeElement !== els.insight) els.insight.value = state.finalInsight || '';

    els.date.textContent = U.formatDate(new Date());

    if (issue) {
      els.issue.textContent = issue.letter + '. ' + issue.title;
      els.question.textContent = issue.question;
    } else {
      els.issue.textContent = 'Wala pang napiling isyu';
      els.question.textContent = 'Bumalik sa Station 4 upang pumili ng isyung panlipunan at isulat ang iyong paliwanag.';
    }

    const decision = answer.decision;
    els.decision.textContent = decision === 'oo' ? 'OO' : decision === 'hindi' ? 'HINDI' : '—';
    els.decision.className = 'answer-badge ' +
      (decision === 'oo' ? 'is-yes' : decision === 'hindi' ? 'is-no' : 'is-empty');

    els.reflection.textContent = reflection || 'Wala pang naisulat na paliwanag.';
    els.reflection.classList.toggle('is-empty', !reflection);

    const editLabel = issue ? (decision && reflection ? 'I-edit ang sagot' : 'Kumpletuhin ang sagot') : 'Pumili ng isyu';
    els.editBtn.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#i-edit"></use></svg>' + U.escapeHtml(editLabel);
  }

  function setSubmitBusy(busy) {
    els.submitBtn.disabled = busy;
    els.submitBtn.setAttribute('aria-busy', String(busy));
    els.submitBtn.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#i-check"></use></svg>' +
      (busy ? 'Ipinapadala…' : 'Submit');
  }

  function showThankYou() {
    const state = window.AppState.getState();
    const name = String(state.student.name || '').trim();
    const section = String(state.student.section || '').trim();
    const submittedAt = state.finalSubmissionAt || new Date().toISOString();

    els.thankYouName.textContent = name || 'mag-aaral';
    els.thankYouSection.textContent = section || '—';
    els.thankYouDate.textContent = U.formatDate(submittedAt);

    Array.prototype.forEach.call(els.station.children, function (child) {
      child.hidden = child !== els.thankYou;
    });
    els.thankYou.hidden = false;

    document.title = 'Nai-submit · DALUM-AWIT';

    if (els.thankYou.dataset.visible !== 'true') {
      els.thankYou.dataset.visible = 'true';
      window.scrollTo({
        top: 0,
        behavior: window.App.prefersReducedMotion() ? 'auto' : 'smooth'
      });
      window.setTimeout(function () {
        els.thankYouTitle.focus({ preventScroll: true });
      }, 80);
    }
  }

  function confirmSubmission() {
    if (!window.AppState.isSubmissionComplete()) {
      window.AppState.markSubmissionComplete();
    }
    showThankYou();
  }

  async function submitAnswers() {
    if (submitting) return;
    if (window.AppState.isSubmissionComplete()) {
      showThankYou();
      return;
    }
    if (!window.OnlineStore || typeof window.OnlineStore.submit !== 'function') {
      window.App.showToast('Hindi pa nakakonekta ang online database. Tingnan ang supabase/SETUP.md.', 6000);
      return;
    }

    window.AppState.setStudentField('name', els.name.value);
    window.AppState.setStudentField('section', els.section.value);
    window.AppState.setFinalInsight(els.insight.value);

    submitting = true;
    submissionRequested = true;
    setSubmitBusy(true);

    try {
      const confirmed = await window.OnlineStore.submit(story, window.AppState.getState());
      if (confirmed) {
        confirmSubmission();
      } else {
        setSubmitBusy(false);
        window.App.showToast('Naka-save sa device ang mga sagot; ipapadala kapag nakakonekta online.', 6000);
      }
    } catch (error) {
      setSubmitBusy(false);
      window.App.showToast(error.message || 'Hindi naipadala ang mga sagot. Subukan muli.', 6000);
    } finally {
      submitting = false;
    }
  }

  function onSyncStatus(event) {
    if (!submissionRequested || window.AppState.isSubmissionComplete()) return;
    if (event.detail && event.detail.state === 'saved') {
      confirmSubmission();
    }
  }

  function goEditAnswers() {
    window.App.goToStation(4);
    window.setTimeout(function () {
      const workspace = document.getElementById('issueWorkspace');
      const target = workspace && !workspace.hidden ? workspace : document.getElementById('issueGrid');
      if (target) {
        target.scrollIntoView({
          behavior: window.App.prefersReducedMotion() ? 'auto' : 'smooth',
          block: 'start'
        });
      }
    }, 320);
  }

  function onShow() {
    window.QuizManager.paintStation(5);
    syncSummary();
    if (window.AppState.isSubmissionComplete()) showThankYou();
  }

  function init(storyData) {
    story = storyData;
    station = story.stations.find(function (item) { return item.id === 5; });
    issues = story.issues || [];
    synthesis = story.synthesis || [];

    els.station = document.getElementById('station-5');
    els.quote = document.getElementById('station5Quote');
    els.attribution = document.getElementById('station5Attribution');
    els.figure = document.getElementById('station5Figure');
    els.opening = document.getElementById('station5Opening');
    els.diagram = document.getElementById('synthesisDiagram');

    els.name = document.getElementById('studentName');
    els.section = document.getElementById('studentSection');
    els.date = document.getElementById('summaryDate');
    els.issue = document.getElementById('summaryIssue');
    els.question = document.getElementById('summaryQuestion');
    els.decision = document.getElementById('summaryDecision');
    els.reflection = document.getElementById('summaryReflection');
    els.insight = document.getElementById('finalInsight');
    els.editBtn = document.getElementById('summaryEditBtn');
    els.submitBtn = document.getElementById('submitAnswersBtn');

    els.thankYou = document.getElementById('thankYouScreen');
    els.thankYouTitle = document.getElementById('thankYouTitle');
    els.thankYouName = document.getElementById('thankYouStudentName');
    els.thankYouSection = document.getElementById('thankYouSection');
    els.thankYouDate = document.getElementById('thankYouDate');
    els.thankYouResetBtn = document.getElementById('thankYouResetBtn');

    buildBanner();
    buildSynthesis();

    els.name.addEventListener('input', function () {
      window.AppState.setStudentField('name', els.name.value);
    });
    els.section.addEventListener('input', function () {
      window.AppState.setStudentField('section', els.section.value);
    });
    els.insight.addEventListener('input', function () {
      window.AppState.setFinalInsight(els.insight.value);
    });

    els.editBtn.addEventListener('click', goEditAnswers);
    els.submitBtn.addEventListener('click', submitAnswers);
    document.getElementById('restartBtn2').addEventListener('click', function () {
      window.App.openResetDialog();
    });
    els.thankYouResetBtn.addEventListener('click', function () {
      window.App.openResetDialog();
    });

    document.addEventListener('dalum:sync-status', onSyncStatus);
    syncSummary();
  }

  window.Station5 = {
    init: init,
    onShow: onShow
  };
})();
