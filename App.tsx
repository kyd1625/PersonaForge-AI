
import React, { useState, useEffect, useRef } from 'react';
import { PersonaConfig, Language, ChatMessage, ChatSession, PersonaTemplate, Page, User } from './types';
import { TRANSLATIONS, TEMPLATES, EXPERT_TEMPLATES } from './constants';
import { generatePersonaPrompt, sendMessageToPersona } from './services/geminiService';
import LanguageSelector from './components/LanguageSelector';
// @ts-ignore
import ReactMarkdown from 'react-markdown';
// @ts-ignore
import remarkGfm from 'remark-gfm';

const App: React.FC = () => {
  const [lang, setLang] = useState<Language>('ko');
  const [activePage, setActivePage] = useState<Page>('dashboard');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [history, setHistory] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showPayment, setShowPayment] = useState<{amt: number; label: string} | null>(null);
  const [isPaying, setIsPaying] = useState(false);
  
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authForm, setAuthForm] = useState({ email: '', password: '', name: '' });

  const [form, setForm] = useState<PersonaConfig>({
    role: '',
    expertise: '',
    tone: '',
    constraints: '',
    language: 'ko'
  });

  const t = TRANSLATIONS[lang];
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedHistory = localStorage.getItem('persona_forge_history');
    if (savedHistory) setHistory(JSON.parse(savedHistory));
    const savedUser = localStorage.getItem('persona_forge_user');
    if (savedUser) setUser(JSON.parse(savedUser));
  }, []);

  useEffect(() => {
    localStorage.setItem('persona_forge_history', JSON.stringify(history));
    if (user) localStorage.setItem('persona_forge_user', JSON.stringify(user));
    else localStorage.removeItem('persona_forge_user');
  }, [history, user]);

  useEffect(() => {
    if (activePage === 'chat') {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeSession?.messages, isTyping, activePage]);

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (authMode === 'signup') {
      const newUser = { id: Date.now().toString(), name: authForm.name, email: authForm.email, tokens: 100 };
      setUser(newUser);
    } else {
      setUser({ id: 'mock-id', name: 'User', email: authForm.email, tokens: 100 });
    }
    setActivePage('dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    setActivePage('auth');
  };

  const deductTokens = (amt: number): boolean => {
    if (!user) return false;
    if (user.tokens < amt) return false;
    setUser({ ...user, tokens: user.tokens - amt });
    return true;
  };

  const handleGenerate = async () => {
    if (!user) {
        setActivePage('auth');
        return;
    }
    if (!deductTokens(10)) {
      alert(t.insufficientTokens);
      setActivePage('store');
      return;
    }
    setLoading(true);
    try {
      const prompt = await generatePersonaPrompt({ ...form, language: lang });
      setResult(prompt);
    } catch (err) {
      alert("Failed to build expert. Try again later.");
    } finally {
      setLoading(false);
    }
  };

  const processPayment = () => {
    if (!showPayment || !user) return;
    setIsPaying(true);
    setTimeout(() => {
      setUser({ ...user, tokens: user.tokens + showPayment.amt });
      setIsPaying(false);
      setShowPayment(null);
      alert(t.paymentSuccess);
      setActivePage('dashboard');
    }, 2500);
  };

  const startChat = (sessionOverride?: ChatSession) => {
    const session = sessionOverride || {
      id: Date.now().toString(),
      personaName: form.role || 'Expert AI',
      systemInstruction: result || '',
      messages: [],
      lastUpdated: Date.now()
    };
    setActiveSession(session);
    setActivePage('chat');
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!chatInput.trim() || !activeSession || isTyping) return;
    const userMsg: ChatMessage = { role: 'user', text: chatInput, timestamp: Date.now() };
    const updatedMessages = [...activeSession.messages, userMsg];
    setActiveSession({ ...activeSession, messages: updatedMessages });
    setChatInput('');
    setIsTyping(true);
    try {
      let aiText = "";
      const aiMsg: ChatMessage = { role: 'model', text: "", timestamp: Date.now() };
      setActiveSession(prev => prev ? { ...prev, messages: [...prev.messages, aiMsg] } : null);
      await sendMessageToPersona(activeSession.systemInstruction, updatedMessages, userMsg.text, (chunk) => {
        aiText += chunk;
        setActiveSession(prev => {
          if (!prev) return null;
          const msgs = [...prev.messages];
          msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], text: aiText };
          return { ...prev, messages: msgs };
        });
      });
      const finalSession = { ...activeSession, messages: [...updatedMessages, { role: 'model', text: aiText, timestamp: Date.now() } as ChatMessage], lastUpdated: Date.now() };
      setHistory(prev => [finalSession, ...prev.filter(s => s.id !== finalSession.id)]);
    } catch (err) { alert("AI connection lost."); } finally { setIsTyping(false); }
  };

  const navItems = [
    { id: 'dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', label: t.nav_home },
    { id: 'forge', icon: 'M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z', label: t.nav_forge },
    { id: 'marketplace', icon: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z', label: t.nav_market },
    { id: 'store', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z', label: t.nav_store },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-950 text-slate-100 font-sans">
      
      <nav className="hidden md:flex fixed left-0 top-0 bottom-0 w-20 lg:w-64 bg-slate-900 border-r border-slate-800 flex-col py-10 px-4 z-50">
        <div className="flex items-center gap-3 px-3 mb-14 cursor-pointer" onClick={() => setActivePage('dashboard')}>
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/30 shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
          </div>
          <span className="hidden lg:block font-black text-xl tracking-tighter text-white">PersonaForge</span>
        </div>
        <div className="flex-1 space-y-2">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id as Page)}
              className={`w-full flex items-center gap-4 px-3 py-3 rounded-2xl transition-all ${activePage === item.id ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={item.icon}/></svg>
              <span className="hidden lg:block font-bold text-sm">{item.label}</span>
            </button>
          ))}
        </div>
        {user ? (
          <div className="mt-auto bg-slate-950 p-4 rounded-3xl border border-slate-800 hidden lg:block">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-black text-indigo-400 border border-slate-700">{user.name.charAt(0)}</div>
                <div className="overflow-hidden">
                    <div className="text-sm font-bold truncate">{user.name}</div>
                    <div className="text-[10px] text-slate-500 truncate">{user.email}</div>
                </div>
            </div>
            <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.credits}</span>
                <span className="text-sm font-black text-white">{user.tokens} Pts</span>
            </div>
            <button onClick={handleLogout} className="w-full py-2 bg-red-600/10 hover:bg-red-600/20 text-red-500 text-[10px] font-black uppercase rounded-xl transition-all">{t.nav_logout}</button>
          </div>
        ) : (
            <button onClick={() => setActivePage('auth')} className="mt-auto w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase rounded-2xl transition-all hidden lg:block">{t.nav_auth}</button>
        )}
      </nav>

      <main className="flex-1 md:ml-20 lg:ml-64 pb-24 md:pb-12 p-5 md:p-10 lg:p-14 overflow-x-hidden transition-all">
        
        {activePage === 'auth' && (
            <div className="min-h-[80vh] flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-500">
                <div className="w-full max-md glass-effect p-8 md:p-10 rounded-[2.5rem] border border-slate-800 shadow-2xl">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-600/40 mx-auto mb-6">
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M12 2L2 7l10 5 10-5-10-5z"/></svg>
                        </div>
                        <h2 className="text-3xl font-black mb-2">{authMode === 'login' ? t.login : t.signup}</h2>
                        <p className="text-slate-500 text-sm">Join the elite forge of AI personas.</p>
                    </div>

                    <form onSubmit={handleAuth} className="space-y-4">
                        {authMode === 'signup' && (
                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase text-slate-500 ml-1">{t.name}</label>
                                <input type="text" required value={authForm.name} onChange={e => setAuthForm({...authForm, name: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-indigo-600 transition-all"/>
                            </div>
                        )}
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase text-slate-500 ml-1">{t.email}</label>
                            <input type="email" required value={authForm.email} onChange={e => setAuthForm({...authForm, email: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-indigo-600 transition-all"/>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase text-slate-500 ml-1">{t.password}</label>
                            <input type="password" required value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-indigo-600 transition-all"/>
                        </div>
                        <button type="submit" className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl transition-all shadow-xl shadow-indigo-600/30 mt-4">
                            {authMode === 'login' ? t.login : t.signup}
                        </button>
                    </form>

                    <div className="mt-8 text-center">
                        <button onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} className="text-sm font-bold text-slate-400 hover:text-indigo-400 transition-colors">
                            {authMode === 'login' ? "Don't have an account? Sign up" : "Already have an account? Log in"}
                        </button>
                    </div>
                </div>
            </div>
        )}

        {!user && activePage !== 'auth' && activePage !== 'store' && (
            <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 animate-in fade-in duration-500">
                <div className="w-20 h-20 bg-slate-900 border border-slate-800 rounded-full flex items-center justify-center mb-6 text-slate-500">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                </div>
                <h2 className="text-2xl font-black mb-3">{t.guestMsg}</h2>
                <button onClick={() => setActivePage('auth')} className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl transition-all">{t.login}</button>
            </div>
        )}

        {user && activePage === 'dashboard' && (
          <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-5 duration-500">
            <section className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div>
                <h1 className="text-3xl md:text-5xl font-black mb-3">Welcome, {user.name}.</h1>
                <p className="text-slate-400 text-base md:text-lg max-w-xl">{t.subtitle}</p>
              </div>
              <LanguageSelector current={lang} onChange={setLang} />
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 glass-effect p-6 md:p-10 rounded-[2rem] border-slate-800 bg-gradient-to-br from-indigo-600/5 to-transparent">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-xl md:text-2xl font-black flex items-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    {t.recentActivity}
                  </h2>
                  <button onClick={() => setActivePage('marketplace')} className="text-xs font-bold text-indigo-400 hover:text-white transition-colors">{t.viewAll}</button>
                </div>
                {history.length === 0 ? (
                  <div className="text-slate-600 italic py-16 text-center bg-slate-900/20 rounded-3xl border border-dashed border-slate-800">
                    Your team is empty. Build your first AI expert!
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {history.slice(0, 4).map(s => (
                      <div key={s.id} onClick={() => startChat(s)} className="p-5 bg-slate-900/60 rounded-2xl border border-slate-800 hover:border-indigo-500/40 hover:bg-slate-800/40 transition-all cursor-pointer flex items-center justify-between group">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all">
                             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/><path d="M8 12h8"/><path d="M12 8v8"/></svg>
                          </div>
                          <div>
                            <div className="font-black text-sm md:text-base">{s.personaName}</div>
                            <div className="text-[10px] md:text-xs text-slate-500 font-medium">Last active: {new Date(s.lastUpdated).toLocaleDateString()}</div>
                          </div>
                        </div>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-slate-700 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all"><path d="M5 12h14m-7-7 7 7-7 7"/></svg>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-6">
                <div className="glass-effect p-8 rounded-[2rem] border-slate-800 bg-indigo-600/10 flex flex-col justify-between min-h-[220px]">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 mb-2">{t.credits}</div>
                    <div className="text-6xl font-black text-white">{user?.tokens || 0}</div>
                  </div>
                  <button onClick={() => setActivePage('store')} className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl transition-all shadow-xl shadow-indigo-600/20">{t.refill}</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {user && activePage === 'forge' && (
          <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-10 duration-500">
            <h1 className="text-3xl md:text-4xl font-black mb-2">{t.nav_forge}</h1>
            <p className="text-slate-400 mb-10 text-sm md:text-base">Explain what you need, and we'll build the expert brain for you.</p>
            
            <div className="glass-effect p-6 md:p-10 rounded-[2.5rem] border-slate-800 space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">{t.roleLabel}</label>
                  <input type="text" value={form.role} onChange={e => setForm({...form, role: e.target.value})} placeholder={t.roleHint} className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-indigo-600 transition-all"/>
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">{t.toneLabel}</label>
                  <input type="text" value={form.tone} onChange={e => setForm({...form, tone: e.target.value})} placeholder={t.toneHint} className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-indigo-600 transition-all"/>
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">{t.expertiseLabel}</label>
                <textarea rows={3} value={form.expertise} onChange={e => setForm({...form, expertise: e.target.value})} placeholder={t.expertiseHint} className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-indigo-600 transition-all resize-none"/>
              </div>
              <div className="space-y-3">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">{t.constraintsLabel}</label>
                <textarea rows={3} value={form.constraints} onChange={e => setForm({...form, constraints: e.target.value})} placeholder={t.constraintsHint} className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-indigo-600 transition-all resize-none"/>
              </div>
              <button onClick={handleGenerate} disabled={loading || !form.role} className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-900 font-black text-lg rounded-2xl flex items-center justify-center gap-3 transition-all shadow-xl shadow-indigo-600/30">
                {loading ? <div className="flex items-center gap-2"><div className="w-5 h-5 border-4 border-white border-t-transparent rounded-full animate-spin"></div> {t.generating}</div> : t.generateBtn}
              </button>
            </div>

            {result && (
              <div className="mt-10 glass-effect p-8 rounded-[2.5rem] border-indigo-500/30 animate-in fade-in zoom-in-95 duration-500">
                <h3 className="text-xl font-black mb-6">{t.resultTitle}</h3>
                <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 mb-8 text-sm md:text-base text-indigo-200 italic font-mono leading-relaxed select-all">
                  {result}
                </div>
                <button onClick={() => startChat()} className="w-full py-5 bg-white text-slate-950 font-black text-lg rounded-2xl hover:bg-slate-100 transition-all shadow-xl shadow-white/10">{t.startChatBtn}</button>
              </div>
            )}
          </div>
        )}

        {user && activePage === 'marketplace' && (
          <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-right-10 duration-500">
            <h1 className="text-3xl md:text-4xl font-black mb-2">{t.expertMarketplace}</h1>
            <p className="text-slate-400 mb-12 text-sm md:text-base">Connect with verified expert personas across various industries.</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {EXPERT_TEMPLATES.map(item => (
                <div key={item.id} className="glass-effect rounded-[2.5rem] border border-slate-800 overflow-hidden group hover:border-indigo-500/50 hover:-translate-y-2 transition-all duration-300 shadow-2xl">
                  <div className="h-32 bg-slate-900 relative">
                     <div className="absolute top-4 right-4 bg-indigo-600 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tighter shadow-lg">
                        -{item.tokenCost} pts
                     </div>
                     <div className="absolute -bottom-6 left-8 w-16 h-16 rounded-2xl bg-indigo-600 shadow-2xl flex items-center justify-center text-3xl font-black border-4 border-slate-950">
                       {item.creator?.charAt(0)}
                     </div>
                  </div>
                  <div className="p-8 pt-12">
                    <div className="flex items-center gap-2 mb-3">
                       <span className="text-[10px] bg-slate-800 text-slate-400 font-black px-2 py-0.5 rounded uppercase tracking-widest">{item.category}</span>
                       <span className="text-[10px] bg-yellow-500/20 text-yellow-500 font-black px-2 py-0.5 rounded flex items-center gap-1 uppercase tracking-widest">
                         <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                         Verified
                       </span>
                    </div>
                    <h3 className="text-xl font-black mb-3 group-hover:text-indigo-400 transition-colors">{item.title[lang]}</h3>
                    <p className="text-sm text-slate-400 mb-8 line-clamp-3 h-15 font-medium leading-relaxed">{item.description[lang]}</p>
                    <div className="flex items-center justify-between border-t border-slate-800 pt-6">
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-600">By {item.creator}</div>
                      <button 
                        onClick={() => {
                          if(!deductTokens(item.tokenCost || 0)) return alert(t.insufficientTokens);
                          setResult(null);
                          setForm(prev => ({...prev, ...item.config}));
                          setActivePage('forge');
                        }}
                        className="px-5 py-2.5 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white rounded-xl text-xs font-black transition-all"
                      >
                        {t.unlockExpert}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {user && activePage === 'chat' && activeSession && (
          <div className="max-w-4xl mx-auto h-[78vh] md:h-[82vh] flex flex-col bg-slate-900 rounded-[2.5rem] border border-slate-800 shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-500">
             <header className="p-6 md:p-8 border-b border-slate-800 flex items-center justify-between bg-slate-900/50 backdrop-blur-2xl">
               <div className="flex items-center gap-4">
                 <button onClick={() => setActivePage('dashboard')} className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-400 hover:text-white transition-all shadow-lg">
                   <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6"/></svg>
                 </button>
                 <div>
                   <h2 className="font-black text-lg md:text-xl flex items-center gap-2">{activeSession.personaName}</h2>
                   <div className="text-[10px] text-green-500 font-black uppercase tracking-widest flex items-center gap-1.5 mt-0.5">
                     <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> Consultation in progress
                   </div>
                 </div>
               </div>
               <div className="hidden sm:flex items-center gap-3">
                 <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-3 py-1.5 bg-slate-950 rounded-full border border-slate-800">
                   {user.tokens} pts available
                 </div>
               </div>
             </header>

             <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
               {activeSession.messages.map((m, i) => (
                 <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                   <div className={`max-w-[85%] md:max-w-[75%] p-5 rounded-3xl text-sm md:text-base leading-relaxed ${m.role === 'user' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/10' : 'bg-slate-950 text-slate-200 border border-slate-800 shadow-sm'}`}>
                     {m.role === 'user' ? (
                       m.text
                     ) : (
                       <div className="prose-custom">
                         <ReactMarkdown remarkPlugins={[remarkGfm]}>
                           {m.text}
                         </ReactMarkdown>
                       </div>
                     )}
                   </div>
                 </div>
               ))}
               {isTyping && (
                 <div className="flex justify-start">
                    <div className="bg-slate-950 p-5 rounded-3xl border border-slate-800 flex gap-1.5">
                       <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"></div>
                       <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                       <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                    </div>
                 </div>
               )}
               <div ref={chatEndRef} />
             </div>

             <form onSubmit={handleSendMessage} className="p-6 md:p-8 bg-slate-900 border-t border-slate-800">
                <div className="relative group">
                  <input 
                    type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} 
                    placeholder={t.chatPlaceholder} 
                    className="w-full bg-slate-950 border border-slate-800 rounded-[1.5rem] px-6 py-5 pr-16 outline-none focus:ring-4 focus:ring-indigo-600/20 group-focus-within:border-indigo-600/40 transition-all text-sm md:text-base font-medium"
                  />
                  <button type="submit" disabled={!chatInput.trim() || isTyping} className="absolute right-3 top-3 bottom-3 px-5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 rounded-2xl transition-all shadow-xl shadow-indigo-600/20">
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M5 12h14m-7-7 7 7-7 7"/></svg>
                  </button>
                </div>
             </form>
          </div>
        )}

        {activePage === 'store' && (
          <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-top-10 duration-500">
             <h1 className="text-3xl md:text-5xl font-black mb-4 text-center">{t.buyTokens}</h1>
             <p className="text-slate-400 text-center mb-16 text-lg">Empower your consultations with professional knowledge points.</p>
             
             <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-end">
               {[
                 { label: 'Trial', amt: 50, price: '$2.99', desc: 'Try a few expert questions.' },
                 { label: 'Pro', amt: 250, price: '$9.99', desc: 'Hire multiple experts for your project.', popular: true },
                 { label: 'Unlimited', amt: 1200, price: '$44.99', desc: 'The complete enterprise expert kit.' }
               ].map(p => (
                 <div key={p.label} className={`glass-effect p-10 rounded-[3rem] flex flex-col items-center text-center gap-6 relative transition-all duration-300 ${p.popular ? 'border-indigo-600 border-4 scale-105 bg-indigo-600/5 shadow-2xl z-10' : 'border-slate-800 hover:border-slate-600'}`}>
                   {p.popular && <span className="absolute -top-4 px-4 py-1.5 bg-indigo-600 text-white text-xs font-black rounded-full uppercase tracking-widest shadow-xl">Best Value</span>}
                   <div className="text-xl font-black uppercase tracking-widest text-slate-400">{p.label}</div>
                   <div className="flex flex-col items-center">
                     <div className="flex items-center gap-3 mb-1">
                        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="currentColor" className="text-yellow-500"><circle cx="12" cy="12" r="10"/></svg>
                        <span className="text-6xl font-black text-white">{p.amt}</span>
                     </div>
                     <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Points</span>
                   </div>
                   <p className="text-sm text-slate-500 min-h-[40px] leading-relaxed px-2">{p.desc}</p>
                   <div className="text-3xl font-black text-indigo-400 mt-2">{p.price}</div>
                   <button onClick={() => setShowPayment({amt: p.amt, label: p.label})} className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-lg rounded-[1.5rem] transition-all shadow-xl shadow-indigo-600/20">Select Plan</button>
                 </div>
               ))}
             </div>
          </div>
        )}
      </main>

      {showPayment && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
              <div className="w-full max-w-lg glass-effect p-8 md:p-10 rounded-[3rem] border border-slate-800 shadow-3xl animate-in zoom-in-95 duration-500">
                  <div className="flex justify-between items-center mb-8">
                      <h3 className="text-2xl font-black">{t.checkout}</h3>
                      <button onClick={() => setShowPayment(null)} className="p-2 text-slate-500 hover:text-white transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                      </button>
                  </div>
                  
                  <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 mb-8 flex items-center justify-between">
                      <div>
                          <div className="text-xs font-black uppercase text-slate-500 mb-1">{showPayment.label} Plan</div>
                          <div className="text-xl font-black text-white">{showPayment.amt} Points</div>
                      </div>
                      <div className="text-2xl font-black text-indigo-400">Total Due</div>
                  </div>

                  <div className="space-y-4">
                      <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-slate-500 ml-1">{t.cardNumber}</label>
                          <input type="text" placeholder="XXXX XXXX XXXX XXXX" className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-indigo-600"/>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                              <label className="text-[10px] font-black uppercase text-slate-500 ml-1">{t.expiry}</label>
                              <input type="text" placeholder="MM/YY" className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-indigo-600"/>
                          </div>
                          <div className="space-y-2">
                              <label className="text-[10px] font-black uppercase text-slate-500 ml-1">{t.cvc}</label>
                              <input type="text" placeholder="123" className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-indigo-600"/>
                          </div>
                      </div>
                  </div>

                  <button onClick={processPayment} disabled={isPaying} className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-lg rounded-2xl transition-all shadow-xl shadow-indigo-600/30 mt-10 flex items-center justify-center gap-3">
                      {isPaying ? (
                          <><div className="w-5 h-5 border-4 border-white border-t-transparent rounded-full animate-spin"></div> {t.processing}</>
                      ) : t.payNow}
                  </button>

                  <div className="mt-6 flex items-center justify-center gap-2 text-[10px] text-slate-500 uppercase font-black">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                      AES-256 Encrypted Payment System
                  </div>
              </div>
          </div>
      )}

      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-20 bg-slate-900 border-t border-slate-800 flex items-center justify-around px-2 z-50 backdrop-blur-xl bg-opacity-95">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => setActivePage(item.id as Page)}
            className={`flex flex-col items-center gap-1 transition-all ${activePage === item.id ? 'text-indigo-500' : 'text-slate-500'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d={item.icon}/></svg>
            <span className="text-[10px] font-black uppercase tracking-tighter">{item.label}</span>
          </button>
        ))}
        {user ? (
            <button onClick={handleLogout} className="flex flex-col items-center gap-1 text-red-500">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
                <span className="text-[10px] font-black uppercase tracking-tighter">{t.nav_logout}</span>
            </button>
        ) : (
            <button onClick={() => setActivePage('auth')} className="flex flex-col items-center gap-1 text-indigo-500">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 7a4 4 0 100-8 4 4 0 000 8z"/></svg>
                <span className="text-[10px] font-black uppercase tracking-tighter">{t.nav_auth}</span>
            </button>
        )}
      </nav>

    </div>
  );
};

export default App;
