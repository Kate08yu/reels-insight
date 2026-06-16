from pydantic import BaseModel, ConfigDict
from typing import Optional


class _StrCoerce(BaseModel):
    model_config = ConfigDict(coerce_numbers_to_str=True)


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


class SceneAnalysis(_StrCoerce):
    scene: int
    text: str = ""
    text_kr: str = ""
    description: str
    technique: str = ""
    psychology: str = ""
    retention_score: str = ""


class HookAnalysis(_StrCoerce):
    technique: str
    strength: str
    reason: str


class StructureAnalysis(_StrCoerce):
    pattern: str
    emotion_flow: str = ""
    pacing: str
    loop_potential: str


class AlgorithmFactors(_StrCoerce):
    watch_time_optimization: str
    shareability: str
    shareability_reason: str


class BenchmarkingGuide(_StrCoerce):
    hook_template: str          # 그대로 쓸 수 있는 후킹 문장 템플릿
    structure_template: str     # 구조 따라하기 가이드
    visual_style: str           # 시각적 스타일 포인트
    audio_strategy: str         # 음악/보이스오버 전략
    caption_strategy: str       # 캡션 작성 전략
    checklist: list[str]        # 제작 전 체크리스트


class VideoAnalysis(_StrCoerce):
    summary: str
    tone: str
    keywords: list[str]
    topics: list[str]
    hook: HookAnalysis
    structure: StructureAnalysis
    scenes: list[SceneAnalysis]
    engagement_triggers: list[str] = []
    algorithm_factors: AlgorithmFactors
    weaknesses: list[str] = []
    improvement: list[str] = []
    benchmarking: BenchmarkingGuide
    transcript: str = ""
    transcript_kr: str = ""
    caption_suggestions: list[str] = []


class ReelDetail(ReelMetrics):
    analysis: Optional[VideoAnalysis] = None
    notion_url: Optional[str] = None


class AccountStats(BaseModel):
    username: str
    reel_count: int
    avg_views: float
    avg_likes: float
    avg_comments: float
    avg_engagement_rate: float
    top_hashtags: list = []
    reels: list[ReelMetrics] = []


class CompareRequest(BaseModel):
    username_a: str
    username_b: str
    max_items: int = 20


class CompareResult(BaseModel):
    account_a: dict
    account_b: dict
    radar: list[dict]
