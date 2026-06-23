---
title: Chicago Public School Enrollment Projections
author: Forest Gregg
layout: post
date: 2024-11-01
description: A cohort-survival bootstrap forecast of Chicago Public Schools K-12 enrollment, overall and by race/ethnicity, with credible intervals.
reactive: true
---

## Kindergarten though 12th Grade Enrollment, Historical and Projected

K-12 enrollment has been declining in Chicago Public Schools for
${latest_enrollment_year - school_age_years.find(d => d.count ===
d3.max(school_age_years.map(d => d.count))).year} years: from a high of
${d3.max(school_age_years.map(d => d.count)).toLocaleString()} students enrolled
in ${school_age_years.find(d => d.count === d3.max(school_age_years.map(d =>
d.count))).year} down to ${school_age_years.find(d => d.year ===
latest_enrollment_year && d.race === 'Total').count.toLocaleString()} students
in ${latest_enrollment_year}.

Based on ${latest_enrollment_year} enrollment and counts of Chicago births
through ${latest_birth_year}, we project that K-12 enrollment will lose another
${(school_age_years.find(d => d.year === latest_enrollment_year && d.race ===
'Total').count - school_age_years.find(d => d.year === latest_birth_year + 5 &&
d.race === 'Total').count).toLocaleString( undefined, { maximumFractionDigits:
0, maximumSignificantDigits: 2 })} students by the ${latest_birth_year +
5}-${latest_birth_year + 6} school year.

| school year | projected enrollment (95% credible interval) |
| ----------- | -------------------------------------------: |
| 2026-2027   |          ${credible_interval(2026, 'Total')} |
| 2027-2028   |          ${credible_interval(2027, 'Total')} |
| 2028-2029   |          ${credible_interval(2028, 'Total')} |

```js
display(
  Plot.plot({
    color: {
      legend: true,
    },
    marginLeft: 85,
    y: {
      grid: true,
      tickFormat: "2s",
      nice: true,
      label: "K-12 enrollment",
      domain: [0, 420000],
    },
    x: {
      nice: true,
      label: "year",
    },
    marks: [
      Plot.areaY(
        school_age_years.filter(
          (d) => d.race === "Total" && d.type === "projection",
        ),
        {
          x: (d) => new Date(`${d.year.toString()}-09-15`),
          y1: (d) => d.count - d.stdev * 1.96,
          y2: (d) => d.count + d.stdev * 1.96,
          fill: "type",
          fillOpacity: 0.1,
        },
      ),
      Plot.line(
        school_age_years.filter((d) => d.race === "Total"),
        {
          x: (d) => new Date(`${d.year.toString()}-09-15`),
          y: "count",
          stroke: "type",
          tip: true,
        },
      ),
    ],
  }),
);
```

## Kindergarten though 12th Grade Enrollment By Race and Ethnicity, Historical and Projected

The enrollment decline is caused by two demographic trends. First,
[Chicago has been losing African Americans of all ages for about twenty years](https://today.uic.edu/uic-report-examines-black-population-loss-in-chicago).
Second, the Latino baby boom peaked around 2001 and Latino births have been
falling since.

| school year |                               African American |                                 Latino |                               white |                               other |
| ----------- | ---------------------------------------------: | -------------------------------------: | ----------------------------------: | ----------------------------------: |
| 2026-2027   | ${credible_interval(2026, "African American")} | ${credible_interval(2026, "Hispanic")} | ${credible_interval(2026, "white")} | ${credible_interval(2026, "other")} |
| 2027-2028   | ${credible_interval(2027, "African American")} | ${credible_interval(2027, "Hispanic")} | ${credible_interval(2027, "white")} | ${credible_interval(2027, "other")} |
| 2028-2029   | ${credible_interval(2028, "African American")} | ${credible_interval(2028, "Hispanic")} | ${credible_interval(2028, "white")} | ${credible_interval(2028, "other")} |

```js
display(
  Plot.plot({
    color: {
      legend: true,
    },
    marginLeft: 85,
    y: {
      grid: true,
      tickFormat: "2s",
      nice: true,
      label: "K-12 enrollment",
    },
    x: {
      nice: true,
      label: "year",
    },
    facet: {
      data: school_age_years_race,
      x: "race",
    },
    marks: [
      Plot.areaY(
        school_age_years_race,

        {
          x: (d) => new Date(d.year.toString()),
          y1: (d) => d.count - d.stdev * 1.96,
          y2: (d) => d.count + d.stdev * 1.96,
          fill: "type",
          fillOpacity: 0.1,
        },
      ),
      Plot.line(school_age_years_race, {
        x: (d) => new Date(d.year.toString()),
        y: "count",
        stroke: "type",
        tip: true,
      }),
    ],
  }),
);
```

## Methodology

Our projections are based on the transitions of students going from one
grade to the next and the transition of children being born in Chicago too
becoming kindergarteners five years later.

First, we predict enrollment in grades 1 through 12 from enrollment in the
previous grade the year before. In the literature on school enrollment
projections, this is called the
[grade progression rate method](https://nces.ed.gov/programs/projections/projections2021/app_a1.asp).

Second, we predict kindergarten enrollment from the number of babies born to
Chicago residents five years earlier. This is called the
[enrollment rate method](https://nces.ed.gov/programs/projections/projections2021/app_a1.asp).

Thes future transitions rates are not known, so we need a plausible way of predicting 
them. It tends to be the case that last year's rate is a good prediction
of this year's rate. So, for each grade-to-grade transition rate, we say that next year's 
rate will be the same as this year's rate plus or minus some random difference, and then
repeat that for the following year, and so on. The size of the random differences are based 
on the observed historical variations.

To make projections, we start with the observed number of students by grade and race and ethnicity
and Chicago births, and use a projected transition rate to step those cohorts to next year and 
then we repeat that with the projected student population the following year, and then a 
third year. That gives us one possible trajectory of the student population. We then repeat
that ${replicates.toLocaleString()} times to get a range of possible trajectories.

### October 2022 Updates

- Use a weighted sample of grade transition and birth to kindergarten
  transitions so that transitions from recent years are more likely to be
  sampled than transitions from older years.
- Don’t sample transitions that had their endpoint in 2020.

### August 2024 Updates

- Added kindergarten data for 2007 and earlier.
- Reincorporated transitions that had their endpoint in 2020

### October 2024 Updates

- Change sampling weights for choosing a year's transition rate from ∝
  ${tex`(\text{year}_i - \text{year}_0)^{1.5}`} to ∝
  ${tex`2.5^{(\text{year}_i - \text{year}_0)}`} to increase effect of recent
  years.

### June 2026 Update

Previously, projected transition rates per grade and race and ethnic group were
drawn from the historically observed transition rates. This led to credible intervals
that were too narrow. For this update, we switched to a random walk model for 
transitions.

The model also contained a per group random shock model to account for events like 
the asylum seekers in 2022-2023. 

## Forecast Accuracy

For each year that we make forecasts, we will record the actual total enrollment.

### July 2022 Forecast

| school year | projected enrollment (95% credible interval) | actual enrollment |
| ----------- | -------------------------------------------- | ----------------- |
| 2022-2023   | 296,000—307,000                              | 305,703           |
| 2023-2024   | 283,000—297,000                              | 305,662           |
| 2024-2025   | 272,000—288,000                              | 307,412           |
| 2025-2026   | 262,000—279,000                              | 299,308           |

### July 2023 Forecast

| school year | projected enrollment (95% credible interval) | actual enrollment |
| ----------- | -------------------------------------------- | ----------------- |
| 2023-2024   | 291,000—299,000                              | 305,662           |
| 2024-2025   | 279,000—290,000                              | 307,412           |
| 2025-2026   | 268,000—280,000                              | 299,308           |
| 2026-2027   | 257,000—269,000                              |                   |

In 2022 and 2023, there was a significant immigration of Venezuelans and other
asylum seekers starting.

### August 2024 Forecast

| school year | projected enrollment (95% credible interval) | actual enrollment |
| ----------- | -------------------------------------------- | ----------------- |
| 2024-2025   | 289,000—302,000                              | 307,412           |
| 2025-2026   | 276,000—293,000                              | 299,308           |
| 2026-2027   | 264,000—283,000                              |                   |
| 2027-2028   | 253,000—274,000                              |                   |


### June 2026 Forecast

| school year | projected enrollment (95% credible interval) | actual enrollment |
| - | - | - |
| 2026-2027 | 281,000—297,000 | |
| 2027-2028 | 264,000—293,000 | |
| 2028-2029 | 250,000—289,000 | |


```js
const school_age_years_race = school_age_years.filter(
  (d) => d.race !== "Total",
);
```

```js
const school_age_years = (() => {
  const race_totals = d3
    .flatRollup(
      cps_demo_data.filter((d) =>
        new Set([
          ...d3.range(0, 13),
          "Full-Day Kindergarten",
          "Half-Day Kindergarten",
        ]).has(d.grade),
      ),
      (v) => d3.sum(v, (d) => d.count),
      (d) => d.year,
      (d) =>
        new Set(["African American", "Hispanic", "white", "Total"]).has(d.race)
          ? d.race
          : "other",
    )
    .map(([year, race, count]) => ({ year, race, count }));

  return [
    ...race_totals.map((d) => ({ ...d, type: "historical" })),
    ...race_totals
      .filter((d) => d.year === latest_enrollment_year)
      .map((d) => ({ ...d, type: "projection", stdev: 0 })),
    ...forecast,
  ];
})();
```


```js
const race_groups = ["African American", "Hispanic", "white", "other"];
```


```js
const S2 = 2e-4;
```


```js
const grade_lookup = (() => {
  const m = new Map();
  for (const d of grade_data) {
    const key = `${d.year}::${d.race}::${d.grade}`;
    m.set(key, (m.get(key) ?? 0) + d.count);
  }
  return m;
})();
```

```js
const birth_lookup = new Map(
  birth_data.map((d) => [`${d.year}::${d.race}`, d.count]),
);
```

```js
const observations = (() => {
  const first_year = d3.min(grade_data, (d) => d.year);
  const out = new Map();
  for (const race of race_groups) {
    const obs = new Map();
    const add = (year, entry) => {
      if (!obs.has(year)) obs.set(year, []);
      obs.get(year).push(entry);
    };
    for (let y = first_year + 1; y <= latest_enrollment_year; y++) {
      for (let g = 0; g < 12; g++) {
        const origin = grade_lookup.get(`${y - 1}::${race}::${g}`);
        const dest = grade_lookup.get(`${y}::${race}::${g + 1}`);
        if (origin > 0 && dest > 0)
          add(y, [g, Math.log(dest / origin), 1 / dest + S2]);
      }
      const kindergarten = grade_lookup.get(`${y}::${race}::0`);
      const births = birth_lookup.get(`${y - 5}::${race}`);
      if (kindergarten > 0 && births > 0)
        add(y, [12, Math.log(kindergarten / births), 1 / kindergarten + S2]);
    }
    out.set(race, obs);
  }
  return out;
})();
```


```js
function gaussian(sd) {
  if (!(sd > 0)) return 0;
  let u = 0,
    v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
```

```js
function kalman_filter(obs, q, phi, w) {
  const D = 14;
  const SHOCK = 13;
  const x = new Array(D).fill(0);
  const P = Array.from({ length: D }, () => new Array(D).fill(0));
  for (let i = 0; i < 13; i++) P[i][i] = 10; // diffuse prior on the levels
  P[SHOCK][SHOCK] = w / Math.max(1e-6, 1 - phi * phi); // stationary shock prior

  let logLik = 0;
  let prev = null;
  for (const year of [...obs.keys()].sort((a, b) => a - b)) {
    if (prev !== null) {
      const dt = year - prev;
      const decay = Math.pow(phi, dt);
      for (let i = 0; i < D; i++) {
        P[i][SHOCK] *= decay;
        P[SHOCK][i] *= decay;
      }
      x[SHOCK] *= decay;
      for (let i = 0; i < 13; i++) P[i][i] += q * dt; // random-walk innovation
      P[SHOCK][SHOCK] += w * dt; // shock innovation
    }
    for (const [s, log_rate, r_var] of obs.get(year)) {
      const Ph = new Array(D);
      for (let i = 0; i < D; i++) Ph[i] = P[i][s] + P[i][SHOCK];
      const F = Ph[s] + Ph[SHOCK] + r_var;
      const innov = log_rate - (x[s] + x[SHOCK]);
      logLik +=
        -0.5 * (Math.log(2 * Math.PI) + Math.log(F) + (innov * innov) / F);
      const K = Ph.map((p) => p / F);
      for (let i = 0; i < D; i++) x[i] += K[i] * innov;
      for (let i = 0; i < D; i++)
        for (let j = 0; j < D; j++) P[i][j] -= K[i] * Ph[j];
    }
    prev = year;
  }
  return { logLik, x, P };
}
```

```js
function nelder_mead(f, x0, steps, iters = 140) {
  const n = x0.length;
  let simplex = [x0.slice()];
  for (let i = 0; i < n; i++) {
    const p = x0.slice();
    p[i] += steps[i];
    simplex.push(p);
  }
  let fv = simplex.map(f);
  for (let it = 0; it < iters; it++) {
    const order = d3.range(n + 1).sort((a, b) => fv[a] - fv[b]);
    simplex = order.map((i) => simplex[i]);
    fv = order.map((i) => fv[i]);
    const centroid = new Array(n).fill(0);
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) centroid[j] += simplex[i][j] / n;
    const worst = simplex[n];
    const reflect = centroid.map((c, j) => c + (c - worst[j]));
    const fr = f(reflect);
    if (fr < fv[0]) {
      const expand = centroid.map((c, j) => c + 2 * (c - worst[j]));
      const fe = f(expand);
      [simplex[n], fv[n]] = fe < fr ? [expand, fe] : [reflect, fr];
    } else if (fr < fv[n - 1]) {
      simplex[n] = reflect;
      fv[n] = fr;
    } else {
      const contract = centroid.map((c, j) => c + 0.5 * (worst[j] - c));
      const fc = f(contract);
      if (fc < fv[n]) {
        simplex[n] = contract;
        fv[n] = fc;
      } else {
        for (let i = 1; i <= n; i++) {
          simplex[i] = simplex[i].map(
            (v, j) => simplex[0][j] + 0.5 * (v - simplex[0][j]),
          );
          fv[i] = f(simplex[i]);
        }
      }
    }
  }
  let best = 0;
  for (let i = 1; i <= n; i++) if (fv[i] < fv[best]) best = i;
  return simplex[best];
}
```


```js
function fit_state_space(obs) {
  const logistic = (z) => 1 / (1 + Math.exp(-z));
  const negLogLik = ([log_q, log_w, z_phi]) => {
    const value = -kalman_filter(obs, 10 ** log_q, logistic(z_phi), 10 ** log_w)
      .logLik;
    return Number.isFinite(value) ? value : 1e9;
  };
  const best = nelder_mead(negLogLik, [-3, -3.5, 0], [0.6, 0.6, 0.8]);
  return { q: 10 ** best[0], w: 10 ** best[1], phi: logistic(best[2]) };
}
```


```js
const fitted = (() => {
  const m = new Map();
  for (const race of race_groups) {
    const obs = observations.get(race);
    const params = fit_state_space(obs);
    const { x, P } = kalman_filter(obs, params.q, params.phi, params.w);
    m.set(race, { ...params, x, P });
  }
  return m;
})();
```


```js
const forecast = (() => {
  const base_year = latest_enrollment_year;
  const final_year = latest_birth_year + 5;
  const years = d3.range(base_year + 1, final_year + 1);

  const draws = new Map();
  const key = (year, race) => `${year}::${race}`;
  for (const year of years)
    for (const race of [...race_groups, "Total"])
      draws.set(key(year, race), []);

  for (let rep = 0; rep < replicates; rep++) {
    const total_by_year = new Map(years.map((year) => [year, 0]));
    for (const race of race_groups) {
      const { q, phi, w, x, P } = fitted.get(race);
      const level = d3
        .range(13)
        .map((s) => x[s] + gaussian(Math.sqrt(Math.max(P[s][s], 0))));
      let shock = x[13] + gaussian(Math.sqrt(Math.max(P[13][13], 0)));
      let count = d3
        .range(13)
        .map((g) => grade_lookup.get(`${base_year}::${race}::${g}`) ?? 0);

      for (const year of years) {
        for (let s = 0; s < 13; s++) level[s] += gaussian(Math.sqrt(q));
        shock = phi * shock + gaussian(Math.sqrt(w));
        const next = new Array(13);
        const births = birth_lookup.get(`${year - 5}::${race}`) ?? 0;
        next[0] =
          births * Math.exp(level[12] + shock + gaussian(Math.sqrt(S2)));
        for (let g = 1; g < 13; g++)
          next[g] =
            count[g - 1] *
            Math.exp(level[g - 1] + shock + gaussian(Math.sqrt(S2)));
        count = next;
        const total = d3.sum(count);
        draws.get(key(year, race)).push(total);
        total_by_year.set(year, total_by_year.get(year) + total);
      }
    }
    for (const year of years)
      draws.get(key(year, "Total")).push(total_by_year.get(year));
  }

  return Array.from(draws, ([k, values]) => {
    const [year, race] = k.split("::");
    return {
      year: +year,
      race,
      count: d3.mean(values),
      stdev: d3.deviation(values),
      type: "projection",
    };
  });
})();
```

```js
const latest_enrollment_year = d3.max(grade_data.map((d) => d.year));
```

```js
const latest_birth_year = d3.max(birth_data.map((d) => d.year));
```

```js
const replicates = 1000;
```

### Grade Data

Chicago Public Schools
[publishes data on their student demographics by grade](https://www.cps.edu/about/district-data/demographics/),
and I've compiled
[that data into a spreadsheet](https://docs.google.com/spreadsheets/d/1GFOEXgOrWECqfQEeMVegepn3ysz-vFgst-RmyqInjUA/edit#gid=1346209997).

The data has information about pre-school, but right now we are going to just
look at the grade (kindergarten is coded as 0).

Unfortunately, we will also only be considering four demographic groups:
non-Hispanic Blacks, Hispanics, non-Hispanic whites, and non-Hispanic other.
This is because we will be using data from the Illinois Department of Public
health on births and those are the only demographic groups they report.

```js
const grade_data = [
  ...d3
    .flatRollup(
      cps_demo_data,
      (v) => d3.sum(v, (d) => d.count),
      (d) => d.year,
      (d) =>
        new Set(["African American", "Hispanic", "white", "Total"]).has(d.race)
          ? d.race
          : "other",
      (d) => d.grade,
    )
    .map(([year, race, grade, count]) => ({ year, race, grade, count }))
    .filter((d) => new Set(d3.range(13)).has(d.grade)),
  ...d3
    .flatRollup(
      cps_demo_data.filter((d) =>
        new Set(["Full-Day Kindergarten", "Half-Day Kindergarten"]).has(
          d.grade,
        ),
      ),
      (v) => d3.sum(v, (d) => d.count),
      (d) => d.year,
      (d) =>
        new Set(["African American", "Hispanic", "white", "Total"]).has(d.race)
          ? d.race
          : "other",
    )
    .map(([year, race, count]) => ({ year, race, grade: 0, count })),
];
```

```js
const cps_demo_data = d3.csv(
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSlDJgyBRmDGBdhVi_fWU6bxprkLZrKrW2YNvGW1hVToXRz9kWQvAPM2UVh28sGMjqfL_1nBNUrjHbl/pub?gid=1346209997&single=true&output=csv",
  d3.autoType,
);
```

### Birth Data

I have compiled the
[data for Chicago births](https://docs.google.com/spreadsheets/d/11puU8gupkp0gjzN_LXMQaSYbhYoJLr5aylaclxhawDw/edit#gid=0)
from a number of sources. See
[this post for details on sources]({% post_url 2024-10-18-chicago-births-2009-2020 %}).

```js
const birth_data = [
  ...birth_data_raw
    .map((d) => [
      {
        year: d.year,
        race: "African American",
        count: d["non-hispanic black"],
      },
      { year: d.year, race: "Hispanic", count: d.hispanic },
    ])
    .flat(),
  ...birth_data_raw
    .filter((d) => d["non-hispanic white"])
    .map((d) => [
      { year: d.year, race: "white", count: d["non-hispanic white"] },
      { year: d.year, race: "other", count: d["non-hispanic other"] },
    ])
    .flat(),
].filter((d) => d.count);
```

```js
const birth_data_raw = d3.csv(
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQIqfBxFiIipgTjASaQObMUzZ8CkMuDDJA40GSr3Ajfc9ObkJRXqIElJHYFfSjuPqv-nvhrfJCWz7bO/pub?gid=0&single=true&output=csv",
  d3.autoType,
);
```

```js
const credible_interval = (year, race) => {
  const target_year = school_age_years.find(
    (d) => d.year === year && d.race === race,
  );
  return `${(target_year.count - target_year.stdev * 1.96).toLocaleString(
    undefined,
    {
      maximumFractionDigits: 0,
      maximumSignificantDigits: 3,
    },
  )}—${(target_year.count + target_year.stdev * 1.96).toLocaleString(
    undefined,
    {
      maximumFractionDigits: 0,
      maximumSignificantDigits: 3,
    },
  )}`;
};
```
