#!/usr/bin/env python3
"""Add kicker keys to drama and adRef sections in all 13 locales."""
import re
from pathlib import Path

MSG = Path(__file__).resolve().parent.parent / "src" / "i18n" / "messages.ts"

KICKERS = {
    "en": ("Drama Studio", "Reference to Ad"),
    "zh": ("短剧工作室", "爆款复刻"),
    "ja": ("ドラマスタジオ", "広告リメイク"),
    "es": ("Estudio de Drama", "Referencia a Anuncio"),
    "ko": ("드라마 스튜디오", "광고 참조"),
    "pt": ("Estúdio de Drama", "Referência a Anúncio"),
    "fr": ("Studio de Drame", "Référence à l'Annonce"),
    "de": ("Drama-Studio", "Anzeigenreferenz"),
    "ar": ("استوديو الدراما", "مرجع الإعلان"),
    "hi": ("ड्रामा स्टूडियो", "विज्ञापन संदर्भ"),
    "vi": ("Studio Kịch", "Tham Chiếu Quảng Cáo"),
    "th": ("สตูดิโอดราม่า", "อ้างอิงโฆษณา"),
    "id": ("Studio Drama", "Referensi Iklan"),
}

text = MSG.read_text(encoding="utf-8")
lines = text.split("\n")

new_lines = []
i = 0
added_drama = 0
added_adref = 0

while i < len(lines):
    new_lines.append(lines[i])

    # Detect "    drama: {" lines
    if re.match(r'^    drama: \{', lines[i]):
        # Find locale
        locale = None
        for j in range(i, -1, -1):
            m = re.match(r'^  ([a-z]{2}): \{', lines[j])
            if m:
                locale = m.group(1)
                break

        if locale and locale in KICKERS and "kicker:" not in "\n".join(lines[i:i+5]):
            drama_kicker, _ = KICKERS[locale]
            # Escape apostrophes
            drama_kicker = drama_kicker.replace("'", "\\'")
            new_lines.append(f"      kicker: '{drama_kicker}',")
            added_drama += 1

    # Detect "    adRef: {" lines
    if re.match(r'^    adRef: \{', lines[i]):
        # Find locale
        locale = None
        for j in range(i, -1, -1):
            m = re.match(r'^  ([a-z]{2}): \{', lines[j])
            if m:
                locale = m.group(1)
                break

        if locale and locale in KICKERS and "kicker:" not in "\n".join(lines[i:i+5]):
            _, adref_kicker = KICKERS[locale]
            # Escape apostrophes
            adref_kicker = adref_kicker.replace("'", "\\'")
            new_lines.append(f"      kicker: '{adref_kicker}',")
            added_adref += 1

    i += 1

MSG.write_text("\n".join(new_lines), encoding="utf-8")
print(f"Added drama.kicker to {added_drama} locales, adRef.kicker to {added_adref} locales")
