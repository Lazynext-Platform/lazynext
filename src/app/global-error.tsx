'use client';

import { useEffect } from 'react';

// Global error boundary — must render its own <html> and <body> since the root
// layout may have failed. We read locale from cookie/localStorage directly.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const locale = (() => {
    if (typeof document !== 'undefined') {
      const m = document.cookie.match(/(?:^|; )locale=([a-z]{2})/);
      return m ? m[1] : 'en';
    }
    return 'en';
  })();

  const msgs: Record<string, { title: string; desc: string; retry: string; back: string }> = {
    en: { title: 'Something went wrong', desc: 'An unexpected error occurred. Please try again.', retry: 'Try again', back: '← Back to home' },
    zh: { title: '出错了', desc: '发生了意外错误，请重试。', retry: '重试', back: '← 返回首页' },
    ja: { title: 'エラーが発生しました', desc: '予期しないエラーが発生しました。もう一度お試しください。', retry: '再試行', back: '← ホームに戻る' },
    es: { title: 'Algo salió mal', desc: 'Ocurrió un error inesperado. Por favor, inténtalo de nuevo.', retry: 'Reintentar', back: '← Volver al inicio' },
    ko: { title: '문제가 발생했습니다', desc: '예기치 않은 오류가 발생했습니다. 다시 시도해 주세요.', retry: '다시 시도', back: '← 홈으로 돌아가기' },
    pt: { title: 'Algo deu errado', desc: 'Ocorreu um erro inesperado. Por favor, tente novamente.', retry: 'Tentar novamente', back: '← Voltar ao início' },
    fr: { title: 'Une erreur est survenue', desc: "Une erreur inattendue s'est produite. Veuillez réessayer.", retry: 'Réessayer', back: "← Retour à l'accueil" },
    de: { title: 'Etwas ist schiefgelaufen', desc: 'Ein unerwarteter Fehler ist aufgetreten. Bitte erneut versuchen.', retry: 'Erneut versuchen', back: '← Zurück zur Startseite' },
    ar: { title: 'حدث خطأ ما', desc: 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.', retry: 'إعادة المحاولة', back: '→ العودة إلى الرئيسية' },
    hi: { title: 'कुछ गलत हो गया', desc: 'एक अप्रत्याशित त्रुटि हुई। कृपया पुनः प्रयास करें।', retry: 'पुनः प्रयास करें', back: '← होम पर वापस जाएं' },
    vi: { title: 'Đã xảy ra lỗi', desc: 'Đã xảy ra lỗi không mong muốn. Vui lòng thử lại.', retry: 'Thử lại', back: '← Về trang chủ' },
    th: { title: 'เกิดข้อผิดพลาด', desc: 'เกิดข้อผิดพลาดที่ไม่คาดคิด กรุณาลองอีกครั้ง', retry: 'ลองอีกครั้ง', back: '← กลับหน้าหลัก' },
    id: { title: 'Terjadi kesalahan', desc: 'Terjadi kesalahan tak terduga. Silakan coba lagi.', retry: 'Coba lagi', back: '← Kembali ke beranda' },
  };
  const t = msgs[locale] || msgs.en;
  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  return (
    <html lang={locale} dir={dir}>
      <body style={{ backgroundColor: '#131416', color: '#f7f7f8', colorScheme: 'dark' }}>
        <main className="min-h-screen flex items-center justify-center">
          <div className="max-w-md px-6 text-center">
            <h1 className="text-2xl font-bold tracking-tight">{t.title}</h1>
            <p className="mt-3 text-sm text-white/50">{t.desc}</p>
            <div className="mt-8 flex items-center justify-center gap-4">
              <button onClick={reset} className="text-sm text-white/70 hover:text-white transition">{t.retry}</button>
              <a href="/" className="text-sm text-white/70 hover:text-white transition">{t.back}</a>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
