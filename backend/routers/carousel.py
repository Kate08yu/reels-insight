import base64

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from models import ReelDetail, VideoAnalysis
from services.notion_service import get_or_create_db, save_analysis
from services.video_analyzer import analyze_carousel

router = APIRouter(prefix="/api/carousel", tags=["carousel"])


@router.post("/analyze", response_model=ReelDetail)
async def analyze_carousel_endpoint(
    files: list[UploadFile] = File(...),
    save_to_notion: bool = Form(False),
):
    if not files:
        raise HTTPException(status_code=400, detail="이미지를 1장 이상 업로드해주세요.")
    if len(files) > 15:
        raise HTTPException(status_code=400, detail="최대 15장까지 업로드 가능합니다.")

    images_b64: list[str] = []
    for f in files:
        raw = await f.read()
        images_b64.append(base64.standard_b64encode(raw).decode())

    try:
        analysis: VideoAnalysis = await analyze_carousel(images_b64)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))

    notion_url = None
    if save_to_notion:
        try:
            db_id = await get_or_create_db()
            notion_url = await save_analysis("캐러셀 업로드", analysis, db_id)
        except Exception as e:
            notion_url = f"저장 실패: {e}"

    return ReelDetail(
        shortcode="",
        url="carousel-upload",
        analysis=analysis,
        notion_url=notion_url,
    )
