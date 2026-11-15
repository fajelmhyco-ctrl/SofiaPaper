# Connect the online answers database

The supplied Supabase URL and publishable key are already in
`assets/js/database-config.js`. The browser uses `@supabase/supabase-js` from
the CDN. The publishable key is public; do not substitute a secret/service-role key.

## 1. Create the table and permissions

Open your project's **SQL Editor**, paste the complete contents of
[`schema.sql`](schema.sql), and click **Run**. It creates:

- `student_answers`: one row per question/attempt, with student name, identifier,
  station, question, selected answer, client answer time, and server receipt time.
- `answer_deletions`: identifiers only, preventing queued retries from recreating
  an answer that an admin has deleted. Answer text and names are deleted.
- A submission function, row-level security, and Realtime publication.

Students can submit through the authenticated function but cannot read other
students' answers, edit admin corrections, or delete records. Admins can create,
read, update, and delete answers. Re-running the SQL preserves existing records.

## 2. Enable student sign-in

In **Authentication → Sign In / Providers**, enable **Anonymous Sign-Ins**.
Students are signed in automatically; no student login screen is added. If you
enable CAPTCHA enforcement later, integrate its token before using anonymous
sign-in. Serve the site over HTTP locally or HTTPS online rather than `file://`.

## 3. Create your admin account

In **Authentication → Users → Add user**, create an email/password user. Then run
[`grant-admin.sql`](grant-admin.sql), replacing the example email with that user's
email. Sign out and sign in again after assigning the role so the token contains it.

Visit `admin.html` and sign in. The dashboard reads the online table, updates on
Realtime events, and refreshes every 15 seconds as a reconnection fallback.
Use **Lahat ng sagot** to edit or delete individual rows; student details also
include the same controls. Use
**Magdagdag ng sagot** to add a record. To add to an existing student attempt, copy
its Attempt ID from an exported record. Changes are applied only after Supabase
confirms success; failures remain visible in the editor.

## 4. Verify with two browsers

1. Open the student page in one browser and `admin.html` in another.
2. Finish a station's story and choose an answer. The row should appear in admin
   with its station, question, answer, and time, even before all questions are done.
3. Edit the answer in admin; confirm the changed value in Supabase Table Editor.
4. Delete the row; confirm it disappears from the dashboard and database.
5. Take the student browser offline, answer another question, then reconnect.
   The queued response should arrive once, and deleted/edited rows must stay so.

Names are optional until the existing Station 5 name field is filled. Earlier
answers carry the unique attempt identifier and receive the name on later sync.
Station 4 decisions/reflections and Station 5 final insights are saved as well.
Admin corrections affect the online research records; they do not rewrite a
student's already displayed quiz feedback or completed lesson state.

Answers are durably queued in the student's browser before network submission.
Keep that browser's site storage until pending answers are sent. The original
local progress and local results history remain available for recovery.

## Current verification

The project URL, publishable key, and pinned SDK URL were reachable on November
15, 2026. At that check, `student_answers` did not exist and anonymous sign-in was
disabled. The SQL and authentication steps above must be completed before live
end-to-end submission/edit/delete can succeed.

Official references: [anonymous sign-in](https://supabase.com/docs/guides/auth/auth-anonymous),
[row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security),
[Realtime database changes](https://supabase.com/docs/guides/realtime/postgres-changes).
