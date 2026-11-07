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

Limits of the shell: the app's own service worker is disabled inside it (so
updates are never stale) and browser notifications are unavailable, so the
Reminders tab can only show in-app nudges.

## Files

| File | What it does |
| --- | --- |
| `index.html` | The 8 screens and bottom tab bar. |
| `style.css` | Mint/leaf/turmeric theme, light + dark mode, 360 px friendly. |
| `data.js` | Food table, 7-day plan, groceries, prep, activity content. **Edit food or prices here.** |
| `app.js` | Calculator, plan builder, localStorage, reminders, chart. |
| `manifest.json` | Makes it installable on a phone. |
| `sw.js` | Tiny service worker for offline use (network first, cache backup). |
| `icon.svg` | App icon. |
| `serve.js` | Optional local test server (Node, no packages). |

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
