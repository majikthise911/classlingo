"""PDF and Markdown content extraction and chunking."""

import re
from pathlib import Path
from typing import Optional

from core.llm_client import LLMClient


def extract_text_from_pdf(file_bytes: bytes) -> str:
    import fitz  # PyMuPDF
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    pages = []
    for page in doc:
        pages.append(page.get_text("text"))
    doc.close()
    return "\n\n".join(pages)


def extract_text_from_markdown(file_bytes: bytes) -> str:
    return file_bytes.decode("utf-8", errors="replace")


def extract_text(filename: str, file_bytes: bytes) -> str:
    ext = Path(filename).suffix.lower()
    if ext == ".pdf":
        return extract_text_from_pdf(file_bytes)
    elif ext in (".md", ".markdown", ".txt"):
        return extract_text_from_markdown(file_bytes)
    else:
        return file_bytes.decode("utf-8", errors="replace")


def chunk_by_sections(text: str, max_tokens: int = 800) -> list[str]:
    """Split text by headings/sections, keeping conceptual units together.
    Falls back to paragraph-based splitting for unstructured text."""
    # Try heading-based splits (markdown ## or === underlines)
    heading_pattern = r"(?=^#{1,3}\s|\n(?:={3,}|-{3,})\n)"
    sections = re.split(heading_pattern, text, flags=re.MULTILINE)
    sections = [s.strip() for s in sections if s.strip()]

    # If no headings found, split by double newlines
    if len(sections) <= 1:
        sections = re.split(r"\n\s*\n", text)
        sections = [s.strip() for s in sections if s.strip()]

    # Merge small sections, split large ones
    chunks = []
    current = ""
    for section in sections:
        # Rough token estimate: ~4 chars per token
        if len(current) + len(section) < max_tokens * 4:
            current = current + "\n\n" + section if current else section
        else:
            if current:
                chunks.append(current)
            # If single section is too large, split by paragraphs
            if len(section) > max_tokens * 4:
                paragraphs = section.split("\n\n")
                sub = ""
                for p in paragraphs:
                    if len(sub) + len(p) < max_tokens * 4:
                        sub = sub + "\n\n" + p if sub else p
                    else:
                        if sub:
                            chunks.append(sub)
                        sub = p
                if sub:
                    current = sub
                else:
                    current = ""
            else:
                current = section

    if current:
        chunks.append(current)

    return chunks if chunks else [text]


def label_chunk_topic(chunk_text: str, llm: Optional[LLMClient] = None) -> str:
    """Use LLM to generate a short topic label for a chunk."""
    if llm is None:
        try:
            llm = LLMClient()
        except ValueError:
            # No API key — use first line as fallback
            first_line = chunk_text.split("\n")[0][:80]
            return re.sub(r"^[#*\-\s]+", "", first_line) or "General"

    system = (
        "You are a topic labeler. Given a chunk of course material, "
        "output a SHORT topic label (2-6 words). Examples: 'Rotation Matrices', "
        "'Keplerian Elements', 'UVW Frame', 'Orbital Energy'. "
        "Output ONLY the label, nothing else."
    )
    try:
        label = llm.generate(system, chunk_text[:1500], model_tier="feedback")
        return label.strip().strip('"').strip("'")[:60]
    except Exception:
        first_line = chunk_text.split("\n")[0][:80]
        return re.sub(r"^[#*\-\s]+", "", first_line) or "General"
