# DALUM-AWIT

**Ang Paglalakbay ni Mutya: Sa Bukid ng mga Kuwento**

Isang station-based, interactive na aralin sa Filipino 7 tungkol sa awiting-bayang “Magtanim ay 'Di Biro,” karanasan ng mga magsasaka, at mga kontemporaryong isyung panlipunan.

Ang app ay isang static na website na walang build step. Lokal na sine-save ang progreso at ipinapadala ang mga sagot sa Supabase. Para sa eksaktong SQL at admin setup, sundin ang [Supabase setup](supabase/SETUP.md).

---

## Mabilis na Simula

### Opsyon A — Buksan nang direkta

I-double-click lamang ang `index.html`.

Gagamitin ng app ang `data/storyData.js` (offline mirror ng JSON) kapag `file://` ang protocol.

### Opsyon B — Lokal na web server (inirerekomenda)

Mula sa project folder:

```powershell
python -m http.server 8765
```

Pagkatapos, buksan ang:

```
http://127.0.0.1:8765
```

Sa mode na ito, binabasa ang canonical na `data/storyData.json`.

### Kinakailangan

- Isang modernong browser (Chrome, Edge, Firefox, Safari).
- Kailangan ng internet para sa online submissions at admin dashboard. Kapag offline, naka-queue ang mga sagot sa browser at muling ipapadala kapag nakakonekta. Kung walang access sa Google Fonts, gagamit ang app ng local fallback fonts.
- Node.js ay kailangan lamang kung i-e-edit ang nilalaman at i-regenerate ang offline data mirror.

---

## Ang Limang Istasyon

| Station | Pamagat | Pangunahing Gawain |
|---|---|---|
| 1 | Sa Gitna ng Palayan | Usapan nina Mutya at Mang Isko, kasunod ang mga tanong 1–5. |
| 2 | Ang Awit ng mga Magsasaka | Pagsusuri ng limang linya ng awit at mga tanong 6–10. |
| 3 | Kung Ano ang Nasa Likod ng Awit | Interactive na daloy ng pagkain at mga tanong 11–15. |
| 4 | Pag-uwi ni Mutya | Pagsusuri ng isyung panlipunan at mga tanong 16–20. |
| 5 | Ang Natutuhan ni Mutya | Mga tanong 21–25, synthesis, at printable na ulat. |

Sunod-sunod na nagbubukas ang mga istasyon. Ang bawat isa ay may sariling completion condition:

- **Simula:** diretso sa istasyon; wala nang hiwalay na full-story intro.
- **Station 1:** matapos ang kuwento sa istasyon at masagutan ang limang tanong.
- **Station 2:** mabuksan ang limang pagsusuri at masagutan ang limang tanong.
- **Station 3:** matapos ang kuwento sa istasyon at masagutan ang limang tanong.
- **Station 4:** matapos ang kuwento, may napiling isyu, may OO/HINDI na sagot, may paliwanag na 40+ karakter, at nasagutan ang limang tanong.
- **Station 5:** masagutan ang huling limang tanong; dito rin ang print/save ng report.

Maaaring balikan ang mga nakaraang istasyon gamit ang stepper sa itaas.

Sa Stations 1, 3, at 4, kasya sa viewport ang tagpo. Lumalabas ang mga tanong matapos ang huling story beat, gamit ang finish button o matapos ang reading timer. Sa maliit na screen, pinapahina ang mahahabang teksto at gawain sa halip na paliitin ang font o mag-scroll. Hindi binabago ang mga salita, larawan, o pagkakasunod ng kuwento.

---

## Estruktura ng Project

```
Sofia's Thesis/
├─ index.html                  ← app shell, header, stepper, station containers
├─ admin.html                  ← standalone local results dashboard
├─ magtanim.mp3                ← looping audio (idagdag sa project root)
├─ README.md
├─ assets/
│  ├─ css/
│  │  ├─ main.css             ← design system, responsive layout, print styles
│  │  └─ admin.css            ← isolated admin dashboard styles
│  ├─ images/
│  │  ├─ favicon.svg
│  │  ├─ Mutya (Nakatayo).png
│  │  ├─ Mutya (Nagsasalita).png
│  │  ├─ Mutya (Naglalakad).png
│  │  ├─ Mang Isko (Nakatayo_Nakikinig).png
│  │  ├─ Mang Isko (Nagsasalita).png
│  │  ├─ Mang Isko (Naglalakad).png
│  │  ├─ Mang Isko (Nagtatanim).png
│  │  └─ Mag asawa.png
│  └─ js/
│     ├─ state.js             ← state manager + LocalStorage + shared utilities
│     ├─ dialogue.js          ← visual-novel dialogue engine
│     ├─ quizzes.js           ← 25-item station quiz renderer
│     ├─ results.js           ← submission history in LocalStorage
│     ├─ admin.js             ← admin dashboard controller
│     ├─ station1.js          ← comprehension check
│     ├─ station2.js          ← lyric analysis accordion
│     ├─ station3.js          ← food-security flowchart
│     ├─ station4.js          ← issue selection, OO/HINDI, reflection
│     ├─ station5.js          ← synthesis, summary, printable report
│     └─ app.js               ← router, stepper, dialogs, data loading
├─ data/
│  ├─ storyData.json          ← canonical content source
│  └─ storyData.js            ← auto-generated offline mirror
└─ tools/
   └─ embed-data.mjs          ← regenerates data/storyData.js
```

---

## Pag-edit ng Nilalaman

Lahat ng teksto, tauhan, usapan, pagsusuri, isyu, at synthesis ay nasa:

```
data/storyData.json
```

Pagkatapos i-edit ang JSON, i-regenerate ang offline mirror:

```powershell
node tools/embed-data.mjs
```

Mahalagang gawin ito upang pareho ang laman ng `storyData.json` at `storyData.js`. Kapag naka-local server, JSON ang binabasa; kapag direktang binuksan ang `index.html`, JS mirror ang ginagamit.

### Mga pangunahing bahagi ng JSON

| Key | Nilalaman |
|---|---|
| `meta` | Pamagat, baitang, asignatura, awit. |
| `characters` | Pangalan, role, side, at sprite files ng mga tauhan. |
| `stations` | Limang station entry: title, lede, objective, scene, dialogue, quiz/lesson. |
| `flowchart` | Apat na yugto ng food-security cycle. |
| `issues` | Tatlong isyung panlipunan, tanong, at prompt. |
| `synthesis` | Apat na node ng final diagram. |
| `summary` | Pamagat at intro ng student report. |

Ang bawat dialogue line ay may:

```json
{
  "speaker": "mutya",
  "text": "Magandang araw po!",
  "scene": "field-morning",
  "mutya": "nagsasalita",
  "isko": "nagtatanim"
}
```

- `speaker`: `mutya`, `isko`, `nanay`, `tatay`, o `narrator`.
- `scene`: `field-morning`, `field-afternoon`, `home`, o `dawn`.
- `mutya` / `isko`: sprite state key.
- `parents`: `true` kung lalabas ang `Mag asawa.png` sa Station 4.

---

## Pag-save at Pag-print ng Ulat

1. Tapusin ang Station 4.
2. Pumunta sa Station 5.
3. Isulat ang pangalan, baitang/seksyon, at “Ang pinakamahalagang natutuhan ko.”
4. Pindutin ang **I-print / I-save**.

Sa print dialog ng browser, piliin ang **Save as PDF** upang makakuha ng A4 na ulat. Karaniwang dalawang pahina ang output at may kasamang:

- Pangalan, baitang/seksyon, petsa, at guro
- Napiling isyung panlipunan at ang tanong
- Sagot na OO/HINDI at ang paliwanag ng mag-aaral
- Ang natutuhan ng mag-aaral
- Sintesis na `AWIT → GAWAIN → KARANASAN NG MAGSASAKA → MGA ISYUNG PANLIPUNAN`
- Mga layunin ng bawat istasyon
- Deklarasyon at lagda ng mag-aaral at guro
- Footer ng DALUM-AWIT

Maaari ring gamitin ang `Ctrl + P` / `Cmd + P`; awtomatikong binubuo ng app ang print-only na ulat bago mag-print.

---

## Progreso at Privacy

- Naka-save ang progreso sa browser sa ilalim ng key na `dalumAwit.state.v1`.
- May lokal na recovery history sa `dalumAwit.submissions.v1` at pending submissions sa `dalumAwit.onlineQueue.v1`.
- Awtomatikong gumagamit ng anonymous Supabase sign-in ang mag-aaral. Ipinapadala online ang identifier/pangalan, station, tanong, sagot, at oras.
- Ang `admin.html` ay nangangailangan ng awtorisadong admin account at nagpapakita ng online na sagot mula sa lahat ng device, na may Edit/Delete sa bawat entry. Tingnan ang [setup at permissions](supabase/SETUP.md).
- Ang **reset button** sa header ay nagbubura ng kasalukuyang progreso ngunit pinananatili ang naitalang attempt para sa dashboard. Mag-reload ang pahina at babalik sa landing page.
- Kung gagamit ng shared classroom computer, pindutin ang reset bago magsimula ang susunod na mag-aaral.

---

## Accessibility at Responsiveness

- Naka-test sa lapad na **1440, 1180, 1024, 900, 834, 768, 700, 600, 430, 390, 360, at 320 px**.
- Walang horizontal overflow sa lahat ng nasubukang lapad.
- Gumagana ang keyboard navigation: `←` at `→` para sa dialogue; `Tab` at `Enter` para sa mga kontrol.
- May visible focus styles at `prefers-reduced-motion` support.
- Ang mobile view ay gumagamit ng stacked layout, mas maliit na sprites, at full-width buttons.
- Ang station stepper ay nagpapakita ng numero sa mobile at may caption para sa aktibong istasyon.

---

## Troubleshooting

**Hindi lumalabas ang mga larawan o walang nangyayari kapag binuksan ang file**
- Siguraduhing buo ang `assets/images/` folder at walang na-rename na PNG.
- Subukang buksan gamit ang lokal na server (Opsyon B).

**Luma ang teksto pagkatapos i-edit ang JSON**
- Patakbuhin muli ang `node tools/embed-data.mjs`.

**Nawala ang progreso**
- Naka-clear ang browser storage, gumamit ng private/incognito window, o ibang browser ang ginamit. Bahagi ito ng inaasahang behavior ng LocalStorage.

**Hindi lumalabas nang maayos ang print**
- Sa print dialog, i-enable ang **Background graphics** kung nais makita ang light green/gold accents.
- Piliin ang A4 at default margins.

---

## Mga Pinagmulan ng Nilalaman

- `BANGHAY NG KUWENTO.docx` — narrative outline, station objectives, at Filipino dialogue.
- `DALUM-AWIT_TESIS.docx` — Kabanata II, metodolohiya, at framing ng pag-aaral.
- `drive-download-20261021T130856Z-1-001.zip` — walong transparent na character PNG, inilagay sa `assets/images/`.

Ang awit na “Magtanim ay 'Di Biro” ay isang tradisyunal na awiting-bayang Pilipino. Ang app ay ginawa bilang interbensyong pampagtuturo para sa Baitang 7 Filipino.
