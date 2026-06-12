from fastapi import APIRouter, HTTPException, Query

from models import AccountStats
from services.apify_service import fetch_account_reels
from services.aggregator import compute_account_stats

router = APIRouter(prefix="/api/accounts", tags=["accounts"])


@router.get("/{username}", response_model=AccountStats)
async def get_account(username: str, max_items: int = Query(default=30, le=100)):
    try:
        reels = await fetch_account_reels(username, max_items)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))
    if not reels:
        raise HTTPException(status_code=404, detail="릴스를 찾을 수 없습니다.")
    return compute_account_stats(username, reels)
