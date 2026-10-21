/* ============================================================
   DALUM-AWIT · Station 3 — interactive food-security flowchart
   ============================================================ */
(function () {
  'use strict';

  const U = window.DalumUtils;

  const ICONS = {
    seed: 'i-seed',
    sweat: 'i-sweat',
    harvest: 'i-harvest',
    plate: 'i-plate'
  };

  let station = null;
  let story = null;
  let nodes = [];
  let els = {};

  function iconFor(name) {
    return ICONS[name] || 'i-leaf';
  }

  function activeNode() {
    const selected = window.AppState.getState().station3.flowNode;
    return nodes.find(function (node) { return node.id === selected; }) || nodes[0];
  }

  function renderDetail() {
    const node = activeNode();
    if (!node) return;
    const index = nodes.indexOf(node);

    els.detail.classList.remove('is-updating');
    els.detail.innerHTML = [
      '<div class="flow-detail-inner">',
      '  <div class="flow-detail-head">',
      '    <span class="flow-detail-icon" aria-hidden="true">',
      '      <svg class="icon"><use href="#' + iconFor(node.icon) + '"></use></svg>',
      '    </span>',
      '    <div>',
      '      <p class="flow-detail-kicker">Yugto ' + (index + 1) + ' ng ' + nodes.length + '</p>',
      '      <h3>' + U.escapeHtml(node.label) + '</h3>',
      '    </div>',
      '  </div>',
      '  <p class="flow-detail-copy">' + U.escapeHtml(node.detail) + '</p>',
      '  <blockquote class="flow-quote">' + U.escapeHtml(node.song) + '</blockquote>',
      '  <p class="flow-question"><strong>Tanong:</strong> ' + U.escapeHtml(node.question) + '</p>',
      '</div>'
    ].join('');

    void els.detail.offsetWidth;
    els.detail.classList.add('is-updating');

    els.flow.querySelectorAll('.flow-step').forEach(function (button) {
      const isActive = button.dataset.flow === node.id;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    });
  }

  function chooseNode(nodeId) {
    if (!nodes.some(function (node) { return node.id === nodeId; })) return;
    window.AppState.setFlowNode(nodeId);
    renderDetail();
  }

  function buildFlow() {
    els.flow.innerHTML = nodes.map(function (node, index) {
      const step = [
        '<button class="flow-step" type="button" data-flow="' + U.escapeHtml(node.id) + '" aria-pressed="false" aria-controls="flowDetail">',
        '  <span class="flow-icon" aria-hidden="true"><svg class="icon"><use href="#' + iconFor(node.icon) + '"></use></svg></span>',
        '  <span class="flow-label">' + U.escapeHtml(node.label) + '</span>',
        '  <span class="flow-short">' + U.escapeHtml(node.short) + '</span>',
        '</button>'
      ].join('');
      const arrow = index < nodes.length - 1
        ? '<span class="flow-arrow" aria-hidden="true"><svg class="icon"><use href="#i-arrow-right"></use></svg></span>'
        : '';
      return step + arrow;
    }).join('');

    els.flow.querySelectorAll('.flow-step').forEach(function (button) {
      button.addEventListener('click', function () {
        chooseNode(button.dataset.flow);
      });
    });
  }

  function reveal(shouldScroll) {
    els.activity.hidden = false;
    renderDetail();
    if (shouldScroll) {
      window.setTimeout(function () {
        els.activity.scrollIntoView({
          behavior: window.App.prefersReducedMotion() ? 'auto' : 'smooth',
          block: 'start'
        });
      }, 140);
    }
  }

  function onShow() {
    if (window.AppState.isDialogueDone(3)) {
      els.activity.hidden = false;
      renderDetail();
    } else {
      els.activity.hidden = true;
    }
  }

  function init(storyData) {
    story = storyData;
    station = story.stations.find(function (item) { return item.id === 3; });
    nodes = story.flowchart || [];

    els.activity = document.getElementById('station3Activity');
    els.flow = document.getElementById('foodFlow');
    els.detail = document.getElementById('flowDetail');
    els.note = document.getElementById('flowNote');

    els.note.textContent = story.flowNote || '';
    buildFlow();
    renderDetail();

    document.getElementById('station3Next').addEventListener('click', function () {
      window.App.completeStation(3);
    });
  }

  window.Station3 = {
    init: init,
    onShow: onShow,
    reveal: reveal
  };
})();
