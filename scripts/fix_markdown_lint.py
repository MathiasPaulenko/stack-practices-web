#!/usr/bin/env python3
"""Post-process generated markdown reports to reduce common markdownlint warnings."""
import re
import sys
from pathlib import Path

def fix_bare_urls(text):
    pattern = r'(?<![\[(<`])https?://[^\s<>\]`]+(?![\])>])'
    return re.sub(pattern, r'<\g<0>>', text)

def is_list_item(line):
    return bool(re.match(r'^[\*\-\+\d]\s', line))

def normalize_blank_lines(lines):
    out = []
    for i, line in enumerate(lines):
        if line.strip() == "":
            prev = next((l for l in reversed(lines[:i]) if l.strip() != ""), "")
            nxt = next((l for l in lines[i+1:] if l.strip() != ""), "")
            if is_list_item(prev) and is_list_item(nxt):
                continue
        out.append(line)
    return out

def ensure_blanks_around_blocks(lines):
    out = []
    in_list = False
    for i, line in enumerate(lines):
        is_heading = re.match(r'^#{1,6}\s', line)
        is_list = is_list_item(line)
        is_blank = line.strip() == ""

        if is_heading:
            if out and out[-1].strip() != "":
                out.append("")
            out.append(line)
            if i < len(lines) - 1 and lines[i+1].strip() != "":
                out.append("")
            in_list = False
            continue

        if is_list:
            if not in_list:
                if out and out[-1].strip() != "":
                    out.append("")
                in_list = True
            out.append(line)
            continue

        if is_blank:
            in_list = False

        if in_list and not is_blank and not is_list:
            if out and out[-1].strip() != "":
                out.append("")
            in_list = False

        out.append(line)
    return out

def process_file(path):
    text = path.read_text(encoding='utf-8')
    text = text.rstrip() + "\n"
    text = fix_bare_urls(text)
    lines = text.splitlines()
    lines = normalize_blank_lines(lines)
    lines = ensure_blanks_around_blocks(lines)
    text = "\n".join(lines).rstrip() + "\n"
    text = re.sub(r'\n{3,}', '\n\n', text)
    path.write_text(text, encoding='utf-8')
    print(f"Processed {path}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        paths = [Path(p) for p in sys.argv[1:]]
    else:
        paths = list(Path("D:/Codigo/stack-practices-web/ref").rglob("*")) if False else []
        # default to all generated audit dirs
        paths = []
        for d in ["forensic-audit", "googlebot-forensic-audit", "helpful-content-forensic-audit", "content-audit", "validation-audit"]:
            paths.extend((Path(f"D:/Codigo/stack-practices-web/ref/{d}")).glob("*.md"))
    for p in paths:
        process_file(p)
