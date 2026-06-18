---
title: Chicago Policing Force Size and Budgets
author: Forest Gregg
layout: post
date: 2024-11-26
description: Sworn-officer counts, per-capita budgets, and index crimes for the Chicago Police Department over time.
reactive: true
---

I've compiled [data on historic budgets and force sizes](https://docs.google.com/spreadsheets/d/1kC_G7Qa1WyzKIl8JvmfrNMw0mNcNOQOOeP-qKYhq6QA/edit#gid=0) for the Chicago police department, as well as data on the population of Chicago and index crimes.

# Force size

The number of sworn-officers per year, i.e. the number of CPD employees who are licensed law enforcement officers with the power to arrest.

```js
display(
  Plot.plot({
    title: "Force size",
    y: { tickFormat: "s", grid: true },
    x: { label: "year" },
    marks: [
      Plot.ruleY([7000]),
      Plot.line(
        data.filter((d) => d["sworn officers"]),
        {
          x: (d) => new Date(d.year, 5),
          y: "sworn officers",
          tip: { format: { x: (d) => d.getFullYear() } },
        },
      ),
    ],
  }),
);
```

```js
display(
  Plot.plot({
    title: "Sworn officers per capita",
    y: { label: "sworn officer per 1,000 Chicagoans", grid: true },
    x: { label: "year" },
    marks: [
      Plot.ruleY([0]),
      Plot.line(
        data.filter((d) => d["chicago population"]),
        {
          x: (d) => new Date(d.year, 5),
          y: (d) => (d["sworn officers"] * 1000) / d["chicago population"],
          tip: { format: { x: (d) => d.getFullYear() } },
        },
      ),
    ],
  }),
);
```

# Index Crimes by Sworn officers

Index crimes are a standardized classification of crimes that [police departments voluntarily report to the FBI](https://en.wikipedia.org/wiki/Uniform_Crime_Reports). We use the total number of index crimes here, except rape which was redefined as a category during this period.

```js
display(
  Plot.plot({
    title: "Index Crimes by Sworn Officer (not including rape)",
    y: { label: "index crimes per sworn officer", grid: true },
    x: { label: "year" },
    marks: [
      Plot.ruleY([0]),
      Plot.line(
        data.filter((d) => d["total index crimes - rape"]),
        {
          x: (d) => new Date(d.year, 5),
          y: (d) => d["total index crimes - rape"] / d["sworn officers"],
          tip: { format: { x: (d) => d.getFullYear() } },
        },
      ),
    ],
  }),
);
```

# Appropriated Budget

This shows the appropriated budget for the Chicago police department. Another interesting measure would be actual spending.

```js
display(
  Plot.plot({
    title: "Chicago Police Department Appropriations, 2023 dollars",
    marginLeft: 100,
    y: { label: "Appropriations", tickFormat: "$,r", grid: true },
    x: { label: "year" },
    marks: [
      Plot.ruleY([0]),
      Plot.line(
        data.filter((d) => d["Appropriations, 2023 Dollars"]),
        {
          x: (d) => new Date(d.year, 5),
          y: (d) =>
            parseFloat(d["Appropriations, 2023 Dollars"].replace(/[$,]/g, "")),
          tip: {
            format: {
              x: (d) => d.getFullYear(),
              y: (d) => `$${d3.format("0.3s")(d).replace("G", "B")}`,
            },
          },
        },
      ),
    ],
  }),
);
```

```js
display(
  Plot.plot({
    title: "Appropriated Budget for Chicago Police per Capita, 2023 Dollars",
    y: { label: "Appropriations per capita", tickFormat: "$,r", grid: true },
    x: { label: "year" },
    marks: [
      Plot.ruleY([0]),
      Plot.line(
        data.filter(
          (d) => d["Appropriations, 2023 Dollars"] && d["chicago population"],
        ),
        {
          x: (d) => new Date(d.year, 5),
          y: (d) =>
            parseFloat(d["Appropriations, 2023 Dollars"].replace(/[$,]/g, "")) /
            d["chicago population"],
          tip: {
            format: {
              x: (d) => d.getFullYear(),
              y: (d) => `$${d3.format("0.3s")(d).replace("G", "B")}`,
            },
          },
        },
      ),
    ],
  }),
);
```

```js
display(
  Plot.plot({
    title:
      "Chicago Police Department Appropriations per reported index crime, 2023 dollars",
    marginLeft: 50,
    y: {
      label: "Appropriations per index crime",
      tickFormat: "$,r",
      grid: true,
    },
    x: { label: "year" },
    marks: [
      Plot.ruleY([0]),
      Plot.line(
        data.filter((d) => d["Appropriations, 2023 Dollars"]),
        {
          x: (d) => new Date(d.year, 5),
          y: (d) =>
            parseFloat(d["Appropriations, 2023 Dollars"].replace(/[$,]/g, "")) /
            d["total index crimes - rape"],
          tip: {
            format: {
              x: (d) => d.getFullYear(),
              y: (d) => `$${d3.format("0.3s")(d).replace("G", "B")}`,
            },
          },
        },
      ),
    ],
  }),
);
```

```js
display(
  Plot.plot({
    title: "Total Index Crimes",
    marginLeft: 50,
    y: { label: "index crime - rape", grid: true },
    x: { label: "year" },
    marks: [
      Plot.ruleY([0]),
      Plot.line(
        data.filter((d) => d["Appropriations, 2023 Dollars"]),
        {
          x: (d) => new Date(d.year, 5),
          y: "total index crimes - rape",
          tip: { format: { x: (d) => d.getFullYear() } },
        },
      ),
    ],
  }),
);
```

```js
const data = d3.csv(
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQIl2G64ISwGQaiN9zcN3ayGynBiast8f_QF7BVJEIa9Llsjd9L1UBQ57zpJIK1GKtO_JPKpa_drpIB/pub?output=csv",
  d3.autoType,
);
```
