# Make a standalone copy of a built kb page: inline its CSS, drop the JS.
# The page is prerendered, so the HTML already holds every table and number.
import re, sys, pathlib
src, out = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
t = src.read_text()
def css(m):
    href = re.search(r'href="([^"]+)"', m.group(0)).group(1)
    return '<style>' + (src.parent / href).resolve().read_text() + '</style>'
t = re.sub(r'<link[^>]*rel="stylesheet"[^>]*>', css, t)
t = re.sub(r'<link[^>]*rel="modulepreload"[^>]*>', '', t)
t = re.sub(r'<script.*?</script>', '', t, flags=re.S)
out.write_text(t)
print(out, len(t), re.findall(r'(?:href|src)="([^"]+)"', t))
