// ============ Market Data (matches backend) ============
export interface MarketSnapshot {
  repo_rate: number | null;
  inflation_rate: number | null;
  gold_price_per_gram: number | null;
  silver_price_per_gram: number | null;
  nifty_pe_ratio: number | null;
  market_sentiment: string | null;
  last_updated: string;
}

export interface FDRateResponse {
  id: number;
  bank_name: string;
  bank_type: string;
  tenure_display: string;
  interest_rate_general: number;
  interest_rate_senior: number | null;
  has_credit_card_offer: boolean;
  special_features: Record<string, unknown> | null;
}

export interface MutualFundResponse {
  scheme_code: string;
  scheme_name: string;
  amc_name: string;
  category: string;
  plan_type: string;
  nav: number;
  nav_date: string | null;
  return_1y: number | null;
  expense_ratio: number | null;
}

export interface ETFResponse {
  symbol: string;
  name: string;
  underlying: string;
  nav: number;
  market_price: number;
  premium_discount: number;
  expense_ratio: number | null;
}

export interface GoldPriceResponse {
  metal_type: string;
  price_per_gram: number;
  price_per_10g: number;
  recorded_at: string;
}

export interface MacroIndicatorResponse {
  indicator_name: string;
  value: number;
  previous_value: number | null;
  change_percent: number | null;
  unit: string;
  recorded_at: string;
}

export interface NewsResponse {
  id: number;
  title: string;
  summary: string | null;
  source: string;
  url: string;
  published_at: string;
  sentiment_score: number | null;
  categories: string[];
}

// ============ Portfolio (matches backend) ============
export interface Holding {
  id: number;
  asset_type: string;
  asset_identifier: string;
  asset_name: string;
  invested_amount: number;
  current_value: number;
  units: number | null;
  gain_loss: number;
  gain_loss_percent: number;
  purchase_date: string;
}

export interface PortfolioSummary {
  total_invested: number;
  total_current_value: number;
  total_gain_loss: number;
  total_gain_loss_percent: number;
  allocation: Record<
    string,
    { invested: number; current: number; percent: number }
  >;
}

export interface CreateHoldingInput {
  asset_type: string;
  asset_identifier: string;
  asset_name: string;
  invested_amount: number;
  units?: number;
  purchase_date: string;
  interest_rate?: number;
  maturity_date?: string;
  notes?: string;
}

// ============ Recommendations (matches backend) ============
export interface RecommendationRequest {
  amount: number;
  risk_override?: string;
  avoid_lock_ins?: boolean;
  prefer_tax_saving?: boolean;
  include_fds?: boolean;
  include_gold?: boolean;
}

export interface GuestRecommendationRequest {
  amount: number;
  risk_profile?: "conservative" | "moderate" | "aggressive";
  avoid_lock_ins?: boolean;
  prefer_tax_saving?: boolean;
  include_fds?: boolean;
  include_gold?: boolean;
}

export interface SuggestionItem {
  asset_type: string;
  instrument_name: string;
  instrument_id: string;
  amount: number;
  percentage: number;
  reason: string;
  highlight?: string;
  current_rate?: number;
}

export interface RecommendationResponse {
  id: number;
  suggestions: SuggestionItem[];
  summary: string;
  risk_note: string;
  tax_note?: string;
  market_context: Record<string, unknown>;
  valid_until: string;
}

export interface GuestRecommendationResponse {
  suggestions: SuggestionItem[];
  summary: string;
  risk_note: string;
  tax_note?: string;
  market_context: Record<string, unknown>;
  disclaimer: string;
  generated_at: string;
}

// ============ Auth (matches backend) ============
export interface User {
  id: number;
  email: string;
  name: string;
  created_at?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface SignupInput {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}
