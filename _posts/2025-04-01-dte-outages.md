---
title: DTE Outages
author: Forest Gregg
layout: post
date: 2025-04-01
description: A live map of current DTE and Consumer Energy power outages across southeast Michigan, scraped hourly, with historical trends.
reactive: true
---

```js
display(md`Consumer Energy outages included for comparison.

Last updated: ${last_checked.toLocaleString()}.`);
```

```js
display(
Plot.plot({
  title: "DTE and Consumer Energy Outages",
  projection: { type: "mercator", domain: boundary },
  color: {
    type: "categorical",
    domain: ["Consumer Energy", "DTE"],
    legend: true
  },
  marks: [
    Plot.geo(counties, { strokeOpacity: 0.25 }),
    Plot.geo(boundary),
    show_storm_tracks
      ? d3
          .groups(storm_tracks, (d) => `${d.WSR_ID}:${d.CELL_ID}:${d.run_id}`)
          .map(([z, track]) =>
            Plot.line(track, {
              x: "LON",
              y: "LAT",
              stroke: "blue",
              strokeWidth: (d) => d.MAX_REFLECT - 45,
              render: function (
                index,
                scales,
                values,
                dimensions,
                context,
                next
              ) {
                const g = next(index, scales, values, dimensions, context);
                g.style.opacity = 0.05;
                return g;
              }
            })
          )
      : null,
    Plot.geo(areas, { fill: (d) => "DTE" }),
    Plot.geo(points, { r: 0.3, stroke: (d) => "DTE" }),
    Plot.geo(rewind(consumer_energy_outages), {
      fill: (d) => "Consumer Energy"
    }),
    Plot.tip(
      areas.features,
      Plot.pointer(
        Plot.geoCentroid({
          title: (d) =>
            `Affected customers: ${d.properties.desc.cust_a.val.toLocaleString()}`
        })
      )
    ),
    Plot.tip(
      rewind(consumer_energy_outages).features,
      Plot.pointer(
        Plot.geoCentroid({
          title: (d) =>
            `Affected customers: ${d.properties.CUSTOMER_COUNT.toLocaleString()}`
        })
      )
    )
  ]
})
);
```

```js
const target_date = view(Inputs.datetime({
  label: "Date and time of outages (defaults to present)",
  value: new Date()
}));
```

```js
const show_storm_tracks = view(Inputs.toggle({
  label: "Show Storm Tracks?",
  value: false
}));
```

```js
const storm_date = view(
  (() => {
    const two_days_ago = new Date();
    two_days_ago.setDate(two_days_ago.getDate() - 2);
    return Inputs.date({
      label: "Storm Date",
      value: two_days_ago,
      max: two_days_ago,
    });
  })(),
);
```

```js
display(
Plot.plot({
  title: "DTE Estimated Restoration Day for Current Outages",
  y: { grid: true, label: "Affected Customers" },
  marginLeft: 50,
  marks: [
    Plot.barY(day_sum, {
      x: (d) =>
        isNaN(d.date)
          ? "no estimate"
          : d.date.toLocaleString(undefined, {
              month: "short",
              day: "numeric"
            }),
      y: "sum",
      tip: true
    }),
    Plot.ruleY([0])
  ]
})
);
```

```js
display(
Plot.plot({
  clip: true,
  title: "DTE Ages of Current Outages",
  marginLeft: 50,
  y: { grid: true, label: "customers affected" },
  x: {
    domain: [
      0,
      (new Date() -
        d3.quantile(
          outages.map((d) => d.desc.start_time),
          0.0025
        )) /
        (1000 * 60 * 60)
    ],
    label: "hours since start of outage",
    reverse: true
  },
  color: { legend: true, scheme: "accent" },
  marks: [
    Plot.rectY(
      outages,
      Plot.binX(
        { y: "sum" },
        {
          tip: true,
          x: (d) => (new Date() - d.desc.start_time) / (1000 * 60 * 60),
          y: (d) => d.desc.cust_a.val,
          interval: 1,
          fill: (d) =>
            isNaN(d.desc.estimate_fixed)
              ? "no estimate"
              : `Estimate fixed by ${d.desc.estimate_fixed.toLocaleString(
                  undefined,
                  {
                    month: "short",
                    day: "numeric"
                  }
                )}`
        }
      )
    ),
    Plot.ruleY([0])
  ]
})
);
```

```js
display(
Plot.plot({
  clip: true,
  title: "DTE Ages of Current Outages, Cumulative",
  marginLeft: 50,
  y: { grid: true, label: "customers affected" },
  x: {
    domain: [
      0,
      (new Date() -
        d3.quantile(
          outages.map((d) => d.desc.start_time),
          0.0025
        )) /
        (1000 * 60 * 60)
    ],
    label: "hours since start of outage",
    reverse: true
  },
  color: { legend: true, scheme: "accent" },
  marks: [
    Plot.rectY(
      outages,
      Plot.binX(
        { y: "sum" },
        {
          tip: true,
          x: (d) => (new Date() - d.desc.start_time) / (1000 * 60 * 60),
          y: (d) => d.desc.cust_a.val,
          interval: 1,
          fill: (d) =>
            isNaN(d.desc.estimate_fixed)
              ? "no estimate"
              : `Estimate fixed by ${d.desc.estimate_fixed.toLocaleString(
                  undefined,
                  {
                    month: "short",
                    day: "numeric"
                  }
                )}`,
          cumulative: -1
        }
      )
    ),
    Plot.ruleY([0])
  ]
})
);
```

```js
display(
Plot.plot({
  title: "Affected customers by State Representative",
  projection: { type: "mercator", domain: boundary },
  color: {
    scheme: "oranges",
    type: "linear",
    legend: true,
    label: "Affected customers"
  },
  marks: [
    Plot.geo(house_districts, { strokeOpacity: 0.1 }),
    Plot.geo(house_district_outages, {
      fill: (d) => d.properties.n_affected_customers,
      stroke: "black",
      strokeOpacity: 0.25
    }),
    Plot.tip(
      house_district_outages.features,
      Plot.pointer(
        Plot.geoCentroid({
          title: (d) =>
            `House district ${
              d.properties.LABEL
            }\nAffected customers: ${d.properties.n_affected_customers.toLocaleString()}`
        })
      )
    )
  ]
})
);
```

```js
display(
Plot.plot({
  title: "Affected Customers by State Senator",
  projection: { type: "mercator", domain: boundary },
  color: {
    scheme: "oranges",
    type: "linear",
    legend: true,
    label: "Affected customers"
  },
  marks: [
    Plot.geo(rewind(senate_districts), { strokeOpacity: 0.1 }),
    Plot.geo(senate_district_outages, {
      fill: (d) => d.properties.n_affected_customers,
      stroke: "black",
      strokeOpacity: 0.25,
      tip: true
    }),
    Plot.tip(
      senate_district_outages.features,
      Plot.pointer(
        Plot.geoCentroid({
          title: (d) =>
            `Senate district ${
              d.properties.LABEL
            }\nAffected customers: ${d.properties.n_affected_customers.toLocaleString()}`
        })
      )
    )
  ]
})
);
```

## Historical Data

Download the raw, historical data for
* [DTE](https://github.com/fgregg/dte-outages/archive/refs/heads/main.zip)
* [Consumer Energy](https://github.com/fgregg/consumer-energy-outages/archive/refs/heads/main.zip)

```js
display(
Plot.plot({
  title: "Number of Affected Customers over Time",
  color: {
    type: "categorical",
    domain: ["Consumer Energy", "DTE"],
    legend: true
  },
  marginLeft: 60,
  x: { type: "time" },
  y: { grid: true },
  marks: [
    Plot.line(dte_outage_history, {
      x: "timestamp",
      y: "affected customers",
      stroke: (d) => "DTE"
    }),
    Plot.line(ce_outage_history, {
      x: "timestamp",
      y: "affected customers",
      stroke: (d) => "Consumer Energy"
    }),
    Plot.ruleY([0]),
    Plot.tip(
      dte_outage_history,
      Plot.pointer({
        x: "timestamp",
        y: "affected customers",
        title: (d) =>
          `time: ${d.timestamp.toLocaleString()}\ncustomers affected ${d[
            "affected customers"
          ].toLocaleString()}`
      })
    )
  ]
})
);
```

```js
display(
Plot.plot({
  title: "Number of Outages over Time",
  color: {
    type: "categorical",
    domain: ["Consumer Energy", "DTE"],
    legend: true
  },
  marginLeft: 60,
  x: { type: "time" },
  y: { grid: true },
  marks: [
    Plot.line(dte_outage_history, {
      x: "timestamp",
      y: "outages",
      stroke: (d) => "DTE"
    }),
    Plot.line(ce_outage_history, {
      x: "timestamp",
      y: "outages",
      stroke: (d) => "Consumer Energy"
    }),
    Plot.ruleY([0]),
    Plot.tip(
      dte_outage_history,
      Plot.pointer({
        x: "timestamp",
        y: "outages",
        title: (d) =>
          `time: ${d.timestamp.toLocaleString()}\noutages ${d.outages.toLocaleString()}`
      })
    )
  ]
})
);
```

```js
const outages_by_house_district = house_district_outages.features
  .map((d) => ({
    district: d.properties.LABEL,
    "affected customers": d.properties.n_affected_customers
  }))
  .sort((a, b) => b["affected customers"] - a["affected customers"]);
```

```js
const outages_by_senate_district = senate_district_outages.features
  .map((d) => ({
    district: d.properties.LABEL,
    "affected customers": d.properties.n_affected_customers
  }))
  .sort((a, b) => b["affected customers"] - a["affected customers"]);
```

```js
const house_district_outages = outages_per_area(dte_house_districts, indexed_outages);
```

```js
const senate_district_outages = outages_per_area(
  dte_senate_districts,
  indexed_outages
);
```

```js
const day_sum = d3
  .flatRollup(
    outages,
    (v) => d3.sum(v.map((d) => d.desc.cust_a.val)),
    (d) => d.desc.estimate_fixed
  )
  .map(([date, sum]) => ({ date, sum }));
```

```js
const consumer_energy_outage_paths = getMostRecentlyCommittedFile(
  "fgregg",
  "consumer-energy-outages",
  "ce_",
  "data"
);
```

```js
const consumer_energy_outage_path = consumer_energy_outage_paths.sort(
  (a, b) =>
    Math.abs(extractDateFromFilename(a, "ce_") - target_date) -
    Math.abs(extractDateFromFilename(b, "ce_") - target_date)
)[0];
```

```js
const consumer_energy_outages = (async () => {
  const response = await fetch(
    `https://corsproxy.bunkum.us/corsproxy/?apiurl=https://raw.githubusercontent.com/fgregg/consumer-energy-outages/main/data/${consumer_energy_outage_path}`
  );
  const data = await response.json();
  return data;
})();
```

```js
const boundary = turf.featureCollection([
  turf.polygon(
    service_area_data.file_data[0].geom.a.map((pl) =>
      polyline.decode(pl).map((pt) => pt.reverse())
    )
  )
]);
```

```js
const service_area_data = (async () => {
  const response = await fetch(
    "https://kubra.io/regions/106f1194-a523-4e92-a093-ac535a46d58a/78f5f8aa-a4e2-45c5-b1e3-b335bdbd84b2/serviceareas.json"
  );
  const data = await response.json();
  return data;
})();
```

```js
const areas = turf.featureCollection(
  outages
    .filter((d) => d.geom.a)
    .map(({ geom, ...d }) => turf.polygon(geom.a, d))
    .filter((d) => turf.area(d) < 108172795)
);
```

```js
const points = turf.featureCollection(
  outages
    .filter((d) => !d.geom.a)
    .map(({ geom, ...d }) => turf.point(geom.p, d))
);
```

```js
const polyline = (await import("https://esm.sh/@mapbox/polyline@1.2.0")).default;
```

```js
const turf = await import("https://esm.sh/@turf/turf@6.5.0");
```

```js
const topojson = await import("https://esm.sh/topojson-client@3");
```

```js
// Was imported from @observablehq/plot-mapping; build it from the us-atlas CDN.
const counties = await (async () => {
  const us = await fetch(
    "https://cdn.jsdelivr.net/npm/us-atlas@3/counties-10m.json",
  ).then((r) => r.json());
  return topojson.feature(us, us.objects.counties);
})();
```

```js
// Function to get the most recently committed file in a public GitHub repository
async function getMostRecentlyCommittedFile(
  username,
  repository,
  filePattern,
  path
) {
  try {
    // Construct the GitHub API URL to list commits in the repository
    const commitsURL = `https://api.github.com/repos/${username}/${repository}/commits`;

    // Fetch the commits from the GitHub API
    const response = await fetch(commitsURL);

    if (!response.ok) {
      throw new Error(`Failed to fetch commits. Status: ${response.status}`);
    }

    const commits = await response.json();

    // Find the latest commit
    const latestCommit = commits[0];

    // Get the tree URL of the latest commit
    const treeURL = latestCommit.commit.tree.url;

    // Fetch the tree details from the GitHub API
    const treeResponse = await fetch(treeURL);

    if (!treeResponse.ok) {
      throw new Error(
        `Failed to fetch tree details. Status: ${treeResponse.status}`
      );
    }

    let treeData = await treeResponse.json();

    if (path) {
      const response = await fetch(
        treeData.tree.find((file) => file.path === path).url
      );
      treeData = await response.json();
    }
    console.log(treeData);

    // Find the file that matches the pattern
    return treeData.tree
      .filter((file) => file.path.includes(filePattern))
      .map((d) => d.path);
  } catch (error) {
    console.error("Error:", error.message);
    return null;
  }
}
```

```js
// Inlined from @fil/rewind (fixes GeoJSON winding for d3/Plot projections).
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
const outage_paths = getMostRecentlyCommittedFile("fgregg", "dte-outages", "dte_");
```

```js
const scraped_path = outage_paths.sort(
  (a, b) =>
    Math.abs(extractDateFromFilename(a, "dte_") - target_date) -
    Math.abs(extractDateFromFilename(b, "dte_") - target_date)
)[0];
```

```js
display(
d3.min(outages.map((d) => new Date(d.desc.start_time)))
);
```

```js
const outages = (async () => {
  const datePattern =
    /^(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday), (January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}$/;
  const response = await fetch(
    `https://corsproxy.bunkum.us/corsproxy/?apiurl=https://raw.githubusercontent.com/fgregg/dte-outages/main/${scraped_path}`
  );
  const data = await response.json();
  data.map((d) => {
    d.desc.estimate_fixed = datePattern.test(d.desc.comments)
      ? new Date(`${d.desc.comments}, 2023`)
      : NaN;
    d.desc.start_time = new Date(d.desc.start_time);
    d.desc.lastFileUpdate = new Date(d.desc.lastFileUpdate);
    d.geom.p = polyline.decode(d.geom.p[0])[0].reverse();
    if (d.geom.a) {
      d.geom.a = d.geom.a.map((pl) =>
        polyline.decode(pl).map((pt) => pt.reverse())
      );
    }
  });
  return data;
})();
```

```js
function extractDateFromFilename(filename, prefix) {
  // Assuming the timestamp format is "dte_YYYYMMDDHHmmss.json"
  const timestampRegex = new RegExp(
    `${prefix}(\\d{4})(\\d{2})(\\d{2})(\\d{2})(\\d{2})(\\d{2})\\.json`
  );
  const matches = filename.match(timestampRegex);

  if (matches) {
    const [, year, month, day, hours, minutes, seconds] = matches;
    const dateStr = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}Z`;
    return new Date(dateStr);
  }

  return null; // Return null if the filename doesn't match the expected format.
}
```

```js
const last_checked = extractDateFromFilename(scraped_path, "dte_");
```

```js
const dte_outage_history = (() => {
  return d3.csv(
    "https://corsproxy.bunkum.us/corsproxy/?apiurl=https://github.com/fgregg/dte-outages/releases/download/hourly/outage_history.csv",
    d3.autoType
  );
})();
```

```js
const ce_outage_history = (() => {
  return d3.csv(
    "https://corsproxy.bunkum.us/corsproxy/?apiurl=https://github.com/fgregg/consumer-energy-outages/releases/download/hourly/outage_history.csv",
    d3.autoType
  );
})();
```

```js
const house_districts = fetch(
  "https://opendata.arcgis.com/api/v3/datasets/078bf618c3e047ab9358c48f8c735eaa_17/downloads/data?format=geojson&spatialRefId=4326&where=1%3D1"
).then((d) => d.json());
```

```js
const senate_districts = fetch(
  "https://opendata.arcgis.com/api/v3/datasets/45e0487cb34c4343b6fad45b97669a19_24/downloads/data?format=geojson&spatialRefId=4326&where=1%3D1"
).then((d) => d.json());
```

```js
function outages_per_area(featurecollection, index) {
  for (const feature of featurecollection.features) {
    const points_in_bbox = index
      .range(...turf.bbox(feature))
      .map((i) => turf.point(outages[i].geom.p, outages[i].desc));
    const points_in_feature = turf.pointsWithinPolygon(
      turf.featureCollection(points_in_bbox),
      feature
    );
    feature.properties.n_affected_customers = d3.sum(
      points_in_feature.features.map((d) => d.properties.cust_a.val)
    );
  }
  return featurecollection;
}
```

```js
const kdbush = (await import("https://esm.sh/kdbush@4")).default;
```

```js
const indexed_outages = (() => {
  const index = new kdbush(outages.length);
  for (const outage of outages) {
    index.add(...outage.geom.p);
  }
  index.finish();
  return index;
})();
```

```js
const dte_house_districts = await fetch("/assets/data/dte-outages/dte_house_districts.json").then((r) => r.json());
```

```js
const dte_senate_districts = await fetch("/assets/data/dte-outages/dte_senate_districts.json").then((r) => r.json());
```

```js
// Inlined from @fgregg/storm-tracks: fetch NOAA NWS storm-cell tracks (only
// when the toggle is on) and group them into continuous runs.
async function stormTracks(date, bbox) {
  const tracks = await d3.csv(
    `https://corsproxy.bunkum.us/corsproxy/?apiurl=https://www.ncdc.noaa.gov/swdiws/csv/nx3structure/${formatDateToYYYYMMDDHHMM(
      new Date(date.getTime() + date.getTimezoneOffset() * 60 * 1000),
    )}:${formatDateToYYYYMMDDHHMM(
      dayOffset(new Date(date.getTime() + date.getTimezoneOffset() * 60 * 1000), 1),
    )}?bbox=${bbox.join(",")}`,
    d3.autoType,
  );
  return d3
    .groups(tracks, (d) => d.WSR_ID + d.CELL_ID)
    .map(([z, grouped]) => runs(grouped))
    .flat();
}
```

```js
function runs(run) {
  let run_id = 0;
  let first = true;
  const max_gap = 1000 * 60 * 45;
  let previous_observation = null;
  for (const observation of run) {
    if (first) first = false;
    else if (observation.ZTIME - previous_observation.ZTIME > max_gap) run_id += 1;
    observation.run_id = run_id;
    previous_observation = observation;
  }
  return run;
}
```

```js
function formatDateToYYYYMMDDHHMM(datetime) {
  const year = datetime.getUTCFullYear();
  const month = String(datetime.getUTCMonth() + 1).padStart(2, "0");
  const day = String(datetime.getUTCDate()).padStart(2, "0");
  const hours = String(datetime.getUTCHours()).padStart(2, "0");
  const minutes = String(datetime.getUTCMinutes()).padStart(2, "0");
  return `${year}${month}${day}${hours}${minutes}`;
}
```

```js
function dayOffset(date, offset) {
  const offsetDay = new Date(date);
  offsetDay.setDate(offsetDay.getDate() + offset);
  return offsetDay;
}
```

```js
const storm_tracks = show_storm_tracks
  ? stormTracks(storm_date, [-85, 41.5, -81.5, 44.5])
  : [];
```


```js
display(Inputs.table(outages_by_house_district));
```

```js
display(Inputs.table(outages_by_senate_district));
```
