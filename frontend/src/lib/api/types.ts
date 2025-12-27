// ============ FD Rates ============
export interface FDRate {
  id: string;
  bank_name: string;
  bank_type: "public" | "private" | "small_finance" | "cooperative";
  tenure_months: number;
  rate_regular: number;
  rate_senior: number;
  min_amount: number;
  max_amount?: number;
  special_rate?: number;
  last_updated: string;
  source_url?: string;
}

export interface FDRatesResponse {
  rates: FDRate[];
  last_scraped: string;
  source: string;
}

// ============ Market Data ============
export interface InflationData {
  month: string;
  cpi: number;
  food_inflation: number;
  core_inflation: number;
  yoy_change: number;
}

export interface IndexData {
  name: string;
  value: number;
  change_1d: number;
  change_1w: number;
  change_1m: number;
  change_ytd: number;
  last_updated: string;
}

export interface GoldPrice {
  price_per_gram: number;
  price_per_10g: number;
  change_1d: number;
  change_1m: number;
  last_updated: string;
}

export interface MarketDataResponse {
  inflation: InflationData;
  indices: IndexData[];
  gold: GoldPrice;
  repo_rate: number;
  last_updated: string;
}

// ============ Portfolio ============
export interface Holding {
  id: string;
  user_id: string;
  name: string;
  type:
    | "mutual_fund"
    | "fd"
    | "stock"
    | "gold"
    | "ppf"
    | "epf"
    | "nps"
    | "bond";
  current_value: number;
  invested_value: number;
  units?: number;
  purchase_date?: string;
  maturity_date?: string;
  interest_rate?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface PortfolioSummary {
  total_value: number;
  total_invested: number;
  total_returns: number;
  returns_percentage: number;
  holdings_count: number;
  allocation: {
    category: string;
    value: number;
    percentage: number;
  }[];
}

export interface CreateHoldingInput {
  name: string;
  type: Holding["type"];
  current_value: number;
  invested_value?: number;
  units?: number;
  purchase_date?: string;
  maturity_date?: string;
  interest_rate?: number;
  notes?: string;
}

// ============ Allocation ============
export interface AllocationRequest {
  amount: number;
  risk_profile?: "conservative" | "moderate" | "aggressive";
  existing_holdings?: Holding[];
  goals?: string[];
}

export interface AllocationItem {
  id: string;
  category: string;
  instrument_type: string;
  name: string;
  amount: number;
  percentage: number;
  reason: string;
  action_text?: string;
  action_url?: string;
  priority: number;
}

export interface AllocationResponse {
  allocations: AllocationItem[];
  total_amount: number;
  risk_profile: string;
  market_context: {
    inflation: number;
    top_fd_rate: number;
    nifty_pe: number;
  };
  generated_at: string;
  disclaimer: string;
}

// ============ Auth ============
export interface User {
  id: string;
  email: string;
  name: string;
  created_at: string;
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
  user: User;
  token: string;
}
