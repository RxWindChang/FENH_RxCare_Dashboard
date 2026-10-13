"""Build site/index.html from the dashboard page plus the standalone shell."""
import pathlib, re, sys
root = pathlib.Path(__file__).resolve().parent.parent
page = pathlib.Path(sys.argv[1]).read_text(encoding='utf-8')
head = (root / 'src/shell_head.html').read_text(encoding='utf-8')

# indicators loader: the endpoint now returns the sheet as a 2D array of display values
start = page.index("    const a = typeof answer === 'string' ? JSON.parse(answer) : answer;\n    if (!a || typeof a.content")
end = page.index("    const hi = table.findIndex(")
page = page[:start] + ("    const table = answer;\n"
    "    if (!Array.isArray(table) || !table.length) throw new Error('「照護組指標」工作表沒有讀到資料。');\n") + page[end:]
page = page.replace("dash.loader('indicators', {\n  description: '把試算表匯出的 CSV（base64）解碼，依欄位位置命名，並把數字與百分比轉成數值。',",
                    "dash.loader('indicators', {\n  description: '依欄位位置命名「照護組指標」的各欄，並把數字與百分比轉成數值。',")
page = page.replace('<p class="ph-foot">', '<p class="ph-foot"><span id="ph-sync"></span><br>', 1)
assert "atob(" not in page
out = head + page + "\n</div>\n</body>\n</html>\n"
(root / 'site').mkdir(exist_ok=True)
(root / 'site/index.html').write_text(out, encoding='utf-8')
print('wrote', len(out.encode()), 'bytes')
