import { ArrowRight, CheckCircle2, ExternalLink, Send } from 'lucide-react';
import { useState } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { api } from '../lib/api.ts';

export function AboutPage() {
  const { navigate } = useApp();
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      <div>
        <p className="text-sm font-semibold text-[#138A55] mb-2">About Yojana Sarthi</p>
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#172B4D] tracking-tight mb-4">
          Helping every Indian household navigate public welfare with clarity
        </h1>
        <p className="text-base text-[#475467] leading-relaxed">
          Millions of eligible Indian citizens — students, farmers, women, workers, entrepreneurs, and senior citizens — miss out on public welfare schemes because official guidelines are scattered across ministry notifications and state portals. Yojana Sarthi brings verified Central and State scheme eligibility into one plain-language guide.
        </p>
      </div>

      <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 sm:p-8 space-y-6">
        <h2 className="font-display text-xl font-bold text-[#172B4D]">Our Core Principles</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {[
            {
              title: 'Transparent Rule Engine',
              text: 'Every eligibility outcome is computed on our backend using structured rules cited from official guidelines. We show every passed, failed, and missing condition.',
            },
            {
              title: 'Honesty About Uncertainty',
              text: 'Missing information is never assumed to pass. Where government records (such as SECC-2011 or board merit lists) must be verified officially, we state that clearly.',
            },
            {
              title: 'Privacy by Design',
              text: 'We never request Aadhaar numbers, bank accounts, PAN cards, or OTPs. Citizens can even check eligibility as a guest without registering.',
            },
            {
              title: 'Ready for Multilingual India',
              text: 'Built in clear, accessible English with modular text and preference architecture prepared for Hindi and regional Indian languages.',
            },
          ].map((item) => (
            <div key={item.title} className="space-y-1.5">
              <div className="flex items-center gap-2 font-display text-sm font-bold text-[#172B4D]">
                <CheckCircle2 className="w-4 h-4 text-[#138A55]" />
                <span>{item.title}</span>
              </div>
              <p className="text-sm text-[#667085] leading-relaxed pl-6">{item.text}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 sm:p-8 space-y-4">
        <h2 className="font-display text-xl font-bold text-[#172B4D]">Official Government Reference Portals</h2>
        <p className="text-sm text-[#667085]">
          Yojana Sarthi cross-references public scheme information from official Government of India and State resources:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {[
            { name: 'myScheme Portal', url: 'https://www.myscheme.gov.in/' },
            { name: 'National Portal of India', url: 'https://www.india.gov.in/' },
            { name: 'National Government Services Portal', url: 'https://services.india.gov.in/' },
            { name: 'Open Government Data Platform India', url: 'https://www.data.gov.in/' },
          ].map((portal) => (
            <a
              key={portal.url}
              href={portal.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3.5 rounded-lg border border-[#E2E8F0] hover:border-[#123B65] text-sm font-medium text-[#123B65]"
            >
              <span>{portal.name}</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => navigate('/eligibility')}
          className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-[#123B65] rounded-lg"
        >
          <span>Check My Eligibility</span>
          <ArrowRight className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => navigate('/contact')}
          className="px-5 py-3 text-sm font-semibold text-[#123B65] bg-white border border-[#CBD5E1] rounded-lg"
        >
          Contact Us
        </button>
      </div>
    </div>
  );
}

export function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setStatus(null);
    try {
      const res = await api.submitContact({ name, email, subject, message });
      setStatus({ type: 'success', text: res.message });
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
    } catch (err) {
      setStatus({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to send message right now.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <p className="text-sm font-semibold text-[#138A55] mb-2">Contact &amp; Scheme Corrections</p>
      <h1 className="font-display text-3xl font-bold text-[#172B4D] tracking-tight mb-3">
        Report a Scheme Update or Send Feedback
      </h1>
      <p className="text-sm text-[#667085] mb-8">
        Spotted an updated income ceiling, new state notification, or broken official link? Let our team know so we can verify and update the record.
      </p>

      <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 sm:p-8">
        {status && (
          <div
            className={`mb-5 p-4 rounded-lg text-sm border ${
              status.type === 'success'
                ? 'bg-[#138A55]/10 border-[#138A55]/30 text-[#138A55]'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}
          >
            {status.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="c-name" className="block text-xs font-semibold text-[#172B4D] mb-1.5">
                Your Name
              </label>
              <input
                id="c-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-[#CBD5E1] rounded-lg"
              />
            </div>
            <div>
              <label htmlFor="c-email" className="block text-xs font-semibold text-[#172B4D] mb-1.5">
                Email Address
              </label>
              <input
                id="c-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-[#CBD5E1] rounded-lg"
              />
            </div>
          </div>
          <div>
            <label htmlFor="c-subject" className="block text-xs font-semibold text-[#172B4D] mb-1.5">
              Subject
            </label>
            <input
              id="c-subject"
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g., Suggest a new State welfare scheme"
              className="w-full px-3.5 py-2.5 text-sm border border-[#CBD5E1] rounded-lg"
            />
          </div>
          <div>
            <label htmlFor="c-message" className="block text-xs font-semibold text-[#172B4D] mb-1.5">
              Message
            </label>
            <textarea
              id="c-message"
              rows={5}
              required
              minLength={10}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Share scheme details or official source URL..."
              className="w-full px-3.5 py-2.5 text-sm border border-[#CBD5E1] rounded-lg"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#123B65] hover:bg-[#0D2B4B] rounded-lg disabled:opacity-60"
          >
            <Send className="w-4 h-4" />
            <span>{submitting ? 'Submitting...' : 'Send Message'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}

export function LegalPage({ type }: { type: 'privacy' | 'terms' | 'disclaimer' }) {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 sm:p-10 space-y-6 text-sm text-[#334155] leading-relaxed">
        {type === 'privacy' && (
          <>
            <h1 className="font-display text-3xl font-bold text-[#172B4D]">Privacy Policy</h1>
            <p className="text-xs text-[#667085]">Last updated: March 2026</p>
            <section className="space-y-2">
              <h2 className="font-display text-lg font-bold text-[#172B4D]">1. Minimal Data Collection</h2>
              <p>
                Yojana Sarthi collects only basic demographic and household attributes needed to evaluate public scheme eligibility (such as age, state, residence area, approximate annual family income, occupation, and education level). We strictly do NOT collect Aadhaar numbers, PAN numbers, bank account details, biometric data, or government OTPs.
              </p>
            </section>
            <section className="space-y-2">
              <h2 className="font-display text-lg font-bold text-[#172B4D]">2. Guest Mode &amp; Account Storage</h2>
              <p>
                Citizens may use the Scheme Explorer, Scheme Comparison, and Eligibility Checker without creating an account. If you choose to create an account, your password is stored securely using salted cryptographic hashing (scrypt), and your profile, saved schemes, and evaluation history are stored solely to power your personal dashboard.
              </p>
            </section>
            <section className="space-y-2">
              <h2 className="font-display text-lg font-bold text-[#172B4D]">3. AI Assistant Privacy</h2>
              <p>
                Yojana Mitra does not access your personal profile unless you explicitly enable the &ldquo;Use my profile context&rdquo; toggle. Do not enter sensitive personal identifiers into chat prompts.
              </p>
            </section>
          </>
        )}

        {type === 'terms' && (
          <>
            <h1 className="font-display text-3xl font-bold text-[#172B4D]">Terms and Conditions</h1>
            <p className="text-xs text-[#667085]">Last updated: March 2026</p>
            <section className="space-y-2">
              <h2 className="font-display text-lg font-bold text-[#172B4D]">1. Informational Guidance Only</h2>
              <p>
                Yojana Sarthi provides preliminary eligibility evaluation and scheme discovery guidance based on publicly available official scheme documents. Using this platform does not constitute filing an application with any Central or State Government ministry.
              </p>
            </section>
            <section className="space-y-2">
              <h2 className="font-display text-lg font-bold text-[#172B4D]">2. Official Verification Requirement</h2>
              <p>
                Government welfare guidelines, income ceilings, benefit amounts, and application deadlines are subject to official revision by ministries and State Governments. Users must confirm current criteria on the linked official government portal before applying.
              </p>
            </section>
            <section className="space-y-2">
              <h2 className="font-display text-lg font-bold text-[#172B4D]">3. Responsible Account Usage</h2>
              <p>
                Users agree not to attempt unauthorized access to administrative endpoints, scrape the platform abusively, or submit misleading information into public contact forms.
              </p>
            </section>
          </>
        )}

        {type === 'disclaimer' && (
          <>
            <h1 className="font-display text-3xl font-bold text-[#172B4D]">Public Information Disclaimer</h1>
            <p className="text-xs text-[#667085]">Last updated: March 2026</p>
            <section className="space-y-2">
              <h2 className="font-display text-lg font-bold text-[#172B4D]">Not an Official Government Portal</h2>
              <p>
                Yojana Sarthi is an independent citizen-focused public information and eligibility guidance platform. It is not affiliated with, endorsed by, or operated by the Government of India or any State Government.
              </p>
            </section>
            <section className="space-y-2">
              <h2 className="font-display text-lg font-bold text-[#172B4D]">Preliminary Eligibility vs. Official Approval</h2>
              <p>
                An &ldquo;Eligible&rdquo; or &ldquo;Potentially Eligible&rdquo; status shown by Yojana Sarthi reflects a rule-based check of your self-declared inputs against documented scheme guidelines. Final eligibility and benefit sanctioning are determined exclusively by the concerned Central or State Government department after official document verification.
              </p>
            </section>
            <section className="space-y-2">
              <h2 className="font-display text-lg font-bold text-[#172B4D]">Zero Fee Notice</h2>
              <p>
                Yojana Sarthi is completely free to use. Always submit official welfare applications directly on official .gov.in / .nic.in portals or authorized Common Service Centres (CSCs).
              </p>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
