#!/usr/bin/env python3
"""Add vi, th, id locale blocks to messages.ts by cloning the English block
as a structural fallback. Real translations should be filled in later."""

import re
from pathlib import Path

PATH = Path(__file__).resolve().parent.parent / "src" / "i18n" / "messages.ts"
text = PATH.read_text(encoding="utf-8")
lines = text.splitlines(keepends=True)

# Find the messages object: starts at "export const messages" line.
# Find the appMessages object: starts at "export const appMessages" line.

def find_line(needle, start=0):
    for i in range(start, len(lines)):
        if needle in lines[i]:
            return i
    return -1

msg_start = find_line("export const messages")
app_start = find_line("export const appMessages")

# Locate the en: { ... }, block within messages (top-level key).
def find_locale_block(start_idx, locale):
    """Return (start_line_idx, end_line_idx) of the top-level `locale: {` block.
    end_line_idx is the line containing the matching closing `},` at column 2."""
    for i in range(start_idx, len(lines)):
        # Match top-level key like "  en: {"
        if re.match(rf"^  {re.escape(locale)}: \{{\s*$", lines[i]):
            block_start = i
            # Now find the closing brace at indent level 2: a line that is "  }," or "  }" followed by "};"
            depth = 1
            for j in range(i + 1, len(lines)):
                # Count braces on this line (very rough but works for this file)
                # We look for a line that is exactly "  }," or "  }" at top level
                stripped = lines[j].rstrip()
                if stripped == "  }," or stripped == "  }":
                    return block_start, j
            raise RuntimeError(f"No closing brace for {locale}")
    raise RuntimeError(f"Locale {locale} not found")

# messages en block
msg_en_start, msg_en_end = find_locale_block(msg_start, "en")
# appMessages en block
app_en_start, app_en_end = find_locale_block(app_start, "en")

msg_en_block = "".join(lines[msg_en_start:msg_en_end + 1])
app_en_block = "".join(lines[app_en_start:app_en_end + 1])

def make_block(en_block, locale):
    """Replace the leading `en: {` with `locale: {`."""
    return re.sub(r"^  en: \{", f"  {locale}: {{", en_block, count=1)

# We need to insert vi, th, id blocks right before the closing `};` of each object.
# Find the closing `};` for messages: it's the line after the last locale block end.
# Actually the structure is:
#   hi: {
#     ...
#   },
# };
# So the `};` line is msg_en_end... no. Let's find the `};` after the last locale.

# For messages: the last locale is `hi`. Find its end.
msg_hi_start, msg_hi_end = find_locale_block(msg_start, "hi")
app_hi_start, app_hi_end = find_locale_block(app_start, "hi")

# The closing `};` is the next line after msg_hi_end.
assert lines[msg_hi_end].strip() == "},", "Expected closing at %d: %r" % (msg_hi_end, lines[msg_hi_end])
assert lines[app_hi_end].strip() == "},", "Expected closing at %d: %r" % (app_hi_end, lines[app_hi_end])

# Build new blocks for vi, th, id (clone of en).
new_locale_blocks = []
for loc in ["vi", "th", "id"]:
    new_locale_blocks.append(make_block(msg_en_block, loc))

new_app_blocks = []
for loc in ["vi", "th", "id"]:
    new_app_blocks.append(make_block(app_en_block, loc))

# Insert after the hi block end (which is the `},` line), before the `};` line.
# We insert the new blocks right after msg_hi_end line.
insert_text = "".join(new_locale_blocks)
# Reconstruct messages portion: lines up to and including msg_hi_end, then new blocks, then rest.
new_lines = lines[:msg_hi_end + 1] + [insert_text] + lines[msg_hi_end + 1:]

# Recompute app_hi_end offset because we inserted text.
offset = len(insert_text)
app_hi_end_new = app_hi_end + offset // 1  # approximate; but we inserted a single string element
# Actually new_lines has one extra element (the big string). Let's be precise.
# Easier: rebuild by finding app_hi_end in new_lines.
# Find app_hi_end in new_lines by searching for the `};` after appMessages.
# Re-locate appMessages start in new_lines.
app_start_new = -1
for i, ln in enumerate(new_lines):
    if "export const appMessages" in ln:
        app_start_new = i
        break
# Find hi block end in new_lines
_, app_hi_end_new = find_locale_block(app_start_new, "hi", ) if False else (None, None)
# Use the function but on new_lines
def find_locale_block_in(lst, start_idx, locale):
    for i in range(start_idx, len(lst)):
        if re.match(rf"^  {re.escape(locale)}: \{{\s*$", lst[i]):
            block_start = i
            for j in range(i + 1, len(lst)):
                stripped = lst[j].rstrip()
                if stripped == "  }," or stripped == "  }":
                    return block_start, j
            raise RuntimeError(f"No closing brace for {locale}")
    raise RuntimeError(f"Locale {locale} not found")

app_hi_start_new, app_hi_end_new = find_locale_block_in(new_lines, app_start_new, "hi")

insert_app_text = "".join(new_app_blocks)
final_lines = new_lines[:app_hi_end_new + 1] + [insert_app_text] + new_lines[app_hi_end_new + 1:]

PATH.write_text("".join(final_lines), encoding="utf-8")
print(f"Done. New line count: {len(final_lines)}")
