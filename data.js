/* data.js — the food table, the 7-day plan, groceries, prep and activity lists.
   Every nutrition number is a ROUGH ESTIMATE per 100 g (or 100 ml for drinks).
   Beginner tip: change a number below and the whole app recalculates. */

/* ---------------------------------------------------------------------------
   1. FOOD TABLE
   kcal/p/c/f/fib are per 100 g (or 100 ml when "ml" is true).
   unit + unitG turns grams into a household measure: 150 g rice with
   unitG 150 and unit "katori" shows as "1 katori (150 g, cooked)".
   staple: true  -> portion can be gently scaled to reach the calorie target.
   dairy: true   -> removed automatically for vegan users.
--------------------------------------------------------------------------- */
const FOODS = {
  idli:           { name: 'Idli',                unit: 'idli',    unitG: 50,   cooked: true,  staple: true, kcal: 130, p: 4.0,  c: 26,   f: 0.4,  fib: 1.2 },
  dosa:           { name: 'Plain dosa',          unit: 'dosa',    unitG: 70,   cooked: true,  staple: true, kcal: 200, p: 5.0,  c: 30,   f: 7.0,  fib: 1.5 },
  poha:           { name: 'Poha',                unit: 'katori',  unitG: 30,   cooked: false, staple: true, kcal: 350, p: 7.0,  c: 77,   f: 1.0,  fib: 2.0 },
  oats:           { name: 'Rolled oats',         unit: 'katori',  unitG: 40,   cooked: false, staple: true, kcal: 389, p: 13.0, c: 66,   f: 7.0,  fib: 10.0 },
  upma:           { name: 'Upma',                unit: 'katori',  unitG: 150,  cooked: true,  staple: true, kcal: 150, p: 4.0,  c: 22,   f: 5.0,  fib: 2.0 },
  paratha:        { name: 'Plain paratha',       unit: 'paratha', unitG: 60,   cooked: true,  staple: true, kcal: 300, p: 7.0,  c: 40,   f: 12.0, fib: 4.0 },
  rice:           { name: 'Cooked rice',         unit: 'katori',  unitG: 150,  cooked: true,  staple: true, kcal: 130, p: 2.7,  c: 28,   f: 0.3,  fib: 0.4 },
  roti:           { name: 'Whole-wheat roti',    unit: 'roti',    unitG: 35,   cooked: true,  staple: true, kcal: 297, p: 9.5,  c: 55,   f: 5.0,  fib: 8.0 },
  khichdi:        { name: 'Khichdi',             unit: 'katori',  unitG: 150,  cooked: true,  staple: true, kcal: 130, p: 5.0,  c: 22,   f: 3.0,  fib: 2.0 },

  dal:            { name: 'Dal (toor/moong)',    unit: 'katori',  unitG: 150,  cooked: true,  kcal: 120, p: 7.0,  c: 15,   f: 2.0,  fib: 4.0 },
  rajma:          { name: 'Rajma curry',         unit: 'katori',  unitG: 150,  cooked: true,  kcal: 130, p: 8.0,  c: 20,   f: 1.5,  fib: 6.0 },
  chana:          { name: 'Chana curry',         unit: 'katori',  unitG: 150,  cooked: true,  kcal: 140, p: 8.0,  c: 22,   f: 2.0,  fib: 7.0 },
  sambar:         { name: 'Sambar',              unit: 'katori',  unitG: 150,  cooked: true,  kcal: 55,  p: 3.0,  c: 7,    f: 1.5,  fib: 1.5 },
  curd:           { name: 'Curd (dahi)',         unit: 'katori',  unitG: 100,  cooked: false, dairy: true, kcal: 80,  p: 3.5,  c: 5,    f: 4.0,  fib: 0.0 },
  paneer:         { name: 'Paneer',              unit: 'katori',  unitG: 60,   cooked: false, dairy: true, kcal: 296, p: 18.0, c: 3,    f: 22.0, fib: 0.0 },
  milk:           { name: 'Milk',                unit: 'cup',     unitG: 200,  ml: true, dairy: true, kcal: 60,  p: 3.2,  c: 4.8,  f: 3.3,  fib: 0.0 },
  buttermilk:     { name: 'Buttermilk (chaas)',  unit: 'glass',   unitG: 200,  ml: true, dairy: true, kcal: 40,  p: 3.0,  c: 5,    f: 1.0,  fib: 0.0 },
  chai:           { name: 'Chai with milk',      unit: 'cup',     unitG: 150,  ml: true, dairy: true, kcal: 60,  p: 2.0,  c: 6,    f: 2.5,  fib: 0.0 },
  black_chai:     { name: 'Black tea / lemon tea', unit: 'cup',   unitG: 150,  ml: true, kcal: 2,   p: 0.0,  c: 0.5,  f: 0.0,  fib: 0.0 },

  egg:            { name: 'Boiled egg',          unit: 'egg',     unitG: 50,   cooked: true,  kcal: 155, p: 13.0, c: 1.1,  f: 11.0, fib: 0.0 },
  egg_curry:      { name: 'Egg curry',           unit: 'katori',  unitG: 120,  cooked: true,  kcal: 150, p: 10.0, c: 5,    f: 10.0, fib: 0.5 },
  chicken_curry:  { name: 'Chicken curry',       unit: 'katori',  unitG: 120,  cooked: true,  kcal: 180, p: 18.0, c: 4,    f: 10.0, fib: 1.0 },
  chicken_grill:  { name: 'Grilled chicken',     unit: 'katori',  unitG: 100,  cooked: true,  kcal: 165, p: 27.0, c: 0,    f: 6.0,  fib: 0.0 },
  fish_curry:     { name: 'Fish curry',          unit: 'katori',  unitG: 120,  cooked: true,  kcal: 150, p: 16.0, c: 4,    f: 8.0,  fib: 0.5 },
  soya:           { name: 'Soya chunks curry',   unit: 'katori',  unitG: 100,  cooked: true,  kcal: 130, p: 14.0, c: 10,   f: 2.0,  fib: 3.0 },
  tofu:           { name: 'Tofu (soy paneer)',   unit: 'katori',  unitG: 80,   cooked: true,  kcal: 145, p: 15.0, c: 4,    f: 8.0,  fib: 1.0 },
  sprouts:        { name: 'Sprouts salad',       unit: 'katori',  unitG: 100,  cooked: false, kcal: 100, p: 7.0,  c: 15,   f: 1.0,  fib: 4.0 },
  mixedveg:       { name: 'Mixed-veg sabzi',     unit: 'katori',  unitG: 120,  cooked: true,  kcal: 90,  p: 3.0,  c: 8,    f: 5.0,  fib: 4.0 },
  palak:          { name: 'Palak sabzi',         unit: 'katori',  unitG: 120,  cooked: true,  kcal: 120, p: 6.0,  c: 7,    f: 8.0,  fib: 4.0 },
  salad:          { name: 'Salad (cucumber/tomato)', unit: 'plate', unitG: 150, cooked: false, kcal: 25, p: 1.0, c: 4,    f: 0.2,  fib: 2.0 },

  apple:          { name: 'Apple',               unit: 'apple',   unitG: 150,  cooked: false, kcal: 52,  p: 0.3,  c: 14,   f: 0.2,  fib: 2.4 },
  banana:         { name: 'Banana',              unit: 'banana',  unitG: 100,  cooked: false, kcal: 89,  p: 1.1,  c: 23,   f: 0.3,  fib: 2.6 },
  guava:          { name: 'Guava',               unit: 'guava',   unitG: 150,  cooked: false, kcal: 68,  p: 2.6,  c: 14,   f: 1.0,  fib: 5.0 },
  papaya:         { name: 'Papaya',              unit: 'katori',  unitG: 150,  cooked: false, kcal: 43,  p: 0.5,  c: 11,   f: 0.3,  fib: 1.7 },

  roasted_chana:  { name: 'Roasted chana',       unit: 'handful', unitG: 30,   cooked: false, kcal: 364, p: 19.0, c: 55,   f: 6.0,  fib: 12.0 },
  almonds:        { name: 'Almonds',             unit: 'almond',  unitG: 1.2,  cooked: false, kcal: 580, p: 21.0, c: 22,   f: 50.0, fib: 12.0 },
  peanuts:        { name: 'Peanuts',             unit: 'handful', unitG: 20,   cooked: false, kcal: 570, p: 26.0, c: 16,   f: 48.0, fib: 8.0 },

  oil:            { name: 'Cooking oil',         unit: 'tsp',     unitG: 5,    cooked: false, kcal: 900, p: 0.0,  c: 0,    f: 100.0, fib: 0.0 },
  ghee:           { name: 'Ghee',                unit: 'tsp',     unitG: 5,    cooked: false, kcal: 900, p: 0.0,  c: 0,    f: 100.0, fib: 0.0 }
};

/* ---------------------------------------------------------------------------
   2. THE 7-DAY PLAN (vegetarian base)
   Each meal has items. For eggetarian / non-vegetarian users the app removes
   items marked role: 'protein' and adds the matching swap. For vegan users it
   removes dairy items and adds the vegan swap (if any).
   "staple" foods are resized a little to get close to the calorie target.
--------------------------------------------------------------------------- */
const PLAN = [
  {
    day: 'Monday',
    quick: { text: '2 rotis + 1 katori dal + 1 katori curd + salad. Or curd rice with a boiled egg.', kcal: 520, p: 24 },
    breakfast: {
      items: [ { f: 'idli', g: 150 }, { f: 'sambar', g: 150 }, { f: 'chai', g: 150 } ],
      swaps: { egg: [ { f: 'egg', g: 100 } ] }
    },
    lunch: {
      items: [ { f: 'rice', g: 225 }, { f: 'dal', g: 150 }, { f: 'mixedveg', g: 120 }, { f: 'salad', g: 100 }, { f: 'curd', g: 100, role: 'protein' }, { f: 'oil', g: 8 } ],
      swaps: {
        egg:     [ { f: 'egg_curry', g: 120 } ],
        nonveg:  [ { f: 'chicken_curry', g: 130 } ],
        vegan:   [ { f: 'tofu', g: 100 } ]
      }
    },
    snack: { items: [ { f: 'guava', g: 150 }, { f: 'roasted_chana', g: 30 } ] },
    dinner: {
      items: [ { f: 'roti', g: 70 }, { f: 'palak', g: 120 }, { f: 'curd', g: 100, role: 'protein' }, { f: 'salad', g: 100 }, { f: 'oil', g: 8 } ],
      swaps: {
        egg:     [ { f: 'egg_curry', g: 120 } ],
        nonveg:  [ { f: 'fish_curry', g: 130 } ],
        vegan:   [ { f: 'tofu', g: 100 } ]
      }
    }
  },
  {
    day: 'Tuesday',
    quick: { text: 'Khichdi with a katori of curd, or 2 rotis + leftover sabzi + 2 boiled eggs.', kcal: 540, p: 22 },
    breakfast: {
      items: [ { f: 'poha', g: 60 }, { f: 'peanuts', g: 10 }, { f: 'banana', g: 100 }, { f: 'chai', g: 150 } ],
      swaps: { egg: [ { f: 'egg', g: 100 } ] }
    },
    lunch: {
      items: [ { f: 'roti', g: 70 }, { f: 'rajma', g: 150 }, { f: 'mixedveg', g: 120 }, { f: 'salad', g: 100 }, { f: 'curd', g: 100, role: 'protein' }, { f: 'oil', g: 8 } ],
      swaps: {
        egg:     [ { f: 'egg_curry', g: 120 } ],
        nonveg:  [ { f: 'chicken_curry', g: 130 } ],
        vegan:   [ { f: 'tofu', g: 100 } ]
      }
    },
    snack: { items: [ { f: 'buttermilk', g: 200 }, { f: 'sprouts', g: 100 } ] },
    dinner: {
      items: [ { f: 'khichdi', g: 250 }, { f: 'curd', g: 100, role: 'protein' }, { f: 'mixedveg', g: 120 }, { f: 'oil', g: 5 } ],
      swaps: {
        egg:     [ { f: 'egg_curry', g: 120 } ],
        nonveg:  [ { f: 'fish_curry', g: 130 } ],
        vegan:   [ { f: 'tofu', g: 100 } ]
      }
    }
  },
  {
    day: 'Wednesday',
    quick: { text: 'Dosa with sambar, or 2 rotis + paneer bhurji + salad.', kcal: 560, p: 25 },
    breakfast: {
      items: [ { f: 'dosa', g: 140 }, { f: 'sambar', g: 150 }, { f: 'chai', g: 150 }, { f: 'oil', g: 5 } ],
      swaps: { egg: [ { f: 'egg', g: 100 } ] }
    },
    lunch: {
      items: [ { f: 'rice', g: 200 }, { f: 'dal', g: 150 }, { f: 'mixedveg', g: 120 }, { f: 'salad', g: 100 }, { f: 'curd', g: 100, role: 'protein' }, { f: 'oil', g: 8 } ],
      swaps: {
        egg:     [ { f: 'egg_curry', g: 120 } ],
        nonveg:  [ { f: 'fish_curry', g: 130 } ],
        vegan:   [ { f: 'tofu', g: 100 } ]
      }
    },
    snack: { items: [ { f: 'apple', g: 150 }, { f: 'almonds', g: 12 } ] },
    dinner: {
      items: [ { f: 'roti', g: 70 }, { f: 'paneer', g: 60, role: 'protein' }, { f: 'mixedveg', g: 120 }, { f: 'salad', g: 100 }, { f: 'oil', g: 5 } ],
      swaps: {
        egg:     [ { f: 'egg_curry', g: 120 } ],
        nonveg:  [ { f: 'chicken_grill', g: 100 } ],
        vegan:   [ { f: 'tofu', g: 100 } ]
      }
    }
  },
  {
    day: 'Thursday',
    quick: { text: 'Upma + curd, or a big bowl of dal-roti. Add a boiled egg if you eat eggs.', kcal: 510, p: 21 },
    breakfast: {
      items: [ { f: 'upma', g: 200 }, { f: 'curd', g: 100, role: 'protein' }, { f: 'chai', g: 150 }, { f: 'oil', g: 5 } ],
      swaps: { egg: [ { f: 'egg', g: 100 } ] }
    },
    lunch: {
      items: [ { f: 'roti', g: 70 }, { f: 'chana', g: 150 }, { f: 'palak', g: 120 }, { f: 'salad', g: 100 }, { f: 'curd', g: 100, role: 'protein' }, { f: 'oil', g: 8 } ],
      swaps: {
        egg:     [ { f: 'egg_curry', g: 120 } ],
        nonveg:  [ { f: 'chicken_curry', g: 130 } ],
        vegan:   [ { f: 'tofu', g: 100 } ]
      }
    },
    snack: { items: [ { f: 'papaya', g: 150 }, { f: 'roasted_chana', g: 30 } ] },
    dinner: {
      items: [ { f: 'khichdi', g: 250 }, { f: 'curd', g: 100, role: 'protein' }, { f: 'mixedveg', g: 120 }, { f: 'oil', g: 5 } ],
      swaps: {
        egg:     [ { f: 'egg_curry', g: 120 } ],
        nonveg:  [ { f: 'fish_curry', g: 130 } ],
        vegan:   [ { f: 'tofu', g: 100 } ]
      }
    }
  },
  {
    day: 'Friday',
    quick: { text: 'Oats with milk and banana (2 minutes), or curd rice + roasted chana.', kcal: 480, p: 20 },
    breakfast: {
      items: [ { f: 'oats', g: 40 }, { f: 'milk', g: 200 }, { f: 'banana', g: 100 }, { f: 'almonds', g: 6 } ],
      swaps: { egg: [ { f: 'egg', g: 100 } ] }
    },
    lunch: {
      items: [ { f: 'rice', g: 225 }, { f: 'rajma', g: 150 }, { f: 'mixedveg', g: 120 }, { f: 'salad', g: 100 }, { f: 'curd', g: 100, role: 'protein' }, { f: 'oil', g: 8 } ],
      swaps: {
        egg:     [ { f: 'egg_curry', g: 120 } ],
        nonveg:  [ { f: 'chicken_curry', g: 130 } ],
        vegan:   [ { f: 'tofu', g: 100 } ]
      }
    },
    snack: { items: [ { f: 'buttermilk', g: 200 }, { f: 'sprouts', g: 100 } ] },
    dinner: {
      items: [ { f: 'roti', g: 70 }, { f: 'palak', g: 120 }, { f: 'paneer', g: 60, role: 'protein' }, { f: 'salad', g: 100 }, { f: 'oil', g: 5 } ],
      swaps: {
        egg:     [ { f: 'egg_curry', g: 120 } ],
        nonveg:  [ { f: 'chicken_grill', g: 100 } ],
        vegan:   [ { f: 'tofu', g: 100 } ]
      }
    }
  },
  {
    day: 'Saturday',
    quick: { text: 'Paratha + curd, or vegetable khichdi with extra dal.', kcal: 530, p: 20 },
    breakfast: {
      items: [ { f: 'paratha', g: 60 }, { f: 'curd', g: 100, role: 'protein' }, { f: 'chai', g: 150 } ],
      swaps: { egg: [ { f: 'egg', g: 100 } ] }
    },
    lunch: {
      items: [ { f: 'rice', g: 200 }, { f: 'dal', g: 150 }, { f: 'mixedveg', g: 120 }, { f: 'salad', g: 100 }, { f: 'curd', g: 100, role: 'protein' }, { f: 'oil', g: 8 } ],
      swaps: {
        egg:     [ { f: 'egg_curry', g: 120 } ],
        nonveg:  [ { f: 'fish_curry', g: 130 } ],
        vegan:   [ { f: 'tofu', g: 100 } ]
      }
    },
    snack: { items: [ { f: 'guava', g: 150 }, { f: 'peanuts', g: 15 } ] },
    dinner: {
      items: [ { f: 'roti', g: 70 }, { f: 'dal', g: 150 }, { f: 'mixedveg', g: 120 }, { f: 'salad', g: 100 }, { f: 'oil', g: 5 } ]
    }
  },
  {
    day: 'Sunday',
    quick: { text: 'Anything simple: 2 rotis + dal + salad, or idli + sambar. One meal is not the whole week.', kcal: 500, p: 20 },
    breakfast: {
      items: [ { f: 'dosa', g: 140 }, { f: 'sambar', g: 150 }, { f: 'chai', g: 150 }, { f: 'oil', g: 5 } ],
      swaps: { egg: [ { f: 'egg', g: 100 } ] }
    },
    lunch: {
      items: [ { f: 'rice', g: 250 }, { f: 'paneer', g: 40, role: 'protein' }, { f: 'mixedveg', g: 120 }, { f: 'salad', g: 100 }, { f: 'curd', g: 100, role: 'protein' }, { f: 'oil', g: 8 } ],
      swaps: {
        egg:     [ { f: 'egg_curry', g: 120 } ],
        nonveg:  [ { f: 'chicken_curry', g: 150 } ],
        vegan:   [ { f: 'tofu', g: 100 } ]
      }
    },
    snack: { items: [ { f: 'banana', g: 100 }, { f: 'roasted_chana', g: 30 } ] },
    dinner: {
      items: [ { f: 'khichdi', g: 250 }, { f: 'curd', g: 100, role: 'protein' }, { f: 'palak', g: 120 }, { f: 'oil', g: 5 } ],
      swaps: {
        egg:     [ { f: 'egg_curry', g: 120 } ],
        nonveg:  [ { f: 'fish_curry', g: 130 } ],
        vegan:   [ { f: 'tofu', g: 100 } ]
      }
    }
  }
];

/* ---------------------------------------------------------------------------
   3. WEEKLY GROCERIES — costs are ROUGH 2026 India estimates (one person).
--------------------------------------------------------------------------- */
const GROCERIES = [
  { id: 'rice',     name: 'Rice',                         qty: '1 kg',           cost: 65,  essential: true },
  { id: 'atta',     name: 'Whole-wheat atta',             qty: '1 kg',           cost: 55,  essential: true },
  { id: 'dal',      name: 'Toor / moong dal',             qty: '500 g',          cost: 75,  essential: true },
  { id: 'beans',    name: 'Rajma or chana',               qty: '500 g',          cost: 70,  essential: true },
  { id: 'batter',   name: 'Idli / dosa batter',           qty: '1 kg',           cost: 90,  essential: true },
  { id: 'poha',     name: 'Poha',                         qty: '250 g',          cost: 25,  essential: true },
  { id: 'oats',     name: 'Rolled oats',                  qty: '250 g',          cost: 50,  essential: true },
  { id: 'milk',     name: 'Milk',                         qty: '2 litres',       cost: 130, essential: true },
  { id: 'curd',     name: 'Curd',                         qty: '1 kg',           cost: 80,  essential: true },
  { id: 'veg',      name: 'Mixed vegetables',             qty: '2 kg',           cost: 160, essential: true },
  { id: 'palak',    name: 'Palak / spinach',              qty: '250 g',          cost: 25,  essential: true },
  { id: 'salad',    name: 'Cucumber, tomato, onion',      qty: '1 kg',           cost: 60,  essential: true },
  { id: 'fruit',    name: 'Seasonal fruit (guava/apple/banana/papaya)', qty: '2 kg', cost: 180, essential: true },
  { id: 'oil',      name: 'Cooking oil',                  qty: '500 ml',         cost: 90,  essential: true },
  { id: 'chana',    name: 'Roasted chana / peanuts',      qty: '250 g',          cost: 60,  essential: true },
  { id: 'spices',   name: 'Salt, turmeric, chilli, jeera', qty: 'top-up',        cost: 50,  essential: true },
  { id: 'eggs',     name: 'Eggs',                         qty: '12',             cost: 84,  essential: false },
  { id: 'paneer',   name: 'Paneer',                       qty: '200 g',          cost: 90,  essential: false },
  { id: 'soya',     name: 'Soya chunks / tofu',           qty: '200 g',          cost: 70,  essential: false },
  { id: 'chicken',  name: 'Chicken',                      qty: '500 g',          cost: 180, essential: false },
  { id: 'fish',     name: 'Fish',                         qty: '500 g',          cost: 200, essential: false },
  { id: 'almonds',  name: 'Almonds',                      qty: '100 g',          cost: 90,  essential: false }
];

/* ---------------------------------------------------------------------------
   4. PREP, STORAGE AND TIFFIN HELP
--------------------------------------------------------------------------- */
const PREP = {
  sunday: [
    'Wash and chop vegetables for 3 days. Store in a box with a kitchen towel.',
    'Boil rajma or chana in bulk. Freeze half in 2 portions.',
    'Cook one big pot of dal. Use half today, keep half for Tuesday.',
    'Make or buy curd. One kilo lasts most of the week.',
    'Portion rice and atta so you do not have to measure when tired.',
    'Boil 4 eggs (if you eat them) for quick snacks.',
    'Chop salad vegetables and keep them dry in the fridge.'
  ],
  cookOnce: [
    'Dal today = dal-rice tomorrow, or sambar with idli.',
    'Rajma today = rajma roti tomorrow, or a rajma salad bowl.',
    'Cooked rice = quick fried rice with egg or vegetables.',
    'Chicken curry = next-day chicken roti wrap (skip mayo).',
    'Extra sabzi = stuffing for a paratha or a quick omelette.',
    'Boiled potatoes = aloo sabzi or a chaat-style salad.'
  ],
  storage: [
    'Cooked rice: fridge 1 day. Reheat once, until steaming hot.',
    'Dal / curry: fridge 2 days. Freeze up to 1 month.',
    'Curd: fridge 3–4 days. Do not leave it out.',
    'Cut vegetables: fridge 3 days in a dry box.',
    'Boiled eggs: fridge 1 week, unshelled.',
    'Cooked chicken / fish: fridge 2 days. Reheat thoroughly.'
  ],
  tiffin: [
    'Base: 2 rotis OR 1.5 katori rice OR 3 idlis.',
    'Protein: 1 katori dal / rajma / chana, or 100 g chicken / fish / paneer.',
    'Vegetables: 1 katori sabzi, plus cucumber or tomato on the side.',
    'Extras: 1 katori curd, a fruit, roasted chana for the 4 pm dip.',
    'Pack curd separately and keep it cool. Add a fork, not a lecture.'
  ]
};

/* ---------------------------------------------------------------------------
   5. ACTIVITY CONTENT
--------------------------------------------------------------------------- */
const STRENGTH = [
  { name: 'Squats',        reps: '2 sets × 10',      how: 'Keep a chair behind you. Sit back, stand up. Knees track over toes.' },
  { name: 'Wall push-ups', reps: '2 sets × 8',       how: 'Hands on the wall, body in one line. Bend elbows, push away. Step back for more.' },
  { name: 'Glute bridges', reps: '2 sets × 10',      how: 'Lie on your back, feet flat. Lift hips, squeeze, lower slowly.' },
  { name: 'Plank',         reps: '2 × 20 seconds',   how: 'Forearms down, body straight. Knees down is a fine easier version.' }
];

const STRETCH = [
  'Neck rolls — 30 seconds each way, slow and gentle.',
  'Shoulder circles — 10 forward, 10 back.',
  'Standing hamstring stretch — 20 seconds each leg.',
  'Calf stretch against a wall — 20 seconds each leg.',
  'Gentle back twist — 20 seconds each side.',
  'Hip flexor stretch — 20 seconds each side.'
];

const FUN_IDEAS = [
  'Dance to three songs — no routine needed.',
  'Badminton, cricket or catch with friends.',
  'Cycle to the shop instead of taking the scooter.',
  'Take the stairs every time this week.',
  'Hula hoop or skip rope for 5 minutes.',
  'Walk while on a phone call.',
  'Try a new vegetable and cook it one way you like.'
];

const SWAPS = [
  { title: 'Protein swaps', items: [
    'Dal ↔ rajma ↔ chana — same katori size.',
    'Curd ↔ buttermilk ↔ soy curd.',
    'Eggs ↔ paneer ↔ soya chunks (similar protein, different taste).',
    'Chicken ↔ fish — curry or grilled, same katori.'
  ]},
  { title: 'Staples', items: [
    '1 katori cooked rice ↔ 2 rotis.',
    'Idli ↔ dosa ↔ upma — similar portion, different form.',
    'Poha ↔ oats — same katori, both quick.'
  ]},
  { title: 'Vegetables & fruit', items: [
    'Any seasonal sabzi in the same katori amount.',
    'Guava ↔ apple ↔ papaya — one small bowl.',
    'Add extra vegetables to dal or khichdi instead of a second roti.'
  ]},
  { title: 'Snacks', items: [
    'Roasted chana ↔ sprouts ↔ one boiled egg.',
    'Fruit ↔ buttermilk + 5 almonds.',
    'Chai ↔ black tea or lemon water (skip the biscuit).'
  ]},
  { title: 'Eating out or ordering', items: [
    'Order one curry + 2 rotis + salad. Share the rice.',
    'Grilled chicken or fish + roti + vegetables; skip fried starters.',
    'South Indian: idli or dosa with extra sambar for protein.',
    'Pizza or biryani? Eat it, enjoy it, add a salad or curd, and go back to the plan at the next meal.'
  ]}
];

/* ---------------------------------------------------------------------------
   6. DEFAULT REMINDERS
--------------------------------------------------------------------------- */
const DEFAULT_REMINDERS = [
  { id: 'breakfast', label: 'Breakfast',          time: '08:00', on: true  },
  { id: 'lunch',     label: 'Lunch',              time: '13:00', on: true  },
  { id: 'snack',     label: 'Evening snack',      time: '17:00', on: false },
  { id: 'dinner',    label: 'Dinner',             time: '20:00', on: true  },
  { id: 'water',     label: 'Water (every 2 h)',  time: '10:00', on: false, end: '19:00' },
  { id: 'walk',      label: 'Walk',               time: '18:30', on: true  },
  { id: 'weighin',   label: 'Weekly weigh-in',    time: '07:00', on: true, weekday: 0 }
];

/* Foods offered as "I love this" chips, mapped to the food table. */
const LOVED_FOODS = [
  { label: 'Idli',    food: 'idli' },
  { label: 'Dosa',    food: 'dosa' },
  { label: 'Roti',    food: 'roti' },
  { label: 'Rice',    food: 'rice' },
  { label: 'Dal',     food: 'dal' },
  { label: 'Curd',    food: 'curd' },
  { label: 'Eggs',    food: 'egg' },
  { label: 'Chicken', food: 'chicken_curry' },
  { label: 'Fish',    food: 'fish_curry' },
  { label: 'Paneer',  food: 'paneer' },
  { label: 'Poha',    food: 'poha' },
  { label: 'Upma',    food: 'upma' },
  { label: 'Chai',    food: 'chai' }
];
