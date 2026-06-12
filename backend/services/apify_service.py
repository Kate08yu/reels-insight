import os
import httpx
from models import ReelMetrics


APIFY_TOKEN = os.getenv("APIFY_API_TOKEN", "")
ACTOR_ID = "apify~instagram-scraper"
BASE_URL = "https://api.apify.com/v2"


async def fetch_account_reels(username: str, max_items: int = 50) -> list[ReelMetrics]:
    """Apify Instagram Scraper로 계정의 릴스 목록과 지표를 수집한다."""
    async with httpx.AsyncClient(timeout=120) as client:
        run_resp = await client.post(
            f"{BASE_URL}/acts/{ACTOR_ID}/runs",
            params={"token": APIFY_TOKEN},
            json={
                "directUrls": [f"https://www.instagram.com/{username}/reels/"],
                "resultsType": "posts",
                "resultsLimit": max_items,
                "addParentData": False,
            },
        )
        run_resp.raise_for_status()
        run = run_resp.json()["data"]
        run_id = run["id"]
        dataset_id = run["defaultDatasetId"]

        # 실행 완료 대기 (polling)
        for _ in range(60):
            status_resp = await client.get(
                f"{BASE_URL}/actor-runs/{run_id}",
                params={"token": APIFY_TOKEN},
            )
            status = status_resp.json()["data"]["status"]
            if status == "SUCCEEDED":
                break
            if status in ("FAILED", "ABORTED", "TIMED-OUT"):
                raise RuntimeError(f"Apify run {status}")
            import asyncio
            await asyncio.sleep(3)
        else:
            raise TimeoutError("Apify run timed out")

        items_resp = await client.get(
            f"{BASE_URL}/datasets/{dataset_id}/items",
            params={"token": APIFY_TOKEN, "limit": max_items},
        )
        items_resp.raise_for_status()
        raw = items_resp.json()

    reels = []
    for item in raw:
        # Apify Instagram Scraper 출력 필드 매핑
        if item.get("type") not in ("Video", "Reel", None):
            continue
        caption_text = item.get("caption", "") or ""
        hashtags = [
            t.lstrip("#") for t in caption_text.split() if t.startswith("#")
        ]
        reels.append(
            ReelMetrics(
                shortcode=item.get("shortCode", item.get("id", "")),
                url=item.get("url", ""),
                thumbnail=item.get("displayUrl", item.get("thumbnailUrl")),
                caption=caption_text,
                hashtags=hashtags,
                likes=item.get("likesCount", 0) or 0,
                comments=item.get("commentsCount", 0) or 0,
                views=item.get("videoViewCount", item.get("videoPlayCount", 0)) or 0,
                timestamp=str(item.get("timestamp", "")),
                owner=item.get("ownerUsername", username),
            )
        )
    return reels
