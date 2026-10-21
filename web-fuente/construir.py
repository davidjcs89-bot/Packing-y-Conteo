import re, json, sys, shutil, os
# Genera web/index.html desde web-fuente/app.html (la app de claude.ai) + web-fuente/shim.js (conexión a Supabase).
# Uso: python3 web-fuente/construir.py
ROOT=os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'web')  # carpeta que se publica
out=ROOT
os.makedirs(out, exist_ok=True)
src=open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'app.html')).read()
m=re.match(r'\s*<title>(.*?)</title>', src); title=m.group(1); body=src[m.end():]
cfg={"url":"https://jshqbgtradcayllkwcyb.supabase.co","key":"sb_publishable_AJqGsKBNnVf6VQz_QzWuUA_CHTsW3X3","email":"negocio@packing-y-conteo.app","lib":"https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js"}
shim=open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'shim.js')).read()
html=f'''<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>{title}</title>
<meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Packing-y-Conteo">
<link rel="apple-touch-icon" href="icon.png"><link rel="icon" href="icon.png">
<script>window.PYC_CFG = {json.dumps(cfg)};</script>
<script>{shim}</script>
<style>html,body{{margin:0;padding:0}}</style>
</head><body>
{body}
</body></html>
'''
open(out+'/index.html','w').write(html)
ico=os.path.join(ROOT,'..','assets','images','icon.png')
if os.path.exists(ico): shutil.copy(ico, out+'/icon.png') if not os.path.exists(out+'/icon.png') else None
print('ok', len(html))
