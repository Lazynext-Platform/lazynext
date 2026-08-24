#!/usr/bin/env python3
"""Add missing i18n keys for remaining hardcoded strings across all 13 locales."""
import re
from pathlib import Path

MSG = Path(__file__).resolve().parent.parent / "src" / "i18n" / "messages.ts"

# New keys to add to the `common` section and other sections
# Format: { locale: { section: { key: value } } }
TRANSLATIONS = {
    "en": {
        "common": {
            "signOut": "Sign out", "credits": "Credits", "language": "Language",
            "switchLanguage": "Switch language", "currency": "Currency",
            "cookieConsent": "Cookie consent", "new": "NEW", "poweredBy": "Powered by",
            "back": "← Back", "backToLazynext": "← Lazynext", "coverage": "Coverage",
        },
        "deploy": {
            "vercelStack": "Next.js + Neon + Public Blob",
            "cfStack": "Workers + D1 + R2",
        },
        "pricing": {
            "packStarter": "Starter", "packPro": "Pro", "packElite": "Elite",
        },
        "appCat": {
            "production": "✅ Production-ready",
            "nocreative": "🟡 Works, no moat",
            "incomplete": "🔴 Incomplete",
            "productionDesc": "Real moat / multi-step pipeline",
            "nocreativeDesc": "Single-step generic model, easily replaced",
            "incompleteDesc": "Shell / text-only / mislabeled",
        },
    },
    "zh": {
        "common": {
            "signOut": "退出登录", "credits": "积分", "language": "语言",
            "switchLanguage": "切换语言", "currency": "货币",
            "cookieConsent": "Cookie 同意", "new": "新", "poweredBy": "技术支持",
            "back": "← 返回", "backToLazynext": "← Lazynext", "coverage": "覆盖范围",
        },
        "deploy": {
            "vercelStack": "Next.js + Neon + Public Blob",
            "cfStack": "Workers + D1 + R2",
        },
        "pricing": {
            "packStarter": "入门版", "packPro": "专业版", "packElite": "旗舰版",
        },
        "appCat": {
            "production": "✅ 生产就绪",
            "nocreative": "🟡 可用，无护城河",
            "incomplete": "🔴 未完成",
            "productionDesc": "真正的护城河 / 多步流水线",
            "nocreativeDesc": "单步通用模型，易被替代",
            "incompleteDesc": "外壳 / 纯文本 / 标签错误",
        },
    },
    "ja": {
        "common": {
            "signOut": "ログアウト", "credits": "クレジット", "language": "言語",
            "switchLanguage": "言語を切り替え", "currency": "通貨",
            "cookieConsent": "Cookie 同意", "new": "新着", "poweredBy": "Powered by",
            "back": "← 戻る", "backToLazynext": "← Lazynext", "coverage": "カバレッジ",
        },
        "deploy": {
            "vercelStack": "Next.js + Neon + Public Blob",
            "cfStack": "Workers + D1 + R2",
        },
        "pricing": {
            "packStarter": "スターター", "packPro": "プロ", "packElite": "エリート",
        },
        "appCat": {
            "production": "✅ 本番環境対応",
            "nocreative": "🟡 動作するが優位性なし",
            "incomplete": "🔴 未完成",
            "productionDesc": "真の優位性 / マルチステップパイプライン",
            "nocreativeDesc": "単一ステップの汎用モデル、容易に置き換え可能",
            "incompleteDesc": "シェル / テキストのみ / 誤ラベル",
        },
    },
    "es": {
        "common": {
            "signOut": "Cerrar sesión", "credits": "Créditos", "language": "Idioma",
            "switchLanguage": "Cambiar idioma", "currency": "Moneda",
            "cookieConsent": "Consentimiento de cookies", "new": "NUEVO", "poweredBy": "Desarrollado por",
            "back": "← Volver", "backToLazynext": "← Lazynext", "coverage": "Cobertura",
        },
        "deploy": {
            "vercelStack": "Next.js + Neon + Public Blob",
            "cfStack": "Workers + D1 + R2",
        },
        "pricing": {
            "packStarter": "Inicial", "packPro": "Pro", "packElite": "Élite",
        },
        "appCat": {
            "production": "✅ Listo para producción",
            "nocreative": "🟡 Funciona, sin ventaja",
            "incomplete": "🔴 Incompleto",
            "productionDesc": "Ventaja real / pipeline multi-paso",
            "nocreativeDesc": "Modelo genérico de un solo paso, fácilmente reemplazable",
            "incompleteDesc": "Shell / solo texto / mal etiquetado",
        },
    },
    "ko": {
        "common": {
            "signOut": "로그아웃", "credits": "크레딧", "language": "언어",
            "switchLanguage": "언어 변경", "currency": "통화",
            "cookieConsent": "쿠키 동의", "new": "신규", "poweredBy": "제공",
            "back": "← 돌아가기", "backToLazynext": "← Lazynext", "coverage": "커버리지",
        },
        "deploy": {
            "vercelStack": "Next.js + Neon + Public Blob",
            "cfStack": "Workers + D1 + R2",
        },
        "pricing": {
            "packStarter": "스타터", "packPro": "프로", "packElite": "엘리트",
        },
        "appCat": {
            "production": "✅ 프로덕션 준비 완료",
            "nocreative": "🟡 작동하지만 차별성 없음",
            "incomplete": "🔴 미완성",
            "productionDesc": "실제 차별성 / 다단계 파이프라인",
            "nocreativeDesc": "단일 단계 범용 모델, 쉽게 대체 가능",
            "incompleteDesc": "셸 / 텍스트 전용 / 잘못된 라벨",
        },
    },
    "pt": {
        "common": {
            "signOut": "Sair", "credits": "Créditos", "language": "Idioma",
            "switchLanguage": "Mudar idioma", "currency": "Moeda",
            "cookieConsent": "Consentimento de cookies", "new": "NOVO", "poweredBy": "Desenvolvido por",
            "back": "← Voltar", "backToLazynext": "← Lazynext", "coverage": "Cobertura",
        },
        "deploy": {
            "vercelStack": "Next.js + Neon + Public Blob",
            "cfStack": "Workers + D1 + R2",
        },
        "pricing": {
            "packStarter": "Inicial", "packPro": "Pro", "packElite": "Elite",
        },
        "appCat": {
            "production": "✅ Pronto para produção",
            "nocreative": "🟡 Funciona, sem diferencial",
            "incomplete": "🔴 Incompleto",
            "productionDesc": "Diferencial real / pipeline multi-etapa",
            "nocreativeDesc": "Modelo genérico de etapa única, facilmente substituível",
            "incompleteDesc": "Shell / apenas texto / rotulado incorretamente",
        },
    },
    "fr": {
        "common": {
            "signOut": "Déconnexion", "credits": "Crédits", "language": "Langue",
            "switchLanguage": "Changer de langue", "currency": "Devise",
            "cookieConsent": "Consentement aux cookies", "new": "NOUVEAU", "poweredBy": "Propulsé par",
            "back": "← Retour", "backToLazynext": "← Lazynext", "coverage": "Couverture",
        },
        "deploy": {
            "vercelStack": "Next.js + Neon + Public Blob",
            "cfStack": "Workers + D1 + R2",
        },
        "pricing": {
            "packStarter": "Débutant", "packPro": "Pro", "packElite": "Élite",
        },
        "appCat": {
            "production": "✅ Prêt pour la production",
            "nocreative": "🟡 Fonctionne, sans avantage",
            "incomplete": "🔴 Incomplet",
            "productionDesc": "Avantage réel / pipeline multi-étapes",
            "nocreativeDesc": "Modèle générique à étape unique, facilement remplaçable",
            "incompleteDesc": "Shell / texte uniquement / mal étiqueté",
        },
    },
    "de": {
        "common": {
            "signOut": "Abmelden", "credits": "Guthaben", "language": "Sprache",
            "switchLanguage": "Sprache wechseln", "currency": "Währung",
            "cookieConsent": "Cookie-Einwilligung", "new": "NEU", "poweredBy": "Unterstützt von",
            "back": "← Zurück", "backToLazynext": "← Lazynext", "coverage": "Abdeckung",
        },
        "deploy": {
            "vercelStack": "Next.js + Neon + Public Blob",
            "cfStack": "Workers + D1 + R2",
        },
        "pricing": {
            "packStarter": "Starter", "packPro": "Pro", "packElite": "Elite",
        },
        "appCat": {
            "production": "✅ Produktionsbereit",
            "nocreative": "🟡 Funktional, ohne Vorteil",
            "incomplete": "🔴 Unvollständig",
            "productionDesc": "Echter Vorteil / mehrstufige Pipeline",
            "nocreativeDesc": "Einstufiges generisches Modell, leicht ersetzbar",
            "incompleteDesc": "Shell / nur Text / falsch beschriftet",
        },
    },
    "ar": {
        "common": {
            "signOut": "تسجيل الخروج", "credits": "الرصيد", "language": "اللغة",
            "switchLanguage": "تبديل اللغة", "currency": "العملة",
            "cookieConsent": "موافقة ملفات تعريف الارتباط", "new": "جديد", "poweredBy": "مدعوم من",
            "back": "→ رجوع", "backToLazynext": "→ Lazynext", "coverage": "التغطية",
        },
        "deploy": {
            "vercelStack": "Next.js + Neon + Public Blob",
            "cfStack": "Workers + D1 + R2",
        },
        "pricing": {
            "packStarter": "المبتدئ", "packPro": "احترافي", "packElite": "نخبة",
        },
        "appCat": {
            "production": "✅ جاهز للإنتاج",
            "nocreative": "🟡 يعمل، بدون ميزة",
            "incomplete": "🔴 غير مكتمل",
            "productionDesc": "ميزة حقيقية / خط أنابيب متعدد الخطوات",
            "nocreativeDesc": "نموذج عام بخطوة واحدة، يسهل استبداله",
            "incompleteDesc": "واجهة / نص فقط / تصنيف خاطئ",
        },
    },
    "hi": {
        "common": {
            "signOut": "साइन आउट", "credits": "क्रेडिट", "language": "भाषा",
            "switchLanguage": "भाषा बदलें", "currency": "मुद्रा",
            "cookieConsent": "कुकी सहमति", "new": "नया", "poweredBy": "द्वारा संचालित",
            "back": "← वापस", "backToLazynext": "← Lazynext", "coverage": "कवरेज",
        },
        "deploy": {
            "vercelStack": "Next.js + Neon + Public Blob",
            "cfStack": "Workers + D1 + R2",
        },
        "pricing": {
            "packStarter": "स्टार्टर", "packPro": "प्रो", "packElite": "एलीट",
        },
        "appCat": {
            "production": "️ प्रोडक्शन के लिए तैयार",
            "nocreative": "🟡 काम करता है, कोई बढ़त नहीं",
            "incomplete": "🔴 अधूरा",
            "productionDesc": "वास्तविक बढ़त / मल्टी-स्टेप पाइपलाइन",
            "nocreativeDesc": "सिंगल-स्टेप सामान्य मॉडल, आसानी से बदला जा सकता है",
            "incompleteDesc": "शेल / केवल टेक्स्ट / गलत लेबल",
        },
    },
    "vi": {
        "common": {
            "signOut": "Đăng xuất", "credits": "Tín dụng", "language": "Ngôn ngữ",
            "switchLanguage": "Chuyển ngôn ngữ", "currency": "Tiền tệ",
            "cookieConsent": "Đồng ý cookie", "new": "MỚI", "poweredBy": "Cung cấp bởi",
            "back": "← Quay lại", "backToLazynext": "← Lazynext", "coverage": "Phạm vi",
        },
        "deploy": {
            "vercelStack": "Next.js + Neon + Public Blob",
            "cfStack": "Workers + D1 + R2",
        },
        "pricing": {
            "packStarter": "Khởi đầu", "packPro": "Pro", "packElite": "Elite",
        },
        "appCat": {
            "production": "✅ Sẵn sàng cho production",
            "nocreative": "🟡 Hoạt động, không có lợi thế",
            "incomplete": "🔴 Chưa hoàn thiện",
            "productionDesc": "Lợi thế thực sự / pipeline nhiều bước",
            "nocreativeDesc": "Mô hình chung một bước, dễ bị thay thế",
            "incompleteDesc": "Shell / chỉ văn bản / nhãn sai",
        },
    },
    "th": {
        "common": {
            "signOut": "ออกจากระบบ", "credits": "เครดิต", "language": "ภาษา",
            "switchLanguage": "เปลี่ยนภาษา", "currency": "สกุลเงิน",
            "cookieConsent": "ยินยอมคุกกี้", "new": "ใหม่", "poweredBy": "ขับเคลื่อนโดย",
            "back": "← ย้อนกลับ", "backToLazynext": "← Lazynext", "coverage": "ความครอบคลุม",
        },
        "deploy": {
            "vercelStack": "Next.js + Neon + Public Blob",
            "cfStack": "Workers + D1 + R2",
        },
        "pricing": {
            "packStarter": "เริ่มต้น", "packPro": "โปร", "packElite": "อีลิต",
        },
        "appCat": {
            "production": "✅ พร้อมใช้งานจริง",
            "nocreative": "🟡 ใช้ได้แต่ไม่มีจุดเด่น",
            "incomplete": "🔴 ยังไม่สมบูรณ์",
            "productionDesc": "จุดเด่นจริง / pipeline หลายขั้นตอน",
            "nocreativeDesc": "โมเดลทั่วไปขั้นตอนเดียว ถูกแทนที่ง่าย",
            "incompleteDesc": "เชลล์ / ข้อความเท่านั้น / ป้ายผิด",
        },
    },
    "id": {
        "common": {
            "signOut": "Keluar", "credits": "Kredit", "language": "Bahasa",
            "switchLanguage": "Ganti bahasa", "currency": "Mata uang",
            "cookieConsent": "Persetujuan cookie", "new": "BARU", "poweredBy": "Didukung oleh",
            "back": "← Kembali", "backToLazynext": "← Lazynext", "coverage": "Cakupan",
        },
        "deploy": {
            "vercelStack": "Next.js + Neon + Public Blob",
            "cfStack": "Workers + D1 + R2",
        },
        "pricing": {
            "packStarter": "Pemula", "packPro": "Pro", "packElite": "Elite",
        },
        "appCat": {
            "production": "✅ Siap produksi",
            "nocreative": "🟡 Berfungsi, tanpa keunggulan",
            "incomplete": "🔴 Tidak lengkap",
            "productionDesc": "Keunggulan nyata / pipeline multi-langkah",
            "nocreativeDesc": "Model generik satu langkah, mudah diganti",
            "incompleteDesc": "Shell / hanya teks / salah label",
        },
    },
}

def js_string(s):
    return "'" + s.replace("\\", "\\\\").replace("'", "\\'") + "'"

def build_common_block(locale):
    t = TRANSLATIONS[locale]["common"]
    # The existing common section has just { signIn: '...' }
    # We need to expand it with all the new keys
    parts = []
    parts.append(f"      signIn: ")  # placeholder, we'll handle this differently
    return None  # We'll handle this inline

def build_section_lines(section_name, keys, indent="    "):
    """Build a section like: common: { key1: 'val1', key2: 'val2', }"""
    parts = []
    for k, v in keys.items():
        parts.append(f"{k}: {js_string(v)}")
    return f"{indent}{section_name}: {{ {', '.join(parts)} }},"

text = MSG.read_text(encoding="utf-8")
lines = text.split("\n")

new_lines = []
i = 0
modified = 0

while i < len(lines):
    line = lines[i]

    # Find locale blocks by looking for "  xx: {" pattern
    locale_match = re.match(r'^  ([a-z]{2}): \{', line)
    if locale_match:
        locale = locale_match.group(1)
        if locale in TRANSLATIONS:
            # We need to find and modify the common, deploy, pricing sections
            # and add an appCat section
            # Strategy: collect all lines of this locale block, modify, then output
            block_start = i
            # Find the end of this locale block (next "  }," at same indent)
            block_end = None
            for j in range(i + 1, len(lines)):
                if lines[j] == "  },":
                    block_end = j
                    break
            if block_end is None:
                new_lines.append(line)
                i += 1
                continue

            block_lines = lines[block_start:block_end + 1]
            block_text = "\n".join(block_lines)

            # 1. Replace the common section
            # Existing: common: { signIn: '...' },
            trans = TRANSLATIONS[locale]
            common_keys = trans["common"]

            # Find the existing common line and replace it
            common_pattern = r"(    common: \{ )signIn: ([^}]+)( \},)"
            common_replacement = lambda m: f"    common: {{ signIn: {m.group(2).rstrip()}, {', '.join(f'{k}: {js_string(v)}' for k, v in common_keys.items())} }},"

            new_block_text = re.sub(common_pattern, common_replacement, block_text, count=1)

            # 2. Add deploy keys (vercelStack, cfStack) to existing deploy section
            deploy_keys = trans["deploy"]
            for dk, dv in deploy_keys.items():
                # Check if key already exists
                if f"deploy.{dk}" not in new_block_text and f"{dk}:" not in new_block_text.split("deploy:")[1].split("},")[0] if "deploy:" in new_block_text else True:
                    # Add the key inside the deploy section
                    # Find "deploy: {" and add after the last key before the closing "},"
                    deploy_match = re.search(r"(    deploy: \{[^}]+)(\},)", new_block_text)
                    if deploy_match and dk not in deploy_match.group(1):
                        new_block_text = new_block_text[:deploy_match.start()] + deploy_match.group(1).rstrip() + f", {dk}: {js_string(dv)}" + " " + deploy_match.group(2) + new_block_text[deploy_match.end():]

            # 3. Add pricing keys (packStarter, packPro, packElite) to existing pricing section
            pricing_keys = trans["pricing"]
            # Find the pricing section and add keys
            pricing_match = re.search(r"(    pricing: \{[^}]+)(\},)", new_block_text)
            if pricing_match:
                for pk, pv in pricing_keys.items():
                    if pk not in pricing_match.group(1):
                        new_block_text = new_block_text[:pricing_match.start()] + pricing_match.group(1).rstrip() + f", {pk}: {js_string(pv)}" + " " + pricing_match.group(2) + new_block_text[pricing_match.end():]
                        # Re-match for next key
                        pricing_match = re.search(r"(    pricing: \{[^}]+)(\},)", new_block_text)

            # 4. Add appCat section (new section, insert before seo)
            app_cat_keys = trans["appCat"]
            app_cat_line = build_section_lines("appCat", app_cat_keys)

            # Insert appCat before the seo section (or before notFound if seo doesn't exist)
            if "appCat:" not in new_block_text:
                # Insert before "    seo: {" or "    notFound: {"
                insert_point = None
                for marker in ["\n    seo: {", "\n    notFound: {"]:
                    pos = new_block_text.find(marker)
                    if pos != -1:
                        insert_point = pos
                        break
                if insert_point is not None:
                    new_block_text = new_block_text[:insert_point] + "\n" + app_cat_line + new_block_text[insert_point:]
                else:
                    # Insert before the closing "  },"
                    new_block_text = new_block_text.rstrip()[:-2] + "    " + app_cat_line + "\n  },"

            new_block_lines = new_block_text.split("\n")
            new_lines.extend(new_block_lines)
            i = block_end + 1
            modified += 1
            continue

    new_lines.append(line)
    i += 1

MSG.write_text("\n".join(new_lines), encoding="utf-8")
print(f"Modified {modified} locale blocks with new i18n keys")
