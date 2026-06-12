from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from models import ReelDetail, VideoAnalysis
from services.video_analyzer import analyze_reel
from services.notion_service import save_analysis, get_or_create_db

router = APIRouter(prefix="/api/reels", tags=["reels"])


class AnalyzeRequest(BaseModel):
    url: str
    save_to_notion: bool = False


@router.post("/analyze", response_model=ReelDetail)
async def analyze_reel_endpoint(body: AnalyzeRequest):
    try:
        analysis: VideoAnalysis = await analyze_reel(body.url)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))

    notion_url = None
    if body.save_to_notion:
        try:
            db_id = await get_or_create_db()
            notion_url = await save_analysis(body.url, analysis, db_id)
        except Exception as e:
            notion_url = f"저장 실패: {e}"

    return ReelDetail(
        shortcode="",
        url=body.url,
        analysis=analysis,
        notion_url=notion_url,
    )
