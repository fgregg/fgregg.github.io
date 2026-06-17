---
title: Movie settings and population
author: Forest Gregg
layout: post
date: 2023-08-10
description: How many movies are set in each U.S. city, compared to its population — from Wikidata.
reactive: true
---

What is the relation between how big a city is and how many movies are set in
that city?

The cities above the dashed red line are the settings for more movies than would
be expected for their population. The cities below are the settings for fewer
movies than expected.

I fit a zero-truncated Poisson model to the data, the dark grey band is the band
in which we expect 50% of the data to fall and lighter gray band is the same for
75% of the data.

Hover over a dot to see the city's details.

The data comes from mighty
[wikidata](https://www.wikidata.org/wiki/Wikidata:Main_Page), with all the
biases that entails.

```js
display(
  Plot.plot({
    x: { type: "log", label: "population →", grid: true },
    y: {
      type: "log",
      label: "movies ↑",
      grid: true,
      domain: [0.8, d3.max(band_count, (d) => d.upper)],
    },
    marks: [
      Plot.areaY(
        band_count.filter((d) => d.level === "75%"),
        { x: "n", y1: "lower", y2: "upper", fill: "#e8e8e8" },
      ),
      Plot.areaY(
        band_count.filter((d) => d.level === "50%"),
        { x: "n", y1: "lower", y2: "upper", fill: "#d4d4d4" },
      ),
      Plot.line(
        band_count.filter((d) => d.level === "50%"),
        { x: "n", y: "center", stroke: "red", strokeDasharray: "4,4" },
      ),
      Plot.dot(all_data, {
        x: "population",
        y: "movies",
        tip: true,
        title: (d) =>
          `${d.city}\n${d.movies} movies, pop ${d.population.toLocaleString()}\n${((d.movies / d.population) * 1e5).toFixed(1)} per 100k`,
      }),
    ],
  }),
);
```

```js
// Count-space version of the bands: the ZT-Poisson mean μ(n) with 50% / 75%
// limits (Poisson variance × φ), no per-capita division.
const band_count = (() => {
  const { mu, phi } = model;
  const [lo, hi] = d3.extent(all_data, (d) => d.population);
  const ns = d3.range(120).map((i) => lo * Math.pow(hi / lo, i / 119));
  const at = (n, z) => {
    const m = mu(n);
    const sd = Math.sqrt(phi * m);
    return [Math.max(0.02, m - z * sd), m + z * sd];
  };
  return ns.flatMap((n) => {
    const [l50, u50] = at(n, 0.674);
    const [l75, u75] = at(n, 1.15);
    return [
      { n, center: mu(n), lower: l75, upper: u75, level: "75%" },
      { n, center: mu(n), lower: l50, upper: u50, level: "50%" },
    ];
  });
})();
```

```js
display(md`**Over-filmed for their size**

| City | Population | Movies | Expected | per 100k |
|---|--:|--:|--:|--:|
${ranked
  .slice(0, 12)
  .map(
    (d) =>
      `| ${d.city} | ${d.population.toLocaleString()} | ${d.movies} | ${d.expected.toFixed(1)} | ${d.rate.toFixed(1)} |`,
  )
  .join("\n")}
`);
```

```js
display(md`**Under-filmed for their size**

| City | Population | Movies | Expected | per 100k |
|---|--:|--:|--:|--:|
${ranked
  .slice(-12)
  .reverse()
  .map(
    (d) =>
      `| ${d.city} | ${d.population.toLocaleString()} | ${d.movies} | ${d.expected.toFixed(1)} | ${d.rate.toFixed(1)} |`,
  )
  .join("\n")}
`);
```

```js
// Rank every city by its deviance residual from the ZT-Poisson fit (scaled by
// the overdispersion). Positive = more films than its size predicts.
const ranked = (() => {
  const { mu, phi } = model;
  const dev = (y, m) =>
    Math.sign(y - m) * Math.sqrt(2 * (y * Math.log(y / m) - (y - m)));
  return all_data
    .map((d) => {
      const m = mu(d.population);
      return {
        city: d.city,
        population: d.population,
        movies: d.movies,
        expected: m,
        rate: (d.movies / d.population) * 1e5,
        resid: dev(d.movies, m) / Math.sqrt(phi),
      };
    })
    .sort((a, b) => b.resid - a.resid);
})();
```

```js
// Materialize the small set of film-setting places in a sub-SELECT first (so
// the planner doesn't try the city-subclass walk over all of Wikidata), pull
// the English label via the label SERVICE rather than rdfs:label + a LANG
// filter (which otherwise fans out to every language), and DISTINCT away the
// multiplicity from the P279* path. Runs in ~5s vs. timing out. See
// https://bunkum.us — the slow original used GROUP BY over rdfs:label.
const sparql = `SELECT DISTINCT ?place ?placeLabel ?population ?movieCount WHERE {
  {
    SELECT ?place (COUNT(?movie) AS ?movieCount) WHERE {
      ?movie wdt:P31 wd:Q11424 ;   # instance of: film
             wdt:P840 ?place .      # narrative location
    } GROUP BY ?place
  }
  ?place wdt:P17 wd:Q30 ;           # country: United States
         wdt:P31/wdt:P279* wd:Q515 ; # (a subclass of) city
         wdt:P1082 ?population .     # population
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
ORDER BY DESC(?movieCount)`;
```

```js
const query_data = fetch(
  `https://query.wikidata.org/sparql?query=${encodeURIComponent(sparql)}`,
  { headers: { accept: "application/sparql-results+json" } },
).then((response) => response.json());
```

```js
const raw_data = query_data.results.bindings.map((d) => ({
  qid: d.place.value.split("/").pop(),
  city: d.placeLabel.value,
  population: Number(d.population.value),
  movies: Number(d.movieCount.value),
}));
```

```js
// Fold the five NYC boroughs into New York City (Q60): a movie set in
// Manhattan / Brooklyn / Queens / the Bronx / Staten Island is a movie set in
// NYC. NYC's population already counts the boroughs, so only the movie counts
// are merged and the borough rows are dropped.
const all_data = (() => {
  const NYC = "Q60";
  const boroughs = new Set(["Q11299", "Q18419", "Q18424", "Q18426", "Q18432"]);
  const extra = d3.sum(
    raw_data.filter((d) => boroughs.has(d.qid)),
    (d) => d.movies,
  );
  return raw_data
    .filter((d) => !boroughs.has(d.qid))
    .map((d) => (d.qid === NYC ? { ...d, movies: d.movies + extra } : d));
})();
```

```js
// Zero-truncated Poisson regression of movies on log(population). The mean
// accounts for the unobserved zero-movie cities, so its per-capita center rises
// with size. β1 ≈ 1.6 (superlinear); φ is the Pearson overdispersion (~400×),
// carried separately to scale the bands. Fit by coordinate descent — the
// likelihood is convex, and the Poisson log(y!) term is constant in the
// coefficients so it's dropped.
const model = (() => {
  const rows = all_data;
  const xbar = d3.mean(rows, (d) => Math.log(d.population)); // center for stability
  // negative log-likelihood (up to a constant) with centered log-population
  const nll = ([a, b1]) => {
    let s = 0;
    for (const d of rows) {
      const lp = a + b1 * (Math.log(d.population) - xbar);
      const m = Math.exp(lp);
      s -= d.movies * lp - m - Math.log1p(-Math.exp(-m));
    }
    return s;
  };
  // minimize by alternating 1-D ternary searches on each coordinate
  const p = [0, 1];
  const ternary = (j) => {
    let lo = p[j] - 10,
      hi = p[j] + 10;
    for (let k = 0; k < 80; k++) {
      const a = p.slice(),
        c = p.slice();
      a[j] = lo + (hi - lo) / 3;
      c[j] = hi - (hi - lo) / 3;
      if (nll(a) < nll(c)) hi = c[j];
      else lo = a[j];
    }
    p[j] = (lo + hi) / 2;
  };
  for (let pass = 0; pass < 50; pass++) {
    ternary(0);
    ternary(1);
  }
  const b1 = p[1];
  const b0 = p[0] - b1 * xbar; // un-center the intercept
  const mu = (pop) => Math.exp(b0 + b1 * Math.log(pop));
  const phi =
    d3.sum(rows, (d) => (d.movies - mu(d.population)) ** 2 / mu(d.population)) /
    (rows.length - 2);
  return { b0, b1, phi, mu };
})();
```
