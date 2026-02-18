"""SM-2 spaced repetition algorithm."""

from datetime import date, timedelta
from typing import NamedTuple


class SM2Result(NamedTuple):
    repetitions: int
    ease_factor: float
    interval: int  # days


def sm2_update(quality: int, repetitions: int, ease_factor: float,
               interval: int) -> SM2Result:
    """SM-2 spaced repetition update.

    Args:
        quality: 0-5 (0=blackout, 3=correct with difficulty, 5=perfect recall)
        repetitions: current repetition count
        ease_factor: current ease factor (>=1.3)
        interval: current interval in days

    Returns:
        SM2Result with updated repetitions, ease_factor, interval
    """
    if quality >= 3:  # correct
        if repetitions == 0:
            interval = 1
        elif repetitions == 1:
            interval = 6
        else:
            interval = round(interval * ease_factor)
        repetitions += 1
    else:  # incorrect — reset
        repetitions = 0
        interval = 1

    ease_factor = max(
        1.3,
        ease_factor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02),
    )
    return SM2Result(repetitions=repetitions, ease_factor=ease_factor, interval=interval)


def quality_from_correct(correct: bool, difficulty: int = 3) -> int:
    """Map a correct/incorrect answer + difficulty to SM-2 quality score.

    Returns 0-5 quality score.
    """
    if correct:
        # Easy questions get higher quality, hard ones get lower
        if difficulty <= 2:
            return 5  # easy + correct = perfect
        elif difficulty <= 3:
            return 4  # medium + correct = good
        else:
            return 3  # hard + correct = acceptable
    else:
        if difficulty >= 4:
            return 2  # hard + wrong = partial
        else:
            return 1  # easy/medium + wrong = poor
