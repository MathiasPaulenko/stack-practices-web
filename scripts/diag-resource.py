import re
import sys

path = sys.argv[1]
text = open(path, encoding="utf-8").read()
parts = text.split("---", 2)
body = parts[2] if len(parts) > 2 else text
words = re.findall(r"\b[\w]+\b", body)
print("Body words:", len(words))

em = body.count("—")
print("Em-dashes:", em)

fm = parts[1]
title_m = re.search(r'^title:\s*["\']?(.+?)["\']?\s*$', fm, re.MULTILINE)
if title_m:
    title = title_m.group(1).strip().strip('"').strip("'")
    print("Title:", repr(title), "len:", len(title))

md_m = re.search(r'^metaDescription:\s*(.+?)\s*$', fm, re.MULTILINE)
if md_m:
    md = md_m.group(1).strip().strip('"').strip("'")
    print("metaDescription:", repr(md), "len:", len(md))

desc_m = re.search(r'^description:\s*(.+?)\s*$', fm, re.MULTILINE)
if desc_m:
    desc = desc_m.group(1).strip().strip('"').strip("'")
    print("description:", repr(desc), "len:", len(desc))

body_links = re.findall(r"\]\((/[^)]+)\)", body)
print("Body links:", len(body_links))
for l in body_links:
    print("  -", l)

# Sections
sections = re.findall(r"^## (.+)$", body, re.MULTILINE)
print("Sections:", len(sections))
for s in sections:
    print("  -", s)
