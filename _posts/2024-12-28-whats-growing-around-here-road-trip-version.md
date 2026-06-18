---
title: What's Growing Around Here (Road Trip Version)?
author: Forest Gregg
layout: post
date: 2024-12-28
description: What crop is grown right around you?
reactive: true
---

Here are the crops and land cover at your location in 2023, according to the
[2023 National Cropland Data Layer](https://www.nass.usda.gov/Research_and_Science/Cropland/SARS1a.php)
from the United States Department of Agriculture's National Agricultural
Statistics Service.

For nice maps, see [this post]({% post_url 2024-12-30-what-are-they-growing-around-here %}).

```js
const radius = view(
  Inputs.select(
    new Map([
      ["100 yards", 0.05681818],
      ["quarter mile", 0.25],
      ["half mile", 0.5],
      ["mile", 1],
      ["two miles", 2],
    ]),
    {
      label: "Radius",
      value: "100 yards",
    },
  ),
);
```

```js
display(htmlTable(dataTable));
```

```js
const position = geoposition;
```

```js
const dataTable = crop_mappings
  .map(([name, id]) => ({
    name,
    prop: landuseProportions.get(id),
  }))
  .filter((d) => d.prop)
  .sort((a, b) => b.prop - a.prop)
  .map(({ name, prop }) => ({
    name,
    percent: Math.round(prop * 100),
  }));
```

```js
const landuseProportions = d3.rollup(
  values[0],
  (v) => v.length / values[0].length,
  (d) => d,
);
```

```js
const values = high_res_image.readRasters({
  window: pixel_state_window,
  fillValue: 0,
});
```

```js
const pixel_state_window = (() => {
  const width_scale = high_res_image.getWidth() / (bbox[2] - bbox[0]);
  const height_scale = high_res_image.getHeight() / (bbox[1] - bbox[3]);

  return [
    ~~((projectedLocalBbox[0][0] - bbox[0]) * width_scale),
    ~~((projectedLocalBbox[1][1] - bbox[3]) * height_scale),
    ~~((projectedLocalBbox[1][0] - bbox[0]) * width_scale),
    ~~((projectedLocalBbox[0][1] - bbox[3]) * height_scale),
  ];
})();
```

```js
const projectedLocalBbox = [
  project.forward([localBbox.minLon, localBbox.minLat]),
  project.forward([localBbox.maxLon, localBbox.maxLat]),
];
```

```js
const project = proj4(
  "+proj=aea +lat_0=23 +lon_0=-96 +lat_1=29.5 +lat_2=45.5 +x_0=0 +y_0=0 +datum=NAD83 +units=m +no_defs",
);
```

```js
const localBbox = bboxAroundPoint(
  position.coords.latitude,
  position.coords.longitude,
  radius,
);
```

```js
function bboxAroundPoint(lat, lon, distanceInMiles = 1) {
  const latDegreeMiles = 69; // Approx. miles per degree of latitude
  const latDelta = distanceInMiles / latDegreeMiles;

  const lonDegreeMiles = Math.cos(lat * (Math.PI / 180)) * latDegreeMiles;
  const lonDelta = distanceInMiles / lonDegreeMiles;

  const minLat = lat - latDelta;
  const maxLat = lat + latDelta;
  const minLon = lon - lonDelta;
  const maxLon = lon + lonDelta;

  return {
    minLat,
    minLon,
    maxLat,
    maxLon,
  };
}
```

```js
const high_res_image = crops_raster.getImage(0);
```

```js
const bbox = (await crops_raster.getImage()).getBoundingBox();
```

```js
const crops_raster = geotiff.fromUrl("https://storage.bunkum.us/2023_clds.tif");
```

```js
const crop_mappings = await fetch(
  "/assets/data/whats-growing-road-trip-version/crop_mappings.json",
).then((r) => r.json());
```

```js
const geotiff = await import("https://esm.sh/geotiff@2.1.3");
```

```js
const proj4 = (await import("https://esm.sh/proj4@2.8")).default;
```

```js
// Standard HTML table (picks up the site table CSS); wrapped for horizontal
// scroll on narrow screens.
const htmlTable = (rows) => {
  const cols = rows.length ? Object.keys(rows[0]) : [];
  return html`<div style="overflow-x: auto">
    <table>
      <thead>
        <tr>
          ${cols.map((c) => html`<th>${c}</th>`)}
        </tr>
      </thead>
      <tbody>
        ${rows.map(
          (r) => html`<tr>
            ${cols.map((c) => html`<td>${r[c]}</td>`)}
          </tr>`,
        )}
      </tbody>
    </table>
  </div>`;
};
```

```js
const geoposition = Generators.observe((next) => {
  navigator.geolocation.watchPosition(
    next,
    (error) => {
      if (error instanceof GeolocationPositionError) {
        console.error("Geoposition error:", error.message);
      }
    },
    {
      enableHighAccuracy: true,
      maximumAge: 1000,
    },
  );
});
```
