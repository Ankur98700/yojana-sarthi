import { ExternalLink } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { BrandLogo } from './BrandLogo.tsx';

export function Footer() {
  const { navigate } = useApp();

  return (
    <footer className="bg-white border-t border-[#E2E8F0] mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand Column */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <BrandLogo className="w-8 h-8" />
              <span className="font-display text-lg font-bold text-[#123B65]">Yojana Sarthi</span>
            </div>
            <p className="text-sm text-[#667085] leading-relaxed">
              Your Personal Guide to Government Welfare Schemes. Discover. Check Eligibility. Access Benefits.
            </p>
            <p className="text-xs text-[#667085] leading-relaxed">
              Independent citizen assistance platform. Not an official Government of India website. Always submit applications on official government portals.
            </p>
          </div>

          {/* Platform Navigation */}
          <div>
            <h3 className="font-display text-sm font-semibold text-[#172B4D] mb-4">Platform</h3>
            <ul className="space-y-2.5 text-sm text-[#667085]">
              <li>
                <button type="button" onClick={() => navigate('/explore')} className="hover:text-[#123B65]">
                  Explore Schemes
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('/eligibility')} className="hover:text-[#123B65]">
                  Eligibility Checker
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('/recommendations')} className="hover:text-[#123B65]">
                  Personalized Recommendations
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('/compare')} className="hover:text-[#123B65]">
                  Compare Schemes
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('/assistant')} className="hover:text-[#123B65]">
                  Yojana Mitra AI Assistant
                </button>
              </li>
            </ul>
          </div>

          {/* Transparency & Policies */}
          <div>
            <h3 className="font-display text-sm font-semibold text-[#172B4D] mb-4">Information & Legal</h3>
            <ul className="space-y-2.5 text-sm text-[#667085]">
              <li>
                <button type="button" onClick={() => navigate('/about')} className="hover:text-[#123B65]">
                  About Us
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('/contact')} className="hover:text-[#123B65]">
                  Contact & Feedback
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('/privacy')} className="hover:text-[#123B65]">
                  Privacy Policy
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('/terms')} className="hover:text-[#123B65]">
                  Terms and Conditions
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('/disclaimer')} className="hover:text-[#123B65]">
                  Public Information Disclaimer
                </button>
              </li>
            </ul>
          </div>

          {/* Official Government Resources */}
          <div>
            <h3 className="font-display text-sm font-semibold text-[#172B4D] mb-4">Official Resources</h3>
            <ul className="space-y-2.5 text-sm text-[#667085]">
              {[
                { label: 'myScheme National Portal', url: 'https://www.myscheme.gov.in/' },
                { label: 'National Portal of India', url: 'https://www.india.gov.in/' },
                { label: 'Government Services Portal', url: 'https://services.india.gov.in/' },
                { label: 'Open Government Data (India)', url: 'https://www.data.gov.in/' },
              ].map((link) => (
                <li key={link.url}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 hover:text-[#123B65]"
                  >
                    <span>{link.label}</span>
                    <ExternalLink className="w-3.5 h-3.5 text-[#667085]" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-[#E2E8F0] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-[#667085]">
          <p>© {new Date().getFullYear()} Yojana Sarthi. Built for transparent citizen welfare discovery across India.</p>
          <p>Primary language: English · Architecture ready for Hindi & regional Indian languages</p>
        </div>
      </div>
    </footer>
  );
}
