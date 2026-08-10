import re
from pathlib import Path

def is_table_row(line):
    return line.strip().startswith('|') and line.strip().endswith('|')

def is_separator(cells):
    return all(re.fullmatch(r'[-:]+', c.strip()) for c in cells)

def format_row(cells):
    return '| ' + ' | '.join(cells) + ' |'

def normalize_cell(cell):
    return cell.strip()

def process_file(p):
    text = p.read_text(encoding='utf-8-sig')
    lines = text.splitlines()
    out = []
    i = 0
    while i < len(lines):
        line = lines[i]
        if not is_table_row(line):
            out.append(line)
            i += 1
            continue
        block = [line]
        j = i + 1
        while j < len(lines) and is_table_row(lines[j]):
            block.append(lines[j])
            j += 1

        parsed = []
        for row in block:
            parts = row.strip().split('|')[1:-1]
            parsed.append([normalize_cell(part) for part in parts])

        if len(parsed) >= 2 and is_separator(parsed[1]):
            header = parsed[0]
            num_cols = len(header)
            formatted_rows = []
            for ridx, r in enumerate(parsed):
                if ridx == 1:
                    cells = [('-' * max(3, len(header[c]))) for c in range(num_cols)]
                else:
                    cells = [r[c] if c < len(r) else '' for c in range(num_cols)]
                formatted_rows.append(format_row(cells))
            out.extend(formatted_rows)
        else:
            out.extend(block)
        i = j

    p.write_text('\n'.join(out) + '\n', encoding='utf-8')
    print(f'formatted {p}')

for p in Path('D:/Codigo/stack-practices-web/ref/recovery').glob('*.md'):
    process_file(p)
