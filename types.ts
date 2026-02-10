
export type Language = 'ko' | 'en' | 'ja';
export type Page = 'dashboard' | 'forge' | 'marketplace' | 'chat' | 'store' | 'auth';

export interface User {
  id: string;
  name: string;
  email: string;
  tokens: number;
}

export interface PersonaConfig {
  role: string;
  expertise: string;
  tone: string;
  constraints: string;
  language: Language;
}

export interface PersonaTemplate {
  id: string;
  title: Record<Language, string>;
  description: Record<Language, string>;
  config: Partial<PersonaConfig>;
  isExpert?: boolean;
  creator?: string;
  tokenCost?: number;
  category: 'Business' | 'Tech' | 'Health' | 'Life';
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface ChatSession {
  id: string;
  personaName: string;
  systemInstruction: string;
  messages: ChatMessage[];
  lastUpdated: number;
  isExpertSession?: boolean;
}

export interface TranslationStrings {
  nav_home: string;
  nav_forge: string;
  nav_market: string;
  nav_store: string;
  nav_auth: string;
  nav_logout: string;
  title: string;
  subtitle: string;
  roleLabel: string;
  roleHint: string;
  expertiseLabel: string;
  expertiseHint: string;
  toneLabel: string;
  toneHint: string;
  constraintsLabel: string;
  constraintsHint: string;
  generateBtn: string;
  generating: string;
  resultTitle: string;
  startChatBtn: string;
  chatPlaceholder: string;
  historyTitle: string;
  credits: string;
  refill: string;
  buyTokens: string;
  insufficientTokens: string;
  expertBadge: string;
  unlockExpert: string;
  recentActivity: string;
  expertMarketplace: string;
  viewAll: string;
  login: string;
  signup: string;
  email: string;
  password: string;
  name: string;
  checkout: string;
  cardNumber: string;
  expiry: string;
  cvc: string;
  payNow: string;
  paymentSuccess: string;
  processing: string;
  guestMsg: string;
}
