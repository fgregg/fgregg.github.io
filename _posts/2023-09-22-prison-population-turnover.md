---
title: Prison Population Turnover
author: Forest Gregg
layout: post
date: 2023-09-22
description: How fast Illinois's prison population turns over, and what that implies for collecting incarcerated people's home addresses ahead of the 2030 redistricting.
reactive: true
---

```js
display(md`Due to the No Representation Without Population Act, the 2030 redistricting for the Illinois state legislature and congressional representatives will use population data that has been adjusted to count incarcerated people at their home addresses instead of at places they are imprisoned.

Producing this adjusted population data will require accurate information on the home addresses of incarcerated people. There are two main ways that this address information can be made more accurate. First, the address information for people currently incarcerated can be improved. Second, the collection of addresses from counties when people are sentenced to prison can be made better.

Which tactic will be more effective depends upon the rate of turnover of the prison population. We judge that it is plausible that on April 4, 2030, incarcerated people who will have entered between now and census day will be about 60% of the incarcerated population, and 50% of people sentenced from Cook County. This probably means that both a county and IDOC strategy is required.

## Analysis

As of September 21, 2023, there are about 6.5 years until the next census day, April 4, 2023. We would like a reasonable guess of the proportion of people incarcerated in IDOC prisons on census day who will have entered prison after September 21, 2023 and so could be affected by improved intake procedures.

If the proportion is high, then it might make sense to focus on improving collection of the home address information from counties when people are sentenced to IDOC prisons. If the proportion is low, then we should focus on getting accurate home addres information of people already incarcerated.

One way to get a sense of the future is to look at historical trends. Specifically, in past years, what proportion of the incarcerated population had been admitted to prison in the previous 6.5 years?

As of June 30, 2023, ${less_than_seven.find((d) => d.date.getTime() === new Date("2023-06-30").getTime()).all.toLocaleString(undefined, { style: "percent" })} of all incarcerated people had been admitted in the previous 6.5 years, and ${less_than_seven.find((d) => d.date.getTime() === new Date("2023-06-30").getTime()).cook.toLocaleString(undefined, { style: "percent" })} of people sentenced from Cook County ([Prison Population Data Sets](https://idoc.illinois.gov/reportsandstatistics/prison-population-data-sets.html)).`);
```

```js
display(
  Plot.plot({
    color: { legend: true },
    y: { label: "Admitted in previous 6.5 years (%)", percent: true },
    marks: [
      Plot.line(less_than_seven, { x: "date", y: "all", stroke: (d) => "all" }),
      Plot.line(less_than_seven, { x: "date", y: "cook", stroke: (d) => "cook" }),
    ],
  }),
);
```

In previous years these proportions were much higher, but the rapid decrease of incarceration has changed the mix of incarcerated people so there are relatively more people with very long sentences.

It's hard to forecast those trends into the future, but it seems plausible that by April 4, 2030 the incarcerated people who will have entered in previous 6.5 years will be about 60%, and 50% for people sentenced from Cook County.

This would suggest a mixed strategy for improving home address information.

```js
// Data re-hosted from the original Observable FileAttachment.
const less_than_seven = (async () => {
  const raw = await fetch(
    "/assets/data/prison-population-turnover/less_than_seven.json",
  ).then((r) => r.json());
  return raw.map((d) => ({ ...d, date: new Date(d.date) }));
})();
```
