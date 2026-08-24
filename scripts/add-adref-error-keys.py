#!/usr/bin/env python3
"""Add errFileTooLarge, errUploadFailed, errTimeout to adRef sections in all 13 locales."""
import re
from pathlib import Path

MSG = Path(__file__).resolve().parent.parent / "src" / "i18n" / "messages.ts"

TRANSLATIONS = {
    "en": ("File too large", "Upload failed", "Generation timed out, please try again"),
    "zh": ("文件过大", "上传失败", "生成超时,请重试"),
    "ja": ("ファイルが大きすぎます", "アップロード失敗", "生成がタイムアウトしました。再試行してください"),
    "es": ("Archivo demasiado grande", "Error de subida", "Generación agotada, intente de nuevo"),
    "ko": ("파일이 너무 큽니다", "업로드 실패", "생성 시간 초과, 다시 시도하세요"),
    "pt": ("Arquivo muito grande", "Falha no upload", "Geração expirou, tente novamente"),
    "fr": ("Fichier trop volumineux", "Échec du téléversement", "Génération expirée, veuillez réessayer"),
    "de": ("Datei zu groß", "Upload fehlgeschlagen", "Zeitüberschreitung bei der Generierung, bitte erneut versuchen"),
    "ar": ("الملف كبير جدًا", "فشل الرفع", "انتهت مهلة التوليد، يرجى إعادة المحاولة"),
    "hi": ("फ़ाइल बहुत बड़ी है", "अपलोड विफल", "जनरेशन समय समाप्त, कृपया पुनः प्रयास करें"),
    "vi": ("Tệp quá lớn", "Tải lên thất bại", "Hết thời gian tạo, vui lòng thử lại"),
    "th": ("ไฟล์ใหญ่เกินไป", "อัปโหลดล้มเหลว", "หมดเวลาสร้าง โปรดลองอีกครั้ง"),
    "id": ("File terlalu besar", "Upload gagal", "Generasi habis waktu, coba lagi"),
}

text = MSG.read_text(encoding="utf-8")
lines = text.split("\n")

new_lines = []
i = 0
added = 0

while i < len(lines):
    new_lines.append(lines[i])

    if re.match(r'^    adRef: \{', lines[i]):
        locale = None
        for j in range(i, -1, -1):
            m = re.match(r'^  ([a-z]{2}): \{', lines[j])
            if m:
                locale = m.group(1)
                break

        if locale and locale in TRANSLATIONS and "errFileTooLarge:" not in "\n".join(lines[i:i+30]):
            file_too_large, upload_failed, timeout = TRANSLATIONS[locale]
            # Escape apostrophes
            file_too_large = file_too_large.replace("'", "\\'")
            upload_failed = upload_failed.replace("'", "\\'")
            timeout = timeout.replace("'", "\\'")
            new_lines.append(f"      errFileTooLarge: '{file_too_large}',")
            new_lines.append(f"      errUploadFailed: '{upload_failed}',")
            new_lines.append(f"      errTimeout: '{timeout}',")
            added += 1

    i += 1

MSG.write_text("\n".join(new_lines), encoding="utf-8")
print(f"Added error keys to {added} locales")
