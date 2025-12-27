"""
Supermemory integration for user context and memory.
"""
import logging
from typing import Any, Dict, List, Optional

from app.config import get_settings
from supermemory import AsyncSupermemory

logger = logging.getLogger(__name__)
settings = get_settings()


class SupermemoryService:
    """
    Manages user memory and context using Supermemory.
    Stores investment history, preferences, and conversations.
    """
    
    def __init__(self):
        self.client = AsyncSupermemory(api_key=settings.SUPERMEMORY_API_KEY)
    
    async def add_user_memory(
        self,
        user_id: str,
        content: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Add a memory for a user."""
        try:
            response = await self.client.memories.add(
                content=content,
                metadata={
                    "user_id": user_id,
                    **(metadata or {})
                }
            )
            return {"success": True, "memory_id": response.id}
        except Exception as e:
            logger.error(f"Failed to add memory: {e}")
            return {"success": False, "error": str(e)}
    
    async def search_user_memories(
        self,
        user_id: str,
        query: str,
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """Search user's memories."""
        try:
            response = await self.client.search.execute(
                q=query,
                filters={"user_id": user_id},
                limit=limit
            )
            return [
                {
                    "content": r.content,
                    "score": r.score,
                    "metadata": r.metadata
                }
                for r in response.results
            ]
        except Exception as e:
            logger.error(f"Failed to search memories: {e}")
            return []
    
    async def store_investment_action(
        self,
        user_id: str,
        action_type: str,
        details: Dict[str, Any]
    ):
        """Store an investment action in memory."""
        content = f"""
        Investment Action: {action_type}
        Date: {details.get('date', 'Unknown')}
        Amount: ₹{details.get('amount', 0):,.0f}
        Asset: {details.get('asset_name', 'Unknown')}
        Asset Type: {details.get('asset_type', 'Unknown')}
        Reason: {details.get('reason', 'No reason provided')}
        """
        
        await self.add_user_memory(
            user_id=user_id,
            content=content,
            metadata={
                "type": "investment_action",
                "action": action_type,
                **details
            }
        )
    
    async def store_recommendation_feedback(
        self,
        user_id: str,
        recommendation_id: str,
        feedback: str,
        followed: bool
    ):
        """Store user's feedback on AI recommendations."""
        content = f"""
        Recommendation Feedback:
        Recommendation ID: {recommendation_id}
        User followed: {'Yes' if followed else 'No'}
        User feedback: {feedback}
        """
        
        await self.add_user_memory(
            user_id=user_id,
            content=content,
            metadata={
                "type": "recommendation_feedback",
                "recommendation_id": recommendation_id,
                "followed": followed
            }
        )
    
    async def get_user_context(
        self,
        user_id: str,
        context_type: str = "all"
    ) -> str:
        """
        Get relevant user context for AI analysis.
        """
        queries = {
            "preferences": "user investment preferences and risk tolerance",
            "history": "recent investment actions and decisions",
            "feedback": "feedback on recommendations",
            "all": "investment history preferences decisions feedback"
        }
        
        query = queries.get(context_type, queries["all"])
        memories = await self.search_user_memories(user_id, query, limit=10)
        
        if not memories:
            return "No previous context available for this user."
        
        context = "\n\n".join([m["content"] for m in memories])
        return context