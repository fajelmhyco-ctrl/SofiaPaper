/* ============================================================
   DALUM-AWIT · Standalone local admin dashboard
   ============================================================ */
(function () {
  'use strict';

  const STORAGE_KEY = 'dalumAwit.submissions.v1';
  const story = window.DALUM_AWIT_DATA || { stations: [] };
  let records = [];

  const els = {};

  function readRecords() {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
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
      list.appendChild(item);
    });
    els.dialogBody.appendChild(list);

    if (typeof els.dialog.showModal === 'function') els.dialog.showModal();
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
    return '"' + String(value == null ? '' : value).replace(/"/g, '""') + '"';
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

  function refresh() {
    records = readRecords();
    renderMetrics();
    renderStationResults();
    renderTable();
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
      if (typeof els.dialog.close === 'function') els.dialog.close();
      else els.dialog.removeAttribute('open');
    });
    els.dialog.addEventListener('click', function (event) {
      if (event.target === els.dialog && typeof els.dialog.close === 'function') els.dialog.close();
    });
    window.addEventListener('storage', function (event) {
      if (event.key === STORAGE_KEY) refresh();
    });

    refresh();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
