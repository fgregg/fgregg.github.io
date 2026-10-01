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
${round_thousand(school_age_years.find(d => d.year === latest_enrollment_year &&
d.race === 'Total').count - school_age_years.find(d => d.year ===
latest_birth_year + 5 && d.race === 'Total').count).toLocaleString()} students by the ${latest_birth_year +
5}-${latest_birth_year + 6} school year.

| school year | projected enrollment (95% credible interval) |
| ----------- | -------------------------------------------: |
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
          x: school_year_date,
          y1: (d) => d.count - d.stdev * 1.96,
          y2: (d) => d.count + d.stdev * 1.96,
          fill: "type",
          fillOpacity: 0.1,
        },
      ),
      Plot.line(
        school_age_years.filter((d) => d.race === "Total"),
        {
          x: school_year_date,
          y: "count",
          stroke: "type",
        },
      ),
      Plot.tip(
        school_age_years.filter((d) => d.race === "Total" && !d.anchor),
        Plot.pointerX({
          x: school_year_date,
          y: displayed_count,
          channels: { type: "type" },
          format: { x: school_year_label },
        }),
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
| ${latest_enrollment_year}-${latest_enrollment_year + 1} (actual) | ${observed_count("African American")} | ${observed_count("Hispanic")} | ${observed_count("white")} | ${observed_count("other")} |
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
    marks: [
      Plot.areaY(
        school_age_years_race.filter((d) => d.type === "projection"),
        {
          fx: "race",
          x: school_year_date,
          y1: (d) => d.count - d.stdev * 1.96,
          y2: (d) => d.count + d.stdev * 1.96,
          fill: "type",
          fillOpacity: 0.1,
        },
      ),
      Plot.line(school_age_years_race, {
        fx: "race",
        x: school_year_date,
        y: "count",
        stroke: "type",
      }),
      Plot.tip(
        school_age_years_race.filter((d) => !d.anchor),
        Plot.pointerX({
          fx: "race",
          x: school_year_date,
          y: displayed_count,
          channels: { type: "type" },
          format: { x: school_year_label },
        }),
      ),
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
on the observed historical variations. The birth to kindergarten rate moves much more from
year to year than the grade-to-grade rates, as families decide between CPS, private
schools, and moving away, so it gets its own, larger, random differences.

Some years also bring a temporary shock that moves many transition rates at once,
like the asylum seekers who arrived in 2022 and 2023. The model includes a
shock for each racial and ethnic group, and a citywide shock shared by all
groups, like the pandemic drop in kindergarten enrollment in fall 2020. These
shocks fade over time instead of persisting.

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

### October 2026 Update

- Added a citywide shock, shared by all racial and ethnic groups, alongside
  each group's own shock. Previously, the groups were projected independently,
  which made the interval for total enrollment too narrow.
- Simulations now draw the starting transition rates and shocks together,
  respecting how their estimates are correlated. Drawing them independently
  sometimes made intervals much too wide.
- The birth to kindergarten rate now has its own random walk variance instead
  of sharing one with the grade-to-grade rates. Kindergarten entry varies much
  more, especially for white and other students.

In a backtest of one to three year forecasts made from 2010 through 2025,
these changes reduced forecast error and gave intervals whose width better
matched the actual errors.

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
| 2026-2027   | 257,000—269,000                              | 287,957           |

In 2022 and 2023, there was a significant immigration of Venezuelans and other
asylum seekers starting.

### August 2024 Forecast

| school year | projected enrollment (95% credible interval) | actual enrollment |
| ----------- | -------------------------------------------- | ----------------- |
| 2024-2025   | 289,000—302,000                              | 307,412           |
| 2025-2026   | 276,000—293,000                              | 299,308           |
| 2026-2027   | 264,000—283,000                              | 287,957           |
| 2027-2028   | 253,000—274,000                              |                   |


### June 2026 Forecast

| school year | projected enrollment (95% credible interval) | actual enrollment |
| - | - | - |
| 2026-2027 | 281,000—297,000 | 287,957 |
| 2027-2028 | 264,000—293,000 | |
| 2028-2029 | 250,000—289,000 | |


```js
const school_year_date = (d) => new Date(`${d.year}-09-15`);
```

```js
// projections are rounded to the nearest thousand; observed counts are exact
const displayed_count = (d) =>
  d.type === "projection" ? round_thousand(d.count) : d.count;
```

```js
const round_thousand = (n) => Math.round(n / 1000) * 1000;
```

```js
const school_year_label = (date) =>
  `${date.getUTCFullYear()}-${String((date.getUTCFullYear() + 1) % 100).padStart(2, "0")}`;
```

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
      // repeats the latest observed year so the projection line joins the
      // historical one; left out of tooltips
      .map((d) => ({ ...d, type: "projection", stdev: 0, anchor: true })),
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
function kalman_filter(obs, q, qK, phi, w) {
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
      for (let i = 0; i < 13; i++) P[i][i] += (i === 12 ? qK : q) * dt; // random-walk innovation
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
// The birth-to-kindergarten rate gets its own random-walk variance, qK, since
// it moves much more than the grade-to-grade rates.
function fit_state_space(obs) {
  const negLogLik = ([log_q, log_w, z_phi, log_qK]) => {
    const value = -kalman_filter(
      obs,
      10 ** log_q,
      10 ** log_qK,
      logistic(z_phi),
      10 ** log_w,
    ).logLik;
    return Number.isFinite(value) ? value : 1e9;
  };
  let best = null;
  let best_value = Infinity;
  for (const start of [
    [-3, -3.5, 0, -3],
    [-3.5, -3, 0.5, -2.5],
  ]) {
    const fit = nelder_mead(negLogLik, start, [0.6, 0.6, 0.8, 0.6], 200);
    const value = negLogLik(fit);
    if (value < best_value) {
      best_value = value;
      best = fit;
    }
  }
  return {
    q: 10 ** best[0],
    w: 10 ** best[1],
    phi: logistic(best[2]),
    qK: 10 ** best[3],
  };
}
```


```js
const logistic = (z) => 1 / (1 + Math.exp(-z));
```

```js
// One filter over all groups. Group r's 13 log-rate levels are at 14r..14r+12
// and its own shock is at 14r+13; the citywide shock is the last element.
function joint_kalman_filter(group_params, city_w, city_phi) {
  const CITY = 14 * race_groups.length;
  const D = CITY + 1;
  const x = new Array(D).fill(0);
  const P = Array.from({ length: D }, () => new Array(D).fill(0));
  const q = new Array(D).fill(0);
  const w = new Array(D).fill(0);
  const phi = new Array(D).fill(1);
  group_params.forEach((p, r) => {
    for (let i = 0; i < 13; i++) {
      P[14 * r + i][14 * r + i] = 10; // diffuse prior on the levels
      q[14 * r + i] = i === 12 ? p.qK : p.q;
    }
    phi[14 * r + 13] = p.phi;
    w[14 * r + 13] = p.w;
    P[14 * r + 13][14 * r + 13] = p.w / Math.max(1e-6, 1 - p.phi * p.phi);
  });
  phi[CITY] = city_phi;
  w[CITY] = city_w;
  P[CITY][CITY] = city_w / Math.max(1e-6, 1 - city_phi * city_phi);

  const by_year = new Map();
  race_groups.forEach((race, r) => {
    for (const [year, entries] of observations.get(race)) {
      if (!by_year.has(year)) by_year.set(year, []);
      for (const [s, log_rate, r_var] of entries)
        by_year.get(year).push([14 * r + s, 14 * r + 13, log_rate, r_var]);
    }
  });

  let logLik = 0;
  let prev = null;
  const decay = new Array(D);
  for (const year of [...by_year.keys()].sort((a, b) => a - b)) {
    if (prev !== null) {
      const dt = year - prev;
      for (let i = 0; i < D; i++) decay[i] = Math.pow(phi[i], dt);
      for (let i = 0; i < D; i++) {
        x[i] *= decay[i];
        for (let j = 0; j < D; j++) P[i][j] *= decay[i] * decay[j];
        P[i][i] += (q[i] + w[i]) * dt; // random-walk and shock innovations
      }
    }
    for (const [s, shock, log_rate, r_var] of by_year.get(year)) {
      const Ph = new Array(D);
      for (let i = 0; i < D; i++) Ph[i] = P[i][s] + P[i][shock] + P[i][CITY];
      const F = Ph[s] + Ph[shock] + Ph[CITY] + r_var;
      const innov = log_rate - (x[s] + x[shock] + x[CITY]);
      logLik +=
        -0.5 * (Math.log(2 * Math.PI) + Math.log(F) + (innov * innov) / F);
      for (let i = 0; i < D; i++) x[i] += (Ph[i] / F) * innov;
      for (let i = 0; i < D; i++) {
        const k = Ph[i] / F;
        for (let j = 0; j < D; j++) P[i][j] -= k * Ph[j];
      }
    }
    prev = year;
  }
  return { logLik, x, P };
}
```

```js
function cholesky(A) {
  const n = A.length;
  const L = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++)
    for (let j = 0; j <= i; j++) {
      let s = A[i][j];
      for (let k = 0; k < j; k++) s -= L[i][k] * L[j][k];
      L[i][j] = i === j ? Math.sqrt(Math.max(s, 1e-12)) : s / L[j][j];
    }
  return L;
}
```

```js
// First fit each group's random walk and shock on its own, then fit the
// citywide shock jointly, letting the group shocks shrink by a common factor
// since part of what looked like a group shock may be citywide.
const fitted = (() => {
  const groups = race_groups.map((race) =>
    fit_state_space(observations.get(race)),
  );
  const negLogLik = ([log_w, z_phi, log_m]) => {
    const group_params = groups.map((p) => ({ ...p, w: p.w * 10 ** log_m }));
    const value = -joint_kalman_filter(group_params, 10 ** log_w, logistic(z_phi))
      .logLik;
    return Number.isFinite(value) ? value : 1e9;
  };
  const best = nelder_mead(negLogLik, [-3.5, 0, 0], [0.6, 0.8, 0.3], 80);
  const group_params = groups.map((p) => ({ ...p, w: p.w * 10 ** best[2] }));
  const city = { w: 10 ** best[0], phi: logistic(best[1]) };
  const { x, P } = joint_kalman_filter(group_params, city.w, city.phi);
  return { groups: group_params, city, x, L: cholesky(P) };
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

  const { groups, city, x, L } = fitted;
  const CITY = x.length - 1;
  for (let rep = 0; rep < replicates; rep++) {
    // draw the current levels and shocks jointly from the filter's estimate
    const z = x.map(() => gaussian(1));
    const state = x.map((xi, i) => {
      let s = xi;
      for (let k = 0; k <= i; k++) s += L[i][k] * z[k];
      return s;
    });
    const level = race_groups.map((_, r) => state.slice(14 * r, 14 * r + 13));
    const shock = race_groups.map((_, r) => state[14 * r + 13]);
    let city_shock = state[CITY];
    const count = race_groups.map((race) =>
      d3
        .range(13)
        .map((g) => grade_lookup.get(`${base_year}::${race}::${g}`) ?? 0),
    );

    for (const year of years) {
      city_shock = city.phi * city_shock + gaussian(Math.sqrt(city.w));
      let total_this_year = 0;
      race_groups.forEach((race, r) => {
        const { q, qK, phi, w } = groups[r];
        for (let s = 0; s < 13; s++)
          level[r][s] += gaussian(Math.sqrt(s === 12 ? qK : q));
        shock[r] = phi * shock[r] + gaussian(Math.sqrt(w));
        const total_shock = shock[r] + city_shock;
        const next = new Array(13);
        const births = birth_lookup.get(`${year - 5}::${race}`) ?? 0;
        next[0] =
          births *
          Math.exp(level[r][12] + total_shock + gaussian(Math.sqrt(S2)));
        for (let g = 1; g < 13; g++)
          next[g] =
            count[r][g - 1] *
            Math.exp(level[r][g - 1] + total_shock + gaussian(Math.sqrt(S2)));
        count[r] = next;
        const total = d3.sum(next);
        draws.get(key(year, race)).push(total);
        total_this_year += total;
      });
      draws.get(key(year, "Total")).push(total_this_year);
    }
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
const observed_count = (race) =>
  school_age_years
    .find(
      (d) =>
        d.year === latest_enrollment_year &&
        d.race === race &&
        d.type === "historical",
    )
    .count.toLocaleString();
```

```js
const credible_interval = (year, race) => {
  const target_year = school_age_years.find(
    (d) => d.year === year && d.race === race,
  );
  return `${round_thousand(
    target_year.count - target_year.stdev * 1.96,
  ).toLocaleString()}—${round_thousand(
    target_year.count + target_year.stdev * 1.96,
  ).toLocaleString()}`;
};
```
