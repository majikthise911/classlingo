"""Gamification: XP, hearts, streaks, levels."""

from datetime import date, datetime, timedelta

from core.database import get_profile, update_profile, get_today_stats, update_today_stats


# XP rewards
XP_CORRECT = 10
XP_INCORRECT = 5  # effort reward
XP_LESSON_BONUS = 50
XP_STREAK_BONUS = 20


def award_xp(correct: bool) -> int:
    """Award XP for answering an exercise. Returns XP earned."""
    xp = XP_CORRECT if correct else XP_INCORRECT
    profile = get_profile()
    new_total = profile["total_xp"] + xp
    new_level = (new_total // 100) + 1
    update_profile(total_xp=new_total, level=new_level)
    update_today_stats(xp_delta=xp, exercises_delta=1)
    return xp


def complete_lesson() -> int:
    """Award lesson completion bonus. Returns total bonus XP."""
    profile = get_profile()
    bonus = XP_LESSON_BONUS

    # Streak bonus
    today_stats = get_today_stats()
    if not today_stats["streak_maintained"]:
        bonus += XP_STREAK_BONUS
        _update_streak()

    new_total = profile["total_xp"] + bonus
    new_level = (new_total // 100) + 1
    update_profile(total_xp=new_total, level=new_level)
    update_today_stats(xp_delta=bonus, lesson_completed=True)
    return bonus


def _update_streak() -> None:
    """Update streak counter."""
    profile = get_profile()
    yesterday = (date.today() - timedelta(days=1)).isoformat()

    from core.database import get_connection
    conn = get_connection()
    yesterday_row = conn.execute(
        "SELECT streak_maintained FROM daily_stats WHERE date = ?", (yesterday,)
    ).fetchone()
    conn.close()

    if yesterday_row and yesterday_row["streak_maintained"]:
        new_streak = profile["current_streak"] + 1
    else:
        new_streak = 1

    longest = max(profile["longest_streak"], new_streak)
    update_profile(current_streak=new_streak, longest_streak=longest)


def use_heart() -> bool:
    """Consume a heart on wrong answer. Returns False if no hearts left."""
    from core.database import recharge_hearts
    hearts = recharge_hearts()
    if hearts <= 0:
        return False
    update_profile(hearts=hearts - 1)
    return True


def get_hearts() -> int:
    from core.database import recharge_hearts
    return recharge_hearts()


def get_level_info() -> dict:
    profile = get_profile()
    level = profile["level"]
    xp = profile["total_xp"]
    xp_in_level = xp % 100
    return {
        "level": level,
        "total_xp": xp,
        "xp_in_level": xp_in_level,
        "xp_to_next": 100 - xp_in_level,
    }
