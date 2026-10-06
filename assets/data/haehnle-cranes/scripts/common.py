import pystac_client, planetary_computer, rasterio, numpy as np
from rasterio.warp import transform_bounds, transform as tr
from rasterio.windows import from_bounds
from rasterio.features import rasterize
from shapely.geometry import Polygon, mapping
from shapely.ops import transform as stransform
cat = pystac_client.Client.open("https://planetarycomputer.microsoft.com/api/stac/v1", modifier=planetary_computer.sign_inplace)
BBOX=[-84.30,42.315,-84.262,42.338]
MARSH=Polygon([(-84.2916,42.3327),(-84.288,42.3333),(-84.282,42.3321),(-84.276,42.3318),(-84.2716,42.3318),
 (-84.2704,42.3286),(-84.2712,42.3245),(-84.2748,42.3221),(-84.28,42.3207),(-84.284,42.3210),(-84.2868,42.3233),
 (-84.288,42.3274),(-84.2904,42.3309)])
def read(item, band, shape=None):
    with rasterio.open(item.assets[band].href) as src:
        b=transform_bounds("EPSG:4326",src.crs,*BBOX)
        w=from_bounds(*b,transform=src.transform)
        out_shape=shape
        a=src.read(1,window=w,boundless=True,out_shape=out_shape,resampling=rasterio.enums.Resampling.nearest)
        return a, src.crs, b
def mask_for(crs,b,shape):
    xs,ys=MARSH.exterior.xy
    X,Y=tr("EPSG:4326",crs,list(xs),list(ys))
    poly=Polygon(zip(X,Y))
    transform=rasterio.transform.from_bounds(*b,shape[1],shape[0])
    return rasterize([mapping(poly)],out_shape=shape,transform=transform).astype(bool)
