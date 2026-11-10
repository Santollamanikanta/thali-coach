# Google Play release kit — Thali Coach

Everything here is ready to upload. The only things I cannot do for you are the
Google Play Developer account, identity verification, and pressing **Publish** —
those need your own Google account.

- **App bundle (upload this):** `download/thali-coach.aab` → also at
  <https://santollamanikanta.github.io/thali-coach/download/thali-coach.aab>
- **Package name:** `com.thalicoach.app`
- **Version:** 3 (`1.2`)
- **Minimum Android:** 6.0 (API 23) · **Target:** Android 15 (API 35)
- **Permissions:** Internet only. No location, camera, contacts, files or health
  permissions.
- **Price:** Free · **Ads:** None · **In-app purchases:** None · **Login:** None

---

## 1. Store listing (copy-paste)

**App name (max 30 chars)**

```
Thali Coach: Indian Diet
```

**Short description (max 80 chars)**

```
Indian meal plans, groceries and a food coach that reads what you ate.
```

**Full description (max 4000 chars)**

```
Thali Coach is a gentle, offline diet and activity companion built around Indian home food — idli, dosa, poha, dal, roti, rice, sabzi, curd, chai, and the snacks that come with real life.

WHY IT IS DIFFERENT
• No login, no ads, no subscription. Everything stays on your phone.
• Built for Indian portions: katori, roti, idli, glass, packet — not just grams.
• Kind by design: if you are under 18, pregnant, breastfeeding, have a medical condition, or have a history of disordered eating, the app switches to healthy-habits mode and hides calorie deficits and weight targets.

WHAT YOU GET
• A full-month plan calendar: every date, with a dot on days you logged, and familiar meals with realistic portions.
• A food coach: type (or say, on the web) what you are eating — “2 samosa and 1 cup chai”. It estimates calories, protein and fibre, explains how to eat it, what to add, what to remove or reduce, a lighter swap, and what would happen if you ate it every day, shown as maths rather than a promise. Snap a photo of the plate to keep it with the entry.
• A grocery list and a prep list for the week.
• Water, meal, step and strength tracking, a weekly weight and waist check-in, and a simple progress view. Saving a weigh-in refreshes your targets and plan.
• Gentle reminders for meals, water and walks (in-app while the app is open).
• Works offline. No account. No data leaves your device.
• Free and open source (MIT): the full code is public.

SAFETY FIRST
Every number is an estimate from standard food tables. Thali Coach does not diagnose or treat anything and is not a replacement for a doctor or registered dietitian. Calorie floors (1,200 kcal for women, 1,500 kcal for men) are built in. There are no crash diets and no weight-loss promises.

Made for Indian kitchens. Eat well, Indian-style.
```

**Category:** Health & Fitness
**Tags (if offered):** Indian food, meal planning, nutrition, food tracker, healthy habits
**Website (optional):** <https://santollamanikanta.github.io/thali-coach/>
**Privacy policy (required):** <https://santollamanikanta.github.io/thali-coach/privacy.html>
**Contact email:** use the email on your Play developer account (the one you want
shown publicly).

### Graphics in this folder

| File | Play field | Spec |
| --- | --- | --- |
| `icon-512.png` | App icon | 512×512, 32-bit PNG with alpha |
| `feature-graphic-1024x500.png` | Feature graphic | 1024×500, 24-bit PNG, no alpha |
| `screenshots/01-coach.png` | Phone screenshot | 1080×1920, 24-bit PNG |
| `screenshots/02-coach-advice.png` | Phone screenshot | 1080×1920 |
| `screenshots/03-plan.png` | Phone screenshot | 1080×1920 |
| `screenshots/04-progress.png` | Phone screenshot | 1080×1920 |
| `screenshots/05-targets.png` | Phone screenshot | 1080×1920 |
| `screenshots/06-activity.png` | Phone screenshot | 1080×1920 |

Play needs at least 2 phone screenshots; upload all 6 in this order. The
screenshots use sample data (29-year-old, 55 kg) — not your real details.

---

## 2. App content answers

### Data safety

- Does your app collect or share any of the required user data types? **No**
- Is all user data encrypted in transit? **Not applicable — no data is
  transmitted or collected**
- Do you provide a way for users to request data deletion? **Not applicable —
  no account and no server-side data.** (In the app: Android Settings → Apps →
  Thali Coach → Storage → Clear storage, or uninstall.)
- Family policy / ads / purchases: **No ads, no in-app purchases, no account**

### Content rating questionnaire

- Violence, blood, sexual content, nudity, bad language, controlled substances,
  gambling: **No** to all
- User-generated content or social features: **No** (food text stays on the
  device and is never shared)
- Advertisements: **No**
- Health/medical content: the app gives **general wellness estimates** and
  explicitly says it is not medical advice. It is **not a medical device** and
  does not diagnose, treat or monitor a condition.

Typical outcome: **Everyone / PEGI 3**. Answer honestly if Play asks about the
weight/diet content.

### Target audience

- Age group: **18 and over** (the app has a safety mode for under-18s, but the
  store listing is for adults). This keeps the app out of the Families policy.
- App appeal to children: **No**

### Other declarations

- Health apps declaration: **general wellness / fitness**, not a medical device,
  no health data collection or sharing
- News app: **No** · COVID-19 tracing: **No** · Government app: **No**
- Financial features: **No** · Real-money gambling: **No**
- Data deletion request URL: **not applicable** (no accounts)
- App access: **All functionality is available without special access** (no
  login, no invite code)

---

## 3. Upload walkthrough

1. **Create the developer account** at <https://play.google.com/console>. Pay the
   one-time **US$25**, complete identity verification (usually 1–3 days).
2. **Create app** → name `Thali Coach: Indian Diet`, default language English,
   type **App**, **Free**, accept the declarations.
3. **App content** → complete every section from the answers above. Paste the
   privacy policy URL. This must be green/complete before you can publish.
4. **Store presence → Main store listing** → paste the name, short and full
   description; upload the icon, feature graphic and all 6 screenshots; choose
   **Health & Fitness**.
5. **Testing → Internal testing** → Create release → upload
   `thali-coach.aab` → add your own Gmail as a tester → roll out. Install it from
   the opt-in link to check the real Play build on your phone.
6. **Closed testing (if Play asks):** new *personal* developer accounts must run
   a closed test with **12 testers for 14 continuous days** before they can apply
   for production. Organisation accounts may skip this. Check the banner in your
   console — the rule changes from time to time.
7. **Production → Create release** → use the tested bundle → write release notes →
   roll out. Review normally takes a few days; health & fitness apps can take
   longer.
8. Keep the upload key safe: `thali-coach-android\thali-release.keystore`
   (alias `thali`). If you lose it you cannot update an app that was published
   without Play App Signing — enable **Play App Signing** so Google holds the
   distribution key.

### Important note about the sideload APK

The APK from this site and the Play build are signed with different keys (Play
re-signs apps). If you already installed the sideload APK, uninstall it once
before installing the Play version. Your saved data lives inside the app's
storage, so uninstalling clears it.

---

## 4. What was verified here

- AAB passes `bundletool validate`; module `base` contains the web assets,
  `classes.dex`, resources and manifest.
- AAB is signed and `jarsigner -verify` passes.
- Version code 3 / version name 1.2, minSdk 23, targetSdk 35.
- APK is signed with v1 + v2 + v3 schemes and contains
  `assets/www/index.html`, `coach-data.js`, `coach.css`, `privacy.html`.
- Web app tested at 360 px: month calendar has 7 columns and no horizontal
  overflow, coach parses “2 samosa and 1 cup chai” to 410 kcal, a photo flows
  from the file input into the log thumbnail, saving a weigh-in rebuilds the
  targets, and reset/start-over work behind the confirm sheet.
- Healthy-habits mode still hides every calorie number.

Not verified: installation on a physical Android device or emulator (none was
available here). The camera hand-off uses the standard `onShowFileChooser`
path plus a local content provider. Please install the internal-testing build
and try Setup → Plan (calendar) → Coach (📷) → Progress before rolling out.
