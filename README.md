# Zrata-X : The Passive Investment Engine

## The Story

As a working professional, I face a recurring challenge every month. When my salary hits my account, I know I should invest it. I understand the basics—Mutual Funds, Digital Gold, ETFs, Fixed Deposits, and Bonds—but the actual execution is paralyzed by decision fatigue.

Every month, I ask myself:
"How much should I put into equity versus debt right now?"
"Is the market too high to buy stocks?"
"Which bank is offering the best FD rates this week?"
"Does my current portfolio need rebalancing?"

I don't have the time to study stock charts, analyze technical indicators, or manually track interest rate changes across twenty different banks. I want to build wealth safely and consistently, but I get stuck in the "hassle" of figuring out the _exact_ split for the month. Existing apps are great for execution (buying the asset) but poor at advisory (telling me what to buy based on what I already own).

I needed a system that acts like a smart personal assistant—one that knows my history, scans the market for me, and simply hands me a "shopping list" for the month.

## The Solution

WealthOS is a purpose-built web application designed for the "Passive Compounder." It is not a trading terminal. It is a decision-support engine that automates the research and allocation process.

Instead of showing complex charts, it asks a simple question: **"How much do you want to invest this month?"**

It then uses an AI Agent (powered by Large Language Models) to analyze real-time market data (scraped from news, bond platforms, and bank websites) and cross-reference it with your personal risk profile and existing portfolio. The result is a clear, actionable plan: "Invest 20,000 INR in Parag Parikh Flexi Cap, 10,000 INR in Gold Bees, and lock 20,000 INR in a Utkarsh Small Finance Bank FD at 8.5%."

## Core Features

### 1. Automated Market Intelligence

The system does not rely on static data. It employs a background "Scout" agent that runs periodically to fetch fresh data:

- **FD Rates:** Scrapes official bank websites and aggregators to find high-yield Fixed Deposit opportunities, specifically targeting Small Finance Banks that offer superior returns.
- **Macro Trends:** Analyzes market sentiment, inflation data, and gold price trends to determine if it is a "Risk-On" or "Risk-Off" month.
- **Mutual Fund Data:** Tracks performance metrics of top funds to suggest rebalancing opportunities.

### 2. AI-Powered Advisory (The "Analyst")

We utilize OpenRouter to access state-of-the-art LLMs (like GPT-4 or Llama 3). The system feeds the raw market data + your portfolio context into the model. The AI acts as a financial planner, applying logical reasoning to suggest an optimal asset allocation strategy for the current month.

### 3. Persistent Memory

Integration with **Supermemory** allows the application to "remember" user context over time. If you mentioned last month that you prefer low-risk assets or that you invested in a specific bond, the system recalls this context for future recommendations, creating a personalized experience that improves with usage.

### 4. Smart Asset Discovery

The application specifically highlights "Arbitrage" opportunities that generic apps miss, such as:

- FDs that offer credit cards against them (building credit history while earning interest).
- Specific bonds or government securities with high yields.
- Gold ETF buying opportunities during price dips.

## Technical Architecture

The project is built as a modern, two-tier web application ensuring scalability and separation of concerns.

### Backend (Python/FastAPI)

The brain of the operation.

- **Framework:** FastAPI for high-performance, asynchronous API endpoints.
- **Task Queue:** Celery (with Redis) for handling long-running background scraping tasks.
- **Data Processing:** `crawl4ai` for robust web scraping and `pandas` for financial data manipulation.
- **Database:** SQLModel (SQLAlchemy) for storing user portfolios, asset data, and historical market snapshots.
- **AI Engine:** Custom service layer interacting with OpenRouter API.

### Frontend (TypeScript/Next.js)

The user interface.

- **Framework:** Next.js (App Router) for server-side rendering and static optimization.
- **UI Library:** Tailwind CSS combined with Shadcn UI for a clean, professional, and distraction-free aesthetic.
- **State Management:** React Hooks and Context API for managing portfolio state and authentication.

## Project Structure

```text
.
├── app/                        # Backend Application (FastAPI)
│   ├── models/                 # Database schemas (User, Asset, Portfolio)
│   ├── routers/                # API endpoints (Auth, Market Data, Recommendations)
│   ├── services/
│   │   ├── ai_engine/          # OpenRouter integration
│   │   ├── data_scrapers/      # Crawl4ai scripts for FDs, News, Funds
│   │   ├── market_data/        # Aggregators for macro trends
│   │   └── memory/             # Supermemory client integration
│   ├── tasks/                  # Celery background tasks
│   └── database.py             # Database connection logic
├── src/                        # Frontend Application (Next.js)
│   ├── app/                    # Next.js pages and routing
│   ├── components/             # Reusable UI components (Shadcn)
│   ├── lib/api/                # TypeScript API clients
│   └── hooks/                  # Custom React hooks for data fetching
└── requirements.txt            # Python dependencies

```

## Setup and Installation

### Prerequisites

- Python 3.10+
- Node.js 18+
- Redis (for Celery background tasks)

### Backend Setup

1. Navigate to the root directory.
2. Create a virtual environment:

```bash
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows

```

3. Install dependencies:

```bash
pip install -r requirements.txt

```

4. Install Playwright browsers (required for scraping):

```bash
playwright install

```

5. Set up environment variables in a `.env` file (see `.env.example`).
6. Start the API server:

```bash
uvicorn app.main:app --reload

```

7. (Optional) Start the Celery worker for background scraping:

```bash
celery -A app.tasks.celery_app worker --loglevel=info

```

### Frontend Setup

1. Navigate to the frontend directory (if separate, otherwise ensure package.json is in root).
2. Install dependencies:

```bash
npm install

```

3. Start the development server:

```bash
npm run dev

```

4. Open your browser and navigate to `http://localhost:3000`.

## Disclaimer

This software is for educational and informational purposes only. The "recommendations" generated by the AI are based on mathematical models and scraped data. They do not constitute certified financial advice. Users should conduct their own due diligence or consult a SEBI-registered investment advisor before making financial decisions.
