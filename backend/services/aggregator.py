from collections import Counter

from models import AccountStats, CompareResult, ReelMetrics


def compute_account_stats(username: str, reels: list[ReelMetrics]) -> AccountStats:
    n = len(reels) or 1
    total_views = sum(r.views for r in reels)
    total_likes = sum(r.likes for r in reels)
    total_comments = sum(r.comments for r in reels)

    engagement_rates = []
    for r in reels:
        if r.views > 0:
            engagement_rates.append((r.likes + r.comments) / r.views)

    avg_engagement = sum(engagement_rates) / len(engagement_rates) if engagement_rates else 0.0

    hashtag_counter: Counter = Counter()
    for r in reels:
        hashtag_counter.update(r.hashtags)

    return AccountStats(
        username=username,
        reel_count=len(reels),
        avg_views=round(total_views / n, 1),
        avg_likes=round(total_likes / n, 1),
        avg_comments=round(total_comments / n, 1),
        avg_engagement_rate=round(avg_engagement * 100, 2),
        top_hashtags=hashtag_counter.most_common(10),
        reels=reels,
    )


def build_radar(a: AccountStats, b: AccountStats) -> list[dict]:
    """두 계정을 각 지표의 최댓값으로 정규화해 레이더 차트 데이터를 반환한다."""
    metrics = [
        ("평균 조회수", a.avg_views, b.avg_views),
        ("평균 좋아요", a.avg_likes, b.avg_likes),
        ("평균 댓글", a.avg_comments, b.avg_comments),
        ("참여율(%)", a.avg_engagement_rate, b.avg_engagement_rate),
        ("릴스 수", float(a.reel_count), float(b.reel_count)),
    ]
    result = []
    for label, va, vb in metrics:
        max_val = max(va, vb, 1)
        result.append(
            {
                "metric": label,
                a.username: round(va / max_val * 100, 1),
                b.username: round(vb / max_val * 100, 1),
            }
        )
    return result


def compare_accounts(a: AccountStats, b: AccountStats) -> CompareResult:
    return CompareResult(
        account_a=a,
        account_b=b,
        radar=build_radar(a, b),
    )
