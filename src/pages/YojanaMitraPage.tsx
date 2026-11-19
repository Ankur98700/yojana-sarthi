import { AlertCircle, Bot, ExternalLink, Send, ShieldCheck, Trash2, User } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { api } from '../lib/api.ts';
import type { ChatMessage } from '../types.ts';

const CHAT_SESSION_KEY = 'yojana_sarthi_chat_session';

const SUGGESTED_QUESTIONS = [
  'Which government schemes are available for college students?',
  'What schemes are available for farmers in Uttar Pradesh?',
  'What documents are required for a housing scheme?',
  'How do I apply for a scholarship?',
  'Which schemes support women entrepreneurs?',
  'Why was I marked potentially eligible?',
];

export function YojanaMitraPage() {
  const { user, guestProfile, navigate } = useApp();
  const [sessionKey, setSessionKey] = useState<string>(() => {
    try {
      const existing = localStorage.getItem(CHAT_SESSION_KEY);
      if (existing) return existing;
      const fresh = `guest_${Date.now().toString(36)}`;
      localStorage.setItem(CHAT_SESSION_KEY, fresh);
      return fresh;
    } catch {
      return `guest_${Date.now().toString(36)}`;
    }
  });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [includeProfile, setIncludeProfile] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const autoQuerySentRef = useRef(false);

  const hasProfileData = Boolean(
    (user?.profile && Object.keys(user.profile).length > 1) ||
      Object.keys(guestProfile).length > 0
  );

  useEffect(() => {
    api
      .getChatHistory(user ? undefined : sessionKey)
      .then((res) => setMessages(res.messages))
      .catch(() => {});
  }, [user, sessionKey]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const sendMessage = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed || sending) return;

    setError(null);
    setInput('');
    const optimisticUserMsg: ChatMessage = {
      id: `local_${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticUserMsg]);
    setSending(true);

    try {
      const res = await api.sendChatMessage({
        message: trimmed,
        sessionKey: user ? undefined : sessionKey,
        includeProfileContext: includeProfile,
        guestProfile: includeProfile && !user ? guestProfile : undefined,
      });
      if (res.sessionKey && !user) {
        setSessionKey(res.sessionKey);
        try {
          localStorage.setItem(CHAT_SESSION_KEY, res.sessionKey);
        } catch {
          // ignore
        }
      }
      setMessages((prev) => [...prev, res.message]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send message right now.');
    } finally {
      setSending(false);
    }
  };

  // Support deep links like /assistant?q=...
  useEffect(() => {
    if (autoQuerySentRef.current) return;
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    if (q) {
      autoQuerySentRef.current = true;
      window.history.replaceState({}, '', '/assistant');
      sendMessage(q);
    }
  }, []);

  const handleClear = async () => {
    try {
      await api.clearChatHistory(user ? undefined : sessionKey);
      setMessages([]);
    } catch {
      setMessages([]);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <p className="text-sm font-semibold text-[#138A55] mb-1">AI Scheme Assistant</p>
          <h1 className="font-display text-3xl font-bold text-[#172B4D] tracking-tight">
            Yojana Mitra
          </h1>
          <p className="text-sm text-[#667085] mt-1">
            Your Government Scheme Guide — grounded strictly in Yojana Sarthi&apos;s verified scheme records with official government links.
          </p>
        </div>

        {messages.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#667085] hover:text-red-700 whitespace-nowrap"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear conversation</span>
          </button>
        )}
      </div>

      {/* Consent & Grounding Controls */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl px-5 py-3.5 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-[#475467]">
          <ShieldCheck className="w-4 h-4 text-[#138A55] shrink-0" />
          <span>
            Yojana Mitra explains rules and links official portals. It never submits government applications on your behalf.
          </span>
        </div>

        <label className="inline-flex items-center gap-2 text-xs font-medium text-[#172B4D] cursor-pointer shrink-0">
          <input
            type="checkbox"
            checked={includeProfile}
            disabled={!hasProfileData}
            onChange={(e) => setIncludeProfile(e.target.checked)}
            className="w-4 h-4 rounded border-[#CBD5E1]"
          />
          <span className={!hasProfileData ? 'text-[#94A3B8]' : ''}>
            {hasProfileData
              ? 'Use my profile context (authorized)'
              : 'Complete eligibility check to enable profile context'}
          </span>
        </label>
      </div>

      {/* Chat Container */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl flex flex-col min-h-[540px] max-h-[70vh]">
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {messages.length === 0 ? (
            <div className="py-8 max-w-2xl mx-auto text-center space-y-6">
              <div className="w-12 h-12 rounded-xl bg-[#123B65]/8 text-[#123B65] flex items-center justify-center mx-auto">
                <Bot className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-display text-lg font-bold text-[#172B4D]">
                  Ask Yojana Mitra about Indian Welfare Schemes
                </h2>
                <p className="text-sm text-[#667085] mt-1.5">
                  Ask in simple English about eligibility conditions, required documents, benefits, or application procedures.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-left">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => sendMessage(q)}
                    className="p-3.5 text-xs sm:text-sm text-[#172B4D] bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] rounded-lg transition-colors text-left"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex items-start gap-3 ${
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-lg bg-[#123B65] text-white flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] sm:max-w-[78%] rounded-xl px-4 py-3.5 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[#123B65] text-white'
                      : 'bg-[#F8FAFC] border border-[#E2E8F0] text-[#172B4D]'
                  }`}
                >
                  {msg.role === 'assistant' && msg.notice && (
                    <div className="mb-3 pb-2.5 border-b border-[#E2E8F0] flex items-start gap-2 text-xs text-[#B45309]">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#F39C35]" />
                      <span>{msg.notice}</span>
                    </div>
                  )}

                  <div className="whitespace-pre-wrap break-words">{msg.content}</div>

                  {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-[#E2E8F0] space-y-2">
                      <p className="text-xs font-semibold text-[#667085]">
                        Referenced Verified Schemes &amp; Official Links
                      </p>
                      <div className="space-y-1.5">
                        {msg.sources.map((src) => (
                          <div
                            key={src.schemeId}
                            className="flex flex-wrap items-center justify-between gap-2 text-xs bg-white border border-[#E2E8F0] rounded-lg px-3 py-2"
                          >
                            <button
                              type="button"
                              onClick={() => navigate(`/schemes/${src.schemeId}`)}
                              className="font-semibold text-[#123B65] hover:underline text-left"
                            >
                              {src.name}
                            </button>
                            <a
                              href={src.officialUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[#138A55] font-medium hover:underline whitespace-nowrap"
                            >
                              <span>Official Site</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-lg bg-[#E2E8F0] text-[#172B4D] flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))
          )}

          {sending && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#123B65] text-white flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-3 text-xs text-[#667085]">
                Yojana Mitra is reviewing verified scheme records...
              </div>
            </div>
          )}

          <div ref={endRef} />
        </div>

        {error && (
          <div className="mx-5 mb-2 px-3.5 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
            {error}
          </div>
        )}

        {/* Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(input);
          }}
          className="border-t border-[#E2E8F0] p-4 flex items-center gap-3"
        >
          <label htmlFor="yojana-mitra-input" className="sr-only">
            Ask a question about government schemes
          </label>
          <input
            id="yojana-mitra-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about scholarships, farmer schemes, documents, or eligibility..."
            disabled={sending}
            className="flex-1 px-4 py-2.5 text-sm bg-white border border-[#CBD5E1] rounded-lg text-[#172B4D] focus:border-[#123B65] focus:outline-none"
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold text-white bg-[#123B65] hover:bg-[#0D2B4B] rounded-lg disabled:opacity-40 whitespace-nowrap"
          >
            <Send className="w-4 h-4" />
            <span>Send</span>
          </button>
        </form>
      </div>
    </div>
  );
}
