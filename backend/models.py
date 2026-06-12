from pydantic import BaseModel
from typing import Optional


class ReelMetrics(BaseModel):
    shortcode: str
    url: str
    thumbnail: Optional[str] = None
    caption: Optional[str] = None
    hashtags: list[str] = []
    likes: int = 0
    comments: int = 0
    views: int = 0
    timestamp: Optional[str] = None
    owner: Optional[str] = None


class VideoAnalysis(BaseModel):
    summary: str
    tone: str
    keywords: list[str]
    topics: list[str]


class ReelDetail(ReelMetrics):
    analysis: Optional[VideoAnalysis] = None


class AccountStats(BaseModel):
    username: str
    reel_count: int
    avg_views: float
    avg_likes: float
    avg_comments: float
    avg_engagement_rate: float
    top_hashtags: list[tuple[str, int]]
    reels: list[ReelMetrics]


class CompareRequest(BaseModel):
    username_a: str
    username_b: str
    max_items: int = 20


class CompareResult(BaseModel):
    account_a: AccountStats
    account_b: AccountStats
    radar: list[dict]
