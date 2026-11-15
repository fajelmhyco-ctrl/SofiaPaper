/* Viewport-only navigation. Existing cards, text, sprites and controls are reused. */
(function () {
  'use strict';
  const fixed = [1, 3, 4];
  const views = {};
  let active = null;
  let story;
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    node.className = className || '';
    if (text) node.textContent = text;
    return node;
  };
  function button(text, action, primary) {
    const node = el('button', 'btn btn-small ' + (primary ? 'btn-primary' : 'btn-ghost'), text);
    node.type = 'button';
    node.addEventListener('click', action);
    return node;
  }
  function open(view, mode) {
    if (mode !== 'info' && !window.AppState.isDialogueDone(view.id)) return;
    view.mode = mode;
    view.part = 0;
    view.subpart = 0;
    view.feedback = false;
    if (mode === 'quiz') {
      view.question = Math.max(0, view.cards.findIndex(card => !window.AppState.getQuizAnswer(card.dataset.quizQuestion)));
    }
    if (!view.dialog.open) view.dialog.showModal();
    paint(view);
  }
  function close(view) {
    view.dialog.close();
    view.launch.focus({ preventScroll: true });
  }
  function showOnly(nodes, selected) {
    nodes.forEach(node => { node.hidden = !selected.includes(node); });
  }
  function task(view, nodes, name) {
    const root = el('article', 'activity-card viewport-task');
    nodes.filter(Boolean).forEach(node => root.append(node));
    root.hidden = true;
    view.content.append(root);
    view.tasks.push({ root, name });
    return root;
  }
  function fitTask(view, page) {
    const nested = page.root.querySelector('.issue-grid, .flow-detail-inner, .point-list');
    const units = Array.from((nested || page.root).children);
    units.forEach(node => { node.hidden = false; });
    view.taskGroups = [units];
    if (page.root.scrollHeight > view.content.clientHeight - 8) {
      view.taskGroups = [];
      units.forEach(node => { node.hidden = true; });
      let group = [];
      for (const node of units) {
        node.hidden = false;
        if (group.length && page.root.scrollHeight > view.content.clientHeight - 8) {
          group.forEach(item => { item.hidden = true; });
          view.taskGroups.push(group);
          group = [];
        }
        group.push(node);
      }
      if (group.length) view.taskGroups.push(group);
    }
    view.subpart = Math.min(view.subpart || 0, view.taskGroups.length - 1);
    showOnly(units, view.taskGroups[view.subpart]);
  }
  function paint(view) {
    const isQuiz = view.mode === 'quiz';
    view.content.querySelectorAll(':scope > *').forEach(node => { node.hidden = true; });
    view.back.disabled = false;
    view.next.disabled = false;
    view.next.textContent = 'Susunod';
    view.back.textContent = 'Bumalik';
    if (isQuiz) {
      const card = view.cards[view.question];
      const question = card.querySelector('h2');
      const options = card.querySelector('.quiz-options');
      const feedback = card.querySelector('.quiz-feedback');
      const answer = window.AppState.getQuizAnswer(card.dataset.quizQuestion);
      const choices = Array.from(options.children);
      view.quiz.hidden = false;
      view.quiz.querySelector('.quiz-set-heading').hidden = true;
      showOnly(view.cards, [card]);
      question.hidden = false;
      options.hidden = false;
      choices.forEach(node => { node.hidden = false; });
      feedback.hidden = true;
      view.title.textContent = 'Station ' + view.id + ' · Tanong ' + (view.question + 1) + ' / ' + view.cards.length;
      // On smaller viewports the prompt and choices become consecutive pages.
      view.split = card.scrollHeight > view.content.clientHeight - 8;
      if (view.split) {
        question.hidden = view.part > 0;
        options.hidden = view.part === 0;
      }
      view.choiceGroups = 1;
      if (view.split && view.part > 0) {
        const groups = [];
        let group = [];
        choices.forEach(node => { node.hidden = true; });
        choices.forEach(node => {
          node.hidden = false;
          if (group.length && card.scrollHeight > view.content.clientHeight - 8) {
            group.forEach(item => { item.hidden = true; });
            groups.push(group);
            group = [];
          }
          group.push(node);
        });
        if (group.length) groups.push(group);
        view.choiceGroups = groups.length;
        view.part = Math.min(view.part, groups.length);
        showOnly(choices, groups[view.part - 1]);
      }
      if (view.feedback && answer) {
        question.hidden = true;
        options.hidden = true;
        feedback.hidden = false;
      }
      if (view.feedback) view.next.textContent = view.question === view.cards.length - 1 ? 'Mga gawain' : 'Susunod na tanong';
      else if (view.split && view.part === 0) view.next.textContent = 'Mga pagpipilian';
      else if (view.split && view.part < view.choiceGroups) view.next.textContent = 'Iba pang pagpipilian';
      else { view.next.textContent = 'Tingnan ang sagot'; view.next.disabled = !answer; }
      view.back.disabled = view.question === 0 && view.part === 0 && !view.feedback;
    } else {
      const pages = view.mode === 'info' ? view.info : view.tasks;
      const page = pages[Math.min(view.part, pages.length - 1)];
      page.root.hidden = false;
      fitTask(view, page);
      view.title.textContent = 'Station ' + view.id + ' · ' + page.name;
      view.back.disabled = view.part === 0 && view.subpart === 0;
      view.next.textContent = view.part === pages.length - 1 && view.subpart === view.taskGroups.length - 1 ? 'Bumalik sa tagpo' : 'Susunod';
      if (view.mode === 'tasks' && view.id === 4 && view.part === 1 &&
          view.subpart === view.taskGroups.length - 1 && !window.AppState.getState().station4.issue) {
        view.next.disabled = true;
      }
    }
    view.content.scrollTop = 0;
    view.title.focus({ preventScroll: true });
  }
  function advance(view, direction) {
    if (view.mode !== 'quiz') {
      const pages = view.mode === 'info' ? view.info : view.tasks;
      if (direction > 0 && view.subpart < view.taskGroups.length - 1) { view.subpart++; paint(view); return; }
      if (direction < 0 && view.subpart > 0) { view.subpart--; paint(view); return; }
      if (direction > 0 && view.part >= pages.length - 1) return close(view);
      view.part = Math.max(0, view.part + direction);
      view.subpart = 0;
    } else if (direction < 0) {
      if (view.feedback) view.feedback = false;
      else if (view.part > 0) view.part--;
      else { view.question = Math.max(0, view.question - 1); }
    } else if (view.feedback) {
      if (view.question === view.cards.length - 1) return open(view, 'tasks');
      view.question++;
      view.part = 0;
      view.feedback = false;
    } else if (view.split && view.part < view.choiceGroups) {
      view.part++;
    } else {
      if (!window.AppState.getQuizAnswer(view.cards[view.question].dataset.quizQuestion)) return;
      view.feedback = true;
    }
    paint(view);
  }
  function init(data) {
    story = data;
    fixed.forEach(id => {
      const section = document.getElementById('station-' + id);
      const activity = document.getElementById('station' + id + 'Activity');
      const dialog = el('dialog', 'app-dialog viewport-dialog');
      dialog.id = 'station-dialog-' + id;
      const title = el('p', 'card-kicker');
      title.id = 'station-dialog-title-' + id;
      title.tabIndex = -1;
      dialog.setAttribute('aria-labelledby', title.id);
      const head = el('div', 'viewport-dialog-head');
      const content = el('div', 'viewport-dialog-content');
      const nav = el('div', 'viewport-dialog-nav');
      const view = { id, section, activity, dialog, title, content, tasks: [], info: [], part: 0, question: 0 };
      views[id] = view;
      head.append(title, button('Isara', () => close(view)));
      view.back = button('Bumalik', () => advance(view, -1));
      view.next = button('Susunod', () => advance(view, 1), true);
      nav.append(view.back, view.next);
      dialog.append(head, content, nav);
      document.body.append(dialog);
      view.quiz = document.getElementById('station' + id + 'Quiz');
      view.cards = Array.from(view.quiz.querySelectorAll('[data-quiz-question]'));
      content.append(view.quiz);
      const heading = section.querySelector('.station-heading');
      const intro = el('article', 'activity-card viewport-task');
      intro.append(heading.querySelector('.station-lede').cloneNode(true));
      const objective = el('article', 'activity-card viewport-task');
      objective.append(heading.querySelector('.objective-card').cloneNode(true));
      content.append(intro, objective);
      view.info = [{ root: intro, name: 'Kuwento' }, { root: objective, name: 'Layunin' }];
      const toolbar = el('div', 'viewport-toolbar');
      view.launch = button('Mga tanong', () => open(view, 'quiz'), true);
      view.launch.hidden = true;
      toolbar.append(button('Kuwento at layunin', () => open(view, 'info')), view.launch);
      if (id !== 1) {
        view.tasksButton = button('Mga gawain', () => open(view, 'tasks'));
        view.tasksButton.hidden = true;
        toolbar.append(view.tasksButton);
      }
      section.append(toolbar);
      if (id === 3) {
        const flow = activity.querySelector('.flow-card');
        task(view, Array.from(flow.children).slice(0, 3), 'Ang daloy ng pagkain');
        const flowButtons = document.getElementById('foodFlow');
        task(view, [flowButtons], 'Pumili ng yugto');
        task(view, [document.getElementById('flowDetail')], 'Pagsusuri ng yugto');
        task(view, [document.getElementById('flowNote')], 'Tandaan');
        flowButtons.addEventListener('click', event => {
          if (event.target.closest('[data-flow]')) { view.part = 2; view.subpart = 0; paint(view); }
        });
      }
      if (id === 4) {
        const issueCard = activity.querySelector('.issue-card-wrap');
        task(view, Array.from(issueCard.children).slice(0, 3), 'Pagpili ng isyu');
        const grid = document.getElementById('issueGrid');
        // Keep the original parent so the station controller can update selections.
        task(view, [grid], 'Mga isyung panlipunan');
        const workspace = document.getElementById('issueWorkspace');
        task(view, [workspace.querySelector('.workspace-head'), document.getElementById('workspaceDetail')], 'Ang napiling isyu');
        task(view, [document.getElementById('workspacePoints')], 'Mahahalagang punto');
        const decision = workspace.querySelector('.decision-card');
        task(view, Array.from(decision.children).slice(0, 3), 'OO o HINDI');
        task(view, Array.from(decision.children), 'Ipaliwanag ang iyong sagot');
        grid.addEventListener('click', event => {
          if (event.target.closest('[data-issue]')) { view.part = 2; view.subpart = 0; paint(view); }
        });
      }
      const final = task(view, [activity.querySelector('.station-nav')], 'Magpatuloy');
      final.prepend(button('Balikan ang mga tanong', () => open(view, 'quiz')));
      activity.hidden = true;
      // Modules still own their state and original controls; only their layout moves.
      activity.classList.add('viewport-source');
      if (id === 1) document.getElementById('station1Review').addEventListener('click', () => close(view));
      dialog.addEventListener('close', () => { view.launch.focus({ preventScroll: true }); });
      dialog.addEventListener('cancel', () => { view.feedback = false; });
    });
    document.addEventListener('dalum:quiz-progress', event => {
      const view = views[event.detail.stationId];
      if (view && view.dialog.open && view.mode === 'quiz') {
        view.feedback = true;
        paint(view);
      }
    });
    window.addEventListener('resize', () => {
      if (active && views[active].dialog.open) paint(views[active]);
    });
  }
  function show(id) {
    Object.values(views).forEach(view => { if (view.dialog.open) view.dialog.close(); });
    active = fixed.includes(id) ? id : null;
    document.body.classList.toggle('station-viewport', Boolean(active));
    document.documentElement.classList.toggle('station-viewport-root', Boolean(active));
    if (!active) return;
    const view = views[id];
    const done = window.AppState.isDialogueDone(id);
    view.launch.hidden = !done;
    if (view.tasksButton) view.tasksButton.hidden = !done;
    window.scrollTo(0, 0);
  }
  function complete(id) {
    const view = views[id];
    if (!view) return;
    view.launch.hidden = false;
    if (view.tasksButton) view.tasksButton.hidden = false;
    if (active === id) open(view, 'quiz');
  }
  window.StationViewport = { init, show, complete };
})();
