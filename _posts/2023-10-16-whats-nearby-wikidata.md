---
title: what's nearby, wikidata?
author: Forest Gregg
layout: post
date: 2023-10-16
description: Lists wikidata entries with wikipedia pages near you.
reactive: true
---

A [Wikidata](https://www.wikidata.org/wiki/Wikidata:Main_Page) sibling of [Wikipedia:Nearby](https://en.wikipedia.org/wiki/Wikipedia:Nearby).

```js
const radius = view(Inputs.range([0.25, 50], {
  label: "Radius (miles)",
  step: 0.25,
  value: 10
}));
```

```js
const refresh = view(Inputs.button("refresh"));
```

```js
display(md`${data_list}`);
```

```js
const coords = refresh
  ? new Promise((resolve, reject) => {
      if (navigator.geolocation)
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve(pos.coords),
          (err) => reject(Error(err.message))
        );
      else reject(Error("this browser does not support geolocation."));
    })
  : new Promise((resolve, reject) => {
      if (navigator.geolocation)
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve(pos.coords),
          (err) => reject(Error(err.message))
        );
      else reject(Error("this browser does not support geolocation."));
    });
```

```js
const sparql = `SELECT DISTINCT ?item ?itemLabel ?article WHERE {
  SERVICE wikibase:around {
    ?item wdt:P625 ?location.
    bd:serviceParam wikibase:center "Point(${coords.longitude} ${
  coords.latitude
})"^^geo:wktLiteral;
      wikibase:radius "${radius * 1.60934}";
      wikibase:distance ?distance.
  }
  ?article schema:about ?item ; schema:isPartOf <https://en.wikipedia.org/> .
  # Label only the final nearby items, not every coordinate in the radius.
  SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en". }
}
ORDER BY (?distance)
`;
```

```js
const raw_data = fetch(
  `https://query.wikidata.org/sparql?query=${encodeURIComponent(sparql)}`,
  { headers: { accept: "application/sparql-results+json" } }
).then((response) => response.json());
```

```js
const data = raw_data
  ? raw_data.results.bindings.map((d) => ({
      item: d.itemLabel.value,
      article_url: d.article.value
    }))
  : [];
```

```js
const data_list = data
  .map((d) => `* <a href="${d.article_url}">${d.item}</a>`)
  .join("\n");
```

