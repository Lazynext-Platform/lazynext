#!/usr/bin/env python3
"""Add legal section to each locale block in messages.ts from legal-translations.json."""
import json, re
from pathlib import Path

MSG = Path(__file__).resolve().parent.parent / "src" / "i18n" / "messages.ts"
LEGAL = Path(__file__).resolve().parent / "legal-translations.json"

legal = json.loads(LEGAL.read_text(encoding="utf-8"))
text = MSG.read_text(encoding="utf-8")
lines = text.split('\n')

# For each locale, find the seo: { ... } block and insert legal: { ... } right after it
new_lines = []
i = 0
while i < len(lines):
    new_lines.append(lines[i])

    # Check if this line starts a seo: { block (4-space indent)
    if re.match(r'^    seo: \{', lines[i]):
        # Find the locale we're in
        locale = None
        for j in range(i - 1, max(i - 600, -1), -1):
            m = re.match(r'^  (\w+): \{', lines[j])
            if m:
                locale = m.group(1)
                break

        if locale and locale in legal:
            # Find the closing "    }," of the seo block
            for j in range(i + 1, min(i + 20, len(lines))):
                if lines[j].rstrip() == '    },':
                    # Insert legal block after this line
                    # Check if legal already exists
                    already_has = False
                    for k in range(j + 1, min(j + 5, len(lines))):
                        if 'legal:' in lines[k]:
                            already_has = True
                            break

                    if not already_has:
                        legal_data = legal[locale]
                        legal_lines = ['    legal: {']
                        for section in ['terms', 'privacy']:
                            legal_lines.append(f'      {section}: {{')
                            for key, val in legal_data[section].items():
                                # Escape single quotes in values
                                escaped = val.replace("\\", "\\\\").replace("'", "\\'")
                                legal_lines.append(f"        {key}: '{escaped}',")
                            legal_lines.append('      },')
                        legal_lines.append('    },')
                        new_lines.extend(legal_lines)
                    break

    i += 1

MSG.write_text('\n'.join(new_lines), encoding="utf-8")
print(f"Done. Added legal sections to messages.ts")
