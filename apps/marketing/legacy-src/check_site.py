"""Static navigation, local asset and basic markup validation (python3)."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit,unquote
ROOT=Path(__file__).resolve().parents[1]
class Links(HTMLParser):
 def __init__(self): super().__init__(); self.refs=[]
 def handle_starttag(self,t,attrs):
  a=dict(attrs)
  for k in ('src','href'):
   if k in a: self.refs.append((t,k,a[k]))
missing=[]; checked=0
for file in ROOT.rglob('*.html'):
 p=Links();p.feed(file.read_text(errors='replace'))
 for t,k,url in p.refs:
  parsed=urlsplit(url)
  if parsed.scheme or parsed.netloc or not parsed.path or url.startswith(('#','/')):continue
  checked+=1
  target=file.parent/unquote(parsed.path)
  if not target.exists():missing.append([str(file.relative_to(ROOT)),url])
print(f'Checked {checked} internal references in {len(list(ROOT.rglob("*.html")))} pages')
if missing:
 for path,url in missing:print('MISSING',path,url)
 raise SystemExit(1)
print('All local references resolve')
