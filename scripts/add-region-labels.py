#!/usr/bin/env python3
"""Add region group labels to the country section of each locale block."""

from pathlib import Path
import re

PATH = Path(__file__).resolve().parent.parent / "src" / "i18n" / "messages.ts"
text = PATH.read_text(encoding="utf-8")
lines = text.split('\n')

# Region translations per locale
REGION_TRANSLATIONS = {
    'en': ('Asia', 'Middle East', 'Europe', 'Americas', 'Africa', 'Oceania'),
    'zh': ('亚洲', '中东', '欧洲', '美洲', '非洲', '大洋洲'),
    'ja': ('アジア', '中東', 'ヨーロッパ', 'アメリカ', 'アフリカ', 'オセアニア'),
    'es': ('Asia', 'Oriente Medio', 'Europa', 'Américas', 'África', 'Oceanía'),
    'ko': ('아시아', '중동', '유럽', '아메리카', '아프리카', '오세아니아'),
    'pt': ('Ásia', 'Oriente Médio', 'Europa', 'Américas', 'África', 'Oceania'),
    'fr': ('Asie', 'Moyen-Orient', 'Europe', 'Amériques', 'Afrique', 'Océanie'),
    'de': ('Asien', 'Naher Osten', 'Europa', 'Amerikas', 'Afrika', 'Ozeanien'),
    'ar': ('آسيا', 'الشرق الأوسط', 'أوروبا', 'الأمريكتان', 'أفريقيا', 'أوقيانوسيا'),
    'hi': ('एशिया', 'मध्य पूर्व', 'यूरोप', 'अमेरिका', 'अफ्रीका', 'ओशिनिया'),
    'vi': ('Châu Á', 'Trung Đông', 'Châu Âu', 'Châu Mỹ', 'Châu Phi', 'Châu Úc'),
    'th': ('เอเชีย', 'ตะวันออกกลาง', 'ยุโรป', 'อเมริกา', 'แอฟริกา', 'โอเชียเนีย'),
    'id': ('Asia', 'Timur Tengah', 'Eropa', 'Amerika', 'Afrika', 'Oseania'),
}

# Find all locale blocks and their country sections
# Pattern: find lines with "    country: {" and the closing "    }," that has "saved:" before it
new_lines = []
i = 0
while i < len(lines):
    line = lines[i]
    new_lines.append(line)

    # Check if this is a country: { line (indented with 4 spaces)
    if re.match(r'^    country: \{', line):
        # Find the closing brace (the next line with exactly "    },")
        # and check if it has "saved:" before it (to confirm it's the country section)
        # Also determine which locale we're in
        # Find the locale by looking backwards for "  xx: {"
        locale = None
        for j in range(i - 1, max(i - 600, -1), -1):
            m = re.match(r'^  (\w+): \{', lines[j])
            if m:
                locale = m.group(1)
                break

        if locale and locale in REGION_TRANSLATIONS:
            # Find the closing "    }," of this country block
            close_idx = None
            for j in range(i + 1, min(i + 20, len(lines))):
                if lines[j].rstrip() == '    },':
                    close_idx = j
                    break

            if close_idx and locale != 'en':  # en already has the labels
                # Check if region labels already exist
                block_text = '\n'.join(lines[i:close_idx])
                if 'regionAsia' not in block_text:
                    # Insert region labels before the closing brace
                    regions = REGION_TRANSLATIONS[locale]
                    region_lines = [
                        f"      regionAsia: '{regions[0]}',",
                        f"      regionMiddleEast: '{regions[1]}',",
                        f"      regionEurope: '{regions[2]}',",
                        f"      regionAmericas: '{regions[3]}',",
                        f"      regionAfrica: '{regions[4]}',",
                        f"      regionOceania: '{regions[5]}',",
                    ]
                    # Insert before close_idx
                    for rl in region_lines:
                        new_lines.append(rl)

    i += 1

PATH.write_text('\n'.join(new_lines), encoding="utf-8")
print("Done. Added region labels to all locale blocks.")
