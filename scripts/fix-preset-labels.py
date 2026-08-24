#!/usr/bin/env python3
"""Fix untranslated format labels in vi/th/id locale blocks."""

from pathlib import Path

PATH = Path(__file__).resolve().parent.parent / "src" / "i18n" / "messages.ts"
text = PATH.read_text(encoding="utf-8")

# Map of (locale, old_label) -> new_label for format labels that were left in English
fixes = {
    # Vietnamese
    ("vi", "UGC Testimonial"): "UGC Cảm nhận",
    ("vi", "Direct-to-Camera"): "Nói thẳng Camera",
    ("vi", "Selfie Testimonial"): "Cảm nhận Selfie",
    ("vi", "Unboxing Reveal"): "Unboxing Tiết lộ",
    ("vi", "TV Spot"): "Quảng cáo TV",
    ("vi", "Camera POV"): "Camera POV",  # keep as-is (consistent with JA/KO)
    # Thai
    ("th", "UGC Testimonial"): "UGC รีวิว",
    ("th", "Direct-to-Camera"): "พูดตรงกล้อง",
    ("th", "Selfie Testimonial"): "รีวิวเซลฟี่",
    ("th", "Unboxing Reveal"): "เปิดกล่องเผย",
    ("th", "TV Spot"): "โฆษณา TV",
    ("th", "Camera POV"): "กล้อง POV",
    # Indonesian
    ("id", "UGC Testimonial"): "Testimoni UGC",
    ("id", "Direct-to-Camera"): "Langsung ke Kamera",
    ("id", "Selfie Testimonial"): "Testimoni Selfie",
    ("id", "Unboxing Reveal"): "Unboxing Pengungkapan",
    ("id", "TV Spot"): "Iklan TV",
    ("id", "Camera POV"): "Kamera POV",
}

lines = text.split('\n')
new_lines = []
for line in lines:
    new_line = line
    # Check if this line has a label that needs fixing
    for (loc, old_label), new_label in fixes.items():
        if f"label: '{old_label}'" in line:
            # Determine which locale block we're in by checking context
            # We need to only replace in the right locale block
            # Simple approach: check if the desc is in the target language
            # But easier: we know the line numbers from grep
            # Let's just check the desc language
            if loc == "vi" and any(c in line for c in ['đ', 'ả', 'ă', 'â', 'ê', 'ô', 'ơ', 'ư', 'ì', 'ỉ', 'ỏ', 'ụ', 'ủ']):
                new_line = line.replace(f"label: '{old_label}'", f"label: '{new_label}'")
            elif loc == "th" and any(c in line for c in ['ะ', 'ิ', 'ี', 'ุ', 'ู', 'เ', 'แ', 'โ', 'ใ', 'ไ']):
                new_line = line.replace(f"label: '{old_label}'", f"label: '{new_label}'")
            elif loc == "id" and any(c in line for c in ['ny', 'ng', 'kh', 'sy', 'be', 'ke', 'pe', 'te', 'me', 'se', 'di', 'ke']):
                # Indonesian - check for Indonesian words in desc
                if any(w in line for w in ['Selfie rekomendasi', 'Kreator bicara', 'Review selfie', 'Kegembiraan ritual', 'Kemewahan kelas', 'Produk terbang', 'Momen produk']):
                    new_line = line.replace(f"label: '{old_label}'", f"label: '{new_label}'")
    new_lines.append(new_line)

PATH.write_text('\n'.join(new_lines), encoding="utf-8")
print("Done. Fixed preset labels for vi/th/id.")
