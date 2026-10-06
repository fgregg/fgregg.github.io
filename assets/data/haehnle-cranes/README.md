# Haehnle Sanctuary sandhill crane counts

Three sources, which overlap from 2007 on.

- `annual_peak_1935_2025.csv`: peak count for each season, 1935 to 2025 (gaps in early
  years). Read from the drawing coordinates of Jackson Audubon's vector chart
  https://jacksonaudubon.org/resources/Documents/Haehnle/HaehnleCranes_Log_WEB.pdf
  (made in R, April 2026). Counts under 1,000 come out as exact integers; larger
  ones are good to within about ±1.
- `weekly_table_2007_2026.csv`: weekly counts from
  https://jacksonaudubon.org/resources/Documents/Haehnle/CraneCountTable-Web.pdf
  (Sept. 2026). `week` is the table's week number, which follows Excel's WEEKNUM
  (weeks start on Sunday, and Jan 1 falls in week 1). `monday` is the Monday of that
  week, so it is the usual count night but not a recorded date. `raw` keeps the cell
  text exactly; `-`, `n/a` and blank mean the week wasn't counted. Zeros at the start
  and end of a season before 2021 may also mean "not counted".
- `crane_counts.csv`: one row per weekly count post on the Jackson Audubon blog
  (https://jacksonaudubon.org/page-18108), Sept. 2015 to now, with exact dates,
  roosting count, total observed (when the post gives it), and a link to the post.
- `weekly_combined.csv`: the series the post's charts use. It takes 2007–2014 from the
  weekly table (dates are the Monday of the week number) and 2015 on from the blog
  (exact dates), plus four nonzero table weeks the blog has no post for. 2015–2026
  table zeros with no matching post are left out, because they may mean "not counted".
- `ep_fall_index_1979_2024.csv`: the USFWS fall survey index for the Eastern
  Population of greater sandhill cranes, from Table 12 of
  https://www.fws.gov/sites/default/files/documents/2025-09/status-and-harvests-of-sandhill-cranes-2025.pdf
  (there was no survey in 2001).
- `ep_survey_sites_2010_2025.csv`: site-level counts from the fall survey's
  observation map, https://apps.fws.gov/epsandhill/observations-map. 2025 looks
  only partly entered, and coverage of sites near Haehnle varies by year (2022 and
  2023 are thin).
- `grand_river_jackson_daily_flow.csv`: daily mean discharge in cubic feet per second
  at USGS gauge 04109000, Grand River at Jackson, 1979 on, from
  https://api.waterdata.usgs.gov. This gauge is upstream of where the Portage River
  (which drains Mud Lake Marsh) joins the Grand, so it measures how wet the region
  is, not the marsh's water level. The Portage River gauge near Munith (04109500)
  stopped in 1956.
- `marsh_sentinel2_water.csv`: one row per clear Sentinel-2 L2A image of Mud Lake
  Marsh, March–November, 2016 to now. Images come from Microsoft's Planetary
  Computer, tile 17TKG only. An image is kept only when at least 95% of the marsh is
  free of cloud and shadow (by the scene classification layer). Reflectances from
  images processed in 2022 or later have the 1,000 offset removed. The columns are
  the share of marsh pixels that are dark in near-infrared (reflectance < 0.10,
  water or saturated ground), that are wet (MNDWI > -0.2), and that are open water
  (MNDWI > 0), plus the median MNDWI. In summer, plants hide the water, so the late
  October–November images are the useful ones.
- `mud_lake_marsh.geojson`: the marsh outline used, traced by hand from imagery.
- `scripts/`: the code that produced `marsh_sentinel2_water.csv`
  (`uv run --with pystac-client --with planetary-computer --with rasterio --with shapely python scripts/series.py`).
