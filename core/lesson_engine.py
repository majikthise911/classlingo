"""Lesson generation engine: topic selection, exercise generation, feedback."""

import json
import random
from typing import Optional

from core.llm_client import LLMClient
from core import database as db
from core.spaced_rep import sm2_update, quality_from_correct

EXERCISE_SYSTEM_PROMPT = """You are an expert tutor for a graduate-level university course.
Generate exercises from the provided course material chunk.

Rules:
- Each exercise tests ONE concept from the chunk
- Use the exact notation from the course material
- For math: use LaTeX notation wrapped in $...$ or $$...$$
- Difficulty 1-5 (1=definition recall, 5=multi-step computation)
- Always include a detailed explanation for the correct answer
- Reference specific slide numbers or homework problems when possible

Output valid JSON (no markdown fences) with this schema:
{
  "type": "mcq",
  "question": "string with LaTeX",
  "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
  "correct_answer": "A",
  "explanation": "detailed explanation with LaTeX",
  "hint": "optional hint",
  "difficulty": 3,
  "topic": "topic label"
}

Supported types and their required fields:
- "mcq": must have "options" (4 choices) and "correct_answer" (letter A/B/C/D)
- "fill_blank": "question" has blanks marked as ___, "correct_answer" is the fill text
- "computation": "question" asks for a numeric result, "correct_answer" is a number, include "tolerance" (float)
- "conceptual": "question" asks for explanation, "correct_answer" is the expected key points

Generate exactly ONE exercise. Choose the type that best fits the material."""

BATCH_SYSTEM_PROMPT = """You are an expert tutor for a graduate-level university course.
Generate a batch of exercises from the provided course material chunk.

Rules:
- Each exercise tests ONE concept from the chunk
- Use the exact notation from the course material
- For math: use LaTeX notation wrapped in $...$ or $$...$$
- Difficulty 1-5 (1=definition recall, 5=multi-step computation)
- Always include a detailed explanation for the correct answer
- Vary the exercise types across the batch

Output valid JSON (no markdown fences) as an ARRAY of exercise objects:
[
  {
    "type": "mcq|fill_blank|computation|conceptual",
    "question": "string with LaTeX",
    "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
    "correct_answer": "string",
    "explanation": "detailed explanation with LaTeX",
    "hint": "optional hint",
    "difficulty": 3,
    "topic": "topic label",
    "tolerance": null
  }
]

For "mcq": include "options" and set "correct_answer" to the letter (A/B/C/D).
For "computation": include "tolerance" as a number.
For "fill_blank": mark blanks with ___ in question.
For "conceptual": correct_answer lists key points.

Generate exactly 3 diverse exercises from this chunk."""

FEEDBACK_SYSTEM_PROMPT = """You are a friendly, encouraging tutor. Given an exercise, the student's answer, and the correct answer, provide brief feedback (1-2 sentences).

If correct: congratulate briefly and reinforce the concept.
If wrong: explain the specific mistake and give one hint toward the right approach.
Use the same notation as the course material. Use LaTeX ($...$) for math.
Output ONLY the feedback text, nothing else."""


def select_lesson_exercises(class_id: int, target_count: int = 7) -> list[dict]:
    """Select exercises for a lesson using spaced repetition + new material mix."""
    # 60% review, 40% new
    review_count = int(target_count * 0.6)
    new_count = target_count - review_count

    due = db.get_due_exercises(class_id, limit=review_count)
    exercises = list(due)

    if len(exercises) < review_count:
        new_count += review_count - len(exercises)

    new = db.get_new_exercises(class_id, limit=new_count)
    # Initialize progress for new exercises
    for ex in new:
        db.get_or_create_progress(ex["id"])
    exercises.extend(new)

    random.shuffle(exercises)
    return exercises[:target_count]


def generate_exercises_for_chunk(chunk_id: int, class_id: int,
                                 llm: Optional[LLMClient] = None,
                                 count: int = 3) -> list[int]:
    """Generate exercises from a chunk using LLM. Returns exercise IDs."""
    chunk = db.get_chunk_by_id(chunk_id)
    if not chunk:
        return []

    if llm is None:
        llm = LLMClient()

    prompt = f"Course material chunk (topic: {chunk['topic_label']}):\n\n{chunk['chunk_text']}"

    try:
        if count == 1:
            result = llm.generate_json(EXERCISE_SYSTEM_PROMPT, prompt)
            exercises_data = [result]
        else:
            result = llm.generate_json(BATCH_SYSTEM_PROMPT, prompt)
            if isinstance(result, list):
                exercises_data = result
            else:
                exercises_data = [result]
    except Exception as e:
        raise RuntimeError(f"Failed to generate exercises: {e}")

    exercise_ids = []
    for ex_data in exercises_data:
        ex_type = ex_data.get("type", "mcq")
        difficulty = ex_data.get("difficulty", 3)
        topic = ex_data.get("topic", chunk["topic_label"])
        eid = db.add_exercise(
            class_id=class_id,
            chunk_id=chunk_id,
            exercise_type=ex_type,
            question_json=json.dumps(ex_data),
            difficulty=difficulty,
            topic=topic,
        )
        exercise_ids.append(eid)

    return exercise_ids


def generate_feedback(exercise_json: dict, user_answer: str, correct: bool,
                      llm: Optional[LLMClient] = None) -> str:
    """Generate AI feedback for a student's answer."""
    if llm is None:
        try:
            llm = LLMClient()
        except ValueError:
            if correct:
                return "Correct! Well done."
            return f"Not quite. The correct answer is: {exercise_json.get('correct_answer', 'N/A')}"

    prompt = (
        f"Exercise: {exercise_json['question']}\n"
        f"Correct answer: {exercise_json['correct_answer']}\n"
        f"Student's answer: {user_answer}\n"
        f"Was correct: {correct}"
    )
    if exercise_json.get("explanation"):
        prompt += f"\nExplanation: {exercise_json['explanation']}"

    try:
        return llm.generate(FEEDBACK_SYSTEM_PROMPT, prompt, model_tier="feedback", max_tokens=300)
    except Exception:
        if correct:
            return "Correct! Well done."
        return f"Not quite. The correct answer is: {exercise_json.get('correct_answer', 'N/A')}"


def check_answer(exercise_json: dict, user_answer: str) -> bool:
    """Check if user's answer is correct."""
    ex_type = exercise_json.get("type", "mcq")
    correct = exercise_json.get("correct_answer", "")

    if ex_type == "mcq":
        # Extract just the letter from both
        user_letter = user_answer.strip().upper()[:1]
        correct_letter = correct.strip().upper()[:1]
        return user_letter == correct_letter

    elif ex_type == "computation":
        try:
            user_val = float(user_answer.strip().replace(",", ""))
            correct_val = float(correct)
            tolerance = exercise_json.get("tolerance", abs(correct_val * 0.02))
            if tolerance is None:
                tolerance = abs(correct_val * 0.02)
            return abs(user_val - correct_val) <= abs(float(tolerance))
        except (ValueError, TypeError):
            return False

    elif ex_type == "fill_blank":
        return user_answer.strip().lower() == correct.strip().lower()

    else:
        # Conceptual — always send to AI for grading, default to True for effort
        return True


def process_answer(exercise_id: int, user_answer: str,
                   llm: Optional[LLMClient] = None) -> dict:
    """Process a user's answer: check, update progress, generate feedback.

    Returns dict with: correct, xp_earned, feedback, hearts_remaining
    """
    from core.gamification import award_xp, use_heart, get_hearts

    exercise = db.get_exercise_by_id(exercise_id)
    if not exercise:
        return {"correct": False, "xp_earned": 0, "feedback": "Exercise not found.", "hearts": 0}

    ex_json = json.loads(exercise["question_json"])
    correct = check_answer(ex_json, user_answer)

    # Update spaced repetition
    progress = db.get_or_create_progress(exercise_id)
    quality = quality_from_correct(correct, exercise.get("difficulty", 3))
    result = sm2_update(
        quality=quality,
        repetitions=progress["repetitions"],
        ease_factor=progress["ease_factor"],
        interval=progress["interval_days"],
    )
    db.update_progress(
        exercise_id=exercise_id,
        ease_factor=result.ease_factor,
        interval_days=result.interval,
        repetitions=result.repetitions,
        quality=quality,
        correct=correct,
    )

    # XP and hearts
    xp = award_xp(correct)
    if not correct:
        use_heart()

    # Feedback
    feedback = generate_feedback(ex_json, user_answer, correct, llm)

    return {
        "correct": correct,
        "xp_earned": xp,
        "feedback": feedback,
        "hearts": get_hearts(),
        "explanation": ex_json.get("explanation", ""),
    }
