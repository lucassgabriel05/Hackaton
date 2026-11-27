"""Gera dist/soundmap.html (arquivo único) e dist/artifact.html (fragmento para o Artifact)
a partir de index.html, css/ e js/.  Uso: python3 tools/build.py"""
import re, pathlib

root = pathlib.Path(__file__).resolve().parent.parent
index = (root / 'index.html').read_text(encoding='utf-8')

css_links = re.findall(r'<link rel="stylesheet" href="(css/[^"]+)">\n', index)
js_links = re.findall(r'<script src="(js/[^"]+)"></script>\n', index)

css = ''.join((root / p).read_text(encoding='utf-8').rstrip() + '\n\n' for p in css_links)
js = ''
for p in js_links:
    js += (root / p).read_text(encoding='utf-8').replace("'use strict';\n", '', 1).strip('\n') + '\n\n'
js = "(function(){\n'use strict';\n" + js + "})();\n"

page = index
for p in css_links:
    page = page.replace(f'<link rel="stylesheet" href="{p}">\n', '')
page = page.replace('</head>', f'<style>\n{css}</style>\n</head>', 1)
for p in js_links:
    page = page.replace(f'<script src="{p}"></script>\n', '')
page = page.replace('</body>', f'<script>\n{js}</script>\n</body>', 1)

dist = root / 'dist'
dist.mkdir(exist_ok=True)
(dist / 'soundmap.html').write_text(page, encoding='utf-8')

# fragmento: sem doctype/html/head/body e sem charset/viewport (o publicador acrescenta)
frag = re.sub(r'<!doctype html>\n<html[^>]*>\n<head>\n<meta charset="utf-8">\n<meta name="viewport"[^>]*>\n', '', page)
frag = frag.replace('</head>\n<body>\n', '').replace('</body>\n</html>\n', '')
(dist / 'artifact.html').write_text(frag, encoding='utf-8')
print('dist/soundmap.html', len(page), 'bytes | dist/artifact.html', len(frag), 'bytes')
