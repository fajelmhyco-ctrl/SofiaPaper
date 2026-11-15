/* Supabase transport shared by students and the authenticated admin dashboard. */
(function () {
  'use strict';
  const config = window.DALUM_DATABASE || {};
  const QUEUE = 'dalumAwit.onlineQueue.v1';
  const SENT = 'dalumAwit.onlineSent.v1';
  let clientPromise;
  let flushing = false;
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
  function enqueue(key, payload) {
    const signature = JSON.stringify(payload);
    const sent = read(SENT);
    if (sent[key] === signature) return;
    const queue = read(QUEUE);
    if (queue[key] && queue[key].signature === signature) return;
    queue[key] = { payload, signature };
    try { write(QUEUE, queue); }
    catch (_) { status('error', 'Hindi mai-save ang sagot. Puno o naka-block ang browser storage.'); return; }
    flush();
  }
  async function flush() {
    if (flushing || document.body.dataset.admin === 'true') return;
    const entries = Object.entries(read(QUEUE));
    if (!entries.length) return;
    if (!configured()) { status('pending', 'Naka-save sa device; hinihintay ang koneksyon sa online database.'); return; }
    if (!navigator.onLine) { status('pending', 'Naka-save sa device; ipapadala kapag online.'); return; }
    flushing = true;
    status('syncing', 'Ipinapadala ang mga sagot…');
    try {
      const db = await studentClient();
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
      retryDelay = 2000;
      status('saved', 'Nai-save online ang mga sagot.');
    } catch (error) {
      console.warn('Online answer sync pending:', error.message);
      status('pending', 'Naka-save sa device; hindi pa naipadala online.');
      clearTimeout(retryTimer);
      retryTimer = setTimeout(() => { retryTimer = null; flush(); }, retryDelay);
      retryDelay = Math.min(60000, retryDelay * 2);
    } finally {
      flushing = false;
    }
    if (Object.keys(read(QUEUE)).length && !retryTimer) flush();
  }
  function capture(story, state) {
    const common = {
      attempt_id: state.attemptId, student_name: state.student.name,
      section: state.student.section, started_at: state.startedAt
    };
    story.stations.forEach(station => {
      (station.quiz.questions || []).forEach(question => {
        const answer = state.assessment.answers[question.id];
        if (!answer) return;
        const option = question.options.find(item => item.id === answer.answerId);
        enqueue(state.attemptId + ':' + question.id, Object.assign({}, common, {
          question_id: question.id, station: station.id, question: question.question,
          selected_id: answer.answerId, selected_answer: option ? option.text : answer.answerId,
          kind: 'quiz', answered_at: answer.answeredAt
        }));
      });
    });
    (story.issues || []).forEach(issue => {
      const answer = state.station4.answers[issue.id];
      if (!answer || (!answer.decision && !answer.reflection)) return;
      enqueue(state.attemptId + ':issue-' + issue.id, Object.assign({}, common, {
        question_id: 'issue-' + issue.id, station: 4, question: issue.question,
        selected_id: answer.decision || '', selected_answer: answer.reflection || '',
        kind: 'reflection', answered_at: answer.answeredAt || state.updatedAt
      }));
    });
    if (state.finalInsight.trim()) enqueue(state.attemptId + ':insight', Object.assign({}, common, {
      question_id: 'insight', station: 5, question: 'Ang pinakamahalagang natutuhan ko',
      selected_id: '', selected_answer: state.finalInsight, kind: 'insight',
      answered_at: state.insightAt || state.updatedAt
    }));
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
  window.OnlineStore = { configured, client, capture, flush, allAnswers, adminSession, mutate };
  if (document.body.dataset.admin !== 'true') {
    window.addEventListener('online', () => { clearTimeout(retryTimer); retryTimer = null; flush(); });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) flush(); });
    setTimeout(flush, 0);
  }
})();
