/* ============================================================
   DALUM-AWIT · Local research-results store
   ============================================================ */
(function () {
  'use strict';

  const STORAGE_KEY = 'dalumAwit.submissions.v1';
  let syncTimer = null;

  function readAll() {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function writeAll(records) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
      return true;
    } catch (error) {
      return false;
    }
  }

  function quizQuestions(story) {
    return story.stations.reduce(function (list, station) {
      const questions = station.quiz && Array.isArray(station.quiz.questions)
        ? station.quiz.questions
        : [];
      return list.concat(questions.map(function (question) {
        return { stationId: station.id, stationTitle: station.title, question: question };
      }));
    }, []);
  }

  function issueSnapshot(story, state) {
    const issueId = state.station4 && state.station4.issue;
    const issue = (story.issues || []).find(function (item) { return item.id === issueId; });
    const answer = issueId && state.station4.answers ? state.station4.answers[issueId] : null;
    return issue ? {
      id: issue.id,
      title: issue.title,
      question: issue.question,
      decision: answer ? answer.decision : null,
      reflection: answer ? answer.reflection : ''
    } : null;
  }

  function buildRecord(story, state, previous) {
    const entries = quizQuestions(story);
    const storedAnswers = state.assessment && state.assessment.answers ? state.assessment.answers : {};
    const responses = entries.map(function (entry) {
      const question = entry.question;
      const answer = storedAnswers[question.id] || null;
      const selected = answer
        ? question.options.find(function (option) { return option.id === answer.answerId; })
        : null;
      const correct = question.options.find(function (option) { return option.correct; });

      return {
        questionId: question.id,
        number: question.number,
        stationId: entry.stationId,
        stationTitle: entry.stationTitle,
        question: question.question,
        selectedId: answer ? answer.answerId : null,
        selectedText: selected ? selected.text : '',
        correctId: correct ? correct.id : null,
        correctText: correct ? correct.text : '',
        correct: answer ? Boolean(answer.correct) : null,
        answeredAt: answer ? answer.answeredAt : null
      };
    });

    const answered = responses.filter(function (response) { return response.selectedId; }).length;
    const score = responses.filter(function (response) { return response.correct === true; }).length;
    const complete = entries.length > 0 && answered === entries.length;
    const now = new Date().toISOString();

    return {
      id: state.attemptId,
      version: 1,
      status: complete ? 'submitted' : 'in-progress',
      student: {
        name: state.student ? state.student.name : '',
        section: state.student ? state.student.section : ''
      },
      score: score,
      answered: answered,
      total: entries.length,
      percentage: entries.length ? Math.round((score / entries.length) * 100) : 0,
      responses: responses,
      issueResponse: issueSnapshot(story, state),
      finalInsight: state.finalInsight || '',
      startedAt: state.startedAt,
      updatedAt: now,
      submittedAt: complete
        ? ((previous && previous.submittedAt) || (state.assessment && state.assessment.submittedAt) || now)
        : null
    };
  }

  function syncNow(story, state) {
    window.clearTimeout(syncTimer);
    if (!story || !state || !state.attemptId) return null;

    const answers = state.assessment && state.assessment.answers ? state.assessment.answers : {};
    if (!Object.keys(answers).length) return null;

    const records = readAll();
    const index = records.findIndex(function (record) { return record.id === state.attemptId; });
    const previous = index >= 0 ? records[index] : null;
    const record = buildRecord(story, state, previous);

    if (index >= 0) records[index] = record;
    else records.push(record);

    writeAll(records);
    return record;
  }

  function syncSoon(story, state) {
    window.clearTimeout(syncTimer);
    syncTimer = window.setTimeout(function () {
      syncNow(story, state);
    }, 180);
  }

  window.ResultsStore = {
    key: STORAGE_KEY,
    readAll: readAll,
    syncNow: syncNow,
    syncSoon: syncSoon
  };
})();
