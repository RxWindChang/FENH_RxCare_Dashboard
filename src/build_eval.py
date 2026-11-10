"""Build site/eval/{inhaler,insulin,cva,export}.html from src/eval/ (single self-contained files,
so the Apps Script 備用網址 can serve each page on its own)."""
import json, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
src = root / 'src/eval'
tpl, css, js = [(src / f).read_text(encoding='utf-8') for f in ('page.html', 'eval.css', 'eval.js')]
LIBS = ('<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>\n'
        '<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>')
pages = {'inhaler': '吸入劑衛教評核', 'insulin': '筆型胰島素注射技術', 'cva': 'CVA 衛教評核', 'export': '評核表下載'}
out = root / 'site/eval'
out.mkdir(parents=True, exist_ok=True)
for view, title in pages.items():
    html = (tpl.replace('{{TITLE}}', title).replace('{{CSS}}', css)
               .replace('{{LIBS}}', LIBS if view == 'export' else '')
               .replace('{{VIEW}}', json.dumps(view)).replace('{{JS}}', js))
    (out / f'{view}.html').write_text(html, encoding='utf-8')
    print('wrote', f'site/eval/{view}.html', len(html.encode()), 'bytes')
