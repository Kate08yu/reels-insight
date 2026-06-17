from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

from models import ReelDetail, VideoAnalysis
from services.video_analyzer import analyze_reel, analyze_video_file
from services.notion_service import save_analysis, get_or_create_db

router = APIRouter(prefix="/api/reels", tags=["reels"])


class AnalyzeRequest(BaseModel):
    url: str
    save_to_notion: bool = False
    caption: str = ""


@router.post("/analyze", response_model=ReelDetail)
async def analyze_reel_endpoint(body: AnalyzeRequest):
    try:
        analysis: VideoAnalysis = await analyze_reel(body.url, body.caption)
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


@router.post("/analyze-upload", response_model=ReelDetail)
async def analyze_upload_endpoint(
    file: UploadFile = File(...),
    save_to_notion: bool = Form(True),
    caption: str = Form(""),
):
    video_bytes = await file.read()
    if len(video_bytes) > 200 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="파일 크기는 200MB 이하여야 합니다.")

    try:
        analysis: VideoAnalysis = await analyze_video_file(video_bytes, caption)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))

    notion_url = None
    if save_to_notion:
        try:
            db_id = await get_or_create_db()
            notion_url = await save_analysis(file.filename or "업로드 영상", analysis, db_id)
        except Exception as e:
            notion_url = f"저장 실패: {e}"

    return ReelDetail(
        shortcode="",
        url=file.filename or "upload",
        analysis=analysis,
        notion_url=notion_url,
    )
