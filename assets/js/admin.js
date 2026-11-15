/* ============================================================
   DALUM-AWIT · Authenticated online admin dashboard
   ============================================================ */
(function () {
  'use strict';

  const story = window.DALUM_AWIT_DATA || { stations: [] };
  const store = window.OnlineStore;
  let records = [];
  let rows = [];
  let channel;
  let polling;
  let refreshTimer;
  let requestVersion = 0;
  let detailId = null;
  let editing = null;
  let answerPage = 0;
  const els = {};

  function recordsFromRows(data) {
    const groups = new Map();
    data.forEach(row => {
      if (!groups.has(row.attempt_id)) groups.set(row.attempt_id, []);
      groups.get(row.attempt_id).push(row);
    });
    return Array.from(groups, ([id, answers]) => {
      const latest = answers.slice().sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0];
      const responses = story.stations.flatMap(station => station.quiz.questions.map(question => {
        const row = answers.find(answer => answer.question_id === question.id);
        const correct = question.options.find(option => option.correct);
        return { questionId: question.id, number: question.number, stationId: station.id,
          question: question.question, selectedId: row ? row.selected_id : null,
          selectedText: row ? row.selected_answer : '', correctId: correct.id,
          correctText: correct.text, correct: row ? row.selected_id === correct.id : null,
          answeredAt: row && row.answered_at, rowId: row && row.id };
      }));
      const answered = responses.filter(response => response.selectedId).length;
      const score = responses.filter(response => response.correct).length;
      return { id, student: { name: latest.student_name, section: latest.section }, responses,
        answered, score, total: 25, percentage: Math.round(score / 25 * 100),
        status: answered === 25 ? 'submitted' : 'in-progress',
        startedAt: latest.started_at, updatedAt: latest.updated_at,
        submittedAt: answered === 25 ? latest.answered_at : null,
        extraAnswers: answers.filter(row => row.kind !== 'quiz') };
    });
  }

  function formatDate(value) {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    try {
      return new Intl.DateTimeFormat('fil-PH', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      }).format(date);
    } catch (error) {
      return date.toLocaleString();
    }
  }

  function text(value, fallback) {
    const normalized = String(value == null ? '' : value).trim();
    return normalized || fallback || '—';
  }

  function setText(element, value) {
    if (element) element.textContent = value;
  }

  function submittedRecords() {
    return records.filter(function (record) { return record.status === 'submitted'; });
  }

  function renderMetrics() {
    const submitted = submittedRecords();
    const average = submitted.length
      ? submitted.reduce(function (sum, record) { return sum + Number(record.score || 0); }, 0) / submitted.length
      : null;

    setText(els.metricTotal, String(records.length));
    setText(els.metricSubmitted, String(submitted.length));
    setText(els.metricAverage, average == null ? '—' : average.toFixed(1) + ' / 25');
    setText(els.metricCompletion, records.length ? Math.round((submitted.length / records.length) * 100) + '%' : '0%');
  }

  function renderStationResults() {
    const stations = story.stations || [];
    els.stationResults.innerHTML = '';

    stations.forEach(function (station) {
      const responses = records.reduce(function (list, record) {
        return list.concat((record.responses || []).filter(function (response) {
          return response.stationId === station.id && response.selectedId;
        }));
      }, []);
      const correct = responses.filter(function (response) { return response.correct; }).length;
      const percentage = responses.length ? Math.round((correct / responses.length) * 100) : 0;

      const card = document.createElement('article');
      card.className = 'station-result';
      const label = document.createElement('span');
      label.textContent = 'Station ' + station.id;
      const value = document.createElement('strong');
      value.textContent = percentage + '%';
      const title = document.createElement('small');
      title.textContent = station.title;
      title.title = station.title;
      card.append(label, value, title);
      els.stationResults.appendChild(card);
    });
  }

  function filteredRecords() {
    const query = els.search.value.trim().toLocaleLowerCase('fil');
    const status = els.status.value;
    return records.filter(function (record) {
      const name = record.student ? record.student.name : '';
      const section = record.student ? record.student.section : '';
      const matchesQuery = !query || (name + ' ' + section).toLocaleLowerCase('fil').includes(query);
      const matchesStatus = status === 'all' || record.status === status;
      return matchesQuery && matchesStatus;
    }).sort(function (a, b) {
      return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
    });
  }

  function cell(value, className) {
    const td = document.createElement('td');
    td.textContent = value;
    if (className) td.className = className;
    return td;
  }

  function openDetails(record) {
    detailId = record.id;
    const studentName = text(record.student && record.student.name, 'Hindi pinangalanan');
    setText(els.dialogTitle, studentName);
    els.dialogBody.innerHTML = '';

    const meta = document.createElement('div');
    meta.className = 'detail-meta';
    [
      ['Seksyon', text(record.student && record.student.section)],
      ['Katayuan', record.status === 'submitted' ? 'Naisumite' : 'Isinasagawa'],
      ['Puntos', (record.score || 0) + ' / ' + (record.total || 25)],
      ['Huling update', formatDate(record.updatedAt)]
    ].forEach(function (item) {
      const box = document.createElement('div');
      const label = document.createElement('span');
      const value = document.createElement('strong');
      label.textContent = item[0];
      value.textContent = item[1];
      box.append(label, value);
      meta.appendChild(box);
    });
    els.dialogBody.appendChild(meta);

    if (record.issueResponse) {
      const issue = document.createElement('section');
      issue.className = 'detail-copy';
      const heading = document.createElement('h3');
      heading.textContent = 'Pananaw: ' + text(record.issueResponse.title);
      const copy = document.createElement('p');
      copy.textContent = (record.issueResponse.decision ? record.issueResponse.decision.toUpperCase() + ' — ' : '') + text(record.issueResponse.reflection, 'Walang paliwanag.');
      issue.append(heading, copy);
      els.dialogBody.appendChild(issue);
    }

    if (String(record.finalInsight || '').trim()) {
      const insight = document.createElement('section');
      insight.className = 'detail-copy';
      const heading = document.createElement('h3');
      heading.textContent = 'Pangwakas na natutuhan';
      const copy = document.createElement('p');
      copy.textContent = record.finalInsight;
      insight.append(heading, copy);
      els.dialogBody.appendChild(insight);
    }

    const list = document.createElement('section');
    list.className = 'response-list';
    const responseTitle = document.createElement('h3');
    responseTitle.textContent = 'Mga sagot sa 25 tanong';
    list.appendChild(responseTitle);

    (record.responses || []).forEach(function (response) {
      const item = document.createElement('article');
      item.className = 'response-item ' + (!response.selectedId ? 'unanswered' : response.correct ? 'correct' : 'wrong');
      const head = document.createElement('div');
      head.className = 'response-item-head';
      const number = document.createElement('strong');
      number.textContent = 'Tanong ' + response.number + ' · Station ' + response.stationId;
      const mark = document.createElement('span');
      mark.className = 'response-mark';
      mark.textContent = !response.selectedId ? 'Hindi nasagutan' : response.correct ? 'Tama' : 'Mali';
      head.append(number, mark);

      const question = document.createElement('p');
      question.className = 'response-question';
      question.textContent = response.question;
      const selected = document.createElement('p');
      selected.className = 'response-answer';
      selected.innerHTML = '<b>Sagot:</b> ';
      selected.appendChild(document.createTextNode(response.selectedId ? response.selectedId.toUpperCase() + '. ' + response.selectedText : '—'));
      const correct = document.createElement('p');
      correct.className = 'response-answer';
      correct.innerHTML = '<b>Tamang sagot:</b> ';
      correct.appendChild(document.createTextNode(response.correctId ? response.correctId.toUpperCase() + '. ' + response.correctText : '—'));
      item.append(head, question, selected, correct);
      if (response.rowId) item.append(answerControls(rows.find(row => row.id === response.rowId)));
      const stamp = document.createElement('small');
      stamp.textContent = formatDate(response.answeredAt);
      item.append(stamp);
      list.appendChild(item);
    });
    (record.extraAnswers || []).forEach(row => {
      const item = document.createElement('article');
      item.className = 'response-item';
      const title = document.createElement('h3');
      title.textContent = 'Station ' + row.station + ' · ' + row.question;
      const answer = document.createElement('p');
      answer.textContent = (row.selected_id ? row.selected_id.toUpperCase() + ' — ' : '') + row.selected_answer;
      item.append(title, answer, answerControls(row));
      list.append(item);
    });
    els.dialogBody.appendChild(list);

    if (typeof els.dialog.showModal === 'function' && !els.dialog.open) els.dialog.showModal();
    else els.dialog.setAttribute('open', '');
  }

  function renderTable() {
    const filtered = filteredRecords();
    els.body.innerHTML = '';

    filtered.forEach(function (record) {
      const tr = document.createElement('tr');
      const name = text(record.student && record.student.name, 'Hindi pinangalanan');
      const nameCell = cell(name, record.student && record.student.name ? 'student-name' : 'muted-value');
      const sectionCell = cell(text(record.student && record.student.section), record.student && record.student.section ? '' : 'muted-value');
      const statusCell = document.createElement('td');
      const badge = document.createElement('span');
      badge.className = 'status-badge ' + (record.status === 'submitted' ? 'submitted' : 'in-progress');
      badge.textContent = record.status === 'submitted' ? 'Naisumite' : 'Isinasagawa';
      statusCell.appendChild(badge);
      const scoreCell = cell((record.score || 0) + ' / ' + (record.total || 25), 'score-value');
      const answeredCell = cell((record.answered || 0) + ' / ' + (record.total || 25));
      const dateCell = cell(formatDate(record.updatedAt));
      const actionCell = document.createElement('td');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'view-button';
      button.textContent = 'Tingnan';
      button.addEventListener('click', function () { openDetails(record); });
      actionCell.appendChild(button);
      tr.append(nameCell, sectionCell, statusCell, scoreCell, answeredCell, dateCell, actionCell);
      els.body.appendChild(tr);
    });

    const noRecords = filtered.length === 0;
    els.tableWrap.hidden = noRecords;
    els.empty.hidden = !noRecords;
    els.exportCsv.disabled = records.length === 0;
    els.exportJson.disabled = records.length === 0;
  }

  function csvCell(value) {
    const safe = String(value == null ? '' : value).replace(/^[=+@\-]/, match => "'" + match);
    return '"' + safe.replace(/"/g, '""') + '"';
  }

  function download(filename, content, type) {
    const blob = new Blob([content], { type: type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  function exportCsv() {
    const questionHeaders = Array.from({ length: 25 }, function (_, index) { return 'Q' + (index + 1); });
    const headers = ['Attempt ID', 'Pangalan', 'Seksyon', 'Katayuan', 'Puntos', 'Kabuuang Tanong', 'Porsiyento', 'Sinimulan', 'Naisumite'].concat(questionHeaders);
    const rows = records.map(function (record) {
      const byNumber = {};
      (record.responses || []).forEach(function (response) { byNumber[response.number] = response.selectedId || ''; });
      return [
        record.id,
        record.student && record.student.name,
        record.student && record.student.section,
        record.status,
        record.score,
        record.total,
        record.percentage,
        record.startedAt,
        record.submittedAt
      ].concat(Array.from({ length: 25 }, function (_, index) { return (byNumber[index + 1] || '').toUpperCase(); }));
    });
    const csv = [headers].concat(rows).map(function (row) { return row.map(csvCell).join(','); }).join('\r\n');
    download('dalum-awit-results.csv', '\ufeff' + csv, 'text/csv;charset=utf-8');
  }

  function exportJson() {
    download('dalum-awit-results.json', JSON.stringify(records, null, 2), 'application/json;charset=utf-8');
  }

  async function refresh() {
    const version = ++requestVersion;
    try {
      const data = await store.allAnswers();
      if (version !== requestVersion) return;
      rows = data;
      records = recordsFromRows(rows);
      renderMetrics(); renderStationResults(); renderTable(); renderAnswers();
      if (detailId && els.dialog.open) {
        const record = records.find(item => item.id === detailId);
        if (record) openDetails(record);
        else { els.dialog.close(); detailId = null; }
      }
    } catch (error) { message('Hindi ma-load ang online na sagot: ' + error.message); }
  }
  function message(value) { document.getElementById('adminMessage').textContent = value; }
  function renderAnswers() {
    const query = document.getElementById('answerSearch').value.trim().toLocaleLowerCase('fil');
    const station = document.getElementById('answerStation').value;
    const filtered = rows.filter(row => (!station || row.station === Number(station)) &&
      (!query || [row.student_name, row.attempt_id, row.question, row.selected_answer].join(' ').toLocaleLowerCase('fil').includes(query)))
      .sort((a, b) => b.answered_at.localeCompare(a.answered_at));
    const pages = Math.max(1, Math.ceil(filtered.length / 50));
    answerPage = Math.min(answerPage, pages - 1);
    const body = document.getElementById('answersBody');
    body.replaceChildren();
    filtered.slice(answerPage * 50, answerPage * 50 + 50).forEach(row => {
      const tr = document.createElement('tr');
      const student = cell(row.student_name || 'Hindi pinangalanan');
      const identifier = document.createElement('small');
      identifier.className = 'answer-identifier';
      identifier.textContent = row.attempt_id;
      student.append(identifier);
      const actions = document.createElement('td');
      actions.append(answerControls(row));
      tr.append(student, cell(row.station), cell(row.question),
        cell((row.kind === 'reflection' ? row.selected_id.toUpperCase() + ' — ' : '') + row.selected_answer),
        cell(formatDate(row.answered_at)), actions);
      body.append(tr);
    });
    document.getElementById('answersPage').textContent = filtered.length + ' sagot · ' + (answerPage + 1) + ' / ' + pages;
    document.getElementById('answersPrevious').disabled = answerPage === 0;
    document.getElementById('answersNext').disabled = answerPage === pages - 1;
  }
  function answerControls(row) {
    const controls = document.createElement('div');
    controls.className = 'export-actions';
    const edit = document.createElement('button');
    edit.type = 'button'; edit.className = 'view-button'; edit.textContent = 'I-edit';
    edit.addEventListener('click', () => editAnswer(row));
    const remove = document.createElement('button');
    remove.type = 'button'; remove.className = 'view-button'; remove.textContent = 'Tanggalin';
    remove.addEventListener('click', async () => {
      if (!window.confirm('Tanggalin ang sagot na ito sa online database?')) return;
      remove.disabled = true;
      try { await store.mutate('delete', row.id); await refresh(); }
      catch (error) { message(error.message); window.alert(error.message); }
      finally { remove.disabled = false; }
    });
    controls.append(edit, remove);
    return controls;
  }
  function questionList(stationId) {
    const station = story.stations.find(item => item.id === Number(stationId));
    const list = station.quiz.questions.map(question => ({ ...question, kind: 'quiz' }));
    if (Number(stationId) === 4) story.issues.forEach(issue => list.push({
      id: 'issue-' + issue.id, kind: 'reflection', question: issue.question,
      options: [{ id: 'oo', text: 'OO' }, { id: 'hindi', text: 'HINDI' }]
    }));
    if (Number(stationId) === 5) list.push({ id: 'insight', kind: 'insight', question: 'Ang pinakamahalagang natutuhan ko', options: [] });
    return list;
  }
  function populateQuestions(selected) {
    const select = document.getElementById('editQuestion');
    select.replaceChildren();
    questionList(document.getElementById('editStation').value).forEach(question => {
      select.add(new Option(question.question, question.id));
    });
    if (selected) select.value = selected;
    populateOptions();
  }
  function populateOptions() {
    const question = questionList(document.getElementById('editStation').value)
      .find(item => item.id === document.getElementById('editQuestion').value);
    const options = document.getElementById('editOption');
    options.replaceChildren();
    question.options.forEach(option => options.add(new Option(option.text, option.id)));
    document.getElementById('editOptionLabel').hidden = question.kind === 'insight';
    document.getElementById('editTextLabel').hidden = question.kind === 'quiz';
  }
  function editAnswer(row) {
    editing = row || null;
    const field = (id, value) => { document.getElementById(id).value = value; };
    document.getElementById('answerEditorTitle').textContent = row ? 'I-edit ang sagot' : 'Magdagdag ng sagot';
    field('editAttempt', row ? row.attempt_id : crypto.randomUUID());
    document.getElementById('editAttempt').readOnly = Boolean(row);
    field('editName', row ? row.student_name : '');
    field('editSection', row ? row.section : '');
    field('editStation', row ? row.station : 1);
    document.getElementById('editStation').disabled = Boolean(row);
    document.getElementById('editQuestion').disabled = Boolean(row);
    populateQuestions(row && row.question_id);
    if (row) field('editOption', row.selected_id);
    field('editText', row && row.kind !== 'quiz' ? row.selected_answer : '');
    const date = new Date(row ? row.answered_at : Date.now());
    field('editTimestamp', new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 19));
    document.getElementById('editorMessage').textContent = '';
    document.getElementById('answerEditor').showModal();
  }
  async function saveAnswer(event) {
    event.preventDefault();
    const field = id => document.getElementById(id).value;
    const question = questionList(field('editStation')).find(item => item.id === field('editQuestion'));
    const option = question.options.find(item => item.id === field('editOption'));
    const values = {
      attempt_id: field('editAttempt').trim(), student_name: field('editName').trim(), section: field('editSection').trim(),
      station: Number(field('editStation')), question_id: question.id, question: question.question,
      selected_id: option ? option.id : '', selected_answer: question.kind === 'quiz' ? option.text : field('editText'),
      kind: question.kind, answered_at: new Date(field('editTimestamp')).toISOString(), admin_edited: true
    };
    const save = document.getElementById('saveAnswer');
    save.disabled = true;
    try {
      if (!editing) {
        const existing = rows.find(row => row.attempt_id === values.attempt_id);
        if (existing) { values.user_id = existing.user_id; values.started_at = existing.started_at; }
      }
      await store.mutate(editing ? 'update' : 'create', editing && editing.id, values);
      document.getElementById('answerEditor').close();
      message('Nai-save online ang sagot.');
      await refresh();
    } catch (error) { document.getElementById('editorMessage').textContent = error.message; }
    finally { save.disabled = false; }
  }
  async function stopLive() {
    clearInterval(polling); clearTimeout(refreshTimer); ++requestVersion;
    if (channel) { const db = await store.client(); await db.removeChannel(channel); channel = null; }
  }
  async function connect() {
    if (!store.configured()) {
      message('Hindi pa nakakonekta ang Supabase. Kumpletuhin ang supabase/SETUP.md at assets/js/database-config.js.');
      document.getElementById('adminLogin').querySelector('button').disabled = true;
      return;
    }
    const user = await store.adminSession();
    if (!user) return;
    document.getElementById('adminAuth').hidden = true;
    document.getElementById('adminDashboard').hidden = false;
    await stopLive();
    const db = await store.client();
    channel = db.channel('admin-answers').on('postgres_changes', {
      event: '*', schema: 'public', table: 'student_answers'
    }, () => { clearTimeout(refreshTimer); refreshTimer = setTimeout(refresh, 100); }).subscribe(state => {
      document.getElementById('connectionStatus').textContent = state === 'SUBSCRIBED' ? 'Live ? Online' : 'Kumokonekta muli';
      if (state === 'SUBSCRIBED') refresh();
    });
    polling = setInterval(refresh, 15000);
    message('');
    await refresh();
  }
  function bindOnline() {
    document.getElementById('adminLogin').addEventListener('submit', async event => {
      event.preventDefault();
      const submit = event.target.querySelector('button'); submit.disabled = true;
      try {
        const db = await store.client();
        const result = await db.auth.signInWithPassword({
          email: document.getElementById('adminEmail').value.trim(), password: document.getElementById('adminPassword').value
        });
        if (result.error) throw result.error;
        document.getElementById('adminPassword').value = '';
        if (!await store.adminSession()) { await db.auth.signOut(); throw new Error('Walang admin access ang account na ito.'); }
        await connect();
      } catch (error) { message(error.message); }
      finally { submit.disabled = false; }
    });
    document.getElementById('adminLogout').addEventListener('click', async () => {
      try {
        await stopLive();
        const db = await store.client(); await db.auth.signOut();
        rows = []; records = []; detailId = null;
        document.querySelectorAll('dialog[open]').forEach(dialog => dialog.close());
        els.dialogBody.replaceChildren(); renderMetrics(); renderStationResults(); renderTable(); renderAnswers();
        document.getElementById('adminDashboard').hidden = true;
        document.getElementById('adminAuth').hidden = false;
        document.getElementById('connectionStatus').textContent = 'Hindi nakakonekta';
        message('');
      } catch (error) { message(error.message); }
    });
    document.getElementById('addAnswer').addEventListener('click', () => editAnswer(null));
    document.getElementById('editStation').addEventListener('change', () => populateQuestions());
    document.getElementById('editQuestion').addEventListener('change', populateOptions);
    document.getElementById('cancelAnswer').addEventListener('click', () => document.getElementById('answerEditor').close());
    document.getElementById('answerForm').addEventListener('submit', saveAnswer);
    ['answerSearch', 'answerStation'].forEach(id => document.getElementById(id).addEventListener('input', () => { answerPage = 0; renderAnswers(); }));
    document.getElementById('answersPrevious').addEventListener('click', () => { answerPage--; renderAnswers(); });
    document.getElementById('answersNext').addEventListener('click', () => { answerPage++; renderAnswers(); });
    connect().catch(error => message(error.message));
  }

  function init() {
    els.metricTotal = document.getElementById('metricTotal');
    els.metricSubmitted = document.getElementById('metricSubmitted');
    els.metricAverage = document.getElementById('metricAverage');
    els.metricCompletion = document.getElementById('metricCompletion');
    els.stationResults = document.getElementById('stationResults');
    els.search = document.getElementById('searchInput');
    els.status = document.getElementById('statusFilter');
    els.body = document.getElementById('resultsBody');
    els.tableWrap = document.getElementById('resultsTableWrap');
    els.empty = document.getElementById('emptyResults');
    els.exportCsv = document.getElementById('exportCsv');
    els.exportJson = document.getElementById('exportJson');
    els.dialog = document.getElementById('resultDialog');
    els.dialogTitle = document.getElementById('resultDialogTitle');
    els.dialogBody = document.getElementById('resultDialogBody');

    els.search.addEventListener('input', renderTable);
    els.status.addEventListener('change', renderTable);
    document.getElementById('refreshResults').addEventListener('click', refresh);
    els.exportCsv.addEventListener('click', exportCsv);
    els.exportJson.addEventListener('click', exportJson);
    document.getElementById('closeResultDialog').addEventListener('click', function () {
      detailId = null;
      if (typeof els.dialog.close === 'function') els.dialog.close();
      else els.dialog.removeAttribute('open');
    });
    els.dialog.addEventListener('click', function (event) {
      if (event.target === els.dialog && typeof els.dialog.close === 'function') els.dialog.close();
    });
    bindOnline();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
