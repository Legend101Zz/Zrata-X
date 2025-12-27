"""
Mutual Fund data service using MFAPI.in (free, no auth required).
Handles all mutual fund data operations.
"""
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

import httpx
from app.models.asset_data import MutualFund
from sqlalchemy import func, select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

MFAPI_BASE_URL = "https://api.mfapi.in/mf"


class MutualFundDataService:
    """
    Fetches mutual fund data from MFAPI.in
    Updates are automatic - no hardcoding of scheme codes.
    
    MFAPI.in updates:
    - 2:05 PM IST
    - 9:05 PM IST  
    - 3:09 AM IST
    """
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.client = httpx.AsyncClient(timeout=30.0)
    
    async def close(self):
        """Close the HTTP client."""
        await self.client.aclose()
    
    async def fetch_all_schemes(self) -> List[Dict[str, Any]]:
        """
        Fetch list of all mutual fund schemes from MFAPI.
        Returns ~10,000+ schemes.
        """
        try:
            response = await self.client.get(MFAPI_BASE_URL)
            response.raise_for_status()
            schemes = response.json()
            logger.info(f"Fetched {len(schemes)} mutual fund schemes from MFAPI")
            return schemes
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error fetching MF schemes: {e.response.status_code}")
            return []
        except httpx.RequestError as e:
            logger.error(f"Request error fetching MF schemes: {e}")
            return []
        except Exception as e:
            logger.error(f"Unexpected error fetching MF schemes: {e}")
            return []
    
    async def fetch_scheme_details(self, scheme_code: str) -> Optional[Dict[str, Any]]:
        """
        Fetch NAV and details for a specific scheme.
        Returns scheme info with historical NAV data.
        """
        try:
            response = await self.client.get(f"{MFAPI_BASE_URL}/{scheme_code}")
            response.raise_for_status()
            data = response.json()
            return data
        except httpx.HTTPStatusError as e:
            logger.warning(f"HTTP error fetching scheme {scheme_code}: {e.response.status_code}")
            return None
        except httpx.RequestError as e:
            logger.warning(f"Request error fetching scheme {scheme_code}: {e}")
            return None
        except Exception as e:
            logger.warning(f"Error fetching scheme {scheme_code}: {e}")
            return None
    
    async def sync_all_schemes(self, batch_size: int = 100) -> Dict[str, int]:
        """
        Sync all mutual fund schemes to database.
        This discovers new schemes and updates existing ones.
        
        Returns stats about the sync operation.
        """
        schemes = await self.fetch_all_schemes()
        
        if not schemes:
            logger.warning("No schemes fetched, skipping sync")
            return {"total": 0, "added": 0, "updated": 0}
        
        added = 0
        updated = 0
        
        for i in range(0, len(schemes), batch_size):
            batch = schemes[i:i + batch_size]
            batch_added, batch_updated = await self._process_scheme_batch(batch)
            added += batch_added
            updated += batch_updated
            
            # Rate limiting - be nice to the free API
            if i + batch_size < len(schemes):
                await asyncio.sleep(0.5)
        
        logger.info(f"Synced {len(schemes)} schemes: {added} added, {updated} updated")
        return {"total": len(schemes), "added": added, "updated": updated}
    
    async def _process_scheme_batch(self, schemes: List[Dict[str, Any]]) -> tuple[int, int]:
        """Process a batch of schemes and return (added, updated) counts."""
        added = 0
        updated = 0
        
        for scheme in schemes:
            scheme_code = str(scheme.get("schemeCode"))
            scheme_name = scheme.get("schemeName", "")
            
            if not scheme_code or not scheme_name:
                continue
            
            # Determine plan type and category from name
            plan_type = self._determine_plan_type(scheme_name)
            category = self._categorize_scheme(scheme_name)
            sub_category = self._determine_sub_category(scheme_name)
            amc_name = self._extract_amc(scheme_name)
            
            # Check if scheme exists
            result = await self.db.execute(
                select(MutualFund).where(MutualFund.scheme_code == scheme_code)
            )
            existing = result.scalar_one_or_none()
            
            if existing:
                # Update existing scheme
                existing.scheme_name = scheme_name
                existing.plan_type = plan_type
                existing.category = category
                existing.sub_category = sub_category
                existing.amc_name = amc_name
                existing.is_active = True
                updated += 1
            else:
                # Create new scheme
                mf = MutualFund(
                    scheme_code=scheme_code,
                    scheme_name=scheme_name,
                    amc_name=amc_name,
                    category=category,
                    sub_category=sub_category,
                    plan_type=plan_type,
                    nav=0.0,
                    nav_date=datetime.utcnow(),
                    is_active=True
                )
                self.db.add(mf)
                added += 1
        
        await self.db.commit()
        return added, updated
    
    async def update_navs(self, scheme_codes: List[str] = None, max_schemes: int = 500) -> Dict[str, int]:
        """
        Update NAVs for schemes.
        If no codes provided, updates schemes that need refresh.
        
        Args:
            scheme_codes: Specific schemes to update, or None for auto-select
            max_schemes: Maximum number of schemes to update in one run
        
        Returns:
            Stats about the update operation
        """
        if not scheme_codes:
            # Get schemes that need update (not updated in last hour)
            cutoff = datetime.utcnow() - timedelta(hours=1)
            result = await self.db.execute(
                select(MutualFund.scheme_code)
                .where(MutualFund.updated_at < cutoff)
                .where(MutualFund.is_active == True)
                .order_by(MutualFund.updated_at.asc())
                .limit(max_schemes)
            )
            scheme_codes = [r[0] for r in result.fetchall()]
        
        if not scheme_codes:
            logger.info("No schemes need NAV update")
            return {"updated": 0, "failed": 0}
        
        updated = 0
        failed = 0
        
        # Process in smaller batches with rate limiting
        batch_size = 20
        for i in range(0, len(scheme_codes), batch_size):
            batch = scheme_codes[i:i + batch_size]
            
            for code in batch:
                success = await self._update_single_nav(code)
                if success:
                    updated += 1
                else:
                    failed += 1
            
            # Rate limiting
            if i + batch_size < len(scheme_codes):
                await asyncio.sleep(1)
        
        await self.db.commit()
        logger.info(f"NAV update complete: {updated} updated, {failed} failed")
        return {"updated": updated, "failed": failed}
    
    async def _update_single_nav(self, scheme_code: str) -> bool:
        """Update NAV for a single scheme."""
        details = await self.fetch_scheme_details(scheme_code)
        
        if not details or not details.get("data"):
            return False
        
        try:
            nav_data = details["data"][0]  # Latest NAV
            nav_value = float(nav_data.get("nav", 0))
            nav_date_str = nav_data.get("date", "")
            
            # Parse date (format: DD-MM-YYYY)
            try:
                nav_date = datetime.strptime(nav_date_str, "%d-%m-%Y")
            except ValueError:
                nav_date = datetime.utcnow()
            
            # Calculate returns if we have enough history
            returns = await self._calculate_returns(details["data"])
            
            await self.db.execute(
                update(MutualFund)
                .where(MutualFund.scheme_code == scheme_code)
                .values(
                    nav=nav_value,
                    nav_date=nav_date,
                    return_1m=returns.get("1m"),
                    return_3m=returns.get("3m"),
                    return_6m=returns.get("6m"),
                    return_1y=returns.get("1y"),
                    return_3y=returns.get("3y"),
                    return_5y=returns.get("5y"),
                    updated_at=datetime.utcnow()
                )
            )
            return True
            
        except Exception as e:
            logger.warning(f"Failed to update NAV for {scheme_code}: {e}")
            return False
    
    async def _calculate_returns(self, nav_history: List[Dict[str, Any]]) -> Dict[str, float]:
        """Calculate returns from NAV history."""
        returns = {}
        
        if not nav_history or len(nav_history) < 2:
            return returns
        
        try:
            current_nav = float(nav_history[0]["nav"])
            
            # Define periods in days
            periods = {
                "1m": 30,
                "3m": 90,
                "6m": 180,
                "1y": 365,
                "3y": 1095,
                "5y": 1825
            }
            
            for period_name, days in periods.items():
                # Find NAV closest to the target date
                if len(nav_history) > days:
                    try:
                        old_nav = float(nav_history[days]["nav"])
                        if old_nav > 0:
                            if period_name in ["3y", "5y"]:
                                # CAGR for longer periods
                                years = days / 365
                                returns[period_name] = ((current_nav / old_nav) ** (1/years) - 1) * 100
                            else:
                                # Simple return for shorter periods
                                returns[period_name] = ((current_nav - old_nav) / old_nav) * 100
                    except (IndexError, ValueError, ZeroDivisionError):
                        pass
                        
        except Exception as e:
            logger.warning(f"Error calculating returns: {e}")
        
        return returns
    
    async def get_historical_nav(
        self,
        scheme_code: str,
        days: int = 365
    ) -> List[Dict[str, Any]]:
        """
        Get historical NAV data for a scheme.
        
        Args:
            scheme_code: The AMFI scheme code
            days: Number of days of history to return
        
        Returns:
            List of {date, nav} dicts, newest first
        """
        details = await self.fetch_scheme_details(scheme_code)
        
        if not details or not details.get("data"):
            return []
        
        nav_data = details["data"][:days]  # MFAPI returns newest first
        
        return [
            {
                "date": d["date"],
                "nav": float(d["nav"])
            }
            for d in nav_data
            if d.get("nav")
        ]
    
    async def search_schemes(
        self,
        query: str = None,
        category: str = None,
        plan_type: str = "direct",
        amc: str = None,
        min_return_1y: float = None,
        limit: int = 50
    ) -> List[MutualFund]:
        """
        Search mutual fund schemes with filters.
        
        Args:
            query: Search term for scheme name
            category: Filter by category (equity, debt, hybrid, etc.)
            plan_type: Filter by plan type (direct/regular)
            amc: Filter by AMC name
            min_return_1y: Minimum 1-year return
            limit: Maximum results to return
        
        Returns:
            List of matching MutualFund objects
        """
        stmt = select(MutualFund).where(MutualFund.is_active == True)
        
        if query:
            # Case-insensitive search
            stmt = stmt.where(MutualFund.scheme_name.ilike(f"%{query}%"))
        
        if category:
            stmt = stmt.where(MutualFund.category == category)
        
        if plan_type:
            stmt = stmt.where(MutualFund.plan_type == plan_type)
        
        if amc:
            stmt = stmt.where(MutualFund.amc_name.ilike(f"%{amc}%"))
        
        if min_return_1y is not None:
            stmt = stmt.where(MutualFund.return_1y >= min_return_1y)
        
        # Order by 1-year return (best first)
        stmt = stmt.order_by(MutualFund.return_1y.desc().nullslast())
        stmt = stmt.limit(limit)
        
        result = await self.db.execute(stmt)
        return list(result.scalars().all())
    
    async def get_scheme_by_code(self, scheme_code: str) -> Optional[MutualFund]:
        """Get a single scheme by code."""
        result = await self.db.execute(
            select(MutualFund).where(MutualFund.scheme_code == scheme_code)
        )
        return result.scalar_one_or_none()
    
    async def get_top_schemes_by_category(
        self,
        category: str,
        plan_type: str = "direct",
        limit: int = 10
    ) -> List[MutualFund]:
        """Get top performing schemes in a category."""
        result = await self.db.execute(
            select(MutualFund)
            .where(
                MutualFund.category == category,
                MutualFund.plan_type == plan_type,
                MutualFund.is_active == True,
                MutualFund.return_1y.isnot(None)
            )
            .order_by(MutualFund.return_1y.desc())
            .limit(limit)
        )
        return list(result.scalars().all())
    
    async def get_all_categories(self) -> List[str]:
        """Get all unique categories."""
        result = await self.db.execute(
            select(MutualFund.category)
            .where(MutualFund.is_active == True)
            .distinct()
        )
        return [r[0] for r in result.fetchall() if r[0]]
    
    async def get_all_amcs(self) -> List[str]:
        """Get all unique AMC names."""
        result = await self.db.execute(
            select(MutualFund.amc_name)
            .where(MutualFund.is_active == True)
            .distinct()
            .order_by(MutualFund.amc_name)
        )
        return [r[0] for r in result.fetchall() if r[0]]
    
    async def get_scheme_count(self) -> Dict[str, int]:
        """Get count of schemes by category."""
        result = await self.db.execute(
            select(MutualFund.category, func.count(MutualFund.id))
            .where(MutualFund.is_active == True)
            .group_by(MutualFund.category)
        )
        return {r[0]: r[1] for r in result.fetchall() if r[0]}
    
    def _determine_plan_type(self, name: str) -> str:
        """Determine if scheme is direct or regular plan."""
        name_lower = name.lower()
        if "direct" in name_lower:
            return "direct"
        elif "regular" in name_lower:
            return "regular"
        else:
            # Default to regular if not specified
            return "regular"
    
    def _categorize_scheme(self, name: str) -> str:
        """Categorize scheme based on name."""
        name_lower = name.lower()
        
        # Debt categories
        if "liquid" in name_lower:
            return "debt"
        elif "overnight" in name_lower:
            return "debt"
        elif "money market" in name_lower:
            return "debt"
        elif "ultra short" in name_lower:
            return "debt"
        elif "low duration" in name_lower:
            return "debt"
        elif "short duration" in name_lower or "short term" in name_lower:
            return "debt"
        elif "medium duration" in name_lower or "medium term" in name_lower:
            return "debt"
        elif "long duration" in name_lower or "long term" in name_lower:
            return "debt"
        elif "gilt" in name_lower:
            return "debt"
        elif "corporate bond" in name_lower:
            return "debt"
        elif "banking" in name_lower and "psu" in name_lower:
            return "debt"
        elif "credit risk" in name_lower:
            return "debt"
        elif "dynamic bond" in name_lower:
            return "debt"
        elif "debt" in name_lower or "bond" in name_lower or "income" in name_lower:
            return "debt"
        elif "floater" in name_lower:
            return "debt"
        
        # Hybrid categories
        elif "hybrid" in name_lower:
            return "hybrid"
        elif "balanced" in name_lower:
            return "hybrid"
        elif "aggressive" in name_lower and "hybrid" in name_lower:
            return "hybrid"
        elif "conservative" in name_lower and "hybrid" in name_lower:
            return "hybrid"
        elif "equity savings" in name_lower:
            return "hybrid"
        elif "arbitrage" in name_lower:
            return "hybrid"
        elif "multi asset" in name_lower:
            return "hybrid"
        
        # Commodity categories
        elif "gold" in name_lower:
            return "gold"
        elif "silver" in name_lower:
            return "silver"
        
        # Solution oriented
        elif "retirement" in name_lower:
            return "solution"
        elif "children" in name_lower or "child" in name_lower:
            return "solution"
        
        # ELSS
        elif "elss" in name_lower or "tax" in name_lower and "saver" in name_lower:
            return "equity_elss"
        
        # Index funds
        elif "index" in name_lower or "nifty" in name_lower or "sensex" in name_lower:
            return "equity_index"
        elif "etf" in name_lower:
            return "etf"
        
        # Equity categories (check last as many other categories also contain equity keywords)
        elif any(x in name_lower for x in [
            "large cap", "largecap", "large-cap",
            "mid cap", "midcap", "mid-cap", 
            "small cap", "smallcap", "small-cap",
            "multi cap", "multicap", "multi-cap",
            "flexi cap", "flexicap", "flexi-cap",
            "focused", "value", "contra", "dividend yield",
            "equity", "growth", "opportunities"
        ]):
            return "equity"
        elif "sectoral" in name_lower or "sector" in name_lower:
            return "equity_sectoral"
        elif "thematic" in name_lower:
            return "equity_thematic"
        
        # Fund of funds
        elif "fund of fund" in name_lower or "fof" in name_lower:
            return "fof"
        
        else:
            return "other"
    
    def _determine_sub_category(self, name: str) -> Optional[str]:
        """Determine sub-category for equity funds."""
        name_lower = name.lower()
        
        if "large cap" in name_lower or "largecap" in name_lower:
            return "large_cap"
        elif "mid cap" in name_lower or "midcap" in name_lower:
            return "mid_cap"
        elif "small cap" in name_lower or "smallcap" in name_lower:
            return "small_cap"
        elif "large & mid" in name_lower or "large and mid" in name_lower:
            return "large_mid_cap"
        elif "multi cap" in name_lower or "multicap" in name_lower:
            return "multi_cap"
        elif "flexi cap" in name_lower or "flexicap" in name_lower:
            return "flexi_cap"
        elif "focused" in name_lower:
            return "focused"
        elif "value" in name_lower:
            return "value"
        elif "contra" in name_lower:
            return "contra"
        elif "dividend yield" in name_lower:
            return "dividend_yield"
        
        return None
    
    def _extract_amc(self, name: str) -> str:
        """Extract AMC name from scheme name."""
        # List of known AMCs (in order of specificity)
        common_amcs = [
            ("Aditya Birla Sun Life", "Aditya Birla"),
            ("HDFC", "HDFC"),
            ("ICICI Prudential", "ICICI"),
            ("SBI", "SBI"),
            ("Axis", "Axis"),
            ("Kotak Mahindra", "Kotak"),
            ("Nippon India", "Nippon"),
            ("Tata", "Tata"),
            ("DSP", "DSP"),
            ("UTI", "UTI"),
            ("Mirae Asset", "Mirae"),
            ("Parag Parikh", "PPFAS"),
            ("Motilal Oswal", "Motilal"),
            ("Franklin Templeton", "Franklin"),
            ("PGIM India", "PGIM"),
            ("Invesco", "Invesco"),
            ("L&T", "L&T"),
            ("Canara Robeco", "Canara"),
            ("Sundaram", "Sundaram"),
            ("HSBC", "HSBC"),
            ("Edelweiss", "Edelweiss"),
            ("Bandhan", "Bandhan"),
            ("Baroda BNP", "Baroda"),
            ("Union", "Union"),
            ("Bank of India", "BOI"),
            ("LIC", "LIC"),
            ("Quant", "Quant"),
            ("360 ONE", "360 ONE"),
            ("WhiteOak", "WhiteOak"),
            ("Groww", "Groww"),
            ("Zerodha", "Zerodha"),
            ("Samco", "Samco"),
            ("NJ", "NJ"),
            ("TRUST", "Trust"),
            ("Mahindra Manulife", "Mahindra"),
            ("ITI", "ITI"),
            ("PPFAS", "PPFAS"),
            ("JM Financial", "JM"),
            ("Quantum", "Quantum"),
            ("Principal", "Principal"),
            ("BNP Paribas", "BNP"),
            ("IDFC", "IDFC"),
            ("Shriram", "Shriram"),
            ("Yes", "Yes"),
            ("BOI AXA", "BOI AXA"),
            ("Indiabulls", "Indiabulls"),
            ("IIFL", "IIFL"),
            ("Navi", "Navi"),
        ]
        
        name_lower = name.lower()
        for full_name, short_name in common_amcs:
            if full_name.lower() in name_lower:
                return short_name
        
        # Try to extract first word if no match
        words = name.split()
        if words:
            return words[0]
        
        return "Other"