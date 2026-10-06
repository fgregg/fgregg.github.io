import sys,json,numpy as np
from concurrent.futures import ThreadPoolExecutor
sys.path.insert(0,'scripts'); from common import *
items=[i for i in cat.search(collections=["sentinel-2-l2a"],bbox=BBOX,datetime="2016-01-01/2026-10-04",
       query={"eo:cloud_cover":{"lt":50},"s2:mgrs_tile":{"eq":"17TKG"}}).items() if 3<=i.datetime.month<=11]
print(len(items),flush=True)
def one(it):
    try:
        b03,crs,b=read(it,'B03'); sh=b03.shape
        b08,_,_=read(it,'B08'); b11,_,_=read(it,'B11',shape=sh); scl,_,_=read(it,'SCL',shape=sh)
        m=mask_for(crs,b,sh)
        clear=~np.isin(scl,[0,1,3,8,9,10,11])
        cf=float(clear[m].mean())
        if cf<0.95: return None
        mm=m&clear
        off=1000.0 if float(it.properties.get('s2:processing_baseline','0')) >= 4.0 else 0.0
        b03=np.clip(b03.astype(float)-off,0,None);b08=np.clip(b08.astype(float)-off,0,None);b11=np.clip(b11.astype(float)-off,0,None)
        mndwi=(b03-b11)/(b03+b11+1e-6); ndwi=(b03-b08)/(b03+b08+1e-6)
        return dict(date=it.datetime.date().isoformat(),id=it.id,clear=cf,baseline=it.properties.get('s2:processing_baseline'),
            mndwi_gt0=float((mndwi[mm]>0).mean()), mndwi_gtm2=float((mndwi[mm]>-0.2).mean()),
            ndwi_gt0=float((ndwi[mm]>0).mean()), mndwi_mean=float(mndwi[mm].mean()),
            nir_lt1000=float((b08[mm]<1000).mean()), scl_water=float((scl[m]==6).mean()),
            nir_med=float(np.median(b08[mm])))
    except Exception as e:
        print('ERR',it.id,e,flush=True); return None
with ThreadPoolExecutor(12) as ex: res=[r for r in ex.map(one,items) if r]
res.sort(key=lambda r:r['date'])
json.dump(res,open('scripts/series.json','w'),indent=1)
print(len(res),'clear scenes')
