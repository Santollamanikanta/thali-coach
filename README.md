# Thali Coach 🌿

A small, mobile-first diet and activity companion for Indian home cooking and
gentle fat loss. Plain HTML, CSS and JavaScript — no frameworks, no npm, no
build step, no backend, no login. Everything is saved in `localStorage` on the
phone.

## Run it

**Simplest:** open `index.html` in a browser. Everything works except the
service worker and phone notifications (browsers block those on `file://`).

**Recommended (install + notifications):**

```bash
node serve.js
```

Then open <http://localhost:8000> on your computer, or on your phone using your
computer's local IP on the same Wi‑Fi. Notifications and “Install app” need
`http://localhost` or `https://`.

## Food coach (new)

The **Coach** tab takes plain words — “2 samosa and 1 cup chai”, “1 katori
rice, dal and curd”, “one packet chips” — or your voice (Chrome/Android speech
input), and replies with:

- what it recognised and a rough calorie/protein/fibre estimate,
- how to eat it (fibre first, slow start, water),
- what you add (fibre, protein) and what to remove or halve,
- what to swap for a lighter version of the same craving,
- what happens **if you ate it every day** (shown as maths, not a promise),
- Add to today / Ignore.

Saved food entries appear as a running log on the Coach tab and as a summary on
Progress. In healthy-habits mode every calorie number is hidden and only portion
advice is shown.

It is deliberately offline and rule-based: a fixed food table in
`coach-data.js`, a small parser in `app.js`, no AI service, no API key and
nothing sent off the phone. That means it handles common Indian foods and
snacks, not arbitrary photos.

### Camera / photo of the plate

Tap **📷** on the Coach tab to take a photo (or pick one from the gallery). The
photo is shrunk to a 560 px JPEG, stored with that day's entry, and shown as a
thumbnail in the log; tap it to view it full screen. The last 12 photos are
kept, so storage never fills.

The photo is a memory aid, **not** recognition: a phone cannot name food from
pixels offline, so after the snap the app shows tap-to-add chips (“2 idli”,
“1 katori dal”…) and the words still do the reading. Real photo recognition
would need an online vision model, an API key and a backend — deliberately out
of scope for a no-login, no-server app.

## Android app (APK)

`download/thali-coach.apk` is a signed sideload build — no Play Store needed.
It is a tiny WebView shell (`com.thalicoach.app`) that bundles these same files
in `assets/www` and serves them from a fake `https://app.thali.local` origin, so
`localStorage` persists and the app works fully offline.

Rebuild it (no Gradle, no internet) with the separate project in
`C:\Users\DELL\thali-coach-android`:

```powershell
powershell -ExecutionPolicy Bypass -File C:\Users\DELL\thali-coach-android\build.ps1
```

That script copies the web files in, then runs `aapt2` → `javac` → `d8` →
`zipalign` → `apksigner` and drops the finished APK into `download/`.

### Google Play bundle (AAB)

`download/thali-coach.aab` is the signed Play upload bundle (version 3 / 1.2).
It is built without Gradle by `C:\Users\DELL\thali-coach-android\build-aab.ps1`
(`aapt2 --proto-format` → `javac` → `d8` → module zip → `bundletool` →
`jarsigner`). Download `bundletool-all-<version>.jar` into that folder first.

Everything needed for the store listing — copy, graphics, data-safety answers,
content rating and a Console walkthrough — is in
[`play-store/listing.md`](play-store/listing.md).

Limits of the shell: the app's own service worker is disabled inside it (so
updates are never stale) and browser notifications are unavailable, so the
Reminders tab can only show in-app nudges. The camera button opens the phone's
camera app through `onShowFileChooser` + a tiny local `PhotoProvider`; no
camera or storage permission is requested.

## Plan calendar, refresh and restart

The **Plan** tab shows a full month (Monday first) with a dot on every day that
has a log. Tap any date to see that weekday's menu; arrows move month by month
and tapping the month name jumps back to today.

Targets and plan are rebuilt automatically when you save a weight check-in in
Progress. **Targets → Refresh or start over** also gives you, by hand:

- **Refresh my targets and plan** — recalculate from your current details.
- **Reset today's log** — blank today only; past days stay.
- **Start over** — erase everything on the phone and return to Setup.

Each one asks for confirmation in a normal in-page sheet (not `window.confirm`,
which is unreliable in a WebView).

## Files

| File | What it does |
| --- | --- |
| `index.html` | The 9 screens and bottom tab bar. |
| `style.css` | Mint/leaf/turmeric theme, light + dark mode, 360 px friendly. |
| `coach.css` | Food-coach screen styles. |
| `data.js` | Food table, 7-day plan, groceries, prep, activity content. **Edit food or prices here.** |
| `coach-data.js` | Snacks/outside-food table, aliases, quick chips, lighter swaps. |
| `app.js` | Calculator, plan builder, coach parser/advice, localStorage, reminders, chart. |
| `manifest.json` | Makes it installable on a phone. |
| `privacy.html` | Plain-language privacy policy + health disclaimer (also the Play Store URL). |
| `sw.js` | Tiny service worker for offline use (network first, cache backup). |
| `icon.svg` | App icon. |
| `serve.js` | Optional local test server (Node, no packages). |
| `LICENSE` | MIT licence — this is open source. |

## Licence and downloads

Thali Coach is open source under the [MIT licence](LICENSE). The full source,
the Android shell and the build scripts are at
<https://github.com/Santollamanikanta/thali-coach>. A source ZIP is also
published at
<https://santollamanikanta.github.io/thali-coach/download/thali-coach-source.zip>.

## The safety rules, built in

- Age is the first question. Under 18 → no calorie deficit or weight-loss
  target; healthy-habits mode instead.
- Pregnant, breastfeeding, a medical condition, past disordered eating, or an
  adult BMI under 18.5 → healthy-habits mode, with a kind “see a doctor or
  dietitian” message. Weight tracking is hidden in this mode.
- BMI 30+ (adults) → a gentle doctor check-in note, not a block.
- Every number is labelled as an estimate. No weight-loss promises.
- Calorie floor: 1200 kcal (women / other), 1500 kcal (men). No crash diets.
- Deficit is 17.5% (inside the 15–20% gentle range), never below the floor.

## Where the numbers come from

Mifflin–St Jeor for resting energy, an activity multiplier for maintenance,
then a gentle deficit. Protein ≈ 1.6 g/kg, fat ≈ 27% of calories, carbs fill
the rest, fibre 14 g per 1000 kcal. The plan builder resizes grain and protein
portions to land near the target. These are estimates from standard food
tables, not measurements of your plate.

## Editing

- Change a food or its nutrition in `FOODS` in `data.js`.
- Change a meal in `PLAN`. Items are `{ f: 'foodId', g: grams }`.
  Mark a food `staple: true` if its portion may be resized.
- Change grocery prices in `GROCERIES` (rough Indian estimates).
- Bump `CACHE_NAME` in `sw.js` after edits so installed copies refresh.

## Reminders, honestly

Reminders use the Notifications API plus in-app toasts. They fire **only while
the app is open, or installed and running** — phones pause web apps in the
background. There is no server to push to. The water reminder repeats every two
hours between the start and end times you choose.

## Not medical advice

This is a general educational tool. It does not diagnose, treat or replace a
doctor or registered dietitian. If you have a medical condition, are pregnant or
breastfeeding, are under 18, or have a history of disordered eating, please get
individual guidance.
