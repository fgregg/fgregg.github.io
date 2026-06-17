---
title: What are they growing around here?
author: Forest Gregg
layout: post
date: 2024-12-30
description: A live map of what crop is grown where, from the USDA Cropland Data Layer raster, by county.
reactive: true
---

Data from the [2023 National Cropland Data Layer](https://www.nass.usda.gov/Research_and_Science/Cropland/SARS1a.php) from the United States Department of Agriculture's National Agricultural Statistics Service.

To see the crops around your current location, [see this notebook](https://observablehq.com/@fgregg/whats-growing-around-here-road-trip-version).

```js
const selected_crop = view(Inputs.select(state_crop_map, {
  label: "Select a crop"
}));
```

```js
const selected_state_name = view(Inputs.select(
  [
    "Lower 48 States",
    ...lower_48.features.map((feature) => feature.properties.name).sort()
  ],
  { label: "Select a state", value: "Lower 48 States" }
));
```

```js
display(
Plot.plot({
  projection: {
    type: "reflect-y",
    domain:
      selected_state_name === "Lower 48 States" ? lower_48 : selected_state
  },
  color: { range: ["white", "green"], domain: [0, 1] },
  marks: [
    Plot.raster(select_crop(state_raster_values[0], selected_crop), {
      x1: state_raster_bbox[0],
      y1: state_raster_bbox[1],
      x2: state_raster_bbox[2],
      y2: state_raster_bbox[3],
      width: state_raster_values.width,
      height: state_raster_values.height
    }),
    Plot.geo(lower_48, { stroke: "gray" })
  ]
})
);
```

```js
const state_crop_map = (() => {
  if (selected_state_name === "Lower 48 States") {
    return crops_map;
  } else {
    const state_crops = new Set(
      state_raster_values[0].map((d) => (Math.random() < 0.01 ? d : null))
    );
    return new Map(
      crop_mappings.filter(([crop, index]) => state_crops.has(index))
    );
  }
})();
```

```js
const state_raster_values = selected_state_name === "Lower 48 States"
  ? state_image.readRasters()
  : state_image.readRasters({
      window: pixel_state_window
    });
```

```js
const state_raster_bbox = (() => {
  if (selected_state_name === "Lower 48 States") {
    return [bbox[0], bbox[3], bbox[2], bbox[1]];
  } else {
    const [x1, y1, x2, y2] = pixel_state_window;
    return [
      (x1 / state_image.getWidth()) * (bbox[2] - bbox[0]) + bbox[0],
      (y1 / state_image.getHeight()) * (bbox[1] - bbox[3]) + bbox[3],
      (x2 / state_image.getWidth()) * (bbox[2] - bbox[0]) + bbox[0],
      (y2 / state_image.getHeight()) * (bbox[1] - bbox[3]) + bbox[3]
    ];
  }
})();
```

```js
const pixel_state_window = (() => {
  const width_scale = state_image.getWidth() / (bbox[2] - bbox[0]);
  const height_scale = state_image.getHeight() / (bbox[1] - bbox[3]);

  return [
    ~~((state_bbox[0][0] - bbox[0]) * width_scale),
    ~~((state_bbox[1][1] - bbox[3]) * height_scale),
    ~~((state_bbox[1][0] - bbox[0]) * width_scale),
    ~~((state_bbox[0][1] - bbox[3]) * height_scale)
  ];
})();
```

```js
const state_image = crops_raster.getImage(state_image_zoom);
```

```js
const state_image_zoom = selected_state_name === "Lower 48 States" ? 6 : 4;
```

```js
const state_bbox = d3.geoPath().bounds(selected_state);
```

```js
const selected_state = selected_state_name === "Lower 48 States"
  ? null
  : lower_48.features.find((d) => d.properties.name === selected_state_name);
```

```js
const select_crop = (original_raster, selected_crop) => {
  const result = new Uint8Array(original_raster.length);
  for (let i = 0; i < original_raster.length; i++) {
    const pixel = original_raster[i];
    if (pixel && pixel === selected_crop) {
      // background pixels are 0, so the && short-circuits those
      result[i] = 1;
    }
  }
  return result;
};
```

```js
const lower_48 = (() => {
  const projected = structuredClone(states);
  const projectedFeatures = projected.features.filter(
    (d) =>
      !new Set([
        "Alaska",
        "Hawaii",
        "Puerto Rico",
        "Guam",
        "Commonwealth of the Northern Mariana Islands",
        "United States Virgin Islands",
        "American Samoa"
      ]).has(d.properties.name)
  );
  for (const feature of projectedFeatures) {
    const projectedGeometry = {
      type: feature.geometry.type,
      coordinates: feature.geometry.coordinates.map((island) =>
        island.map((ring) => ring.map((coord) => project.forward(coord)))
      )
    };
    feature.geometry = projectedGeometry;
  }
  projected.features = projectedFeatures;
  return projected;
})();
```

```js
const project = proj4(
  "+proj=aea +lat_0=23 +lon_0=-96 +lat_1=29.5 +lat_2=45.5 +x_0=0 +y_0=0 +datum=NAD83 +units=m +no_defs"
);
```

```js
const states = topojson.feature(us, us.objects.states);
```

```js
const crops_map = new Map(crop_mappings);
```

```js
const bbox = (await crops_raster.getImage()).getBoundingBox();
```

```js
const crops_raster = geotiff.fromUrl("https://storage.bunkum.us/2023_clds.tif");
```

```js
// geotiff + topojson via CDN (Observable loaded them via require / stdlib).
const geotiff = await import("https://esm.sh/geotiff@2.1.3");
```

```js
const topojson = await import("https://esm.sh/topojson-client@3");
```

```js
const proj4 = (await import("https://esm.sh/proj4@2.8")).default;
```

```js
const us = await fetch("/assets/data/what-are-they-growing/us-counties-10m.json").then((r) => r.json());
```

```js
const crop_mappings = await fetch("/assets/data/what-are-they-growing/crop_mappings.json").then((r) => r.json());
```

