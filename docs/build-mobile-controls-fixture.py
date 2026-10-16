"""Embed exact CSS/HUD and source-derived content; no browser or network operations."""
from pathlib import Path
import re,json,hashlib,base64,gzip
root=Path(__file__).resolve().parent.parent
source=(root/'index.html').read_text()
styles='\n'.join(re.findall(r'<style\b[^>]*>[\s\S]*?</style>',source))
hud=source[source.index('<div class="hud" id="hud" inert>'):source.index('<div id="world-scroll"')].rstrip()
specs=json.loads(re.search(r'const SPECS = (\[.*?\]);',(root/'assets/building-actions.js').read_text()).group(1))
links=re.findall(r"\{zone:(\d+),title:'([^']+)',desc:'([^']+)',url:",source)
core=(root/'assets/content-core.js').read_text();moon=(root/'assets/moon-snow-garden.js').read_text()
hints={6:re.search(r"const hints=\{.*?6:'([^']+)'",core).group(1),20:re.search(r"interactionHint: '([^']+)'",moon).group(1)}
primary_phases=json.loads(re.search(r'const CRAFT_PRIMARY_PHASES=(\[.*?\]);',source).group(1))
content={}
for index in [6,20]:
 zone,title,description=links[index]
 content[str(index)]={'title':title,'description':description,'zone':['作品','服务','项目','连接'][int(zone)]+' / '+str(index+1).zfill(2),'craftStatus':title,'interactionHint':hints[index],'primaryPhase':primary_phases[index],'labels':specs[index]['labels']}
meta={'source':'index.html + assets/content-core.js + assets/moon-snow-garden.js + assets/building-actions.js','cssBlocks':styles.count('<style'),'cssSHA256':hashlib.sha256(styles.encode()).hexdigest(),'hudSHA256':hashlib.sha256(hud.encode()).hexdigest(),'cssBytes':len(styles.encode()),'hudBytes':len(hud.encode()),'content':content}
html=(root/'docs/mobile-controls-fixture-template.html').read_text()
for key,value in [('__CSS__',styles),('__HUD__',hud),('__CONTENT__',content),('__META__',meta)]:html=html.replace(key,json.dumps(value,ensure_ascii=False))
p=root/'docs/mobile-controls-layout-fixture.html';p.write_text(html)
url='data:text/html;base64,'+base64.b64encode(html.encode()).decode();(root/'qa-results/mobile-controls-layout-data-url.txt').write_text(url)
compressed=base64.b64encode(gzip.compress(html.encode())).decode()
bootstrap='<!doctype html><meta charset="utf-8"><title>Loading local HUD fixture</title><p>Loading local HUD fixture…</p><script>(async()=>{const b=Uint8Array.from(atob("'+compressed+'"),c=>c.charCodeAt(0));const h=await new Response(new Blob([b]).stream().pipeThrough(new DecompressionStream("gzip"))).text();document.open();document.write(h);document.close()})().catch(e=>document.body.textContent=String(e))</script>'
compact='data:text/html;base64,'+base64.b64encode(bootstrap.encode()).decode();(root/'qa-results/mobile-controls-layout-compact-url.txt').write_text(compact)
print(json.dumps({'fixture':str(p),'htmlBytes':len(html.encode()),'fullDataURLBytes':len(url),'compactDataURLBytes':len(compact),'metadata':meta},indent=2,ensure_ascii=False))
