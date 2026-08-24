#!/usr/bin/env python3
"""Add errGeneric, errUploadFailed, errTimeout to drama and adRef sections."""
import re
from pathlib import Path

MSG = Path(__file__).resolve().parent.parent / "src" / "i18n" / "messages.ts"

TRANSLATIONS = {
    "en": {
        "drama_errGeneric": "Something went wrong: {code}",
        "drama_errUploadFailed": "Upload failed",
        "drama_errTimeout": "Generation timed out, please try again",
        "adRef_errGeneric": "Something went wrong: {code}",
    },
    "zh": {
        "drama_errGeneric": "出错了:{code}",
        "drama_errUploadFailed": "上传失败",
        "drama_errTimeout": "生成超时,请重试",
        "adRef_errGeneric": "出错了:{code}",
    },
    "ja": {
        "drama_errGeneric": "エラーが発生しました:{code}",
        "drama_errUploadFailed": "アップロード失敗",
        "drama_errTimeout": "生成がタイムアウトしました。再試行してください",
        "adRef_errGeneric": "エラーが発生しました:{code}",
    },
    "es": {
        "drama_errGeneric": "Algo salió mal: {code}",
        "drama_errUploadFailed": "Error de subida",
        "drama_errTimeout": "Generación agotada, intente de nuevo",
        "adRef_errGeneric": "Algo salió mal: {code}",
    },
    "ko": {
        "drama_errGeneric": "문제가 발생했습니다: {code}",
        "drama_errUploadFailed": "업로드 실패",
        "drama_errTimeout": "생성 시간 초과, 다시 시도하세요",
        "adRef_errGeneric": "문제가 발생했습니다: {code}",
    },
    "pt": {
        "drama_errGeneric": "Algo deu errado: {code}",
        "drama_errUploadFailed": "Falha no upload",
        "drama_errTimeout": "Geração expirou, tente novamente",
        "adRef_errGeneric": "Algo deu errado: {code}",
    },
    "fr": {
        "drama_errGeneric": "Une erreur s'est produite : {code}",
        "drama_errUploadFailed": "Échec du téléversement",
        "drama_errTimeout": "Génération expirée, veuillez réessayer",
        "adRef_errGeneric": "Une erreur s'est produite : {code}",
    },
    "de": {
        "drama_errGeneric": "Etwas ist schiefgelaufen: {code}",
        "drama_errUploadFailed": "Upload fehlgeschlagen",
        "drama_errTimeout": "Zeitüberschreitung bei der Generierung, bitte erneut versuchen",
        "adRef_errGeneric": "Etwas ist schiefgelaufen: {code}",
    },
    "ar": {
        "drama_errGeneric": "حدث خطأ: {code}",
        "drama_errUploadFailed": "فشل الرفع",
        "drama_errTimeout": "انتهت مهلة التوليد، يرجى إعادة المحاولة",
        "adRef_errGeneric": "حدث خطأ: {code}",
    },
    "hi": {
        "drama_errGeneric": "कुछ गलत हुआ: {code}",
        "drama_errUploadFailed": "अपलोड विफल",
        "drama_errTimeout": "जनरेशन समय समाप्त, कृपया पुनः प्रयास करें",
        "adRef_errGeneric": "कुछ गलत हुआ: {code}",
    },
    "vi": {
        "drama_errGeneric": "Đã xảy ra lỗi: {code}",
        "drama_errUploadFailed": "Tải lên thất bại",
        "drama_errTimeout": "Hết thời gian tạo, vui lòng thử lại",
        "adRef_errGeneric": "Đã xảy ra lỗi: {code}",
    },
    "th": {
        "drama_errGeneric": "เกิดข้อผิดพลาด: {code}",
        "drama_errUploadFailed": "อัปโหลดล้มเหลว",
        "drama_errTimeout": "หมดเวลาสร้าง โปรดลองอีกครั้ง",
        "adRef_errGeneric": "เกิดข้อผิดพลาด: {code}",
    },
    "id": {
        "drama_errGeneric": "Terjadi kesalahan: {code}",
        "drama_errUploadFailed": "Upload gagal",
        "drama_errTimeout": "Generasi habis waktu, coba lagi",
        "adRef_errGeneric": "Terjadi kesalahan: {code}",
    },
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
        locale = None
        for j in range(i, -1, -1):
            m = re.match(r'^  ([a-z]{2}): \{', lines[j])
            if m:
                locale = m.group(1)
                break

        if locale and locale in TRANSLATIONS and "errGeneric:" not in "\n".join(lines[i:i+30]):
            tr = TRANSLATIONS[locale]
            new_lines.append(f"      errGeneric: '{tr['drama_errGeneric']}',")
            new_lines.append(f"      errUploadFailed: '{tr['drama_errUploadFailed']}',")
            new_lines.append(f"      errTimeout: '{tr['drama_errTimeout']}',")
            added_drama += 1

    # Detect "    adRef: {" lines - add errGeneric if missing
    if re.match(r'^    adRef: \{', lines[i]):
        locale = None
        for j in range(i, -1, -1):
            m = re.match(r'^  ([a-z]{2}): \{', lines[j])
            if m:
                locale = m.group(1)
                break

        if locale and locale in TRANSLATIONS and "errGeneric:" not in "\n".join(lines[i:i+30]):
            tr = TRANSLATIONS[locale]
            new_lines.append(f"      errGeneric: '{tr['adRef_errGeneric']}',")
            added_adref += 1

    i += 1

MSG.write_text("\n".join(new_lines), encoding="utf-8")
print(f"Added drama error keys to {added_drama} locales, adRef errGeneric to {added_adref} locales")
