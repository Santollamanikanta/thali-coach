/* app.js — Thali Coach
   Plain JavaScript. No build step, no backend.
   Read it top to bottom:
     1. small helpers + storage
     2. setup form + safety
     3. calorie and macro estimates
     4. 7-day plan builder
     5. screen renderers (targets, plan, groceries, prep, activity, progress, reminders)
     6. reminders, notifications, service worker
*/

'use strict';

/* ===========================================================================
   1. HELPERS + STORAGE
=========================================================================== */

const STORE_KEY = 'thaliCoach.v1';
const WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MEALS = [
  { key: 'breakfast', label: 'Breakfast', icon: '🌅' },
  { key: 'lunch',     label: 'Lunch',     icon: '🍛' },
  { key: 'snack',     label: 'Snack',     icon: '🍎' },
  { key: 'dinner',    label: 'Dinner',    icon: '🌙' }
];
const SCREENS = ['setup', 'targets', 'plan', 'coach', 'groceries', 'prep', 'activity', 'progress', 'reminders'];
const FLOORS = { female: 1200, male: 1500, other: 1200 };

/* Activity level -> multiplier for maintenance calories, plus step/walk goals. */
const ACTIVITY = {
  sedentary: { label: 'Mostly sitting',  mult: 1.2,   steps: 6000,  walk: 30 },
  light:     { label: 'Lightly active',  mult: 1.375, steps: 7500,  walk: 35 },
  moderate:  { label: 'Moderately active', mult: 1.55, steps: 9000,  walk: 45 },
  active:    { label: 'Very active',     mult: 1.725, steps: 11000, walk: 50 }
};

const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const num = (n) => Math.round(n).toLocaleString('en-IN');
const esc = (s) => String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const round5 = (g) => Math.max(5, Math.round(g / 5) * 5);

function todayKey(d = new Date()) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function parseKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function daysAgo(key) {
  const a = new Date(); a.setHours(0, 0, 0, 0);
  const b = parseKey(key); b.setHours(0, 0, 0, 0);
  return Math.round((a - b) / 86400000);
}
/* ISO-ish week key, e.g. 2026-W45 — keeps grocery/prep ticks per week. */
function weekKey(d = new Date()) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((t - yearStart) / 86400000 + 1) / 7);
  return t.getUTCFullYear() + '-W' + String(week).padStart(2, '0');
}
function defaultDayName() {
  return WEEK[(new Date().getDay() + 6) % 7];
}
function fmtTime(hhmm) {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  const ampm = h < 12 ? 'am' : 'pm';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return hour + ':' + String(m).padStart(2, '0') + ' ' + ampm;
}

function defaultState() {
  return {
    profile: null,
    targets: null,
    logs: {},
    weights: [],
    groceryChecks: {},
    prepChecks: {},
    reminders: DEFAULT_REMINDERS.map((r) => ({ ...r })),
    fired: {},
    selectedDay: null
  };
}

function loadState() {
  const base = defaultState();
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
    if (!saved) return base;
    const merged = Object.assign(base, saved);
    /* Re-merge reminders so new versions keep the user's saved times. */
    merged.reminders = DEFAULT_REMINDERS.map((def) => {
      const old = (saved.reminders || []).find((r) => r.id === def.id) || {};
      return { ...def, on: old.on !== undefined ? old.on : def.on, time: old.time || def.time, end: old.end || def.end };
    });
    if (merged.profile) merged.targets = calcTargets(merged.profile);
    return merged;
  } catch (err) {
    console.warn('Could not read saved data, starting fresh.', err);
    return base;
  }
}

let state = loadState();

function save() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn('Could not save. Storage may be full or blocked.', err);
  }
}

function getLog(key) {
  if (!state.logs[key]) state.logs[key] = { water: 0, meals: {}, activity: {} };
  return state.logs[key];
}

/* Small toast used for in-app reminders and confirmations. */
let toastTimer = null;
function toast(message) {
  const el = $('#toast');
  if (!el) return;
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 5500);
}

function needSetupHtml() {
  return `<div class="card empty">
    <h3>One small step first</h3>
    <p>Fill in your setup so the plan and estimates can be yours.</p>
    <button class="btn" type="button" data-go="setup">Open setup</button>
  </div>`;
}

/* ===========================================================================
   2. SETUP + SAFETY
=========================================================================== */

function buildLoveChips() {
  const box = $('#loveChips');
  box.innerHTML = LOVED_FOODS.map((x) =>
    `<button type="button" class="chip" data-food="${x.food}" aria-pressed="false">${esc(x.label)}</button>`
  ).join('');
}

function syncPregnancyRow() {
  const row = $('#pregnancyRow');
  const show = $('#sex').value === 'female';
  row.hidden = !show;
  if (!show) {
    $('#pregnant').checked = false;
    $('#breastfeeding').checked = false;
  }
}

function prefillSetup() {
  const p = state.profile;
  const chips = $$('#loveChips .chip');
  if (!p) {
    chips.forEach((c) => { c.classList.remove('on'); c.setAttribute('aria-pressed', 'false'); });
    return;
  }
  $('#age').value = p.age;
  $('#sex').value = p.sex;
  $('#heightFt').value = p.heightFt;
  $('#heightIn').value = p.heightIn;
  $('#weight').value = p.weightKg;
  $('#activity').value = p.activity;
  $('#diet').value = p.diet;
  $('#budget').value = p.budget;
  $('#condition').value = p.condition || 'none';
  $('#edHistory').value = p.edHistory ? 'yes' : 'no';
  $('#pregnant').checked = !!p.pregnant;
  $('#breastfeeding').checked = !!p.breastfeeding;
  $('#lovedText').value = p.lovedText || '';
  syncPregnancyRow();
  chips.forEach((c) => {
    const on = (p.loved || []).includes(c.dataset.food);
    c.classList.toggle('on', on);
    c.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
}

function onSetupSubmit(event) {
  event.preventDefault();
  const errorBox = $('#setupError');
  errorBox.hidden = true;

  const age = parseInt($('#age').value, 10);
  const ft = parseInt($('#heightFt').value, 10);
  const inch = parseInt($('#heightIn').value, 10) || 0;
  const kg = parseFloat($('#weight').value);
  const cm = Math.round((ft * 12 + inch) * 2.54 * 10) / 10;

  let problem = '';
  if (!age || age < 10 || age > 100) problem = 'Please add your age (10–100). It is our first safety check.';
  else if (!$('#sex').value) problem = 'Please choose an option for sex (it changes the estimate).';
  else if (!ft || ft < 3 || ft > 8 || inch < 0 || inch > 11) problem = 'Please check your height in feet and inches.';
  else if (!kg || kg < 25 || kg > 300) problem = 'Please add your weight in kilograms (25–300).';
  if (problem) {
    errorBox.textContent = problem;
    errorBox.hidden = false;
    errorBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  const sex = $('#sex').value;
  const profile = {
    age,
    sex,
    heightFt: ft,
    heightIn: inch,
    heightCm: cm,
    weightKg: Math.round(kg * 10) / 10,
    activity: $('#activity').value,
    diet: $('#diet').value,
    budget: parseInt($('#budget').value, 10) || 1200,
    condition: $('#condition').value,
    edHistory: $('#edHistory').value === 'yes',
    pregnant: sex === 'female' && $('#pregnant').checked,
    breastfeeding: sex === 'female' && $('#breastfeeding').checked,
    loved: $$('#loveChips .chip.on').map((c) => c.dataset.food),
    lovedText: $('#lovedText').value.trim()
  };

  state.profile = profile;
  state.targets = calcTargets(profile);
  save();
  renderAll();
  showScreen('targets');
  toast(state.targets.mode === 'habits'
    ? 'Saved. We are keeping this gentle — healthy habits mode is on.'
    : 'Saved. These are estimates to guide you, not rules.');
}

/* ===========================================================================
   3. CALCULATOR
   Mifflin-St Jeor for resting energy, an activity multiplier for maintenance,
   then a gentle 17.5% deficit with a hard calorie floor.
=========================================================================== */

function calcTargets(p) {
  const sexAdj = p.sex === 'male' ? 5 : p.sex === 'female' ? -161 : -78;
  const bmr = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age + sexAdj;
  const act = ACTIVITY[p.activity] || ACTIVITY.light;
  const maintenance = Math.round(bmr * act.mult);
  const bmi = p.weightKg / Math.pow(p.heightCm / 100, 2);
  const floor = FLOORS[p.sex] || 1200;

  /* Reasons to avoid a fat-loss prescription entirely. */
  const reasons = [];
  if (p.age < 18) reasons.push('under18');
  if (p.pregnant) reasons.push('pregnant');
  if (p.breastfeeding) reasons.push('breastfeeding');
  if (p.condition && p.condition !== 'none') reasons.push('condition');
  if (p.edHistory) reasons.push('ed');
  if (p.age >= 18 && bmi < 18.5) reasons.push('underweight');

  let mode = reasons.length ? 'habits' : 'loss';

  /* A deficit would need to go below the floor — so no deficit at all. */
  if (mode === 'loss' && maintenance <= floor) {
    reasons.push('lowmaintenance');
    mode = 'habits';
  }

  let target = maintenance;
  let deficit = 0;
  if (mode === 'loss') {
    const gentleCut = Math.round((maintenance * 0.175) / 10) * 10;
    target = Math.max(floor, maintenance - gentleCut);
    if (target >= maintenance) { target = maintenance; deficit = 0; }
    else deficit = maintenance - target;
  }

  const protein = Math.round(1.6 * p.weightKg);
  const fat = Math.round((target * 0.27) / 9);
  const carbs = Math.max(60, Math.round((target - protein * 4 - fat * 9) / 4));
  const fibre = Math.round((target / 1000) * 14);

  return {
    mode, reasons, floor, bmr: Math.round(bmr), maintenance, target, deficit,
    protein, fat, carbs, fibre,
    bmi,
    water: clamp(Math.round((p.weightKg * 35) / 250), 6, 12),
    activity: act
  };
}

/* ===========================================================================
   4. PLAN BUILDER
   Apply the user's diet, then gently resize staples and protein foods so the
   day lands near the calorie target. Everything stays an estimate.
=========================================================================== */

const UNIT_PLURALS = { glass: 'glasses', tsp: 'tsp', tbsp: 'tbsp', handful: 'handfuls' };

/* Smallest portions we will show — half a roti helps nobody. */
const MIN_PORTIONS = {
  idli: 100, dosa: 70, poha: 30, oats: 30, upma: 150, paratha: 60,
  rice: 100, roti: 60, khichdi: 150,
  roasted_chana: 20, almonds: 6, peanuts: 10
};

function household(foodId, grams) {
  const f = FOODS[foodId];
  if (!f) return grams + ' g';
  const amount = (f.ml ? grams + ' ml' : grams + ' g');
  const stateText = f.cooked === true ? ', cooked' : f.cooked === false ? ', raw' : '';
  if (!f.unit) return amount + stateText;

  const count = grams / f.unitG;
  const quarter = f.unit === 'katori' || f.unit === 'plate';
  const shown = count < 5
    ? Math.round(count * (quarter ? 4 : 2)) / (quarter ? 4 : 2)
    : Math.round(count);
  const unit = shown === 1 ? f.unit : (UNIT_PLURALS[f.unit] || f.unit + 's');
  return `≈ ${shown} ${unit} (${amount}${stateText})`;
}

function nutrition(items) {
  return items.reduce((t, it) => {
    const f = FOODS[it.f];
    const k = it.g / 100;
    t.kcal += f.kcal * k;
    t.p += f.p * k;
    t.c += f.c * k;
    t.fat += f.f * k;
    t.fib += f.fib * k;
    return t;
  }, { kcal: 0, p: 0, c: 0, fat: 0, fib: 0 });
}

function fitPortions(built, targets) {
  const goal = Math.round(targets.mode === 'habits' ? targets.maintenance : targets.target);
  const all = () => Object.values(built).flat();
  const sum = (list, field) => list.reduce((s, it) => s + FOODS[it.f][field] * it.g / 100, 0);
  const kcalOf = (list) => sum(list, 'kcal');

  /* Drinks, whole fruit, nuts and oils stay as they are. Everything else is
     portioned together, so a 1,300 kcal day does not become "one idli". */
  const FIXED = new Set(['oil', 'ghee', 'milk', 'chai', 'buttermilk', 'black_chai',
    'apple', 'banana', 'guava', 'papaya', 'almonds', 'peanuts', 'roasted_chana',
    'sambar', 'salad']);

  const oils = all().filter((it) => it.f === 'oil' || it.f === 'ghee');
  const staples = all().filter((it) => FOODS[it.f].staple);
  const portionables = all().filter((it) => !FIXED.has(it.f));

  /* 1. If fat is well above target, use a little less cooking oil. */
  if (sum(all(), 'f') > targets.fat * 1.15) {
    oils.forEach((it) => { it.g = Math.max(2, round5(it.g * 0.65)); });
  }

  /* 2. First gentle pass over the whole plate. */
  const total = kcalOf(all());
  if (total > 0) {
    const f = clamp(goal / total, 0.55, 1.6);
    portionables.forEach((it) => {
      const min = MIN_PORTIONS[it.f] || 10;
      const step = it.f === 'egg' ? 50 : 5;
      it.g = Math.max(min, Math.round((it.g * f) / step) * step);
    });
  }

  /* 3. Fine-tune the grains so the day lands near the target, without
        dropping below a sensible minimum portion. */
  const stapleKcal = kcalOf(staples);
  if (stapleKcal > 0) {
    const fixedKcal = kcalOf(all()) - stapleKcal;
    const f = clamp((goal - fixedKcal) / stapleKcal, 0.5, 1.6);
    staples.forEach((it) => {
      const min = MIN_PORTIONS[it.f] || 30;
      it.g = Math.max(min, round5(it.g * f));
    });
  }

  /* 4. Still over? Trim the optional snack extras, not the meals. */
  if (kcalOf(all()) > goal * 1.06) {
    all().forEach((it) => {
      if (['roasted_chana', 'almonds', 'peanuts'].includes(it.f)) {
        const min = MIN_PORTIONS[it.f] || 5;
        it.g = Math.max(min, round5(it.g * 0.6));
      }
    });
  }

  /* 5. One last gentle oil trim if fat is still well above target. */
  if (sum(all(), 'f') > targets.fat * 1.2) {
    oils.forEach((it) => { it.g = Math.max(2, round5(it.g * 0.6)); });
  }
}

function buildDay(dayName, profile, targets) {
  const day = PLAN.find((d) => d.day === dayName) || PLAN[0];
  const diet = profile.diet || 'veg';
  const built = {};

  MEALS.forEach(({ key }) => {
    const src = day[key];
    let items = src.items.map((it) => ({ ...it }));

    if (diet === 'vegan') {
      const hadProteinDairy = items.some((it) => it.role === 'protein' && FOODS[it.f].dairy);
      const hadChai = items.some((it) => it.f === 'chai');
      items = items.filter((it) => !FOODS[it.f].dairy);
      if (src.swaps && src.swaps.vegan) items = items.concat(src.swaps.vegan.map((it) => ({ ...it })));
      else if (hadProteinDairy) items.push({ f: 'tofu', g: 80 });
      if (hadChai) items.push({ f: 'black_chai', g: 150 });
    } else if (diet !== 'veg') {
      const swap = (src.swaps && (src.swaps[diet] || (diet === 'nonveg' && src.swaps.egg))) || null;
      if (swap) {
        items = items.filter((it) => it.role !== 'protein');
        items = items.concat(swap.map((it) => ({ ...it })));
      }
    }

    built[key] = items;
  });

  fitPortions(built, targets);
  return built;
}

function dayNutrition(built) {
  return nutrition(Object.values(built).flat());
}

/* ===========================================================================
   5. SCREEN RENDERERS
=========================================================================== */

function renderAll() {
  updateBadge();
  renderTargets();
  renderPlan();
  renderCoach();
  renderGroceries();
  renderPrep();
  renderActivity();
  renderProgress();
  renderReminders();
}

function updateBadge() {
  const badge = $('#modeBadge');
  if (!state.targets) { badge.hidden = true; return; }
  badge.hidden = false;
  const habits = state.targets.mode === 'habits';
  badge.textContent = habits ? 'Healthy habits' : 'Gentle fat-loss';
  badge.classList.toggle('badge-calm', habits);
}

const SAFETY_TEXT = {
  under18: {
    title: 'Growing bodies come first',
    body: 'Because you are under 18, we will not show calorie deficits or weight-loss targets. Your body is still growing. Regular meals, active play, good sleep and water matter more than any number. If weight is worrying you, please talk to a doctor or registered dietitian who works with young people.'
  },
  pregnant: {
    title: 'Pregnancy is not a fat-loss season',
    body: 'We have switched to healthy-habits mode and removed weight-loss targets. Please speak to your doctor or dietitian about what and how much to eat — your needs are specific and change through pregnancy.'
  },
  breastfeeding: {
    title: 'Breastfeeding needs extra care',
    body: 'We have switched to healthy-habits mode and removed calorie deficits. Please speak to your doctor or dietitian about your intake. Rest, regular meals and enough water matter a lot right now.'
  },
  condition: {
    title: "Let's keep your doctor in the loop",
    body: 'You told us about a medical condition. We will not give you a fat-loss prescription here. Please check with your doctor or registered dietitian before changing your diet — some conditions need specific guidance.'
  },
  ed: {
    title: 'Weight numbers are off the table',
    body: 'Because you mentioned disordered eating, we will not show calories, deficits or weight targets. Your worth is not a number. Please consider talking to a doctor, dietitian or counsellor who understands eating concerns. The habit tools here are gentle and optional.'
  },
  underweight: {
    title: 'A deficit is not right for you now',
    body: 'Your BMI is on the lower side, so a calorie deficit would not be appropriate. We have switched to healthy-habits mode. If you are losing weight without trying, please see a doctor.'
  },
  lowmaintenance: {
    title: 'A deficit would go too low',
    body: 'Your estimated maintenance calories are already at or below a safe minimum, so a fat-loss deficit would mean eating too little. We have switched to healthy-habits mode. Please talk to a dietitian before cutting calories.'
  }
};

function safetyCards(targets) {
  return targets.reasons.map((r) => {
    const s = SAFETY_TEXT[r] || SAFETY_TEXT.condition;
    return `<div class="card note note-warn">
      <h3>${esc(s.title)}</h3>
      <p>${esc(s.body)}</p>
      <p class="small muted">This app offers general information, not medical advice.</p>
    </div>`;
  }).join('');
}

function habitsCard(targets) {
  return `<div class="card hero calm">
    <p class="eyebrow">Healthy habits mode</p>
    <h3>No calorie targets. Just steady habits.</h3>
    <ul class="ticks">
      <li>Three meals and one or two snacks at regular times.</li>
      <li>A palm of protein at each meal — dal, curd, eggs, paneer, chicken, fish or soya.</li>
      <li>6–${targets.water} glasses of water through the day.</li>
      <li>30–60 minutes of movement or active play you enjoy.</li>
      <li>8–10 hours of sleep for teens, 7–9 for adults.</li>
      <li>Half the plate vegetables or fruit. No food is banned.</li>
    </ul>
    <p class="small muted">The meal plan, walks, water counter and reminders still work. They simply come without weight-loss numbers.</p>
  </div>`;
}

function renderTargets() {
  const box = $('#targetsContent');
  if (!state.profile || !state.targets) { box.innerHTML = needSetupHtml(); updateBadge(); return; }
  const t = state.targets;
  updateBadge();

  if (t.mode === 'habits') {
    box.innerHTML = safetyCards(t) + habitsCard(t);
    return;
  }

  const percent = t.deficit > 0 ? Math.round((t.deficit / t.maintenance) * 100) : 0;
  const doctorNote = t.bmi >= 30 ? `<div class="card note note-warn">
      <h3>A gentle check-in with your doctor</h3>
      <p>Your BMI is in a range where a quick check-up is a good idea before you start. That is not a red light — it is just good care. Gentle changes still count, and a doctor can look at the whole picture.</p>
    </div>` : '';

  box.innerHTML = `
    <div class="card hero">
      <p class="eyebrow">Daily estimate</p>
      <p class="big-number">${num(t.target)}<span> kcal</span></p>
      <p class="hint">About ${num(t.deficit)} kcal below your estimated maintenance (${percent}%). ${percent >= 15 && percent <= 20
        ? 'That sits in the gentle 15–20% range.'
        : 'The calorie floor kept this smaller than a full 15–20%, which is intentional.'} Estimates only, never a promise.</p>
      <div class="stat-grid">
        <div><b>${num(t.maintenance)}</b><span>maintenance</span></div>
        <div><b>${t.protein} g</b><span>protein</span></div>
        <div><b>${t.carbs} g</b><span>carbs</span></div>
        <div><b>${t.fat} g</b><span>fat</span></div>
        <div><b>${t.fibre} g</b><span>fibre</span></div>
        <div><b>${t.water}</b><span>glasses of water</span></div>
      </div>
      <p class="small muted">Protein ≈ 1.6 g per kg · fat ≈ 27% of calories · carbs the rest · fibre 14 g per 1,000 kcal.</p>
    </div>

    <div class="card">
      <h3>What the numbers say</h3>
      <p>BMI ≈ <b>${t.bmi.toFixed(1)}</b>. That is a screening number, not a verdict. It does not know your muscle, frame or health history.</p>
      <p class="small muted">Your calorie floor is ${num(t.floor)} kcal. We never go below it. No crash diets here.</p>
    </div>
    <div class="card">
      <h3>About that protein target</h3>
      <p>${t.protein} g is worked out at about 1.6 g per kg of your current weight. That is a good target, but it is genuinely hard to hit on ${num(t.target)} kcal${state.profile.diet === 'veg' || state.profile.diet === 'vegan' ? ' of plant-based food' : ''} without supplements.</p>
      <p class="small">The 7-day plan usually lands a little lower. Close the gap with ${state.profile.diet === 'veg' || state.profile.diet === 'vegan'
        ? 'a little more curd, dal, paneer, tofu or soya at meals'
        : 'a little more curd, dal, eggs, chicken or fish at meals'} — or accept a slightly lower protein day. Getting near it most days is what counts; one perfect day is not the goal.</p>
    </div>
    ${doctorNote}
    <div class="card">
      <h3>How we guessed</h3>
      <p class="small">We used the Mifflin–St Jeor equation: 10 × weight (kg) + 6.25 × height (cm) − 5 × age + a sex adjustment. Then we multiplied by your activity level (${esc(ACTIVITY[state.profile.activity] ? ACTIVITY[state.profile.activity].label : 'light')}).</p>
      <p class="small muted">Real needs vary with muscle, sleep, stress, medication and more. Treat these as a starting point, then adjust with how you feel and your multi-week trend.</p>
    </div>
    <div class="card calm">
      <h3>No promises, just a direction</h3>
      <p>We will not promise kilograms or a timeline. The plan aims for a small, repeatable deficit you can live with for months — with protein at every meal and food you actually enjoy.</p>
    </div>`;
}

/* ------------------------------- PLAN ---------------------------------- */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/* "2 – 8 Nov 2026" (or "30 Oct – 5 Nov 2026" across months). */
function weekLabelText(dates) {
  const a = dates[0];
  const b = dates[6];
  if (a.getMonth() === b.getMonth()) {
    return `${a.getDate()} – ${b.getDate()} ${MONTHS[b.getMonth()]} ${b.getFullYear()}`;
  }
  return `${a.getDate()} ${MONTHS[a.getMonth()]} – ${b.getDate()} ${MONTHS[b.getMonth()]} ${b.getFullYear()}`;
}

function mealsOn(key) {
  const log = state.logs[key];
  return !!(log && log.meals && Object.values(log.meals).some(Boolean));
}

/* Consecutive days with at least one meal ticked, ending today or yesterday. */
function mealStreak() {
  let n = 0;
  const d = new Date();
  if (!mealsOn(todayKey(d))) d.setDate(d.getDate() - 1);
  while (mealsOn(todayKey(d))) { n += 1; d.setDate(d.getDate() - 1); }
  return n;
}

function renderDayTabs() {
  const box = $('#dayTabs');
  if (!state.selectedDay) state.selectedDay = defaultDayName();
  const dates = weekDates();
  const tk = todayKey();
  const label = $('#weekLabel');
  if (label) {
    const streak = mealStreak();
    label.innerHTML = `${weekLabelText(dates)}${streak > 0
      ? ` · <span class="streak-inline">🔥 ${streak}-day meal streak</span>`
      : ''}`;
  }
  box.innerHTML = WEEK.map((d, i) => {
    const on = d === state.selectedDay;
    const date = dates[i];
    const isToday = todayKey(date) === tk;
    const logged = mealsOn(todayKey(date));
    return `<button type="button" role="tab" aria-selected="${on}" aria-label="${d} ${date.getDate()} ${MONTHS[date.getMonth()]}" class="day-tab${on ? ' active' : ''}${isToday ? ' is-today' : ''}" data-day="${d}">
      <span class="day-short">${d.slice(0, 3)}</span>
      <span class="day-num">${date.getDate()}</span>
      <span class="day-mark${logged ? ' on' : ''}" aria-hidden="true"></span>
    </button>`;
  }).join('');
  const active = box.querySelector('.day-tab.active');
  if (active && active.scrollIntoView) {
    active.scrollIntoView({ block: 'nearest', inline: 'center' });
  }
}

function planRow(item, showNumbers) {
  const f = FOODS[item.f];
  return `<li class="food-row">
    <div class="food-main"><b>${esc(f.name)}</b><span>${esc(household(item.f, item.g))}</span></div>
    ${showNumbers ? `<span class="food-kcal">${num(f.kcal * item.g / 100)}</span>` : ''}
  </li>`;
}

function renderPlan() {
  const box = $('#planContent');
  renderDayTabs();
  if (!state.profile || !state.targets) { box.innerHTML = needSetupHtml(); return; }

  const dayName = state.selectedDay || defaultDayName();
  const built = buildDay(dayName, state.profile, state.targets);
  const totals = dayNutrition(built);
  const showNums = state.targets.mode !== 'habits';
  const target = state.targets.target;

  const mealCards = MEALS.map(({ key, label, icon }) => {
    const items = built[key];
    const t = nutrition(items);
    return `<div class="card meal">
      <div class="meal-head">
        <h3>${icon} ${label}</h3>
        ${showNums ? `<span class="pill">≈ ${num(t.kcal)} kcal</span>` : ''}
      </div>
      <ul class="foods">
        ${items.map((it) => planRow(it, showNums)).join('')}
      </ul>
      ${showNums ? `<p class="macro-line">P ${Math.round(t.p)} g · C ${Math.round(t.c)} g · F ${Math.round(t.fat)} g · fibre ${Math.round(t.fib)} g</p>` : ''}
    </div>`;
  }).join('');

  const day = PLAN.find((d) => d.day === dayName) || PLAN[0];
  const proteinGap = state.targets.protein - Math.round(totals.p);
  const overBy = Math.round(totals.kcal - target);
  const diet = state.profile.diet;
  const proteinExtra = diet === 'veg'
    ? 'extra curd, paneer or soya'
    : diet === 'vegan' ? 'extra tofu, soy curd or soya chunks'
    : 'an extra egg, chicken or fish';
  const totalsCard = showNums ? `
    <div class="card">
      <div class="meal-head"><h3>Day total</h3><span class="pill">estimates</span></div>
      <div class="stat-grid">
        <div><b>${num(totals.kcal)}</b><span>kcal</span></div>
        <div><b>${Math.round(totals.p)} g</b><span>protein</span></div>
        <div><b>${Math.round(totals.c)} g</b><span>carbs</span></div>
        <div><b>${Math.round(totals.fat)} g</b><span>fat</span></div>
        <div><b>${Math.round(totals.fib)} g</b><span>fibre</span></div>
      </div>
      <p class="hint">Your estimate: ≈ ${num(target)} kcal and ${state.targets.protein} g protein a day.</p>
      ${overBy > target * 0.05 ? `<p class="hint">This day is about ${num(overBy)} kcal above the estimate. Portions are guides — drop the optional snack or 1 tsp oil if you want to be closer.</p>` : ''}
      ${proteinGap > 10 ? `<p class="hint">Protein is ≈ ${Math.round(totals.p)} g today. ${state.targets.protein} g is ambitious at this calorie level; ${esc(proteinExtra)} helps close the gap. Getting close over the week matters more than one perfect day.</p>` : ''}
      ${Math.round(totals.fib) < state.targets.fibre - 5
        ? `<p class="hint">Fibre is a little low. A fruit or an extra katori of sabzi will help.</p>` : ''}
    </div>` : `<div class="card calm">
      <h3>Portions without numbers</h3>
      <p>In healthy-habits mode we hide calorie and macro numbers. Use the household measures above — a katori, a roti, a glass — and let hunger and fullness guide the rest.</p>
    </div>`;

  const loved = lovedFoodsSummary();
  const quick = `<details class="card quick">
    <summary>Can't cook today? Quick option</summary>
    <p>${esc(day.quick.text)}</p>
    ${showNums ? `<p class="small muted">≈ ${day.quick.kcal} kcal · ${day.quick.p} g protein — a rough estimate.</p>` : ''}
  </details>`;

  const swaps = SWAPS.map((group) => `<details class="card quick">
    <summary>${esc(group.title)}</summary>
    <ul class="ticks small">${group.items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>
  </details>`).join('');

  box.innerHTML = `
    ${mealCards}
    ${quick}
    ${totalsCard}
    <div class="card">
      <h3>Your favourites</h3>
      ${loved.html}
      <p class="small muted">No food is banned. Keep favourites in a sensible portion and build the rest of the meal around them.</p>
    </div>
    <div class="card">
      <h3>Portion legend</h3>
      <p class="small">g = grams. “Cooked” means the weight after cooking; “raw” means before cooking. 1 katori ≈ 150 g cooked rice or dal. 1 roti ≈ 35 g. 1 tsp oil ≈ 5 g.</p>
      <p class="small muted">These are estimates from standard food tables, not lab measurements of your plate.</p>
    </div>
    ${swaps}`;
}

function lovedFoodsSummary() {
  if (!state.profile) return { html: '<p class="hint">Add favourites in setup.</p>' };
  const used = new Set();
  PLAN.forEach((d) => {
    const built = buildDay(d.day, state.profile, state.targets);
    Object.values(built).flat().forEach((it) => used.add(it.f));
  });
  const matched = LOVED_FOODS.filter((x) => (state.profile.loved || []).includes(x.food) && used.has(x.food));
  let html = '';
  if (matched.length) {
    html += `<p>In your week: ${matched.map((m) => `<span class="pill pill-soft">${esc(m.label)}</span>`).join(' ')}</p>`;
  } else {
    html += '<p class="hint">Tap favourites in setup and we will show where they fit.</p>';
  }
  if (state.profile.lovedText) {
    html += `<p class="small">Also noted: <b>${esc(state.profile.lovedText)}</b>. Keep them in sensible portions — see the swaps below.</p>`;
  }
  return { html };
}

/* ----------------------------- GROCERIES -------------------------------- */

function renderGroceries() {
  const box = $('#groceryContent');
  if (!state.profile) { box.innerHTML = needSetupHtml(); return; }
  const wk = weekKey();
  const checks = state.groceryChecks[wk] || {};
  const sum = (arr) => arr.reduce((s, g) => s + g.cost, 0);
  const essential = GROCERIES.filter((g) => g.essential);
  const optional = GROCERIES.filter((g) => !g.essential);
  const checkedSum = GROCERIES.filter((g) => checks[g.id]).reduce((s, g) => s + g.cost, 0);
  const budget = state.profile.budget || 1200;
  const headline = checkedSum > 0
    ? { value: checkedSum, label: 'checked' }
    : { value: sum(essential), label: 'essentials' };

  const row = (g) => `<label class="g-row">
    <input type="checkbox" data-grocery="${g.id}" ${checks[g.id] ? 'checked' : ''}>
    <span class="g-name">${esc(g.name)}<small>${esc(g.qty)}${g.essential ? '' : ' · optional'}</small></span>
    <span class="g-cost">₹${g.cost}</span>
  </label>`;

  box.innerHTML = `
    <div class="card hero">
      <p class="eyebrow">This week</p>
      <p class="big-number">₹${num(headline.value)}<span> ${headline.label}</span></p>
      <p class="hint">Essentials alone: about ₹${num(sum(essential))}. With every optional item: about ₹${num(sum(essential) + sum(optional))}.</p>
      <p class="small muted">Rough Indian prices for one person; they vary by city and season. Nothing here is a sponsored product.</p>
    </div>

    <div class="card">
      <h3>Essentials</h3>
      ${essential.map(row).join('')}
    </div>
    <div class="card">
      <h3>Optional extras</h3>
      ${optional.map(row).join('')}
    </div>
    <div class="card ${checkedSum > budget ? 'note note-warn' : 'calm'}">
      <h3>Budget check</h3>
      <p>Your checked list is about <b>₹${num(checkedSum)}</b> against a weekly budget of <b>₹${num(budget)}</b>.</p>
      ${checkedSum > budget
        ? '<p class="small">If this is tight, drop optional extras first (almonds, fish, chicken), buy seasonal vegetables, and use eggs, dal, curd and soya for protein.</p>'
        : '<p class="small">There is room to add a fruit or a little curd if you like.</p>'}
    </div>`;
}

/* -------------------------------- PREP ---------------------------------- */

function renderPrep() {
  const box = $('#prepContent');
  if (!state.profile) { box.innerHTML = needSetupHtml(); return; }
  const wk = weekKey();
  const checks = state.prepChecks[wk] || {};

  const sunday = PREP.sunday.map((text, i) => `<label class="g-row">
      <input type="checkbox" data-prep="s${i}" ${checks['s' + i] ? 'checked' : ''}>
      <span class="g-name">${esc(text)}</span>
    </label>`).join('');

  box.innerHTML = `
    <div class="card">
      <div class="meal-head"><h3>Sunday prep checklist</h3><span class="pill">this week</span></div>
      ${sunday}
    </div>
    <div class="card">
      <h3>Cook once, eat twice</h3>
      <ul class="ticks">${PREP.cookOnce.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
    </div>
    <div class="card">
      <h3>Storage times</h3>
      <ul class="ticks small">${PREP.storage.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
      <p class="small muted">When in doubt, throw it out. Cool cooked food within 2 hours and keep the fridge cold.</p>
    </div>
    <div class="card">
      <h3>Tiffin portion guide</h3>
      <ul class="ticks small">${PREP.tiffin.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
    </div>
    <div class="card calm">
      <h3>Ten-minute rule</h3>
      <p>When you are tired, cook the smallest version: dal + rice in one pot, or curd rice with roasted chana. A simple meal beats a skipped one.</p>
    </div>`;
}

/* ------------------------------ ACTIVITY -------------------------------- */

function weekDates() {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function activityOn(key) {
  const log = state.logs[key];
  return !!(log && log.activity && Object.values(log.activity).some(Boolean));
}

function activityStreak() {
  let n = 0;
  const d = new Date();
  if (!activityOn(todayKey(d))) d.setDate(d.getDate() - 1);
  while (activityOn(todayKey(d))) { n += 1; d.setDate(d.getDate() - 1); }
  return n;
}

function renderActivity() {
  const box = $('#activityContent');
  if (!state.profile) { box.innerHTML = needSetupHtml(); return; }
  const act = ACTIVITY[state.profile.activity] || ACTIVITY.light;
  const key = todayKey();
  const log = getLog(key);
  const done = log.activity || {};
  const today = new Date();
  const strengthDay = [1, 3, 5].includes(today.getDay());
  const streak = activityStreak();

  const week = weekDates();
  const strengthCount = week.filter((d) => {
    const l = state.logs[todayKey(d)];
    return l && l.activity && l.activity.strength;
  }).length;

  const strip = week.map((d) => {
    const k = todayKey(d);
    const isToday = k === key;
    const on = activityOn(k);
    return `<div class="week-dot${on ? ' on' : ''}${isToday ? ' today' : ''}">
      <span>${['M', 'T', 'W', 'T', 'F', 'S', 'S'][(d.getDay() + 6) % 7]}</span>
      <i>${on ? '✓' : d.getDate()}</i>
    </div>`;
  }).join('');

  const tasks = [
    { id: 'walk', title: `Walk ${act.walk} minutes`, sub: `Aim for about ${num(act.steps)} steps across the day.`, icon: '🚶' },
    { id: 'postmeal', title: 'Three 10-minute post-meal walks', sub: 'After breakfast, lunch and dinner. Even one counts.', icon: '🍽️' },
    { id: 'strength', title: 'Home strength', sub: strengthDay ? 'Today is a strength day 💪' : 'Rest day today — sessions are Monday, Wednesday and Friday.', icon: '🏋️' },
    { id: 'stretch', title: '10-minute stretch', sub: 'Any time, especially after a long sit.', icon: '🧘' }
  ];

  const taskRows = tasks.map((t) => `<button type="button" class="task${done[t.id] ? ' done' : ''}" data-task="${t.id}" aria-pressed="${!!done[t.id]}">
    <span class="task-icon" aria-hidden="true">${done[t.id] ? '✅' : t.icon}</span>
    <span class="task-text"><b>${t.title}</b><small>${t.sub}</small></span>
  </button>`).join('');

  box.innerHTML = `
    <div class="card hero">
      <p class="eyebrow">Today's movement</p>
      <div class="stat-grid">
        <div><b>${num(act.steps)}</b><span>step goal</span></div>
        <div><b>${act.walk} min</b><span>walk</span></div>
        <div><b>${streak} 🔥</b><span>day streak</span></div>
        <div><b>${strengthCount}/3</b><span>strength this week</span></div>
      </div>
      <div class="week-strip">${strip}</div>
    </div>

    <div class="card">
      <h3>Tap what you did</h3>
      ${taskRows}
      <p class="hint">Streaks are encouragement, not a test. Missing a day just means tomorrow gets a fresh start.</p>
    </div>

    <details class="card quick">
      <summary>3× a week home strength (no equipment)</summary>
      ${STRENGTH.map((s) => `<div class="ex"><b>${esc(s.name)}</b><span>${esc(s.reps)}</span><p>${esc(s.how)}</p></div>`).join('')}
      <p class="small muted">Leave one easy rep in the tank. Sore is fine; sharp pain is not.</p>
    </details>

    <details class="card quick">
      <summary>Stretch routine (10 minutes)</summary>
      <ul class="ticks small">${STRETCH.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
    </details>

    <details class="card quick">
      <summary>Make it fun</summary>
      <ul class="ticks small">${FUN_IDEAS.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
    </details>`;
}

/* -------------------------------- COACH --------------------------------- */

const QTY_WORDS = {
  a: 1, an: 1, one: 1, ek: 1, two: 2, do: 2, three: 3, teen: 3, four: 4, char: 4,
  five: 5, paanch: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  half: 0.5, aadha: 0.5, quarter: 0.25, couple: 2, few: 3, some: 1
};

const UNIT_ALIASES = {
  katori: 'katori', katoris: 'katori', bowl: 'katori', bowls: 'katori',
  cup: 'cup', cups: 'cup', mug: 'cup', mugs: 'cup',
  plate: 'plate', plates: 'plate', glass: 'glass', glasses: 'glass',
  piece: 'piece', pieces: 'piece', pc: 'piece', pcs: 'piece',
  slice: 'slice', slices: 'slice',
  tsp: 'tsp', teaspoon: 'tsp', teaspoons: 'tsp',
  tbsp: 'tbsp', tablespoon: 'tbsp', tablespoons: 'tbsp',
  spoon: 'spoon', spoons: 'spoon',
  handful: 'handful', handfuls: 'handful',
  packet: 'packet', packets: 'packet', pack: 'packet', packs: 'packet',
  scoop: 'scoop', scoops: 'scoop',
  g: 'g', gm: 'g', gms: 'g', gram: 'g', grams: 'g',
  ml: 'ml', l: 'l', litre: 'l', liter: 'l'
};

/* Alias list, longest phrase first so "masala dosa" beats "dosa". */
const ALIAS_LIST = Object.keys(FOOD_ALIASES)
  .map((alias) => ({ alias: alias, key: FOOD_ALIASES[alias], words: alias.split(' ').length }))
  .sort((a, b) => b.alias.length - a.alias.length);

let coachDraft = null;
let coachSwap = null;

function coachFood(key) {
  if (FOODS[key]) {
    const f = FOODS[key];
    return {
      key: key, name: f.name, unit: f.unit, unitG: f.unitG, ml: !!f.ml, dairy: !!f.dairy,
      perKcal: (f.kcal / 100) * f.unitG,
      perP: (f.p / 100) * f.unitG, perC: (f.c / 100) * f.unitG,
      perF: (f.f / 100) * f.unitG, perFib: (f.fib / 100) * f.unitG,
      tags: []
    };
  }
  const e = EXTRAS[key];
  if (!e) return null;
  return {
    key: key, name: e.name, unit: e.unit, unitG: e.unitG, ml: !!e.ml, dairy: !!e.dairy,
    perKcal: e.kcal, perP: e.p, perC: e.c, perF: e.f, perFib: e.fib,
    tags: e.tags || []
  };
}

/* Turn "2 katori" into grams. Units that do not match the food fall back
   to sensible household sizes. */
function portionGrams(info, qty, unit) {
  if (!unit) return qty * info.unitG;
  if (unit === 'g' || unit === 'ml') return qty;
  if (unit === 'l') return qty * 1000;
  if (unit === 'katori' || unit === 'cup') {
    if (info.unit === 'katori' || info.unit === 'cup') return qty * info.unitG;
    return qty * (unit === 'cup' ? 200 : 150);
  }
  if (unit === 'glass') return qty * (info.unit === 'glass' ? info.unitG : 200);
  if (unit === 'plate') return qty * (info.unit === 'plate' ? info.unitG : 300);
  if (unit === 'tsp') return qty * 5;
  if (unit === 'tbsp' || unit === 'spoon') return qty * 15;
  if (unit === 'handful') return qty * (info.unit === 'handful' ? info.unitG : 30);
  if (unit === 'packet') return qty * (info.unit === 'packet' ? info.unitG : 30);
  if (unit === 'slice') return qty * (info.unit === 'slice' ? info.unitG : 30);
  if (unit === 'scoop') return qty * (info.unit === 'scoop' ? info.unitG : 60);
  return qty * info.unitG; /* piece, dosa, roti, biscuit ... */
}

function parseSegment(seg) {
  const tokens = seg.replace(/[.,!?]/g, ' ').split(/\s+/).filter(Boolean);
  let qty = null;
  let unit = null;
  let i = 0;

  if (tokens.length >= 3 && /^\d+$/.test(tokens[0]) && tokens[1] === '/' && /^\d+$/.test(tokens[2])) {
    qty = parseInt(tokens[0], 10) / parseInt(tokens[2], 10);
    i = 3;
  } else if (tokens.length && /^\d+(\/\d+)?$/.test(tokens[0])) {
    const parts = tokens[0].split('/');
    qty = parts.length === 2 ? parseInt(parts[0], 10) / parseInt(parts[1], 10) : parseInt(parts[0], 10);
    i = 1;
  } else if (tokens.length && QTY_WORDS[tokens[0]] != null) {
    qty = QTY_WORDS[tokens[0]];
    i = 1;
  }
  if (i < tokens.length && UNIT_ALIASES[tokens[i]]) {
    unit = UNIT_ALIASES[tokens[i]];
    i += 1;
  }

  const words = tokens.slice(i);
  if (!words.length) return [];

  let phrase = ' ' + words.join(' ') + ' ';
  const items = [];

  for (let guard = 0; guard < 5; guard += 1) {
    let hit = null;
    for (let a = 0; a < ALIAS_LIST.length; a += 1) {
      const entry = ALIAS_LIST[a];
      if (phrase.indexOf(' ' + entry.alias + ' ') !== -1) { hit = entry; break; }
    }
    if (!hit) break;
    items.push({ key: hit.key, qty: qty == null ? 1 : qty, unit: unit });
    phrase = phrase.replace(' ' + hit.alias + ' ', ' ');
    qty = null; /* only the first food takes the spoken quantity */
    unit = null;
  }

  if (!items.length) {
    return [{ key: null, name: words.join(' '), qty: qty == null ? 1 : qty, unit: unit || 'katori' }];
  }
  return items;
}

function parseFoodText(text) {
  const raw = String(text || '').trim();
  if (!raw) return [];
  const segments = raw.toLowerCase()
    .replace(/½/g, ' half ')
    .replace(/¼/g, ' quarter ')
    .replace(/[–—]/g, '-')
    .replace(/\bplus\b|\band\b|\bwith\b|[+,;\/\n]/g, '|')
    .split('|')
    .map((s) => s.trim())
    .filter(Boolean);

  const items = [];
  segments.forEach((seg) => {
    parseSegment(seg).forEach((item) => items.push(item));
  });
  return items.slice(0, 8);
}

function nutritionForItem(item) {
  if (!item.key) {
    /* Unknown food: give a visible, deliberately rough middle guess. */
    const grams = portionGrams({ unit: 'katori', unitG: 150 }, item.qty, item.unit);
    const units = grams / 150;
    return {
      key: null, name: item.name, qty: item.qty, unit: item.unit, grams: grams,
      kcal: 180 * units, p: 5 * units, c: 22 * units, f: 7 * units, fib: 2 * units,
      tags: [], unknown: true
    };
  }
  const info = coachFood(item.key);
  if (!info) return null;
  const grams = portionGrams(info, item.qty, item.unit);
  const units = info.unitG ? grams / info.unitG : item.qty;
  return {
    key: item.key, name: info.name, qty: item.qty, unit: item.unit || info.unit,
    grams: grams, kcal: info.perKcal * units, p: info.perP * units,
    c: info.perC * units, f: info.perF * units, fib: info.perFib * units,
    tags: info.tags, dairy: info.dairy, unknown: false
  };
}

function foodLogToday() {
  const log = getLog(todayKey());
  return Array.isArray(log.foods) ? log.foods : [];
}
function foodKcalToday() {
  return foodLogToday().reduce((sum, e) => sum + (e.kcal || 0), 0);
}

function analyzeFood(text) {
  const items = parseFoodText(text).map(nutritionForItem).filter(Boolean);
  const totals = items.reduce((t, i) => ({
    kcal: t.kcal + i.kcal, p: t.p + i.p, c: t.c + i.c,
    f: t.f + i.f, fib: t.fib + i.fib
  }), { kcal: 0, p: 0, c: 0, f: 0, fib: 0 });

  const t = state.targets;
  const allowed = t && t.mode !== 'habits';
  const before = foodKcalToday();
  const leftAfter = allowed ? (t.target - before - totals.kcal) : null;

  const swap = bestSwap(items, allowed);
  return { text: text, items: items, totals: totals, leftAfter: leftAfter, allowed: allowed, swap: swap };
}

function bestSwap(items, allowed) {
  if (!allowed) return null;
  let best = null;
  items.forEach((item) => {
    if (!item.key || !COACH_SWAPS[item.key]) return;
    const plan = COACH_SWAPS[item.key];
    const alt = nutritionForItem({ key: plan.to, qty: plan.qty, unit: null });
    if (!alt) return;
    const portions = Math.max(1, item.qty || 1);
    const perPortion = item.kcal / portions;
    const saved = perPortion - alt.kcal;
    if (saved > 30 && (!best || saved > best.saved)) {
      best = { from: item, to: alt, saved: saved, perPiece: portions > 1, label: plan.label };
    }
  });
  return best;
}

function coachHoursNow() {
  return new Date().getHours();
}

function adviceFor(draft) {
  const tags = {};
  draft.items.forEach((i) => (i.tags || []).forEach((t) => { tags[t] = true; }));
  const hour = coachHoursNow();
  const out = [];

  if (tags.fried) {
    out.push({
      title: 'Fried today',
      body: 'Fried food is easy to over-eat because it is soft and salty. One is a treat, three is a meal. Put curd, sprouts or salad next to it and eat those first.'
    });
  }
  if (tags.drink) {
    out.push({
      title: 'Liquid sugar',
      body: 'A sugary drink does not switch off hunger. A 250 ml glass is roughly 6 teaspoons of sugar. Chaas, nimbu pani without sugar, or plain water do the same job better.'
    });
  }
  if (tags.sweet) {
    out.push({
      title: 'Sweet timing',
      body: 'Eat sweets straight after a meal rather than alone on an empty stomach — the rise in blood sugar is gentler. A 10–15 minute walk afterwards helps too.'
    });
  }
  if (tags.refined) {
    out.push({
      title: 'Refined flour',
      body: 'Maida items digest fast and leave you hungry again in an hour. Add a protein (curd, egg, chana, paneer) so the meal actually holds.'
    });
  }
  if (tags.salty) {
    out.push({
      title: 'Salt load',
      body: 'Salty snacks can show up on the scale tomorrow as water, not fat. Drink water through the day and add a banana or some curd for potassium.'
    });
  }
  if ((tags.chai || (draft.items.some((i) => i.key === 'chai'))) && hour >= 16) {
    out.push({
      title: 'Late caffeine',
      body: 'Chai or coffee after 4 pm can still be in your system at bedtime. If sleep is already patchy, make this the last one.'
    });
  }

  const item = draft.items[0];
  if (item && item.key === 'chai' && hour >= 16) { /* covered above */ }

  if (hour >= 21 && draft.totals.kcal > 200) {
    out.push({
      title: 'Close to bedtime',
      body: 'Keep late eating small and leave about two hours before lying down, especially if you get acidity or reflux.'
    });
  }

  if (!out.length) {
    out.push({
      title: 'This is a steady choice',
      body: 'Nothing here needs fixing. Eat it slowly and stop when you are comfortable rather than full.'
    });
  }
  return out.slice(0, 4);
}

function addSuggestions(draft) {
  const out = [];
  const t = draft.totals;
  const proteinLow = t.p < 8;
  const fibreLow = t.fib < 3;

  if (proteinLow) out.push('Add a protein so you are not hungry in an hour: 1 katori curd, 1 boiled egg, or a handful of roasted chana.');
  if (fibreLow) out.push('Add fibre: cucumber–tomato salad, a fruit, or a bowl of sprouts.');
  if (draft.items.some((i) => i.unit === 'packet' || i.unit === 'bar')) out.push('Portion it out on a plate and put the packet away — you will eat noticeably less without thinking about it.');
  if (draft.items.length > 3) out.push('Three or more items at once usually means a meal, not a snack. That is fine — just count it as one and keep the next meal simple.');
  if (!out.length) out.push('Nothing to add. Carry on.');
  return out.slice(0, 3);
}

function removeSuggestions(draft) {
  const out = [];
  const over = draft.allowed && draft.leftAfter < 0;
  const top = draft.items.slice().sort((a, b) => b.kcal - a.kcal)[0];

  if (over && top) {
    out.push(`Remove or halve the ${top.name} — that saves about ${num(Math.round(top.kcal / 2))} kcal and closes most of the gap.`);
  }
  if (draft.items.some((i) => (i.tags || []).includes('drink') && (i.tags || []).includes('sweet'))) {
    out.push(draft.allowed
      ? 'Drop the sugary drink. Water, chaas or nimbu pani without sugar does the same job for about 100 kcal less.'
      : 'Drop the sugary drink. Water, chaas or nimbu pani without sugar does the same job.');
  }
  if (draft.items.some((i) => (i.tags || []).includes('fried')) && draft.items.length > 1) {
    out.push('Keep one fried piece, not the whole plate. Fried food is the easiest place to cut without feeling deprived.');
  }
  if (top && top.unit === 'packet') {
    out.push('Portion one serving onto a plate and put the packet away — the second half is rarely tasted anyway.');
  }
  return out.slice(0, 2);
}

function habitMaths(draft) {
  if (!draft.allowed) {
    return 'One snack never decides anything. Keep the next meal simple and protein-led, and go back to your usual routine.';
  }
  if (draft.leftAfter == null || draft.leftAfter >= 0) {
    return 'Today this fits inside your estimate, so there is no maths to do. One food never decides anything.';
  }
  const extra = Math.round(-draft.leftAfter);
  const perMonth = (extra * 30) / 7700;
  const walks = Math.ceil(extra / 90);
  return `If you ate this every single day on top of your plan, that is about ${num(extra)} extra kcal a day — roughly ${perMonth.toFixed(1)} kg a month of trend. That is maths, not a promise: bodies adapt and you will not follow it exactly. One ${walks > 1 ? walks + ' × ' : ''}20-minute walk covers a fair slice of it.`;
}

function coachVerdict(draft) {
  if (!draft.allowed) {
    const heavy = draft.totals.kcal > 350;
    return {
      tone: 'calm',
      text: heavy
        ? 'This is on the heavier side. Not a problem — just keep the next meal simple and protein-led.'
        : 'A light choice. Nothing to fix here.'
    };
  }
  if (draft.leftAfter >= 0) {
    return {
      tone: 'good',
      text: `Fits — about ${num(draft.totals.kcal)} kcal, leaving roughly ${num(draft.leftAfter)} kcal in today's estimate.`
    };
  }
  return {
    tone: 'warn',
    text: `About ${num(draft.totals.kcal)} kcal — roughly ${num(-draft.leftAfter)} kcal past today's estimate. Not a failure. Make the next meal protein and vegetables, and skip the "make up for it" idea.`
  };
}

function coachItemLine(item) {
  const qty = item.qty === 1 ? '' : `${item.qty} × `;
  const name = item.unknown ? `${esc(item.name)} <span class="coach-unknown">not in my table</span>` : esc(item.name);
  const right = coachDraft && coachDraft.allowed
    ? `<span class="coach-kcal">${num(item.kcal)} kcal</span>`
    : '';
  return `<li><span>${qty}${name}</span>${right}</li>`;
}

function coachCard(draft) {
  const verdict = coachVerdict(draft);
  const advice = adviceFor(draft);
  const adds = addSuggestions(draft);
  const removes = removeSuggestions(draft);
  const allowed = draft.allowed;

  const totalsLine = allowed
    ? `<div class="coach-total"><span>Total</span><b>${num(draft.totals.kcal)} kcal</b><span class="muted">≈ ${Math.round(draft.totals.p)} g protein · ${draft.totals.fib.toFixed(1)} g fibre</span></div>`
    : `<div class="coach-total"><span>Total</span><b>portion advice only</b><span class="muted">healthy-habits mode hides calories</span></div>`;

  const swapBlock = draft.swap
    ? `<div class="coach-swap">
        <h4>A lighter swap</h4>
        <p>${esc(draft.swap.from.name)} → ${esc(draft.swap.label)}. About <b>${num(draft.swap.saved)} kcal less</b>${draft.swap.perPiece ? ' per piece' : ''}, and more protein or fibre in most cases.</p>
      </div>`
    : '';

  return `<div class="card coach-card" id="coachResult">
    <div class="meal-head">
      <h3>Here's the read</h3>
      <span class="pill ${verdict.tone === 'warn' ? 'warn' : (verdict.tone === 'good' ? 'good' : '')}">${verdict.tone === 'warn' ? 'over today' : (verdict.tone === 'good' ? 'fits' : 'gentle')}</span>
    </div>
    <ul class="coach-items">${draft.items.map(coachItemLine).join('')}</ul>
    ${totalsLine}
    <p class="coach-verdict">${verdict.text}</p>

    <h4>How to eat it</h4>
    <ul class="ticks small">
      <li>Eat the fibre first — salad, vegetables or fruit — then the protein, then the carb or sweet.</li>
      <li>Slow down for the first five minutes. Put the phone down; you will notice fullness sooner.</li>
      <li>Water through the day, not three glasses at one go.</li>
    </ul>

    ${advice.map((a) => `<h4>${esc(a.title)}</h4><p class="small">${esc(a.body)}</p>`).join('')}

    <h4>Add / keep</h4>
    <ul class="ticks small">${adds.map((a) => `<li>${esc(a)}</li>`).join('')}</ul>

    ${removes.length ? `<h4>Remove or reduce</h4><ul class="ticks small">${removes.map((a) => `<li>${esc(a)}</li>`).join('')}</ul>` : ''}

    ${swapBlock}

    <h4>If this becomes a habit</h4>
    <p class="small">${esc(habitMaths(draft))}</p>

    <div class="coach-actions">
      <button class="btn" type="button" data-coach="save">Add to today</button>
      ${draft.swap ? '<button class="btn btn-ghost" type="button" data-coach="swap">Use lighter swap</button>' : ''}
      <button class="btn btn-ghost" type="button" data-coach="clear">Ignore</button>
    </div>
    <p class="hint">Fixed food table, rough estimates. You decide what to do with it.</p>
  </div>`;
}

function emptyCoachCard() {
  return `<div class="card calm coach-empty">
    <h3>Say it in plain words</h3>
    <p>“2 samosa and 1 cup chai” · “1 katori rice, dal and curd” · “one packet chips”.</p>
    <p class="small muted">I will estimate the calories, tell you how to eat it, and suggest what to add, swap or skip. Nothing is sent anywhere — it all stays on this phone.</p>
  </div>`;
}

function todayFoodCard(entries, allowed) {
  if (!entries.length) {
    return `<div class="card">
      <h3>Today's food log</h3>
      <p class="hint">Nothing logged yet. Anything you add above shows up here with the running total.</p>
    </div>`;
  }
  const total = entries.reduce((s, e) => s + e.kcal, 0);
  const target = state.targets && state.targets.target ? state.targets.target : null;
  const pill = allowed && target
    ? `<span class="pill">${num(total)} / ${num(target)} kcal</span>`
    : `<span class="pill">${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}</span>`;

  const rows = entries.slice().reverse().map((e) => `<li class="coach-log-row">
      <div>
        <b>${esc(e.text)}</b>
        <span class="muted small">${e.items.map((i) => esc(i.name)).join(', ')} · ${esc(e.at)}</span>
      </div>
      <div class="coach-log-right">
        ${allowed ? `<span>${num(e.kcal)}</span>` : ''}
        <button class="icon-btn" type="button" data-coach-del="${esc(e.id)}" aria-label="Delete ${esc(e.text)}">✕</button>
      </div>
    </li>`).join('');

  return `<div class="card">
    <div class="meal-head"><h3>Today's food log</h3>${pill}</div>
    <ul class="coach-log">${rows}</ul>
    <p class="hint">${allowed && target
      ? `About ${num(Math.max(0, target - total))} kcal left in today's estimate.`
      : 'Calories are hidden in healthy-habits mode.'}</p>
  </div>`;
}

function renderCoach() {
  const box = $('#coachContent');
  if (!box) return;
  if (!state.profile || !state.targets) { box.innerHTML = needSetupHtml(); return; }

  const chips = $('#coachChips');
  if (chips && !chips.dataset.built) {
    chips.innerHTML = COACH_CHIPS
      .map((c) => `<button type="button" class="chip" data-quick="${esc(c.text)}">${esc(c.label)}</button>`)
      .join('');
    chips.dataset.built = '1';
  }

  const allowed = state.targets.mode !== 'habits';
  box.innerHTML = (coachDraft ? coachCard(coachDraft) : emptyCoachCard())
    + todayFoodCard(foodLogToday(), allowed);
}

function analyzeCoachInput() {
  const input = $('#coachInput');
  if (!input) return;
  const text = input.value.trim();
  if (!text) { toast('Type what you ate first.'); input.focus(); return; }

  const draft = analyzeFood(text);
  if (!draft.items.length) {
    toast('I could not find a food there. Try “2 idli and chutney”.');
    return;
  }
  coachDraft = draft;
  saveCoachDraft();
  renderCoach();
  const card = $('#coachResult');
  if (card && card.scrollIntoView) card.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

/* Keep the draft across tab switches, but never across days. */
function saveCoachDraft() {
  state.coachDraft = coachDraft ? { text: coachDraft.text, day: todayKey() } : null;
  save();
}
function restoreCoachDraft() {
  if (state.coachDraft && state.coachDraft.day === todayKey() && state.coachDraft.text) {
    coachDraft = analyzeFood(state.coachDraft.text);
  }
}

function logFoodDraft(draft) {
  const log = getLog(todayKey());
  if (!Array.isArray(log.foods)) log.foods = [];
  log.foods.push({
    id: 'f' + Date.now() + Math.random().toString(36).slice(2, 6),
    text: draft.text,
    items: draft.items.map((i) => ({ name: i.name, qty: i.qty, unit: i.unit, kcal: Math.round(i.kcal) })),
    kcal: Math.round(draft.totals.kcal),
    p: Math.round(draft.totals.p),
    fib: Number(draft.totals.fib.toFixed(1)),
    at: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  });
  save();
  /* Ticking the meal box is optional, but it keeps the streak honest. */
  if (log.meals) log.meals.snack = true;
  coachDraft = null;
  state.coachDraft = null;
  save();
  const input = $('#coachInput');
  if (input) input.value = '';
  renderCoach();
  toast('Added to today 🍽️');
}

function useSwapDraft() {
  if (!coachDraft || !coachDraft.swap) return;
  const alt = coachDraft.swap.to;
  logFoodDraft({
    text: coachDraft.swap.label,
    items: [alt],
    totals: { kcal: alt.kcal, p: alt.p, c: alt.c, f: alt.f, fib: alt.fib },
    allowed: coachDraft.allowed
  });
  toast('Lighter swap logged 🌿');
}

function wireCoach() {
  const form = $('#coachForm');
  if (form) form.addEventListener('submit', (e) => { e.preventDefault(); analyzeCoachInput(); });

  const chips = $('#coachChips');
  if (chips) {
    chips.addEventListener('click', (e) => {
      const chip = e.target.closest('[data-quick]');
      if (!chip) return;
      const input = $('#coachInput');
      input.value = chip.dataset.quick;
      analyzeCoachInput();
    });
  }

  const box = $('#coachContent');
  if (box) {
    box.addEventListener('click', (e) => {
      const del = e.target.closest('[data-coach-del]');
      if (del) {
        const log = getLog(todayKey());
        log.foods = (log.foods || []).filter((f) => f.id !== del.dataset.coachDel);
        save();
        renderCoach();
        return;
      }
      const btn = e.target.closest('[data-coach]');
      if (!btn) return;
      const action = btn.dataset.coach;
      if (action === 'save' && coachDraft) logFoodDraft(coachDraft);
      else if (action === 'swap') useSwapDraft();
      else if (action === 'clear') {
        coachDraft = null;
        state.coachDraft = null;
        save();
        const input = $('#coachInput');
        if (input) input.value = '';
        renderCoach();
        toast('Ignored — nothing logged.');
      }
    });
  }

  const mic = $('#coachMic');
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (mic && SR) {
    const rec = new SR();
    rec.lang = 'en-IN';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    mic.hidden = false;
    mic.addEventListener('click', () => {
      try { rec.start(); mic.classList.add('listening'); } catch (err) { /* already running */ }
    });
    rec.onresult = (e) => {
      const input = $('#coachInput');
      input.value = e.results[0][0].transcript;
      mic.classList.remove('listening');
      analyzeCoachInput();
    };
    rec.onerror = () => { mic.classList.remove('listening'); toast('Could not hear that. Type it instead.'); };
    rec.onend = () => mic.classList.remove('listening');
  }
}

/* ------------------------------ PROGRESS -------------------------------- */

function waterGoal() {
  return clamp(Math.round(((state.profile ? state.profile.weightKg : 60) * 35) / 250), 6, 12);
}

function weightChart(entries) {
  const data = entries.slice(-8);
  if (data.length < 2) return '<p class="hint">Add two weigh-ins and a trend line appears here.</p>';
  const W = 320, H = 170, L = 38, R = 12, T = 14, B = 28;
  const vals = data.map((e) => e.weight);
  let min = Math.min(...vals);
  let max = Math.max(...vals);
  if (max - min < 1) { min -= 0.5; max += 0.5; } else { min -= 0.3; max += 0.3; }

  const x = (i) => L + (i * (W - L - R)) / (data.length - 1);
  const y = (v) => T + ((max - v) * (H - T - B)) / (max - min);
  const points = data.map((e, i) => `${x(i).toFixed(1)},${y(e.weight).toFixed(1)}`).join(' ');
  const dots = data.map((e, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(e.weight).toFixed(1)}" r="3.5" class="chart-dot"/>`).join('');
  const mid = (min + max) / 2;
  const grid = [max, mid, min].map((v) => `
    <line x1="${L}" y1="${y(v).toFixed(1)}" x2="${W - R}" y2="${y(v).toFixed(1)}" class="chart-grid"/>
    <text x="${L - 6}" y="${(y(v) + 4).toFixed(1)}" text-anchor="end" class="chart-label">${v.toFixed(1)}</text>`).join('');
  const labels = `<text x="${L}" y="${H - 8}" class="chart-label">${data[0].date.slice(5)}</text>
    <text x="${W - R}" y="${H - 8}" text-anchor="end" class="chart-label">${data[data.length - 1].date.slice(5)}</text>`;

  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Weight trend chart">
    ${grid}
    <polyline points="${points}" class="chart-line"/>
    ${dots}
    ${labels}
  </svg>`;
}

function averageWeight(fromDays, toDays) {
  const picks = state.weights.filter((e) => {
    const d = daysAgo(e.date);
    return d >= fromDays && d <= toDays;
  });
  if (!picks.length) return null;
  return picks.reduce((s, e) => s + e.weight, 0) / picks.length;
}

function renderProgress() {
  const box = $('#progressContent');
  if (!state.profile || !state.targets) { box.innerHTML = needSetupHtml(); return; }

  const key = todayKey();
  const log = getLog(key);
  const goal = waterGoal();
  const water = clamp(log.water || 0, 0, goal + 4);
  const dots = Array.from({ length: goal }, (_, i) => `<span class="drop${i < water ? ' on' : ''}" aria-hidden="true">💧</span>`).join('');

  const mealBoxes = MEALS.map((m) => `<label class="check">
      <input type="checkbox" data-meal="${m.key}" ${log.meals && log.meals[m.key] ? 'checked' : ''}>
      ${m.icon} ${m.label}
    </label>`).join('');

  const streak = mealStreak();
  const weekLogged = weekDates().filter((d) => mealsOn(todayKey(d))).length;
  const mealHeader = `<div class="meal-head"><h3>Today's meals</h3><span class="pill">${streak > 0 ? `🔥 ${streak} day${streak === 1 ? '' : 's'}` : 'start today'}</span></div>
    <p class="hint">${weekLogged}/7 days logged this week. Ticking one meal is enough to keep the streak.</p>`;

  const weightBlock = state.targets.mode === 'habits'
    ? `<div class="card calm">
        <h3>Weight tracking is paused</h3>
        <p>In healthy-habits mode we do not show weights, calories or targets. Your water, meals and movement still count — and they are the habits that matter most right now.</p>
      </div>`
    : `<div class="card">
        <h3>Weekly weight &amp; waist</h3>
        <p class="hint">Weigh yourself once or twice a week, same time, same conditions. Use the weekly average, not one number.</p>
        ${weightChart(state.weights)}
        <form id="weightForm" class="weight-form">
          <div class="row3">
            <div class="field"><label for="wDate">Date</label><input id="wDate" type="date" value="${key}" max="${key}"></div>
            <div class="field"><label for="wWeight">Weight (kg)</label><input id="wWeight" type="number" step="0.1" min="25" max="300" inputmode="decimal" placeholder="62.4"></div>
            <div class="field"><label for="wWaist">Waist (cm, optional)</label><input id="wWaist" type="number" step="0.1" min="30" max="200" inputmode="decimal" placeholder="—"></div>
          </div>
          <button class="btn" type="submit">Save this check-in</button>
        </form>
      </div>
      ${weightSummary()}
      ${state.weights.length ? `<div class="card"><h3>Recent check-ins</h3>${state.weights.slice(-6).reverse().map((e) => `
        <div class="g-row">
          <span class="g-name">${esc(e.date)}<small>${e.waist ? 'waist ' + e.waist + ' cm' : 'weight only'}</small></span>
          <span class="g-cost">${e.weight.toFixed(1)} kg</span>
          <button type="button" class="mini-del" data-del="${esc(e.date)}" aria-label="Remove check-in from ${esc(e.date)}">✕</button>
        </div>`).join('')}</div>` : ''}`;

  box.innerHTML = `
    <div class="card">
      <div class="meal-head"><h3>Water</h3><span class="pill">${water} / ${goal} glasses</span></div>
      <div class="drops">${dots}</div>
      <div class="stepper">
        <button type="button" class="step" data-water="-1" aria-label="One glass less">−</button>
        <span class="water-ml">${water * 250} ml</span>
        <button type="button" class="step" data-water="1" aria-label="One glass more">+</button>
      </div>
      <p class="hint">Tap to log a glass. A rough guide, not a rule. Tea, buttermilk and fruit also count a little.</p>
    </div>

    <div class="card">
      ${mealHeader}
      <div class="meal-checks">${mealBoxes}</div>
      <p class="hint">A nudge, not a score. No shame if a meal is missed.</p>
    </div>

    ${progressFoodCard()}

    ${weightBlock}

    <div class="card calm">
      <h3>How to read progress</h3>
      <ul class="ticks small">
        <li>Weight bounces with salt, sleep, hormones and weather. Look at 2–4 week trends.</li>
        <li>Waist and how clothes fit often tell a clearer story than the scale.</li>
        <li>Energy, sleep, strength and mood count as progress too.</li>
        <li>If things stall for 3–4 weeks, adjust one portion — not the whole plan.</li>
      </ul>
    </div>`;
}

function progressFoodCard() {
  const entries = foodLogToday();
  const allowed = state.targets && state.targets.mode !== 'habits';
  const total = entries.reduce((s, e) => s + (e.kcal || 0), 0);
  const target = state.targets && state.targets.target ? state.targets.target : null;

  if (!entries.length) {
    return `<div class="card">
      <div class="meal-head"><h3>Food coach</h3></div>
      <p class="hint">Nothing captured yet. Tell the coach what you ate and it will estimate the calories and suggest what to add, swap or skip.</p>
      <p><button type="button" class="btn btn-ghost btn-slim" data-go="coach">Open food coach</button></p>
    </div>`;
  }

  const last = entries[entries.length - 1];
  const pill = allowed && target
    ? `<span class="pill">${num(total)} / ${num(target)} kcal</span>`
    : `<span class="pill">${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}</span>`;

  return `<div class="card">
    <div class="meal-head"><h3>Food coach</h3>${pill}</div>
    <p class="small"><b>${esc(last.text)}</b><br><span class="muted">${
      allowed && target
        ? `About ${num(Math.max(0, target - total))} kcal left in today's estimate.`
        : 'Calories hidden in healthy-habits mode.'
    }</span></p>
    <p><button type="button" class="btn btn-ghost btn-slim" data-go="coach">Open food coach</button></p>
  </div>`;
}

function weightSummary() {
  const current = averageWeight(0, 6);
  const previous = averageWeight(7, 13);
  if (current === null) return '';
  if (previous === null) {
    return `<div class="card"><h3>Last 7 days</h3><p class="hint">Average: <b>${current.toFixed(1)} kg</b>. Add another week of check-ins to compare.</p></div>`;
  }
  const diff = current - previous;
  const sign = diff > 0 ? '+' : '';
  return `<div class="card"><h3>Trend</h3>
    <div class="stat-grid">
      <div><b>${current.toFixed(1)} kg</b><span>last 7 days avg</span></div>
      <div><b>${sign}${diff.toFixed(1)} kg</b><span>vs previous week</span></div>
    </div>
    <p class="small muted">Estimates from your own entries. One week is noise; the direction over several weeks is what matters.</p>
  </div>`;
}

/* ------------------------------ REMINDERS ------------------------------- */

const REMINDER_TEXT = {
  breakfast: 'Breakfast time 🌿 Something with protein: idli + sambar, poha + curd, or eggs.',
  lunch: 'Lunch time. Half the plate vegetables, a palm of protein, your usual roti or rice.',
  snack: 'Snack o’clock: fruit, roasted chana, buttermilk, or a boiled egg.',
  dinner: 'Dinner time. Keep it simple — dal, sabzi and a roti or a smaller rice portion.',
  water: 'Sip some water 💧 A glass now, no pressure.',
  walk: 'A 10-minute walk? Even a short one counts.',
  weighin: 'Weekly check-in: same time, same conditions. Look at the trend, not one day.'
};

function reminderTimes(r) {
  if (r.id !== 'water') return [r.time];
  const toMin = (t) => {
    const [h, m] = (t || '10:00').split(':').map(Number);
    return h * 60 + m;
  };
  const fromMin = (m) => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  const start = toMin(r.time);
  const end = toMin(r.end || r.time);
  if (start > end) return [r.time];
  const out = [];
  for (let m = start; m <= end; m += 120) out.push(fromMin(m));
  return out;
}

function notificationStatus() {
  if (!('Notification' in window)) return 'This browser does not support notifications. In-app nudges still work.';
  if (!window.isSecureContext) return 'Phone notifications need https:// or http://localhost. In-app nudges still work here.';
  if (Notification.permission === 'granted') return 'Notifications are on. In-app alerts also appear while the app is open.';
  if (Notification.permission === 'denied') return 'Notifications are blocked in browser settings. You can change that in the site settings. In-app nudges still work.';
  return 'Notifications are off. Turn them on for phone alerts while the app is open or installed.';
}

function renderReminders() {
  const box = $('#remindersContent');
  if (!state.profile) { box.innerHTML = needSetupHtml(); return; }

  const rows = state.reminders.map((r) => {
    const when = r.id === 'weighin' ? 'Sundays' : r.id === 'water' ? 'Every 2 hours' : 'Every day';
    return `<div class="rem-row">
      <label class="rem-toggle">
        <input type="checkbox" data-rem="${r.id}" ${r.on ? 'checked' : ''}>
        <span class="rem-text"><b>${esc(r.label)}</b><small>${when}</small></span>
      </label>
      <div class="rem-times">
        <input type="time" value="${r.time}" data-rem-time="${r.id}" aria-label="${esc(r.label)} time">
        ${r.id === 'water' ? `<span class="small muted">to</span><input type="time" value="${r.end || '19:00'}" data-rem-end="${r.id}" aria-label="Water reminders end time">` : ''}
      </div>
    </div>`;
  }).join('');

  box.innerHTML = `
    <div class="card">
      <h3>Your nudges</h3>
      ${rows}
      <p class="hint">Switch off anything that feels like pressure. These are gentle reminders, not alarms.</p>
    </div>

    <div class="card">
      <h3>Phone alerts</h3>
      <p class="hint">${esc(notificationStatus())}</p>
      <div class="btn-row">
        <button class="btn" type="button" id="enableNotifications">Turn on notifications</button>
        <button class="btn btn-ghost" type="button" id="testNotify">Send a test</button>
      </div>
      <p class="small muted">Reminders fire only while Thali Coach is open, or installed and running. Phones pause web apps in the background — so also keep the in-app nudges in mind.</p>
    </div>

    <div class="card">
      <h3>Install on your phone</h3>
      <p class="hint">Installed apps open full-screen, work offline, and feel like a normal app.</p>
      <div class="btn-row">
        <button class="btn btn-ghost" type="button" id="installBtn" ${installPrompt ? '' : 'hidden'}>Install app</button>
      </div>
      <p class="small muted">Android: browser menu → “Install app”. iPhone: Share → “Add to Home Screen”. Service workers need https:// or http://localhost.</p>
    </div>`;
}

function checkReminders() {
  if (!state.profile) return;
  pruneFired();
  const now = new Date();
  const key = todayKey(now);
  const hhmm = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');

  state.reminders.forEach((r) => {
    if (!r.on) return;
    if (r.id === 'weighin' && now.getDay() !== (r.weekday !== undefined ? r.weekday : 0)) return;
    if (!reminderTimes(r).includes(hhmm)) return;
    const firedKey = key + '|' + r.id + '|' + hhmm;
    if (state.fired[firedKey]) return;
    state.fired[firedKey] = 1;
    save();
    fireReminder(r);
  });
}

function fireReminder(r) {
  const body = REMINDER_TEXT[r.id] || 'A gentle nudge from Thali Coach.';
  if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
    try {
      new Notification('Thali Coach · ' + r.label, { body, icon: 'icon.svg', tag: 'thali-' + r.id });
      return;
    } catch (err) { /* fall through to the in-app toast */ }
  }
  toast(body);
}

function pruneFired() {
  const keep = [todayKey(), todayKey(new Date(Date.now() - 86400000))];
  Object.keys(state.fired).forEach((k) => {
    if (!keep.includes(k.split('|')[0])) delete state.fired[k];
  });
}

async function enableNotifications() {
  if (!('Notification' in window)) { toast('This browser has no notification support. In-app nudges still work.'); return; }
  if (!window.isSecureContext) { toast('Notifications need https:// or localhost. In-app nudges still work.'); return; }
  try {
    const permission = await Notification.requestPermission();
    renderReminders();
    if (permission === 'granted') {
      toast('Notifications on. They work while the app is open or installed.');
      testNotification();
    } else if (permission === 'denied') {
      toast('Notifications blocked. In-app nudges still work while the app is open.');
    } else {
      toast('No problem — in-app nudges still work.');
    }
  } catch (err) {
    toast('Could not ask for permission in this browser.');
  }
}

function testNotification() {
  if (!('Notification' in window)) { toast('This browser has no notification support. In-app nudges still work.'); return; }
  if (Notification.permission === 'granted') {
    try {
      new Notification('Thali Coach test 🌿', { body: 'This is how a reminder looks. In-app alerts appear even without permission.', icon: 'icon.svg' });
      toast('Test sent. If you do not see it, check browser notification settings.');
    } catch (err) {
      toast('Could not send a phone notification. In-app nudges still work.');
    }
  } else {
    toast('Turn on notifications first, or just watch for in-app nudges.');
  }
}

let installPrompt = null;
window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  installPrompt = event;
  const btn = $('#installBtn');
  if (btn) btn.hidden = false;
});

async function installApp() {
  if (!installPrompt) {
    toast('Use your browser menu → “Install app” or “Add to Home screen”.');
    return;
  }
  installPrompt.prompt();
  try { await installPrompt.userChoice; } catch (err) { /* ignore */ }
  installPrompt = null;
  renderReminders();
}

/* ===========================================================================
   6. WIRING, NAVIGATION, STARTUP
=========================================================================== */

let currentScreen = 'setup';

function showScreen(name) {
  if (!SCREENS.includes(name)) name = 'setup';
  currentScreen = name;
  SCREENS.forEach((s) => {
    const el = document.getElementById('screen-' + s);
    if (el) el.hidden = s !== name;
  });
  $$('#tabbar .tab').forEach((b) => {
    const on = b.dataset.screen === name;
    b.classList.toggle('active', on);
    if (on) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  });

  const renderers = {
    setup: prefillSetup,
    targets: renderTargets,
    plan: function () { renderDayTabs(); renderPlan(); },
    coach: renderCoach,
    groceries: renderGroceries,
    prep: renderPrep,
    activity: renderActivity,
    progress: renderProgress,
    reminders: renderReminders
  };
  if (renderers[name]) renderers[name]();
  window.scrollTo(0, 0);
}

function wireStatic() {
  $('#setupForm').addEventListener('submit', onSetupSubmit);
  $('#sex').addEventListener('change', syncPregnancyRow);

  $('#loveChips').addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    chip.classList.toggle('on');
    chip.setAttribute('aria-pressed', chip.classList.contains('on') ? 'true' : 'false');
  });

  $('#tabbar').addEventListener('click', (e) => {
    const tab = e.target.closest('.tab');
    if (tab) showScreen(tab.dataset.screen);
  });

  document.addEventListener('click', (e) => {
    const go = e.target.closest('[data-go]');
    if (go) showScreen(go.dataset.go);
  });

  $('#dayTabs').addEventListener('click', (e) => {
    const tab = e.target.closest('.day-tab');
    if (!tab) return;
    state.selectedDay = tab.dataset.day;
    save();
    renderPlan();
  });

  /* Groceries */
  $('#groceryContent').addEventListener('change', (e) => {
    const cb = e.target.closest('[data-grocery]');
    if (!cb) return;
    const wk = weekKey();
    if (!state.groceryChecks[wk]) state.groceryChecks[wk] = {};
    state.groceryChecks[wk][cb.dataset.grocery] = cb.checked;
    save();
    renderGroceries();
  });

  /* Prep */
  $('#prepContent').addEventListener('change', (e) => {
    const cb = e.target.closest('[data-prep]');
    if (!cb) return;
    const wk = weekKey();
    if (!state.prepChecks[wk]) state.prepChecks[wk] = {};
    state.prepChecks[wk][cb.dataset.prep] = cb.checked;
    save();
  });

  /* Activity */
  $('#activityContent').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-task]');
    if (!btn) return;
    const log = getLog(todayKey());
    if (!log.activity) log.activity = {};
    log.activity[btn.dataset.task] = !log.activity[btn.dataset.task];
    save();
    renderActivity();
  });

  /* Progress */
  $('#progressContent').addEventListener('click', (e) => {
    const water = e.target.closest('[data-water]');
    if (water) {
      const log = getLog(todayKey());
      log.water = clamp((log.water || 0) + Number(water.dataset.water), 0, waterGoal() + 4);
      save();
      renderProgress();
      return;
    }
    const del = e.target.closest('[data-del]');
    if (del) {
      state.weights = state.weights.filter((w) => w.date !== del.dataset.del);
      save();
      renderProgress();
      toast('Check-in removed.');
    }
  });

  $('#progressContent').addEventListener('change', (e) => {
    const cb = e.target.closest('[data-meal]');
    if (!cb) return;
    const log = getLog(todayKey());
    if (!log.meals) log.meals = {};
    log.meals[cb.dataset.meal] = cb.checked;
    save();
    renderProgress();
  });

  $('#progressContent').addEventListener('submit', (e) => {
    if (e.target.id !== 'weightForm') return;
    e.preventDefault();
    const date = $('#wDate').value || todayKey();
    const weight = parseFloat($('#wWeight').value);
    const waist = parseFloat($('#wWaist').value);
    if (!weight || weight < 25 || weight > 300) { toast('Please enter a weight in kg (25–300).'); return; }
    state.weights = state.weights.filter((w) => w.date !== date);
    state.weights.push({ date, weight: Math.round(weight * 10) / 10, waist: waist ? Math.round(waist * 10) / 10 : null });
    state.weights.sort((a, b) => a.date.localeCompare(b.date));
    save();
    renderProgress();
    toast('Saved. One reading is a dot; the trend is the story.');
  });

  /* Reminders */
  $('#remindersContent').addEventListener('change', (e) => {
    const t = e.target;
    let changed = false;
    if (t.dataset.rem) {
      const r = state.reminders.find((x) => x.id === t.dataset.rem);
      if (r) { r.on = t.checked; changed = true; }
    }
    if (t.dataset.remTime) {
      const r = state.reminders.find((x) => x.id === t.dataset.remTime);
      if (r && t.value) { r.time = t.value; changed = true; }
    }
    if (t.dataset.remEnd) {
      const r = state.reminders.find((x) => x.id === t.dataset.remEnd);
      if (r && t.value) { r.end = t.value; changed = true; }
    }
    if (changed) { save(); renderReminders(); }
  });

  $('#remindersContent').addEventListener('click', (e) => {
    if (e.target.id === 'enableNotifications') enableNotifications();
    if (e.target.id === 'testNotify') testNotification();
    if (e.target.id === 'installBtn') installApp();
  });

  wireCoach();
}

function startScheduler() {
  checkReminders();
  setInterval(checkReminders, 15000);
}

/* If the app is left open past midnight, move to the new day quietly. */
let lastDayKey = todayKey();
function startDayWatch() {
  setInterval(() => {
    const now = todayKey();
    if (now === lastDayKey) return;
    lastDayKey = now;
    state.selectedDay = defaultDayName();
    renderAll();
    showScreen(currentScreen);
    toast('New day, fresh start 🌿');
  }, 30000);
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  if (!location.protocol.startsWith('http')) return; /* file:// cannot use a service worker */
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      /* Ask for an update on every open, so fixes do not wait a day. */
      .then((reg) => reg.update().catch(() => {}))
      .catch((err) => console.warn('Service worker not registered:', err));
  });
}

function init() {
  buildLoveChips();
  wireStatic();

  if (state.profile) {
    prefillSetup();
  } else {
    /* Friendly starting values. Age stays empty because it is the safety check. */
    $('#heightFt').value = 4;
    $('#heightIn').value = 7;
    $('#weight').value = 62.4;
  }
  syncPregnancyRow();

  state.selectedDay = defaultDayName();
  restoreCoachDraft();

  renderAll();
  showScreen(state.profile ? 'plan' : 'setup');
  startScheduler();
  startDayWatch();
  registerServiceWorker();
}

init();
