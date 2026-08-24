#!/usr/bin/env python3
"""Add notFound and error sections to all 13 locales in messages.ts."""
import re
from pathlib import Path

MSG = Path(__file__).resolve().parent.parent / "src" / "i18n" / "messages.ts"

# Translations for notFound and error sections
TRANSLATIONS = {
    "en": {
        "notFound": {
            "title": "Page not found",
            "desc": "The page you're looking for doesn't exist or has been moved.",
            "back": "← Back to home",
        },
        "error": {
            "title": "Something went wrong",
            "desc": "An unexpected error occurred. Please try again.",
            "retry": "Try again",
            "back": "← Back to home",
        },
    },
    "zh": {
        "notFound": {
            "title": "页面未找到",
            "desc": "您查找的页面不存在或已被移动。",
            "back": "← 返回首页",
        },
        "error": {
            "title": "出错了",
            "desc": "发生了意外错误，请重试。",
            "retry": "重试",
            "back": "← 返回首页",
        },
    },
    "ja": {
        "notFound": {
            "title": "ページが見つかりません",
            "desc": "お探しのページは存在しないか、移動されました。",
            "back": "← ホームに戻る",
        },
        "error": {
            "title": "エラーが発生しました",
            "desc": "予期しないエラーが発生しました。もう一度お試しください。",
            "retry": "再試行",
            "back": "← ホームに戻る",
        },
    },
    "es": {
        "notFound": {
            "title": "Página no encontrada",
            "desc": "La página que buscas no existe o ha sido movida.",
            "back": "← Volver al inicio",
        },
        "error": {
            "title": "Algo salió mal",
            "desc": "Ocurrió un error inesperado. Por favor, inténtalo de nuevo.",
            "retry": "Reintentar",
            "back": "← Volver al inicio",
        },
    },
    "ko": {
        "notFound": {
            "title": "페이지를 찾을 수 없습니다",
            "desc": "찾으시는 페이지가 존재하지 않거나 이동되었습니다.",
            "back": "← 홈으로 돌아가기",
        },
        "error": {
            "title": "문제가 발생했습니다",
            "desc": "예기치 않은 오류가 발생했습니다. 다시 시도해 주세요.",
            "retry": "다시 시도",
            "back": "← 홈으로 돌아가기",
        },
    },
    "pt": {
        "notFound": {
            "title": "Página não encontrada",
            "desc": "A página que você procura não existe ou foi movida.",
            "back": "← Voltar ao início",
        },
        "error": {
            "title": "Algo deu errado",
            "desc": "Ocorreu um erro inesperado. Por favor, tente novamente.",
            "retry": "Tentar novamente",
            "back": "← Voltar ao início",
        },
    },
    "fr": {
        "notFound": {
            "title": "Page introuvable",
            "desc": "La page que vous recherchez n'existe pas ou a été déplacée.",
            "back": "← Retour à l'accueil",
        },
        "error": {
            "title": "Une erreur est survenue",
            "desc": "Une erreur inattendue s'est produite. Veuillez réessayer.",
            "retry": "Réessayer",
            "back": "← Retour à l'accueil",
        },
    },
    "de": {
        "notFound": {
            "title": "Seite nicht gefunden",
            "desc": "Die gesuchte Seite existiert nicht oder wurde verschoben.",
            "back": "← Zurück zur Startseite",
        },
        "error": {
            "title": "Etwas ist schiefgelaufen",
            "desc": "Ein unerwarteter Fehler ist aufgetreten. Bitte erneut versuchen.",
            "retry": "Erneut versuchen",
            "back": "← Zurück zur Startseite",
        },
    },
    "ar": {
        "notFound": {
            "title": "الصفحة غير موجودة",
            "desc": "الصفحة التي تبحث عنها غير موجودة أو تم نقلها.",
            "back": "→ العودة إلى الرئيسية",
        },
        "error": {
            "title": "حدث خطأ ما",
            "desc": "حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.",
            "retry": "إعادة المحاولة",
            "back": "→ العودة إلى الرئيسية",
        },
    },
    "hi": {
        "notFound": {
            "title": "पेज नहीं मिला",
            "desc": "आप जिस पेज की तलाश कर रहे हैं वह मौजूद नहीं है या स्थानांतरित कर दिया गया है।",
            "back": "← होम पर वापस जाएं",
        },
        "error": {
            "title": "कुछ गलत हो गया",
            "desc": "एक अप्रत्याशित त्रुटि हुई। कृपया पुनः प्रयास करें।",
            "retry": "पुनः प्रयास करें",
            "back": "← होम पर वापस जाएं",
        },
    },
    "vi": {
        "notFound": {
            "title": "Không tìm thấy trang",
            "desc": "Trang bạn đang tìm không tồn tại hoặc đã được di chuyển.",
            "back": "← Về trang chủ",
        },
        "error": {
            "title": "Đã xảy ra lỗi",
            "desc": "Đã xảy ra lỗi không mong muốn. Vui lòng thử lại.",
            "retry": "Thử lại",
            "back": "← Về trang chủ",
        },
    },
    "th": {
        "notFound": {
            "title": "ไม่พบหน้า",
            "desc": "หน้าที่คุณกำลังมองหาไม่มีอยู่หรือถูกย้ายแล้ว",
            "back": "← กลับหน้าหลัก",
        },
        "error": {
            "title": "เกิดข้อผิดพลาด",
            "desc": "เกิดข้อผิดพลาดที่ไม่คาดคิด กรุณาลองอีกครั้ง",
            "retry": "ลองอีกครั้ง",
            "back": "← กลับหน้าหลัก",
        },
    },
    "id": {
        "notFound": {
            "title": "Halaman tidak ditemukan",
            "desc": "Halaman yang Anda cari tidak ada atau telah dipindahkan.",
            "back": "← Kembali ke beranda",
        },
        "error": {
            "title": "Terjadi kesalahan",
            "desc": "Terjadi kesalahan tak terduga. Silakan coba lagi.",
            "retry": "Coba lagi",
            "back": "← Kembali ke beranda",
        },
    },
}

def js_string(s):
    """Convert a Python string to a JS single-quoted string literal."""
    return "'" + s.replace("\\", "\\\\").replace("'", "\\'") + "'"

def build_section(locale):
    t = TRANSLATIONS[locale]
    lines = []
    lines.append("    notFound: {")
    lines.append(f"      title: {js_string(t['notFound']['title'])},")
    lines.append(f"      desc: {js_string(t['notFound']['desc'])},")
    lines.append(f"      back: {js_string(t['notFound']['back'])},")
    lines.append("    },")
    lines.append("    error: {")
    lines.append(f"      title: {js_string(t['error']['title'])},")
    lines.append(f"      desc: {js_string(t['error']['desc'])},")
    lines.append(f"      retry: {js_string(t['error']['retry'])},")
    lines.append(f"      back: {js_string(t['error']['back'])},")
    lines.append("    },")
    return "\n".join(lines)

text = MSG.read_text(encoding="utf-8")
lines = text.split("\n")

new_lines = []
i = 0
added = 0
while i < len(lines):
    new_lines.append(lines[i])

    # After each cookie block closes (    },), insert notFound + error before the blank line + seo
    # Pattern: cookie block ends with "    }," followed by blank line then "    seo: {"
    if lines[i].rstrip() == "    }," and i + 2 < len(lines) and lines[i + 1].strip() == "" and re.match(r"^    seo: \{", lines[i + 2]):
        # Check we're after a cookie block by looking back for "cookie: {"
        found_cookie = False
        for j in range(i - 1, max(i - 10, -1), -1):
            if re.match(r"^    cookie: \{", lines[j]):
                found_cookie = True
                break
        if found_cookie:
            # Determine locale by finding the enclosing "  xx: {" block
            locale = None
            for j in range(i, -1, -1):
                m = re.match(r"^  ([a-z]{2}): \{", lines[j])
                if m:
                    locale = m.group(1)
                    break
            if locale and locale in TRANSLATIONS:
                new_lines.append("")
                new_lines.append(build_section(locale))
                added += 1

    i += 1

MSG.write_text("\n".join(new_lines), encoding="utf-8")
print(f"Added notFound + error sections to {added} locales")
