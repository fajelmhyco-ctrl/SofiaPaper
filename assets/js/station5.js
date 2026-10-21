/* ============================================================
   DALUM-AWIT · Station 5 — synthesis, summary, printable report
   ============================================================ */
(function () {
  'use strict';

  const U = window.DalumUtils;

  let story = null;
  let station = null;
  let issues = [];
  let synthesis = [];
  let els = {};

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

  function blankLine() {
    return '<span class="print-blank-line" aria-hidden="true"></span>';
  }

  function buildPrintReport() {
    const state = window.AppState.getState();
    const issue = selectedIssue();
    const answer = selectedAnswer();
    const reflection = String(answer.reflection || '').trim();
    const insight = String(state.finalInsight || '').trim();
    const name = String(state.student.name || '').trim();
    const section = String(state.student.section || '').trim();
    const today = U.formatDate(new Date());
    const decision = answer.decision === 'oo' ? 'OO' : answer.decision === 'hindi' ? 'HINDI' : '—';

    const stationList = story.stations.map(function (item) {
      return '<li><strong>Station ' + item.id + ' — ' + U.escapeHtml(item.title) + ':</strong> ' + U.escapeHtml(item.objective) + '</li>';
    }).join('');

    const chain = synthesis.map(function (node) {
      return '<span>' + U.escapeHtml(node.label) + '</span>';
    }).join('<span class="print-chain-arrow" aria-hidden="true">→</span>');

    els.print.innerHTML = [
      '<div class="print-sheet">',
      '  <header class="print-head">',
      '    <div class="print-brand">',
      '      <span class="print-brand-mark" aria-hidden="true"><svg class="icon"><use href="#i-rice"></use></svg></span>',
      '      <div>',
      '        <p class="print-kicker">Baitang 10 · Filipino</p>',
      '        <h1>DALUM-AWIT</h1>',
      '        <p class="print-subtitle">Ang Paglalakbay ni Mutya: Sa Bukid ng mga Kuwento</p>',
      '      </div>',
      '    </div>',
      '    <p class="print-doc-type">Ulat ng Mag-aaral</p>',
      '  </header>',
      '  <div class="print-meta">',
      '    <div><span>Pangalan</span><strong>' + (name ? U.escapeHtml(name) : blankLine()) + '</strong></div>',
      '    <div><span>Baitang at Seksyon</span><strong>' + (section ? U.escapeHtml(section) : blankLine()) + '</strong></div>',
      '    <div><span>Petsa</span><strong>' + U.escapeHtml(today) + '</strong></div>',
      '    <div><span>Guro</span><strong>' + blankLine() + '</strong></div>',
      '  </div>',

      '  <section class="print-section">',
      '    <h2><span class="print-section-number">1</span> Napiling Isyung Panlipunan</h2>',
      issue
        ? '    <p class="print-issue-title">' + U.escapeHtml(issue.letter + '. ' + issue.title) + '</p><p>' + U.escapeHtml(issue.summary) + '</p>'
        : '    <p class="print-issue-title">Wala pang napiling isyu.</p>',
      issue ? '    <p class="print-question"><strong>Tanong:</strong> ' + U.escapeHtml(issue.question) + '</p>' : '',
      '  </section>',

      '  <section class="print-section">',
      '    <h2><span class="print-section-number">2</span> Aking Pananaw</h2>',
      '    <p class="print-decision">Aking sagot: <strong>' + decision + '</strong></p>',
      '    <p class="print-label">Paliwanag</p>',
      reflection
        ? '    <p class="print-reflection">' + U.escapeHtml(reflection).replace(/\n/g, '<br>') + '</p>'
        : '    <div class="print-blank-lines">' + blankLine() + blankLine() + blankLine() + '</div>',
      '  </section>',

      '  <section class="print-section">',
      '    <h2><span class="print-section-number">3</span> Ang Aking Natutuhan</h2>',
      insight
        ? '    <p class="print-reflection">' + U.escapeHtml(insight).replace(/\n/g, '<br>') + '</p>'
        : '    <div class="print-blank-lines">' + blankLine() + blankLine() + blankLine() + blankLine() + '</div>',
      '  </section>',

      '  <section class="print-section">',
      '    <h2><span class="print-section-number">4</span> Sintesis ng Paglalakbay</h2>',
      '    <div class="print-chain">' + chain + '</div>',
      '    <div class="print-chain-notes">',
      synthesis.map(function (node) {
        return '<p><strong>' + U.escapeHtml(node.label) + '.</strong> ' + U.escapeHtml(node.summary) + '</p>';
      }).join(''),
      '    </div>',
      '  </section>',

      '  <section class="print-section print-stations">',
      '    <h2><span class="print-section-number">5</span> Mga Layunin ng Bawat Istasyon</h2>',
      '    <ol>' + stationList + '</ol>',
      '  </section>',

      '  <p class="print-declaration">Ang ulat na ito ay bunga ng aking pakikilahok sa DALUM-AWIT at ng aking pagsusuri sa awiting-bayang “Magtanim ay \'Di Biro.” Pinatutunayan ko na ang mga sagot at paliwanag sa ulat na ito ay aking sariling gawa.</p>',

      '  <div class="print-signatures">',
      '    <div><span>Lagda ng Mag-aaral</span><strong>' + blankLine() + '</strong></div>',
      '    <div><span>Lagda ng Guro</span><strong>' + blankLine() + '</strong></div>',
      '  </div>',

      '  <footer class="print-footer">',
      '    <span>DALUM-AWIT · Filipino 10</span>',
      '    <span>Inihanda para sa pagtatasa ng guro</span>',
      '  </footer>',
      '</div>'
    ].join('');

    els.print.setAttribute('aria-hidden', 'false');
  }

  function printReport() {
    buildPrintReport();
    window.setTimeout(function () {
      window.print();
    }, 60);
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
    syncSummary();
    buildPrintReport();
  }

  function init(storyData) {
    story = storyData;
    station = story.stations.find(function (item) { return item.id === 5; });
    issues = story.issues || [];
    synthesis = story.synthesis || [];

    els.quote = document.getElementById('station5Quote');
    els.attribution = document.getElementById('station5Attribution');
    els.figure = document.getElementById('station5Figure');
    els.opening = document.getElementById('station5Opening');
    els.diagram = document.getElementById('synthesisDiagram');
    els.print = document.getElementById('printReport');

    els.name = document.getElementById('studentName');
    els.section = document.getElementById('studentSection');
    els.date = document.getElementById('summaryDate');
    els.issue = document.getElementById('summaryIssue');
    els.question = document.getElementById('summaryQuestion');
    els.decision = document.getElementById('summaryDecision');
    els.reflection = document.getElementById('summaryReflection');
    els.insight = document.getElementById('finalInsight');
    els.editBtn = document.getElementById('summaryEditBtn');

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
    document.getElementById('printReportBtn').addEventListener('click', printReport);
    document.getElementById('printReportBtn2').addEventListener('click', printReport);
    document.getElementById('restartBtn2').addEventListener('click', function () {
      window.App.openResetDialog();
    });

    window.addEventListener('beforeprint', buildPrintReport);
    syncSummary();
    buildPrintReport();
  }

  window.Station5 = {
    init: init,
    onShow: onShow
  };
})();
