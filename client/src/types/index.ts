// Core domain types
export interface Session {
  id: number;
  isActive: boolean;
  createdAt: string;
  createdBy?: string | null;
  players?: Player[];
}

export interface Player {
  id: number;
  name: string;
  isActive: boolean;
  totalBuyIns: number;
  totalCredits: number;
  netBalance: number;
  finalChipCount?: number;
  payout?: number;
}

export interface SessionDetail extends Session {
  players: Player[];
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page?: number;
  pageSize?: number;
}

// Form data types
export interface CreateSessionPayload {
  createdBy?: string;
}

export interface AddPlayerPayload {
  name: string;
  initialBuyIn: number;
}

export interface BuyInPayload {
  playerId: number;
  amount: number;
}

export interface CreditPayload {
  providerId: number;
  receiverId: number;
  amount: number;
}

export interface CashOutPayload {
  playerId: number;
  finalChipCount: number;
}

// Component prop types
export interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

export interface FilterProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
}

// Language and Currency types
export type Language = 'pt' | 'en' | 'es';
export type Currency = 'BRL' | 'USD' | 'EUR';

export type GroupBy = 'week' | 'month' | 'year';

// Translation keys - making it strict
export interface TranslationKeys {
  createSession: string;
  yourName: string;
  filterCreator: string;
  filter: string;
  week: string;
  month: string;
  year: string;
  archived: string;
  ended: string;
  page: string;
  prev: string;
  next: string;
  addPlayer: string;
  name: string;
  initialBuyIn: string;
  add: string;
  registerBuyIn: string;
  registerCredit: string;
  players: string;
  totalBuyIns: string;
  credits: string;
  netBalance: string;
  cashOut: string;
  selectPlayer: string;
  amount: string;
  save: string;
  provider: string;
  receiver: string;
  finalChips: string;
  confirmCashOut: string;
  endSession: string;
  deleteArchive: string;
  payout: string;
  session: string;
  inactive: string;
  active: string;
  loading: string;
  menu: string;
  sessionActions: string;
  player: string;
  playerAdded: string;
  buyInRegistered: string;
  creditRegistered: string;
  sessionEnded: string;
  failedLoadSession: string;
  failedAddPlayer: string;
  failedRegisterBuyIn: string;
  failedRegisterCredit: string;
  failedCashOut: string;
  failedEndSession: string;
  confirmEndSession: string;
  cashOutAllFirst: string;
  failedLoadSessions: string;
  failedCreateSession: string;
  failedLoadArchived: string;
  sessionCreated: string;
  archivedSessions: string;
  noArchivedSessions: string;
  noArchivedSessionsHint: string;
  back: string;
  orderedNewest: string;
  of: string;
  groupBy: string;
  currencyBRL: string;
  currencyUSD: string;
  currencyEUR: string;
  login: string;
}

export type TranslationKey = keyof TranslationKeys;
