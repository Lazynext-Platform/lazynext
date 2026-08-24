export const metadata = {
  title: 'Privacy Policy — Lazynext',
  description: 'Privacy Policy for Lazynext AI E-commerce Ad Studio.',
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen text-[#f7f7f8]" style={{ backgroundColor: '#131416', colorScheme: 'dark' }}>
      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Privacy Policy</h1>
        <p className="mt-2 text-sm text-white/40">Last updated: {new Date().getFullYear()}</p>

        <div className="mt-10 space-y-8 text-sm leading-relaxed text-white/70">
          <section>
            <h2 className="text-lg font-semibold text-white/90">1. Overview</h2>
            <p className="mt-3">
              Lazynext (&ldquo;we&rdquo;, &ldquo;us&rdquo;) is an AI e-commerce ad studio that helps you generate
              UGC product ads, reference-ad remakes, AI drama ads, and ad skits. This Privacy Policy explains how we
              collect, use, and protect your information when you use our website at lazynext.com.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white/90">2. Information We Collect</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>Account information: your name and email address, obtained via Google Sign-In.</li>
              <li>Usage data: the content you submit (product photos, prompts, reference videos) and the generations you create.</li>
              <li>Billing data: payment processing is handled by Dodo Payments; we do not store your card details.</li>
              <li>Credit balance: we track how many credits you have purchased and spent.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white/90">3. How We Use Your Information</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>To authenticate you and manage your account.</li>
              <li>To process payments and manage credits.</li>
              <li>To generate AI ad content based on your inputs.</li>
              <li>To store and display your created work in your personal &ldquo;My Work&rdquo; area.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white/90">4. Third-Party Services</h2>
            <p className="mt-3">
              Lazynext uses the following third-party services: Google OAuth for authentication, Dodo Payments for
              billing, Cloudflare for hosting and storage, and Atlas Cloud for AI generation. Each service has its own
              privacy policy governing your data.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white/90">5. Data Storage</h2>
            <p className="mt-3">
              Your account data and creation history are stored in Cloudflare D1. Media assets are stored in Cloudflare
              R2. All data is processed in accordance with applicable data protection laws.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white/90">6. Your Rights</h2>
            <p className="mt-3">
              You may request access to, correction of, or deletion of your personal data at any time by contacting us
              at support@lazynext.com.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white/90">7. Contact</h2>
            <p className="mt-3">
              If you have questions about this Privacy Policy, please contact us at support@lazynext.com.
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
