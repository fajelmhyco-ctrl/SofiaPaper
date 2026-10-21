/* ============================================================
   DALUM-AWIT · Station 2 — interactive lyric analysis
   ============================================================ */
(function () {
  'use strict';

  const U = window.DalumUtils;

  let station = null;
  let lesson = null;
  let els = {};

  function cardMarkup(lyric, index) {
    const number = String(index + 1).padStart(2, '0');
    const bodyId = 'lyric-body-' + lyric.id;

    return [
      '<article class="lyric-card" data-lyric="' + U.escapeHtml(lyric.id) + '">',
      '  <button class="lyric-toggle" type="button" aria-expanded="false" aria-controls="' + bodyId + '">',
      '    <span class="lyric-index" aria-hidden="true">' + number + '</span>',
      '    <span class="lyric-main">',
      '      <span class="lyric-quote">“' + U.escapeHtml(lyric.line) + '”</span>',
      '      <span class="lyric-cue">' + U.escapeHtml(lyric.cue) + '</span>',
      '    </span>',
      '    <span class="lyric-action">',
      '      <span class="lyric-action-label">Pagsusuri</span>',
      '      <span class="lyric-chevron" aria-hidden="true">',
      '        <svg class="icon"><use href="#i-chevron"></use></svg>',
      '      </span>',
      '    </span>',
      '  </button>',
      '  <div class="lyric-body" id="' + bodyId + '" aria-hidden="true">',
      '    <div class="lyric-body-inner">',
      '      <div class="lyric-analysis">',
      '        <div class="analysis-block">',
      '          <span class="analysis-label">Ano ang sinasabi ng awit?</span>',
      '          <p class="analysis-cue-text">' + U.escapeHtml(lyric.cue) + '</p>',
      '          <p>' + U.escapeHtml(lyric.implication) + '</p>',
      '        </div>',
      '        <div class="analysis-block analysis-block-real">',
      '          <span class="analysis-label">Sa tunay na buhay ng magsasaka</span>',
      '          <p>' + U.escapeHtml(lyric.realWorld) + '</p>',
      '        </div>',
      '      </div>',
      '    </div>',
      '  </div>',
      '</article>'
    ].join('');
  }

  function isOpened(lyricId) {
    return window.AppState.getState().station2.opened.indexOf(lyricId) !== -1;
  }

  function applyOpenState() {
    els.cards.querySelectorAll('.lyric-card').forEach(function (card) {
      const lyricId = card.dataset.lyric;
      const open = isOpened(lyricId);
      card.classList.toggle('is-open', open);
      card.querySelector('.lyric-toggle').setAttribute('aria-expanded', String(open));
      card.querySelector('.lyric-body').setAttribute('aria-hidden', String(!open));
    });
  }

  function updateProgress() {
    const opened = window.AppState.getState().station2.opened;
    const total = lesson.lyrics.length;
    const count = lesson.lyrics.filter(function (lyric) {
      return opened.indexOf(lyric.id) !== -1;
    }).length;

    els.progressText.textContent = count + ' / ' + total + ' nabuksan';

    const complete = count === total;
    els.closing.hidden = !complete;
    els.next.disabled = !complete;
    els.openAll.hidden = complete;
    els.hint.textContent = complete
      ? 'Kumpleto ang pagsusuri. Handa ka nang magpatuloy sa Station 3.'
      : 'Buksan ang lahat ng card upang magpatuloy.';
  }

  function openCard(card, shouldToast) {
    const lyricId = card.dataset.lyric;
    const wasOpen = card.classList.contains('is-open');

    if (!wasOpen) {
      card.classList.add('is-open');
      card.querySelector('.lyric-toggle').setAttribute('aria-expanded', 'true');
      card.querySelector('.lyric-body').setAttribute('aria-hidden', 'false');
      if (!isOpened(lyricId)) {
        window.AppState.addOpenedLyric(lyricId);
        if (shouldToast && window.AppState.getState().station2.opened.length === lesson.lyrics.length) {
          window.App.showToast('Nabuksan mo ang lahat ng pagsusuri. Magpatuloy na sa susunod na istasyon.');
        }
      }
      updateProgress();
    } else {
      card.classList.remove('is-open');
      card.querySelector('.lyric-toggle').setAttribute('aria-expanded', 'false');
      card.querySelector('.lyric-body').setAttribute('aria-hidden', 'true');
    }
  }

  function bindCards() {
    els.cards.querySelectorAll('.lyric-toggle').forEach(function (button) {
      button.addEventListener('click', function () {
        openCard(button.closest('.lyric-card'), true);
      });
    });
  }

  function openAll() {
    window.AppState.openAllLyrics(lesson.lyrics.map(function (lyric) { return lyric.id; }));
    applyOpenState();
    updateProgress();
    window.App.showToast('Bukas na ang lahat ng card. Maaari mong suriin ang bawat linya.');
  }

  function onShow() {
    applyOpenState();
    updateProgress();
  }

  function init(storyData) {
    station = storyData.stations.find(function (item) { return item.id === 2; });
    lesson = station.lesson;

    els.cards = document.getElementById('lyricCards');
    els.progressText = document.getElementById('lyricProgressText');
    els.closing = document.getElementById('station2Closing');
    els.closingText = document.getElementById('station2ClosingText');
    els.next = document.getElementById('station2Next');
    els.hint = document.getElementById('station2Hint');
    els.openAll = document.getElementById('openAllLyrics');

    document.getElementById('station2Quote').textContent = '“' + lesson.quote + '”';
    document.getElementById('station2Intro').textContent = lesson.intro;
    els.closingText.textContent = lesson.closing;

    els.cards.innerHTML = lesson.lyrics.map(cardMarkup).join('');
    bindCards();

    els.openAll.addEventListener('click', openAll);
    els.next.addEventListener('click', function () {
      if (els.next.disabled) return;
      window.App.completeStation(2);
    });
  }

  window.Station2 = {
    init: init,
    onShow: onShow
  };
})();
