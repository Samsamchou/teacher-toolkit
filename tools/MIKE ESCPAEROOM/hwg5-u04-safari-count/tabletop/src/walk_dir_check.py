# Local check (no Blender): does a Tripo Walk clip step toward the HEAD? (11/25 zebra: rig back to front -> walked backwards).
# Usage: python src/walk_dir_check.py <model> [...]  (models/<model>.glb). BACKWARDS -> Animal(..., reverse_clip=True).
import sys, math, numpy as np
sys.path.insert(0, 'src')
from gltf_fk import tracks, leg_feet, load
for m in sys.argv[1:]:
    path='models/%s.glb'%m
    J, acc = load(path)
    P=np.concatenate([acc(pr['attributes']['POSITION']) for me in J['meshes'] for pr in me['primitives']])
    P2=np.c_[P[:,0],-P[:,2]]; h=P[:,1]
    J, T, _ = tracks(path)
    feet = leg_feet(J)
    tr = {f: [(p[0], -p[2]) for p in T[f]] for f in feet}
    vel = [(b[0]-a[0], b[1]-a[1]) for t in tr.values() for a, b in zip(t, t[1:])]
    sxx=sum(x*x for x,y in vel); syy=sum(y*y for x,y in vel); sxy=sum(x*y for x,y in vel)
    ang=0.5*math.atan2(2*sxy,sxx-syy); ax=np.array((math.cos(ang),math.sin(ang)))
    proj=sorted((x*ax[0]+y*ax[1] for x,y in vel), key=abs); fast=proj[int(len(proj)*0.75):]
    sg=1.0 if sum(fast)>=0 else -1.0
    top=P2[h>np.percentile(h,98)].mean(0); c=P2.mean(0)
    hs=np.sign((top-c)@ax)
    print('%-24s walk-sign %+d mesh-top(head)-sign %+d %s'%(m,sg,hs,'BACKWARDS' if hs!=sg else 'ok'))
