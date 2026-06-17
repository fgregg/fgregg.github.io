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
const sparql = `SELECT ?placeLabel ?population (COUNT(?movie) as ?movieCount)
WHERE {
  ?movie wdt:P31 wd:Q11424 ;   # Instance of: film
        wdt:P840 ?place .      # Place of setting: P840
  
  ?place wdt:P17 wd:Q30 ;      # Country: United States of America (Q30)
         wdt:P31/wdt:P279* wd:Q515 ;
         rdfs:label ?placeLabel ;
         wdt:P1082 ?population .  # Population: P1082
  
  FILTER(LANG(?placeLabel) = "en")
}
GROUP BY ?placeLabel ?population
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

