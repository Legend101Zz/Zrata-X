"""
OpenRouter client for AI-powered analysis and recommendations.
"""
import json
import logging
from typing import Any, Dict, List, Optional

import httpx
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class OpenRouterClient:
    """
    OpenRouter API client for LLM access.
    Supports multiple models with automatic fallback.
    """
    
    def __init__(self):
        self.base_url = settings.OPENROUTER_BASE_URL
        self.api_key = settings.OPENROUTER_API_KEY
        self.client = httpx.AsyncClient(timeout=60.0)
    
    async def complete(
        self,
        prompt: str,
        model: str = None,
        system_prompt: str = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
        response_format: Optional[Dict] = None
    ) -> str:
        """
        Send completion request to OpenRouter.
        """
        model = model or settings.PRIMARY_MODEL
        
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        
        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens
        }
        
        if response_format:
            payload["response_format"] = response_format
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://passivecompounder.app",
            "X-Title": "Passive Compounder"
        }
        
        try:
            response = await self.client.post(
                f"{self.base_url}/chat/completions",
                json=payload,
                headers=headers
            )
            response.raise_for_status()
            
            data = response.json()
            return data["choices"][0]["message"]["content"]
            
        except httpx.HTTPStatusError as e:
            logger.error(f"OpenRouter API error: {e.response.status_code} - {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"OpenRouter request failed: {e}")
            raise
    
    async def analyze_portfolio(
        self,
        portfolio: List[Dict[str, Any]],
        market_data: Dict[str, Any],
        user_preferences: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Analyze user portfolio and market conditions.
        Returns insights without hardcoded rules.
        """
        system_prompt = """You are an expert Indian investment analyst. 
        Analyze portfolios and provide insights based on current market conditions.
        Focus on:
        - Asset allocation balance
        - Risk assessment
        - Market timing considerations
        - Tax efficiency
        - Inflation protection
        
        Be specific to Indian markets, regulations, and opportunities.
        Consider Small Finance Bank FDs, Gold/Silver ETFs, debt funds, etc.
        Never give specific buy/sell recommendations - provide educational analysis only."""
        
        prompt = f"""
        Analyze this portfolio:
        
        Current Holdings:
        {json.dumps(portfolio, indent=2)}
        
        Current Market Data:
        {json.dumps(market_data, indent=2)}
        
        User Preferences:
        {json.dumps(user_preferences, indent=2)}
        
        Provide:
        1. Current allocation breakdown by asset class
        2. Risk assessment
        3. Key observations (overweight/underweight areas)
        4. Market condition impact
        5. Potential opportunities based on current data
        
        Return as JSON with keys: allocation, risk_assessment, observations, market_impact, opportunities
        """
        
        response = await self.complete(
            prompt=prompt,
            system_prompt=system_prompt,
            model=settings.PRIMARY_MODEL,
            response_format={"type": "json_object"}
        )
        
        try:
            return json.loads(response)
        except json.JSONDecodeError:
            return {"raw_analysis": response}
    
    async def generate_investment_suggestion(
        self,
        investment_amount: float,
        current_portfolio: List[Dict[str, Any]],
        market_data: Dict[str, Any],
        user_preferences: Dict[str, Any],
        available_options: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Generate AI-powered investment suggestions.
        No hardcoded allocation rules - fully dynamic based on context.
        """
        system_prompt = """You are a helpful investment co-pilot for Indian investors.
        Generate actionable investment suggestions based on:
        - Current portfolio composition
        - User's risk tolerance and preferences
        - Current market conditions
        - Available investment options and their current rates
        
        Important guidelines:
        - Frame suggestions as educational options, not financial advice
        - Consider tax implications (LTCG, STCG, Section 80C)
        - Highlight special opportunities (high FD rates, discounted ETFs, etc.)
        - Always consider inflation and real returns
        - Suggest specific amounts for specific instruments
        - Explain the reasoning clearly in simple language
        """
        
        prompt = f"""
        Help allocate ₹{investment_amount:,.0f} for investment.
        
        Current Portfolio:
        {json.dumps(current_portfolio, indent=2)}
        
        User Preferences:
        - Risk tolerance: {user_preferences.get('risk_tolerance', 'moderate')}
        - Investment horizon: {user_preferences.get('horizon_years', 5)} years
        - Avoid lock-ins: {user_preferences.get('avoid_lock_ins', False)}
        - Prefer tax saving: {user_preferences.get('prefer_tax_saving', False)}
        
        Current Market Conditions:
        {json.dumps(market_data, indent=2)}
        
        Available Options:
        {json.dumps(available_options, indent=2)}
        
        Generate a suggested allocation with:
        1. Specific instruments and amounts
        2. Clear reasoning for each suggestion
        3. Any special opportunities to highlight
        4. Overall portfolio impact
        
        Return as JSON with structure:
        {{
            "suggestions": [
                {{
                    "asset_type": "...",
                    "instrument": "...",
                    "amount": 0,
                    "percentage": 0,
                    "reason": "...",
                    "highlight": "..." // optional special note
                }}
            ],
            "summary": "...",
            "risk_note": "...",
            "tax_note": "..."
        }}
        """
        
        response = await self.complete(
            prompt=prompt,
            system_prompt=system_prompt,
            model=settings.PRIMARY_MODEL,
            response_format={"type": "json_object"}
        )
        
        try:
            return json.loads(response)
        except json.JSONDecodeError:
            return {"error": "Failed to parse AI response", "raw": response}
    
    async def analyze_news_sentiment(
        self,
        news_items: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Analyze news sentiment for market insights.
        """
        prompt = f"""
        Analyze these financial news headlines for investment relevance:
        
        {json.dumps(news_items, indent=2)}
        
        For each item, provide:
        - sentiment_score: -1 (bearish) to 1 (bullish)
        - relevance: which asset classes are affected (gold, equity, debt, etc.)
        - key_insight: one-line actionable insight
        
        Return as JSON array with keys: title, sentiment_score, relevance, key_insight
        """
        
        response = await self.complete(
            prompt=prompt,
            model=settings.FAST_MODEL,
            response_format={"type": "json_object"}
        )
        
        try:
            result = json.loads(response)
            return result if isinstance(result, list) else result.get("items", [])
        except json.JSONDecodeError:
            return []