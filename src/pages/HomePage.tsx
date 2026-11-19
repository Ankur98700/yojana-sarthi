import {
  ArrowRight,
  Bot,
  CheckCircle2,
  ClipboardCheck,
  Compass,
  FileCheck2,
  Scale,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { SchemeCard } from '../components/SchemeCard.tsx';
import { useApp } from '../context/AppContext.tsx';
import { api, type SchemesMetaResponse } from '../lib/api.ts';
import type { Scheme } from '../types.ts';

const HERO_IMG = '/src/assets/images/hero_indian_citizens_1795059294524.jpg';
const TRUST_IMG = '/src/assets/images/trust_verified_guidance_1795059293856.jpg';

export function HomePage() {
  const { navigate } = useApp();
  const [popularSchemes, setPopularSchemes] = useState<Scheme[]>([]);
  const [meta, setMeta] = useState<SchemesMetaResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [heroImgErr, setHeroImgErr] = useState(false);
  const [trustImgErr, setTrustImgErr] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([
      api.listSchemes({ limit: 6, sort: 'recently_verified' }),
      api.getSchemesMeta(),
    ])
      .then(([listRes, metaRes]) => {
        if (!active) return;
        setPopularSchemes(listRes.items);
        setMeta(metaRes);
      })
      .catch(() => {
        // Handled cleanly in empty state
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const features = [
    {
      title: 'Smart Eligibility Checker',
      description:
        'Answer simple household, age, state, and income questions. Our backend rule engine checks every criterion and explains exactly why you qualify or what information is missing.',
      action: 'Start eligibility check',
      path: '/eligibility',
      icon: ClipboardCheck,
      span: 'lg:col-span-2',
    },
    {
      title: 'Personalized Recommendations',
      description:
        'See schemes ranked transparently by verified eligibility, state coverage, and household relevance — with plain-English explanations instead of opaque scores.',
      action: 'View recommendations',
      path: '/recommendations',
      icon: Sparkles,
      span: 'lg:col-span-1',
    },
    {
      title: 'Government Scheme Explorer',
      description:
        'Search Central and State schemes across agriculture, scholarships, healthcare, housing, pensions, women welfare, and entrepreneurship.',
      action: 'Browse all schemes',
      path: '/explore',
      icon: Compass,
      span: 'lg:col-span-1',
    },
    {
      title: 'AI-Powered Scheme Assistant',
      description:
        'Ask Yojana Mitra in plain English about documents, application steps, or government terms. Answers are grounded strictly in verified scheme records with official links.',
      action: 'Ask Yojana Mitra',
      path: '/assistant',
      icon: Bot,
      span: 'lg:col-span-2',
    },
    {
      title: 'Scheme Comparison',
      description:
        'Place up to three welfare schemes side by side to compare benefits, age limits, income caps, required documents, and application methods.',
      action: 'Compare schemes',
      path: '/compare',
      icon: Scale,
      span: 'lg:col-span-1',
    },
    {
      title: 'Document Checklist',
      description:
        'Track the exact certificates and proofs needed across your saved and eligible schemes in one organized citizen dashboard.',
      action: 'Open checklist',
      path: '/dashboard',
      icon: FileCheck2,
      span: 'lg:col-span-2',
    },
  ];

  return (
    <div>
      {/* HERO SECTION — Balanced 2-Column Split */}
      <section className="bg-white border-b border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
            <div className="lg:col-span-6 flex flex-col justify-center">
              <p className="text-sm font-semibold text-[#138A55] mb-3">
                Yojana Sarthi · Citizen Welfare Guidance Platform
              </p>
              <h1 className="font-display text-4xl sm:text-5xl font-extrabold text-[#172B4D] tracking-tight leading-[1.12] mb-5">
                Find Government Schemes You&apos;re Eligible For.
              </h1>
              <p className="text-base sm:text-lg text-[#475467] leading-relaxed max-w-xl mb-8">
                Discover welfare schemes, check your eligibility, and access benefits designed for you and your family.
              </p>

              <div className="flex flex-wrap items-center gap-3.5">
                <button
                  type="button"
                  onClick={() => navigate('/eligibility')}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-semibold text-white bg-[#123B65] hover:bg-[#0D2B4B] rounded-lg transition-colors whitespace-nowrap"
                >
                  <span>Check My Eligibility</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/explore')}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-semibold text-[#123B65] bg-white border border-[#CBD5E1] hover:border-[#123B65] hover:bg-[#F8FAFC] rounded-lg transition-colors whitespace-nowrap"
                >
                  <span>Explore Government Schemes</span>
                </button>
              </div>

              <div className="mt-8 pt-6 border-t border-[#F1F5F9] flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-[#667085]">
                <span>No Aadhaar or bank details required</span>
                <span aria-hidden="true">·</span>
                <span>Guest eligibility checks supported</span>
                <span aria-hidden="true">·</span>
                <span>Direct links to official .gov.in portals</span>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="h-full min-h-[280px] sm:min-h-[340px] rounded-2xl overflow-hidden border border-[#E2E8F0] bg-[#F5F7FA]">
                {!heroImgErr ? (
                  <img
                    src={HERO_IMG}
                    alt="Diverse Indian citizens including a student, farmer, woman entrepreneur, and senior citizen walking along a guiding pathway toward a public service center"
                    referrerPolicy="no-referrer"
                    onError={() => setHeroImgErr(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-10 text-center bg-gradient-to-br from-[#123B65]/5 via-[#F5F7FA] to-[#138A55]/10">
                    <ShieldCheck className="w-12 h-12 text-[#123B65] mb-3" />
                    <p className="font-display font-semibold text-[#172B4D]">
                      Discover. Check Eligibility. Access Benefits.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Live Verified Database Coverage Strip (Real DB counts — zero fake stats) */}
          <div className="mt-12 pt-8 border-t border-[#E2E8F0] grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <p className="font-mono tabular-nums text-2xl sm:text-3xl font-semibold text-[#123B65]">
                {meta ? meta.totalVerifiedSchemes : '—'}
              </p>
              <p className="text-xs sm:text-sm text-[#667085] mt-1">Verified schemes in database</p>
            </div>
            <div>
              <p className="font-mono tabular-nums text-2xl sm:text-3xl font-semibold text-[#123B65]">
                {meta ? meta.centralSchemesCount : '—'}
              </p>
              <p className="text-xs sm:text-sm text-[#667085] mt-1">Central Government schemes</p>
            </div>
            <div>
              <p className="font-mono tabular-nums text-2xl sm:text-3xl font-semibold text-[#138A55]">
                {meta ? meta.stateSchemesCount : '—'}
              </p>
              <p className="text-xs sm:text-sm text-[#667085] mt-1">Dedicated State schemes</p>
            </div>
            <div>
              <p className="font-mono tabular-nums text-2xl sm:text-3xl font-semibold text-[#172B4D]">
                {meta ? meta.categories.length : '—'}
              </p>
              <p className="text-xs sm:text-sm text-[#667085] mt-1">Welfare categories indexed</p>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS — Three Clear Steps */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
        <div className="max-w-2xl mb-12">
          <p className="text-sm font-semibold text-[#123B65] mb-2">How It Works</p>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#172B4D] tracking-tight">
            Three clear steps from questions to official benefits
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              step: '01',
              title: 'Tell Us About Yourself',
              body: 'Answer a few simple questions about your personal and household circumstances. No Aadhaar or bank numbers are ever required.',
            },
            {
              step: '02',
              title: 'Discover Relevant Schemes',
              body: 'Our eligibility engine checks your information against available scheme requirements and clearly marks passed, failed, or missing conditions.',
            },
            {
              step: '03',
              title: 'Access Government Benefits',
              body: 'Understand your eligibility, required documents, benefits, and step-by-step application process with direct links to official portals.',
            },
          ].map((item) => (
            <div
              key={item.step}
              className="bg-white border border-[#E2E8F0] rounded-xl p-7 flex flex-col justify-between"
            >
              <div>
                <p className="font-mono tabular-nums text-sm font-semibold text-[#F39C35] mb-3">
                  {item.step}
                </p>
                <h3 className="font-display text-lg font-bold text-[#172B4D] mb-2.5">
                  {item.step} – {item.title}
                </h3>
                <p className="text-sm text-[#667085] leading-relaxed">{item.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* MAIN FEATURES — Asymmetric Editorial Bento Grid */}
      <section className="bg-white border-y border-[#E2E8F0] py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold text-[#138A55] mb-2">Core Capabilities</p>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#172B4D] tracking-tight">
                Built for clarity, accuracy, and everyday usability
              </h2>
            </div>
            <button
              type="button"
              onClick={() => navigate('/eligibility')}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#123B65] hover:text-[#0D2B4B] whitespace-nowrap"
            >
              <span>Run free eligibility check</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {features.map((feat) => {
              const Icon = feat.icon;
              return (
                <div
                  key={feat.title}
                  className={`${feat.span} bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-7 flex flex-col justify-between transition-colors hover:border-[#123B65]/40`}
                >
                  <div>
                    <Icon className="w-5 h-5 text-[#123B65] mb-4" />
                    <h3 className="font-display text-lg font-bold text-[#172B4D] mb-2">
                      {feat.title}
                    </h3>
                    <p className="text-sm text-[#475467] leading-relaxed max-w-2xl">
                      {feat.description}
                    </p>
                  </div>
                  <div className="mt-6">
                    <button
                      type="button"
                      onClick={() => navigate(feat.path)}
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#123B65] hover:text-[#0D2B4B]"
                    >
                      <span>{feat.action}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* POPULAR VERIFIED SCHEMES */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <p className="text-sm font-semibold text-[#123B65] mb-2">Verified Welfare Directory</p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#172B4D] tracking-tight">
              Popular Government Schemes
            </h2>
          </div>
          <button
            type="button"
            onClick={() => navigate('/explore')}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#123B65] hover:text-[#0D2B4B] whitespace-nowrap"
          >
            <span>Explore all schemes</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-white border border-[#E2E8F0] rounded-xl p-6 h-72 animate-pulse"
              >
                <div className="h-3 bg-[#E2E8F0] rounded w-1/3 mb-4" />
                <div className="h-5 bg-[#E2E8F0] rounded w-5/6 mb-3" />
                <div className="h-4 bg-[#F1F5F9] rounded w-full mb-2" />
                <div className="h-4 bg-[#F1F5F9] rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : popularSchemes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {popularSchemes.map((scheme) => (
              <SchemeCard key={scheme.id} scheme={scheme} />
            ))}
          </div>
        ) : (
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-10 text-center">
            <p className="text-sm text-[#667085]">
              Unable to load schemes right now. Please refresh or open the Explore Schemes page.
            </p>
          </div>
        )}
      </section>

      {/* TRUST AND TRANSPARENCY SECTION */}
      <section className="bg-white border-y border-[#E2E8F0] py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
            <div className="lg:col-span-5">
              <div className="h-full min-h-[260px] rounded-2xl overflow-hidden border border-[#E2E8F0] bg-[#F5F7FA]">
                {!trustImgErr ? (
                  <img
                    src={TRUST_IMG}
                    alt="An Indian family reviewing verified welfare documents and eligibility checklists together at home"
                    referrerPolicy="no-referrer"
                    onError={() => setTrustImgErr(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center p-8 text-[#123B65]">
                    <ShieldCheck className="w-12 h-12" />
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-7 flex flex-col justify-center">
              <p className="text-sm font-semibold text-[#138A55] mb-2">Trust &amp; Transparency</p>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#172B4D] tracking-tight mb-4">
                Verified sources, honest rules, and citizen-first privacy
              </h2>
              <p className="text-sm sm:text-base text-[#475467] leading-relaxed mb-6">
                Yojana Sarthi is designed as a transparent public-benefit guide. Every eligibility evaluation is computed by structured backend rules linked to official ministry and state guidelines — never guesswork.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {[
                  {
                    title: 'Official Source Links',
                    desc: 'Every scheme cites official government portals (myScheme, Ministry websites, and State portals) with last-verified dates.',
                  },
                  {
                    title: 'No Assumed Passes',
                    desc: 'Missing information is never treated as passing. Incomplete profiles are marked Potentially Eligible with exact missing fields listed.',
                  },
                  {
                    title: 'Zero Sensitive Identifiers',
                    desc: 'We never ask for Aadhaar numbers, bank accounts, PAN, or OTPs. You only share general household eligibility inputs.',
                  },
                  {
                    title: 'Clear Official Boundary',
                    desc: 'Preliminary eligibility here helps you prepare documents; final approval always rests with the official government authority.',
                  },
                ].map((point) => (
                  <div key={point.title} className="space-y-1">
                    <div className="flex items-center gap-2 text-sm font-semibold text-[#172B4D]">
                      <CheckCircle2 className="w-4 h-4 text-[#138A55] shrink-0" />
                      <span>{point.title}</span>
                    </div>
                    <p className="text-xs sm:text-sm text-[#667085] leading-relaxed pl-6">
                      {point.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 lg:pt-20">
        <div className="bg-[#123B65] rounded-2xl px-6 py-12 sm:px-12 sm:py-16 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="max-w-2xl">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight mb-3">
              Your Next Government Benefit Could Be Just a Few Clicks Away.
            </h2>
            <p className="text-sm sm:text-base text-white/80 leading-relaxed">
              Complete our guided eligibility questionnaire in under three minutes — as a guest or registered citizen — and receive clear, source-backed guidance.
            </p>
          </div>
          <div className="shrink-0">
            <button
              type="button"
              onClick={() => navigate('/eligibility')}
              className="inline-flex items-center gap-2 px-6 py-3.5 text-sm font-semibold text-[#123B65] bg-white hover:bg-[#F5F7FA] rounded-lg transition-colors whitespace-nowrap"
            >
              <span>Find My Schemes</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
