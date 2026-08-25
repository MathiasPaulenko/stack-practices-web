import os, glob

files = glob.glob('dist/**/*', recursive=True)
by_ext = {}
for f in files:
    if os.path.isfile(f):
        ext = os.path.splitext(f)[1].lower() or '(none)'
        by_ext.setdefault(ext, {'count': 0, 'size': 0})
        by_ext[ext]['count'] += 1
        by_ext[ext]['size'] += os.path.getsize(f)

for ext in sorted(by_ext, key=lambda x: -by_ext[x]['size']):
    info = by_ext[ext]
    print(f'{ext:10s} count={info["count"]:6d} size={info["size"]/1024:8.1f} KB')
