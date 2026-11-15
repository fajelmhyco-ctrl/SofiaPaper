/* Supabase transport shared by students and the authenticated admin dashboard. */
(function () {
  'use strict';
  const config = window.DALUM_DATABASE || {};
  const QUEUE = 'dalumAwit.onlineQueue.v1';
  const SENT = 'dalumAwit.onlineSent.v1';
  let clientPromise;
  let flushPromise = null;
  let retryTimer;
  let retryDelay = 2000;
  const configured = () => Boolean(config.url && config.publishableKey);
  function read(key) {
    try { return JSON.parse(localStorage.getItem(key) || '{}'); } catch (_) { return {}; }
  }
  function write(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
  function status(state, message) {
    document.dispatchEvent(new CustomEvent('dalum:sync-status', { detail: { state, message } }));
  }
  async function client() {
    if (!configured()) throw new Error('Hindi pa nakakonekta ang online database. Tingnan ang supabase/SETUP.md.');
    if (!clientPromise) {
      clientPromise = new Promise((resolve, reject) => {
        if (window.supabase) return resolve(window.supabase);
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.95.3/dist/umd/supabase.js';
        script.onload = () => window.supabase ? resolve(window.supabase) : reject(new Error('Hindi ma-load ang database client.'));
        script.onerror = () => { script.remove(); reject(new Error('Hindi maabot ang database. Susubukan muli kapag online.')); };
        document.head.append(script);
      }).then(sdk => sdk.createClient(config.url, config.publishableKey, {
        auth: { storageKey: document.body.dataset.admin === 'true' ? 'dalum.admin.auth' : 'dalum.student.auth' }
      })).catch(error => { clientPromise = null; throw error; });
    }
    return clientPromise;
  }
  async function studentClient() {
    const db = await client();
    const session = await db.auth.getSession();
    if (session.error) throw session.error;
    if (!session.data.session) {
      const result = await db.auth.signInAnonymously();
      if (result.error) throw result.error;
    }
    return db;
  }
  function enqueue(key, payload, force) {
    const signature = JSON.stringify(payload);
    const queue = read(QUEUE);
    if (queue[key] && queue[key].signature === signature) return true;
    if (!force) {
      const sent = read(SENT);
      if (sent[key] === signature) return true;
    }
    queue[key] = { payload, signature };
    try { write(QUEUE, queue); }
    catch (_) { status('error', 'Hindi mai-save ang sagot. Puno o naka-block ang browser storage.'); return false; }
    flush();
    return true;
  }
  function flush() {
    if (document.body.dataset.admin === 'true') return Promise.resolve(true);
    if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
    if (flushPromise) return flushPromise;
    flushPromise = runFlush().finally(() => { flushPromise = null; });
    return flushPromise;
  }
  async function runFlush() {
    if (!Object.keys(read(QUEUE)).length) return true;
    if (!configured()) { status('pending', 'Naka-save sa device; hinihintay ang koneksyon sa online database.'); return false; }
    if (!navigator.onLine) { status('pending', 'Naka-save sa device; ipapadala kapag online.'); return false; }
    status('syncing', 'Ipinapadala ang mga sagot…');
    try {
      const db = await studentClient();
      while (Object.keys(read(QUEUE)).length) {
        const entries = Object.entries(read(QUEUE));
        for (const [key, entry] of entries) {
          const result = await db.rpc('submit_student_answer', { payload: entry.payload });
          if (result.error) throw result.error;
          const queue = read(QUEUE);
          const sent = read(SENT);
          sent[key] = entry.signature;
          write(SENT, sent);
          if (queue[key] && queue[key].signature === entry.signature) delete queue[key];
          write(QUEUE, queue);
        }
      }
      retryDelay = 2000;
      status('saved', 'Nai-save online ang mga sagot.');
      return true;
    } catch (error) {
      console.warn('Online answer sync pending:', error.message);
      status('pending', 'Naka-save sa device; hindi pa naipadala online.');
      clearTimeout(retryTimer);
      retryTimer = setTimeout(() => { retryTimer = null; flush(); }, retryDelay);
      retryDelay = Math.min(60000, retryDelay * 2);
      return false;
    }
  }
  function capture(story, state, options) {
    const force = Boolean(options && options.force);
    let captured = true;
    const common = {
      attempt_id: state.attemptId, student_name: state.student.name,
      section: state.student.section, started_at: state.startedAt
    };
    story.stations.forEach(station => {
      (station.quiz.questions || []).forEach(question => {
        const answer = state.assessment.answers[question.id];
        if (!answer) return;
        const option = question.options.find(item => item.id === answer.answerId);
        if (!enqueue(state.attemptId + ':' + question.id, Object.assign({}, common, {
          question_id: question.id, station: station.id, question: question.question,
          selected_id: answer.answerId, selected_answer: option ? option.text : answer.answerId,
          kind: 'quiz', answered_at: answer.answeredAt
        }), force)) captured = false;
      });
    });
    (story.issues || []).forEach(issue => {
      const answer = state.station4.answers[issue.id];
      if (!answer || (!answer.decision && !answer.reflection)) return;
      if (!enqueue(state.attemptId + ':issue-' + issue.id, Object.assign({}, common, {
        question_id: 'issue-' + issue.id, station: 4, question: issue.question,
        selected_id: answer.decision || '', selected_answer: answer.reflection || '',
        kind: 'reflection', answered_at: answer.answeredAt || state.updatedAt
      }), force)) captured = false;
    });
    if (state.finalInsight.trim() && !enqueue(state.attemptId + ':insight', Object.assign({}, common, {
      question_id: 'insight', station: 5, question: 'Ang pinakamahalagang natutuhan ko',
      selected_id: '', selected_answer: state.finalInsight, kind: 'insight',
      answered_at: state.insightAt || state.updatedAt
    }), force)) captured = false;
    return captured;
  }
  async function submit(story, state) {
    if (!capture(story, state, { force: true })) return false;
    return flush();
  }
  async function allAnswers() {
    const db = await client();
    const rows = [];
    for (let offset = 0; ; offset += 500) {
      const result = await db.from('student_answers').select('*').order('id').range(offset, offset + 499);
      if (result.error) throw result.error;
      rows.push(...result.data);
      if (result.data.length < 500) return rows;
    }
  }
  async function adminSession() {
    const db = await client();
    const result = await db.auth.getUser();
    if (result.error || !result.data.user) return null;
    if (result.data.user.app_metadata.role !== 'admin') return null;
    return result.data.user;
  }
  async function mutate(action, id, values) {
    const db = await client();
    let query;
    if (action === 'create') query = db.from('student_answers').insert(values);
    if (action === 'update') query = db.from('student_answers').update(Object.assign({}, values, { admin_edited: true })).eq('id', id);
    if (action === 'delete') query = db.from('student_answers').delete().eq('id', id);
    const result = await query.select();
    if (result.error) throw result.error;
    if (!result.data.length) throw new Error('Walang nabago. I-refresh ang tala o mag-sign in muli.');
    return result.data[0];
  }
  window.OnlineStore = { configured, client, capture, flush, submit, allAnswers, adminSession, mutate };
  if (document.body.dataset.admin !== 'true') {
    window.addEventListener('online', () => { clearTimeout(retryTimer); retryTimer = null; flush(); });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) flush(); });
    setTimeout(flush, 0);
  }
})();
