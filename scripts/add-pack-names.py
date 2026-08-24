#!/usr/bin/env python3
"""Add packStarter/packPro/packElite keys to multi-line pricing sections."""
import re
from pathlib import Path

MSG = Path(__file__).resolve().parent.parent / "src" / "i18n" / "messages.ts"

PACK_NAMES = {
    "en": ("Starter", "Pro", "Elite"),
    "zh": ("入门版", "专业版", "旗舰版"),
    "ja": ("スターター", "プロ", "エリート"),
    "es": ("Inicial", "Pro", "Élite"),
    "ko": ("스타터", "프로", "엘리트"),
    "pt": ("Inicial", "Pro", "Elite"),
    "fr": ("Débutant", "Pro", "Élite"),
    "de": ("Starter", "Pro", "Elite"),
    "ar": ("المبتدئ", "احترافي", "نخبة"),
    "hi": ("स्टार्टर", "प्रो", "एलीट"),
    "vi": ("Khởi đầu", "Pro", "Elite"),
    "th": ("เริ่มต้น", "โปร", "อีลิต"),
    "id": ("Pemula", "Pro", "Elite"),
}

text = MSG.read_text(encoding="utf-8")
lines = text.split("\n")

new_lines = []
i = 0
added = 0

while i < len(lines):
    new_lines.append(lines[i])

    # Detect "    pricing: {" lines
    if re.match(r'^    pricing: \{', lines[i]):
        # Find the locale by looking back
        locale = None
        for j in range(i, -1, -1):
            m = re.match(r'^  ([a-z]{2}): \{', lines[j])
            if m:
                locale = m.group(1)
                break

        if locale and locale in PACK_NAMES and "packStarter" not in "\n".join(lines[i:i+20]):
            # Find the closing "    }," of this pricing block
            for j in range(i + 1, min(i + 30, len(lines))):
                if lines[j].rstrip() == "    },":
                    starter, pro, elite = PACK_NAMES[locale]
                    # Insert pack keys before the closing brace
                    new_lines.append(f"      packStarter: '{starter}',")
                    new_lines.append(f"      packPro: '{pro}',")
                    new_lines.append(f"      packElite: '{elite}',")
                    added += 1
                    break

    i += 1

MSG.write_text("\n".join(new_lines), encoding="utf-8")
print(f"Added pack names to {added} pricing sections")
