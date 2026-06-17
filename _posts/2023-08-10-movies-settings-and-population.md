---
title: Movie settings and population
author: Forest Gregg
layout: post
date: 2023-08-10
description: How many movies are set in each U.S. city, compared to its population — from Wikidata.
reactive: true
---

What is the relation between how big a city is and how many movies are set in that city?

The cities above the black line are the settings for more movies than would be expected for their population. The cities below are the settings for fewer movies than expected.

Hover over a dot to see the city's details.

The data comes from mighty [wikidata](https://www.wikidata.org/wiki/Wikidata:Main_Page).

```js
display(
Plot.plot({
  x: {
    nice: true,
    ticks: 20,
    tickFormat: (d) =>
      d === Math.floor(d) ? d3.format("~s")(Math.pow(10, d)) : "•",
    label: "population (log scale) →"
  },
  y: {
    nice: true,
    ticks: 20,
    tickFormat: (d) =>
      d === Math.floor(d) ? d3.format("~s")(Math.pow(10, d)) : "•",
    label: "movies (log scale) →"
  },
  marks: [
    Plot.dot(data, {
      x: (d) => Math.log10(d.population),
      y: (d) => Math.log10(d.movies)
    }),
    Plot.linearRegressionY(data, {
      x: (d) => Math.log10(d.population),
      y: (d) => Math.log10(d.movies)
    }),
    Plot.tip(
      data,
      Plot.pointer({
        x: (d) => Math.log10(d.population),
        y: (d) => Math.log10(d.movies),
        title: (d) =>
          `${
            d.city
          }\npop: ${d.population.toLocaleString()}\nmovies: ${d.movies.toLocaleString()}`
      })
    )
  ]
})
);
```

```js
// Materialize the small set of film-setting places in a sub-SELECT first (so
// the planner doesn't try the city-subclass walk over all of Wikidata), pull
// the English label via the label SERVICE rather than rdfs:label + a LANG
// filter (which otherwise fans out to every language), and DISTINCT away the
// multiplicity from the P279* path. Runs in ~5s vs. timing out. See
// https://bunkum.us — the slow original used GROUP BY over rdfs:label.
const sparql = `SELECT DISTINCT ?placeLabel ?population ?movieCount WHERE {
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
  { headers: { accept: "application/sparql-results+json" } }
).then((response) => response.json());
```

```js
const data = query_data.results.bindings
  .map((d) => ({
    city: d.placeLabel.value,
    population: Number(d.population.value),
    movies: Number(d.movieCount.value)
  }))
  .filter((d) => d.movies > 1);
```

