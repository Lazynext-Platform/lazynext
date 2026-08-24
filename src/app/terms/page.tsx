export const metadata = {
  title: 'Terms of Service — Lazynext',
  description: 'Terms of Service for Lazynext AI E-commerce Ad Studio.',
};

export default function TermsPage() {
  return (
    <main className="min-h-screen text-[#f7f7f8]" style={{ backgroundColor: '#131416', colorScheme: 'dark' }}>
      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Terms of Service</h1>
        <p className="mt-2 text-sm text-white/40">Last updated: {new Date().getFullYear()}</p>

        <div className="mt-10 space-y-8 text-sm leading-relaxed text-white/70">
          <section>
            <h2 className="text-lg font-semibold text-white/90">1. Acceptance of Terms</h2>
            <p className="mt-3">
              By accessing or using Lazynext at lazynext.com, you agree to be bound by these Terms of Service. If you do
              not agree, please do not use the service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white/90">2. Description of Service</h2>
            <p className="mt-3">
              Lazynext is an AI e-commerce ad studio that provides tools for generating UGC product ads, reference-ad
              remakes, AI drama ads, and ad skits. The service is powered by Atlas Cloud for AI generation and is hosted
              on Cloudflare Workers.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white/90">3. Accounts</h2>
            <p className="mt-3">
              You must sign in with Google to use the service. You are responsible for maintaining the security of your
              account and for all activities that occur under your account.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white/90">4. Credits and Payments</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>Credits are purchased through Dodo Payments and are used to generate AI content.</li>
              <li>Credits do not expire.</li>
              <li>All payments are processed by Dodo Payments; Lazynext does not store card details.</li>
              <li>Refunds are handled on a case-by-case basis; contact support@lazynext.com for assistance.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white/90">5. Acceptable Use</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>You may not use the service to generate content that is illegal, harmful, or infringes on others&apos; rights.</li>
              <li>You may not attempt to reverse-engineer, decompile, or otherwise extract source code from the service.</li>
              <li>You may not abuse, overload, or disrupt the service or its infrastructure.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white/90">6. Intellectual Property</h2>
            <p className="mt-3">
              Lazynext is built on the open-source Atlas Marketing Studio project (MIT license). AI generation is powered
              by the Atlas Cloud API. Content you generate using the service is yours to use. The Lazynext name, logo,
              and brand are property of Lazynext.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white/90">7. Disclaimer of Warranties</h2>
            <p className="mt-3">
              The service is provided &ldquo;as is&rdquo; without warranties of any kind. AI-generated content may not
              always meet expectations, and we do not guarantee specific results.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white/90">8. Limitation of Liability</h2>
            <p className="mt-3">
              To the maximum extent permitted by law, Lazynext shall not be liable for any indirect, incidental, or
              consequential damages arising from your use of the service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white/90">9. Changes to These Terms</h2>
            <p className="mt-3">
              We may update these Terms from time to time. Continued use of the service after changes constitutes
              acceptance of the revised Terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white/90">10. Contact</h2>
            <p className="mt-3">
              If you have questions about these Terms, please contact us at support@lazynext.com.
            </p>
          </section>
        </div>

        <div className="mt-12">
          <a href="/" className="text-sm text-white/50 hover:text-white transition">&larr; Back to Lazynext</a>
        </div>
      </div>
    </main>
  );
}
