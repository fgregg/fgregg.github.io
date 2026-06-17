---
title: Trends in tier scores at CPS Selective Enrollment High Schools
author: Forest Gregg
layout: post
date: 2022-11-21
description: Trends in admission cut scores at Chicago's selective-enrollment high schools, by tier, shown as small multiples.
reactive: true
---

In 2009, the federal court supervision that required the Chicago Public Schools to work towards racial and ethnic desegregation of the district schools ended. The district then developed a policy to maintain social, economic, and racial and ethnic diversity at some of the magnet and selective enrollment high schools that the district had set up for desegregation. 

The "Tiers" policy basically scores Chicago census tracts in how economically well-off the inhabitants are. The tracts are then divided into tiers such that each tier contain the same number of school-age children. Tier 1 has the tracts with the poorest households and Tier 4 has the wealthiest households. ([More details](http://cpstiers.opencityapps.org/tier-calculation.html)).

For the selective enrollment high schools, the top academically-scoring students, within a tier, that apply to a school are admitted. Some seats are set aside for the top scoring students, regardless of their Tier.

These charts show how the average score, minimum score, and maximum score, per Tier has changed for the students admitted to the these high schools since the policy was put into place in 2010.

Since 2010, CPS has changed the way that the academic scores were calculated three times: in 2015 and in both 2021 and 2022. The scores of the incoming students are not directly comparable across these changes. (h/t to [@chris430218](https://twitter.com/chris430218/status/1524800150505398273) for letting me know that the score calculation changed from 2021 to 2022.)

The [data for this](https://docs.google.com/spreadsheets/d/1_qPr8OYuRU43aApCy0m0gQll_wNfETysVSjD_bNZWN4/edit#gid=1850105614) was compiled by [Denali Dasgupta](https://twitter.com/naxattack) and [Forest Gregg](https://mastodon.social/@fgregg).

## Tier Trends All Schools

```js
display(
facet_plot(data)
);
```

## Detail View for your choice of school

```js
const selected_school = view(Inputs.select(new Set(data.map((d) => d.SCHOOL)), {
  value: "Young",
  label: "Choose a school"
}));
```

```js
display(
facet_plot(data.filter((d) => d.SCHOOL === selected_school))
);
```

```js
const facet_plot = function (school_data) {
  // Native small-multiples wrap (the original used a patched Plot's auto-column
  // faceting): order schools by mean score and lay them out in a roughly-square
  // grid via computed facet column/row indices. Each panel is labelled by the
  // SCHOOL text mark below.
  const schools = [...new Set(school_data.map((d) => d.SCHOOL))].sort(
    (a, b) => mean_values[a] - mean_values[b],
  );
  const cols = Math.ceil(Math.sqrt(schools.length));
  const fxy = (s) => {
    const i = schools.indexOf(s);
    return [i % cols, Math.floor(i / cols)];
  };
  return Plot.plot({
    facet: {
      data: school_data,
      x: (d) => fxy(d.SCHOOL)[0],
      y: (d) => fxy(d.SCHOOL)[1]
    },
    fx: { axis: null },
    fy: { axis: null },
    x: {
      domain: [new Date("2010"), new Date("2022")]
    },
    y: {
      grid: true,
      label: "Score"
    },
    marks: [
      Plot.text(
        school_data,
        Plot.selectFirst({
          x: (d) => new Date(d.SY.toString()),
          y: "Max",
          dy: -8,
          text: "SCHOOL",
          textAnchor: "start",
          fontWeight: "bold"
        })
      ),
      Plot.text(
        school_data,
        Plot.selectLast({
          x: (d) => new Date("2022"),
          y: "Mean",
          z: "TIER",
          dx: 9,
          text: "TIER",
          textAnchor: "start",
          fontWeight: "bold"
        })
      ),
      Plot.areaY(school_data, {
        filter: (d) => d.score_regime === "Pre MAP",
        x: (d) => new Date(d.SY.toString()),
        y1: "Min",
        y2: "Max",
        z: "TIER",
        fill: "TIER",
        fillOpacity: 0.1
      }),
      Plot.line(school_data, {
        filter: (d) => d.score_regime === "Pre MAP",
        x: (d) => new Date(d.SY.toString()),
        y: "Mean",
        z: "TIER",
        stroke: "TIER"
      }),
      Plot.areaY(school_data, {
        filter: (d) => d.score_regime === "MAP",
        x: (d) => new Date(d.SY.toString()),
        y1: "Min",
        y2: "Max",
        z: "TIER",
        fill: "TIER",
        fillOpacity: 0.1
      }),
      Plot.line(school_data, {
        filter: (d) => d.score_regime === "MAP",
        x: (d) => new Date(d.SY.toString()),
        y: "Mean",
        z: "TIER",
        stroke: "TIER"
      }),
      Plot.ruleX(school_data, {
        filter: (d) => d.score_regime === "Post MAP",
        x: (d) => new Date(d.SY.toString()),
        y1: "Min",
        y2: "Max",
        z: "TIER",
        stroke: "TIER",
        strokeWidth: 5,
        strokeOpacity: 0.1
      }),
      Plot.dot(school_data, {
        filter: (d) => d.score_regime === "Post MAP",
        x: (d) => new Date(d.SY.toString()),
        y: "Mean",
        z: "TIER",
        stroke: "TIER"
      }),
      Plot.ruleX(school_data, {
        filter: (d) => d.score_regime === "No NWEA",
        x: (d) => new Date(d.SY.toString()),
        y1: "Min",
        y2: "Max",
        z: "TIER",
        stroke: "TIER",
        strokeWidth: 5,
        strokeOpacity: 0.1
      }),
      Plot.dot(school_data, {
        filter: (d) => d.score_regime === "No NWEA",
        x: (d) => new Date(d.SY.toString()),
        y: "Mean",
        z: "TIER",
        stroke: "TIER"
      })
    ]
  });
};
```

```js
const new_sehs = data.filter((d) =>
  new Set(["Lane", "South Shore", "Westinghouse", "Hancock"]).has(d.SCHOOL)
);
```

```js
const college_prep = data.filter((d) =>
  new Set(["Northside", "Payton", "Lindblom", "Jones", "King", "Brooks"]).has(
    d.SCHOOL
  )
);
```

```js
const magnets = data.filter((d) => d.SCHOOL === "Young");
```

```js
const data = d3.csv(
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTzCuWFFAyzMSoL-VzjNu88EQjuQJAiFNwVc9jSsN6sFfduksxVNeBojkE71DCOiiU0Lc0OKBWcMsbv/pub?gid=1850105614&single=true&output=csv",
  d3.autoType
);
```

```js
const d2021 = data.filter((d) => d.SY === 2021);
```

```js
const mean_values = Object.fromEntries(
  d3.rollups(
    data,
    (xs) => d3.mean(xs, (x) => x.Mean),
    (d) => d.SCHOOL
  )
);
```

