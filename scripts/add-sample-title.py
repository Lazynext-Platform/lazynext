#!/usr/bin/env python3
"""Add sampleTitle key to adSkit sections in all 13 locales."""
import re
from pathlib import Path

MSG = Path(__file__).resolve().parent.parent / "src" / "i18n" / "messages.ts"

TITLES = {
    "en": "Insulated Tumbler",
    "zh": "保温杯",
    "ja": "断熱タンブラー",
    "es": "Vaso Térmico",
    "ko": "보온 텀블러",
    "pt": "Copo Térmico",
    "fr": "Gobelet Isotherme",
    "de": "Isolierbecher",
    "ar": "كوب معزول",
    "hi": "इन्सुलेटेड टम्बलर",
    "vi": "Cốc Giữ Nhiệt",
    "th": "แก้วเก็บความร้อน",
    "id": "Tumbler Insulasi",
}

text = MSG.read_text(encoding="utf-8")
lines = text.split("\n")

new_lines = []
i = 0
added = 0

while i < len(lines):
    new_lines.append(lines[i])

    if re.match(r'^    adSkit: \{', lines[i]):
        locale = None
        for j in range(i, -1, -1):
            m = re.match(r'^  ([a-z]{2}): \{', lines[j])
            if m:
                locale = m.group(1)
                break

        if locale and locale in TITLES and "sampleTitle:" not in "\n".join(lines[i:i+30]):
            title = TITLES[locale].replace("'", "\\'")
            new_lines.append(f"      sampleTitle: '{title}',")
            added += 1

    i += 1

MSG.write_text("\n".join(new_lines), encoding="utf-8")
print(f"Added sampleTitle to {added} locales")
