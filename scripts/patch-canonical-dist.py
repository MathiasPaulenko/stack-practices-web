from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / 'dist'

def patch_root_home():
    p = ROOT / 'index.html'
    text = p.read_text(encoding='utf-8')
    text = text.replace('"https://stackpractices.com"', '"https://stackpractices.com/"', 1)
    p.write_text(text, encoding='utf-8')
    print('Patched', p)

def patch_es_home():
    p = ROOT / 'es' / 'index.html'
    text = p.read_text(encoding='utf-8')
    text = text.replace('"https://stackpractices.com/es"', '"https://stackpractices.com/es/"', 1)
    p.write_text(text, encoding='utf-8')
    print('Patched', p)

if __name__ == '__main__':
    patch_root_home()
    patch_es_home()
