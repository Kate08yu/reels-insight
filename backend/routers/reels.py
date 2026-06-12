from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from models import CompareRequest, CompareResult, ReelDetail, VideoAnalysis
from services.apify_service import fetch_account_reels
from services.aggregator import compare_accounts, compute_account_stats
from services.video_analyzer import analyze_reel

router = APIRouter(prefix="/api/reels", tags=["reels"])


class AnalyzeRequest(BaseModel):
    url: str


@router.post("/analyze", response_model=ReelDetail)
async def analyze_reel_endpoint(body: AnalyzeRequest):
    try:
        analysis: VideoAnalysis = await analyze_reel(body.url)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))
    return ReelDetail(
        shortcode="",
        url=body.url,
        analysis=analysis,
    )


@router.post("/compare", response_model=CompareResult)
async def compare_endpoint(body: CompareRequest):
    try:
        reels_a = await fetch_account_reels(body.username_a, body.max_items)
        reels_b = await fetch_account_reels(body.username_b, body.max_items)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))
    stats_a = compute_account_stats(body.username_a, reels_a)
    stats_b = compute_account_stats(body.username_b, reels_b)
    return compare_accounts(stats_a, stats_b)
