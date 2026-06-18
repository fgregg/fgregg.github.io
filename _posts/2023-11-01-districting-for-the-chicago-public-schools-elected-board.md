---
title: Districting for the Chicago Public Schools elected board
author: Forest Gregg
layout: post
date: 2023-11-01
description: Evaluating draft district maps for the elected Chicago Public Schools board against legal requirements and minority-preferred-candidate outcomes.
reactive: cellular
---

The Illinois legislature has to approve electoral districts for the 2024 and 2026 elections for Chicago Public Schools board members. By 2026, Chicago voters will have chosen 20 board members based on those districts, along with one at-large chair.

The [FOIA Bakery has put forward principles](https://docs.google.com/document/d/1nc5OeXYkdR_v3YZs0vY10QjRFxWnlC73PdIiy6RXBOM/edit) we believe  should guide the districting. These include:

1. The districts must comply with state and federal law.
2. The 10-district plan should be built from the 20-district plan.
3. The districts should contain substantially similar number of public school students

The first condition is compliance with the law, and creating districting plans that fully comply with the federal Voting Rights Act is challenging.

In this article we propose a family of 20-district maps that all have eleven minority-effective districts. These maps improve upon the October 31, 2023 draft plan put forth by the General Assembly committees on board districting. That draft plan included only eight minority-effective districts.

Eleven districts are not sufficient. We urge the legislature to improve upon our results and release a just and legal plan.

All other considerations must wait until this primary requirement is satisfied.

## Legal Requirements 
The [state law establishing the elected school board](https://www.ilga.gov/legislation/ilcs/ilcs4.asp?DocName=010500050HArt%2E+34&ActID=1005&ChapterID=17&SeqStart=199200000&SeqEnd=227400000) requires that the districts be:

* compact,
* contiguous,
* substantially equal in population
* and consistent with the Illinois Voting Rights Act.

Additionally, elected school boards are subject to the federal Voting Rights Act.

The contiguous and substantially equal population criterion are the most straightforward. While it is not specified in the law, courts have clarified that the full residential population as enumerated in the decennial federal census should be the preferred source for population measurements.

The compact criteria is not well defined and, in practice, allows wide latitude.

The most challenging and typically contested criteria is compliance with the Voting Rights Act.

### Minority-Preferred Candidates 

The federal Voting Rights Act and subsequent litigation motivates the drawing of electoral districts where minority groups have a good chance of electing their preferred candidates.

The [2023 general election is informative for this purpose](https://observablehq.com/@fgregg/ecological-inference-of-racial-and-ethnic-votes-for-candid). Lori Lightfoot was the strongly favored candidate of African Americans voters and Jesus “Chuy” Garcia was the strongly favored candidate for Latino voters. Neither candidate received much support from other racial or ethnic groups. 

Despite decisive support from Black voters in the subsequent runoff election against Paul Vallas, Brandon Johnson was only the third most popular choice for Black voters in the general election. In that first election, he received strong support only from white voters.

We will evaluate districting plans on how many districts they contain that would have been effective in electing a minority-preferred candidate. Concretely, we count the number of districts in which either Lightfoot or Garcia would have received more votes than all other candidates.

## October 31, 2023 Draft Plan

On October 31, the Senate and House committees working on districting for the elected board released their third draft plan of 20 districts.

```js
display(
Plot.plot({
  projection: { type: "mercator", domain: rewind(may_17_draft_plan) },
  marks: [
    Plot.geo(rewind(may_17_draft_plan), {
      fill: (d) =>
        may_17_winners.find((e) => e.district_name === d.properties.Name)
          .candidate,
      stroke: "white"
    })
  ],
  color: {
    type: "categorical",
    legend: true,
    scheme: "Set2"
  }
})
);
```

The plan only has seven districts where the minority-preferred candidate would have received the most votes: six effective districts for African Americans, and one district for Latinos. Their May 17 plan had two Latino-effective districts.

If this measure of effectiveness is predictive of electoral outcomes, then white Chicagoans would pick 65% of the board seats, Black Chicagoans would pick 30% of the seats, and Latino Chicagoans would pick 5%.

White people make up 33% of Chicago’s population, Black people are 29%, and Latinos are 29%.

Chicago public school students are 11% white, 36% Black, and 47% Latino.

Besides being inequitable, a districting plan that only had seven minority districts and only one Latino district would invite close scrutiny under the Voting Rights Act.

In the next section, we propose a family of maps that have much better effectiveness for minority-preferred candidates.

### October 31 Plan Data

```js
display(table(may_17_draft_plan_data));
```

## Computer Generated Plans

We [wrote a program](https://github.com/fgregg/elected-school-board-maps) to try to find plans with the largest number of minority-effective districts. The program was able to find plans with 11 such districts.

These plans would either contain 3 to 4 plans for Latino effective districts (Garcia) and 7 to 8 plans for African American effective districts (Lightfoot).

Finally, we generated a thousand variations of these plans.

Each plan is built from the precincts used in the 2023 general election, each district is contiguous, and each has a deviation from ideal population of not more than 3%. Each plan has 11 minority-effective districts.

```js
const planRange = Inputs.range(
  [Math.min(...mapIds) / 10, Math.max(...mapIds) / 10],
  {
    step: 1,
    label: "Plan Number",
    value: choice(mapIds) / 10
  }
);
```

```js
const plan_number = view(planRange);
```

```js
display(
Inputs.button([
  ["Random Map", () => set(planRange, choice(mapIds) / 10)]
])
);
```

### Plan ${plan_number}

```js
display(
Plot.plot({
  projection: { type: "mercator", domain: rewind(district_borders) },
  marks: [
    Plot.geo(rewind(district_borders), {
      fill: (d) =>
        district_winners.find((e) => e.district == d.properties.district)
          .candidate,
      stroke: "white"
    })
  ],
  color: {
    legend: true,
    type: "categorical",
    scheme: "Set2"
  }
})
);
```

```js
display(
button(district_borders, `plan_${plan_number}.geojson`)
);
```

### Plan ${plan_number} data

```js
display(table(district_data));
```

## Conclusion

Eleven minority-effective districts is not enough.

If we, as amateurs, have been able to substantially improve upon the minority-effectiveness of districting for the elected board of the Chicago Public Schools, we hope that the skilled and professional mapmakers of the Illinois legislature can improve minority-representation even more. We urge them to do so.

## Caveats

1. Our analysis depends heavily on the 2023 election being informative of future voting patterns. It would be good to extend our measure of effectiveness to include previous election patterns.
2. The building blocks for our maps are electoral precincts. Our estimates of population per precinct is based on assigning block-level census data to precincts. Sometimes blocks don't neatly nest into precincts which means that there will be some error in calculating precinct population.

## Substantially Similar Number of Public School Students

In our view, ten minority-effective districts are not adequate and may be open to a Voting Rights Act challenge. We think it is premature to try to optimize districts for substantially similar number of public school students—our third principle.

## Acknowledgements

This article builds heavily upon the work of the [Metric Geometry and Gerrymandering Group](https://mggg.org/), particularly their [gerrychain software](https://github.com/mggg/gerrychain) and their paper ["Computational Redistricting and the Voting Rights Act"](https://mggg.org/publications/VRA-Ensembles.pdf).

```js
const district_borders = turfjs.dissolve(districts, { propertyName: "district" });
```

```js
const district_winners = district_data
  .map(
    ({
      "Paul Vallas": vallas,
      'Jesus "Chuy" Garcia': garcia,
      "Lori Lightfoot": lightfoot,
      "Brandon Johnson": johnson,
      district
    }) => ({
      district,
      ...Object.entries({ garcia, vallas, lightfoot, johnson }).reduce((a, b) =>
        b[1] > a[1] ? b : a
      )
    })
  )
  .map((d) => ({
    district: d.district,
    candidate: new Set(["vallas", "johnson"]).has(d[0])
      ? "vallas/johnson"
      : d[0],
    votes: d[1]
  }));
```

```js
const district_data = (() => {
  const ids = [...Array(20).keys()];
  return ids.map((i) => ({
    district: i,
    popululation: fields.p1_001n.get(i),
    "public school students": fields.school_age_public.get(i),
    "total CVAP": fields.total_cvap.get(i),
    "Black CVAP %": fields.black_cvap.get(i) / fields.total_cvap.get(i),
    "Latino CVAP %": fields.latino_cvap.get(i) / fields.total_cvap.get(i),
    "white CVAP %": fields.white_cvap.get(i) / fields.total_cvap.get(i),
    "Asian CVAP %": fields.asian_cvap.get(i) / fields.total_cvap.get(i),
    'Jesus "Chuy" Garcia': fields['jesus "chuy" garcia'].get(i),
    "Paul Vallas": fields["paul vallas"].get(i),
    "Lori Lightfoot": fields["lori e. lightfoot"].get(i),
    "Brandon Johnson": fields["brandon johnson"].get(i)
  }));
})();
```

```js
const fields = Object.fromEntries(
  [
    "p1_001n",
    "school_age_public",
    "total_cvap",
    "black_cvap",
    "white_cvap",
    "latino_cvap",
    "asian_cvap",
    "paul vallas",
    "lori e. lightfoot",
    "brandon johnson",
    'jesus "chuy" garcia'
  ].map((f) => [f, rollup(f)])
);
```

```js
const rollup = (property) =>
  d3.rollup(
    districts.features,
    (v) => d3.sum(v, (d) => d.properties[property]),
    (d) => d.properties.district
  );
```

```js
const districts = (() => {
  precincts.features.map(
    (d) =>
      (d.properties.district = assignment_hash.get(d.properties.precinct_id)?.[
        plan_number * 10
      ])
  );
  return precincts;
})();
```

```js
const may_17_winners = may_17_draft_plan_data
  .map(({ district_name, vallas, garcia, lightfoot, johnson }) => ({
    district_name,
    ...Object.entries({ garcia, vallas, lightfoot, johnson }).reduce((a, b) =>
      b[1] > a[1] ? b : a
    )
  }))
  .map((d) => ({
    district_name: d.district_name,
    candidate: d[0],
    votes: d[1]
  }));
```

```js
const mapIds = Object.keys(assignments[0])
  .filter((d) => d !== "block")
  .map((d) => parseInt(d));
```

```js
const assignment_hash = new Map(assignments.map((d) => [d.block, d]));
```

```js
const assignments = d3.csv("/assets/data/districting/assignments.csv", d3.autoType);
```

```js
const precincts = topojson.feature(precincts_topo, precincts_topo.objects.blocks);
```

```js
const precincts_topo = fetch("/assets/data/districting/blocks.topojson").then((r) => r.json());
```

```js
const may_17_draft_plan = fetch("/assets/data/districting/oct_31_draft_plan.geojson").then((r) => r.json());
```

```js
const choice = (arr) => {
  return arr[Math.floor(Math.random() * arr.length)];
};
```

```js
const button = (data, filename = "data.json") => {
  if (!data) throw new Error("Array of data required as first argument");

  const downloadData = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json"
  });

  const size = (downloadData.size / 1024).toFixed(0);
  const button = DOM.download(
    downloadData,
    filename,
    `Download ${filename} (~${size} KB)`
  );
  return button;
};
```

```js
function set(input, value) {
  input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
}
```

```js
const turfjs = await import("https://esm.sh/@turf/turf@7");
```

```js
// topojson-client via CDN (Observable provided it as a stdlib builtin).
const topojson = await import("https://esm.sh/topojson-client@3");
```

```js
// Tom MacWright's table component, vendored in the reactive runtime build.
const table = (await import("/assets/js/toms-table.js")).default;
```

```js
// Inlined from @fil/rewind: fix GeoJSON winding so d3/Plot's spherical
// projection doesn't invert large polygons into a filled globe.
function rewind(duck, simple) {
  return duck?.stream
    ? geoRewindProjection(duck, simple)
    : duck?.type
      ? geoRewindFeature(duck, simple)
      : Array.isArray(duck)
        ? Array.from(duck, (d) => rewind(d, simple))
        : duck;
}
```

```js
const geoRewindFeature = (feature, simple) =>
  geoProjectSimple(feature, geoRewindStream(simple));
```

```js
const geoRewindProjection = (projection, simple) => {
  const { stream: normalize } = geoRewindStream(simple);
  return { stream: (s) => normalize(projection.stream(s)) };
};
```

```js
function geoRewindStream(simple = true) {
  const { geoContains, geoArea } = d3;
  let ring, polygon;
  return d3.geoTransform({
    polygonStart() { this.stream.polygonStart(); polygon = []; },
    lineStart() { if (polygon) polygon.push((ring = [])); else this.stream.lineStart(); },
    lineEnd() { if (!polygon) this.stream.lineEnd(); },
    point(x, y) { if (polygon) ring.push([x, y]); else this.stream.point(x, y); },
    polygonEnd() {
      for (let [i, ring] of polygon.entries()) {
        ring.push(ring[0].slice());
        if (
          i
            ? !geoContains({ type: "Polygon", coordinates: [ring] }, polygon[0][0])
            : polygon[1]
              ? !geoContains({ type: "Polygon", coordinates: [ring] }, polygon[1][0])
              : simple && geoArea({ type: "Polygon", coordinates: [ring] }) > 2 * Math.PI
        ) ring.reverse();
        this.stream.lineStart();
        ring.pop();
        for (const [x, y] of ring) this.stream.point(x, y);
        this.stream.lineEnd();
      }
      this.stream.polygonEnd();
      polygon = null;
    },
  });
}
```

```js
const geoProjectSimple = (() => {
  const { geoStream } = d3;
  function projectFeatureCollection(o, stream) {
    return { ...o, features: o.features.map((f) => projectFeature(f, stream)) };
  }
  function projectFeature(o, stream) {
    return { ...o, geometry: projectGeometry(o.geometry, stream) };
  }
  function projectGeometryCollection(o, stream) {
    return { ...o, geometries: o.geometries.map((g) => projectGeometry(g, stream)) };
  }
  function projectGeometry(o, stream) {
    return !o ? null
      : o.type === "GeometryCollection" ? projectGeometryCollection(o, stream)
      : o.type === "Polygon" || o.type === "MultiPolygon" ? projectPolygons(o, stream)
      : o;
  }
  function projectPolygons(o, stream) {
    let coordinates = [];
    let polygon, line;
    geoStream(o, stream({
      polygonStart() { coordinates.push((polygon = [])); },
      polygonEnd() {},
      lineStart() { polygon.push((line = [])); },
      lineEnd() { line.push(line[0].slice()); },
      point(x, y) { line.push([x, y]); },
    }));
    if (o.type === "Polygon") coordinates = coordinates[0];
    return { ...o, coordinates, rewind: true };
  }
  return function (object, projection) {
    const stream = projection.stream;
    if (!stream) throw new Error("invalid projection");
    const project =
      object && object.type === "Feature" ? projectFeature
      : object && object.type === "FeatureCollection" ? projectFeatureCollection
      : projectGeometry;
    return project(object, stream);
  };
})();
```

```js
// The named Data-table cell "may_17_draft_plan_data": the Oct 31 plan's
// per-district figures, re-hosted from the original FileAttachment.
const may_17_draft_plan_data = await d3.csv(
  "/assets/data/districting/oct_31_draft_plan.csv",
  d3.autoType,
);
```

