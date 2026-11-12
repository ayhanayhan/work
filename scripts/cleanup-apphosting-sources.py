#!/usr/bin/env python3
import argparse,subprocess,re
from collections import defaultdict
p=argparse.ArgumentParser();p.add_argument('--bucket',default='gs://firebaseapphosting-sources-612520357246-europe-west4/**');p.add_argument('--keep',type=int,default=10);p.add_argument('--delete',action='store_true');a=p.parse_args()
r=subprocess.run(['gcloud','storage','ls','-l',a.bucket],capture_output=True,text=True,check=True)
g=defaultdict(list)
for line in r.stdout.splitlines():
 m=re.match(r'\s*(\d+)\s+(\S+)\s+(gs://.+\.zip)$',line)
 if not m: continue
 size,date,path=m.groups();name=path.rsplit('/',1)[-1]
 if '--' not in name: continue
 g[name.split('--',1)[0]].append((date,int(size),path))
delete=[]
for app,items in sorted(g.items()):
 items.sort(reverse=True);old=items[max(1,a.keep):];delete+=old;print(f'{app}: total={len(items)} keep={min(len(items),a.keep)} delete={len(old)}')
print(f'Candidates={len(delete)} bytes={sum(x[1] for x in delete)/1024**3:.2f} GiB')
if not a.delete: print('Dry-run only. Add --delete after successful deployment.');raise SystemExit(0)
for i,(_,_,path) in enumerate(delete,1):
 print(f'[{i}/{len(delete)}] {path}');subprocess.run(['gcloud','storage','rm','--quiet',path],check=False)
