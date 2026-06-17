---
title: Chicago Public School Enrollment Projections
author: Forest Gregg
layout: post
date: 2024-11-01
description: A cohort-survival bootstrap forecast of Chicago Public Schools K-12 enrollment, overall and by race/ethnicity, with credible intervals.
reactive: cellular
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
| 2025-2026   |          ${credible_interval(2025, 'Total')} |
| 2026-2027   |          ${credible_interval(2026, 'Total')} |
| 2027-2028   |          ${credible_interval(2027, 'Total')} |

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
| 2025-2026   | ${credible_interval(2025, "African American")} | ${credible_interval(2025, "Hispanic")} | ${credible_interval(2025, "white")} | ${credible_interval(2025, "other")} |
| 2026-2027   | ${credible_interval(2026, "African American")} | ${credible_interval(2026, "Hispanic")} | ${credible_interval(2026, "white")} | ${credible_interval(2026, "other")} |
| 2027-2028   | ${credible_interval(2027, "African American")} | ${credible_interval(2027, "Hispanic")} | ${credible_interval(2027, "white")} | ${credible_interval(2027, "other")} |

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

Our projections are based on combining two separate projections.

First, we predict the number of students enrolled in 1st grade through 12th
grade based on the number of students enrolled in kindergarten through 11th
grade in the prior year. In the literature on school enrollment projections,
this is called the
[grade progression rate method](https://nces.ed.gov/programs/projections/projections2021/app_a1.asp).

Second, we predict the number of students that will enroll in kindergarten based
on the number of babies born to Chicago residents five-years prior. This is the
called the
[enrollment rate method](https://nces.ed.gov/programs/projections/projections2021/app_a1.asp).

For example, for the ${latest_enrollment_year + 1}-${latest_enrollment_year + 2}
school year, we predict the number of 5th graders based on the number of 4th
graders who were actually enrolled in the
${latest_enrollment_year}-${latest_enrollment_year + 1} school year. In order to
make that prediction we need to choose a rate at which 4th graders will turn
into 5th graders. For every demographic group, we calculate the historical
transitions rates for every year-pair we can, and then we choose one of the
historical rates at random. We do this for every grade from 1st through 12th.

Then, for kindergarten, we predict the number of kindergartners who will enroll
by taking the number of babies born in ${latest_enrollment_year + 1 - 5}, five
years prior to the projected year; and then multiplying that count by an
enrollment rate. We similarly choose a historical enrollment rate at random.

That gives us a projection for all the grades K-12 for the
${latest_enrollment_year + 1}-${latest_enrollment_year + 2} school year. In
order to make a projection for the ${latest_enrollment_year +
2}-${latest_enrollment_year + 3} school year, we apply the grade progression
rate method to our ${latest_enrollment_year + 1}-${latest_enrollment_year + 2}
projection and the enrollment rate method for the ${latest_enrollment_year +
2}-${latest_enrollment_year + 3} kindergarten class.

We keep stepping forward like this through until our final projection year.

This gives us **one** projection trajectory. We then repeat the process
${replicates.toLocaleString()} times to get many projection trajectories. This
provides us a range of possible outcomes.

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

## Forecast Accuracy

For each year that we make forecasts, we will record the actual total enrollment
.

### July 2022 Forecast

| school year | projected enrollment (95% credible interval) | actual enrollment |
| ----------- | -------------------------------------------- | ----------------- |
| 2022-2023   | 296,000—307,000                              | 305,703           |
| 2023-2024   | 283,000—297,000                              | 305,662           |
| 2024-2025   | 272,000—288,000                              | 307,412           |
| 2025-2026   | 262,000—279,000                              |                   |

### July 2023 Forecast

| school year | projected enrollment (95% credible interval) | actual enrollment |
| ----------- | -------------------------------------------- | ----------------- |
| 2023-2024   | 291,000—299,000                              | 305,662           |
| 2024-2025   | 279,000—290,000                              | 307,412           |
| 2025-2026   | 268,000—280,000                              |                   |
| 2026-2027   | 257,000—269,000                              |                   |

In 2022 and 2023, there was a significant immigration of Venezuelans and other
asylum seekers starting.

### August 2024 Forecast

| school year | projected enrollment (95% credible interval) | actual enrollment |
| ----------- | -------------------------------------------- | ----------------- |
| 2024-2025   | 289,000—302,000                              | 307,412           |
| 2025-2026   | 276,000—293,000                              |                   |
| 2026-2027   | 264,000—283,000                              |                   |
| 2027-2028   | 253,000—274,000                              |                   |

## Bootstrap

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
    ...total_bootstrap,
  ];
})();
```

```js
const total_bootstrap = (() => {
  const all_student_bootstrap = d3
    .flatRollup(
      grade_bootstrap,
      (v) => d3.sum(v, (d) => d.count),
      (d) => d.year,
      (d) => d.iteration,
    )
    .map(([year, iteration, count]) => ({
      year,
      race: "Total",
      iteration,
      count,
    }));

  const race_bootstrap = d3
    .flatRollup(
      grade_bootstrap,
      (v) => d3.sum(v, (d) => d.count),
      (d) => d.year,
      (d) => d.race,
      (d) => d.iteration,
    )
    .map(([year, race, iteration, count]) => ({
      year,
      race,
      iteration,
      count,
    }));

  return d3
    .flatGroup(
      [...race_bootstrap, ...all_student_bootstrap],
      (d) => d.year,
      (d) => d.race,
    )
    .map(([year, race, draws]) => ({
      year,
      race,
      count: d3.mean(draws.map((d) => d.count)),
      stdev: d3.deviation(draws.map((d) => d.count)),
      type: "projection",
    }));
})();
```

```js
const grade_bootstrap = (() => {
  let bootstrap = [];
  for (const i of d3.range(replicates)) {
    // use the last year of cps enrollment data as the base year for
    // forecasts
    let previous_year = grade_data.filter(
      (d) => d.year === latest_enrollment_year && d.race !== "Total",
    );
    for (const projected_year of d3.range(
      latest_enrollment_year + 1,
      latest_birth_year + 5 + 1,
    )) {
      const grade_bootstrap = previous_year
        .map((d) => ({
          iteration: i,
          year: projected_year,
          race: d.race,
          grade: d.grade + 1,
          count: d.count * draw_grade_transition(d.grade, d.race),
        }))
        .flat()
        .filter((d) => d.count);
      const kindergarten_bootstrap = birth_data
        .filter((birth) => birth.year === projected_year - 5)
        .map((birth) => ({
          iteration: i,
          year: projected_year,
          race: birth.race,
          grade: 0,
          count: birth.count * draw_kindergarten_transition(birth.race),
        }));
      if (kindergarten_bootstrap.length < 4) {
        throw `Don't have enough data on births for ${projected_year - 5}`;
      }
      const projection = [...grade_bootstrap, ...kindergarten_bootstrap];
      bootstrap = [...bootstrap, ...projection];
      previous_year = projection;
    }
  }
  return bootstrap;
})();
```

```js
const draw_grade_transition = (grade, race) => {
  const transitions = grade_transitions.get(grade)?.get(race);
  if (transitions) {
    const weights = sampling_weights(transitions.length);
    return weighted_sample(weights, transitions);
  }
};
```

```js
const grade_transitions = (() => {
  const transitions = d3.group(
    grade_lag,
    (d) => d.grade,
    (d) => d.race,
  );
  for (const [grade, map] of transitions) {
    for (const [race, lags] of map) {
      map.set(
        race,
        lags.map((d) => d.y / d.x),
      );
    }
  }
  return transitions;
})();
```

```js
const grade_lag = grade_data
  .map((d) => ({
    grade: d.grade,
    race: d.race,
    year: d.year,
    x: d.count,
    y: grade_data.find(
      (e) =>
        e.year === d.year + 1 && e.grade === d.grade + 1 && e.race === d.race,
    )?.count,
  }))
  .filter((f) => f.y)
  .sort((a, b) => d3.ascending(a.year, b.year));
```

```js
const draw_kindergarten_transition = (race) => {
  const transitions = birth_kindergarten_transitions.get(race);
  if (transitions) {
    const weights = sampling_weights(transitions.length);
    return weighted_sample(weights, transitions);
  }
};
```

```js
const birth_kindergarten_transitions = (() => {
  const transitions = d3.group(birth_lag, (d) => d.race);
  for (const [key, value] of transitions) {
    transitions.set(
      key,
      value.map((d) => d.y / d.x),
    );
  }
  return transitions;
})();
```

```js
const birth_lag = birth_data
  .map((birth) => ({
    year: birth.year,
    race: birth.race,
    x: birth.count,
    y: grade_data.find(
      (e) =>
        e.year === birth.year + 5 && e.race === birth.race && e.grade === 0,
    )?.count,
  }))
  .filter((d) => d.y)
  .sort((a, b) => d3.ascending(a.year, b.year));
```

```js
const sampling_weights = (N) => {
  const weights = d3.range(1, N + 1).map((i) => 2.5 ** i);
  const C = d3.sum(weights);
  return weights.map((i) => i / C);
};
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
from a number source. See
[this notebook for details on sources](https://observablehq.com/@fgregg/chicago-births-2009-2020).

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

```js
// Inlined from @nstrayer/javascript-statistics-snippets.
function weighted_sample(weights, values) {
  const random_val = Math.random();
  let cumulative_prob = 0,
    i;
  for (i = 0; i < weights.length; i++) {
    cumulative_prob += weights[i];
    if (cumulative_prob > random_val) break;
  }
  return values ? values[i] : i;
}
```
