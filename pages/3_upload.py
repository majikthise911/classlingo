"""Upload page: manage classes and upload course materials."""

import streamlit as st
from core.database import (
    init_db, get_classes, create_class, delete_class,
    add_material, get_materials, delete_material,
    get_chunks_for_class, add_chunk,
)
from core.content_parser import extract_text, chunk_by_sections, label_chunk_topic

init_db()

st.set_page_config(page_title="Upload | Classlingo", page_icon="📤", layout="centered")

from pathlib import Path
css_path = Path(__file__).parent.parent / "assets" / "style.css"
if css_path.exists():
    st.markdown(f"<style>{css_path.read_text()}</style>", unsafe_allow_html=True)

st.title("📤 Upload Materials")

# --- Class Management ---
st.subheader("Your Classes")

classes = get_classes()

col1, col2 = st.columns([3, 1])
with col1:
    new_class_name = st.text_input("New class name", placeholder="e.g. SPCE 5025")
with col2:
    st.write("")  # spacer
    st.write("")
    if st.button("Create", use_container_width=True, type="primary"):
        if new_class_name.strip():
            create_class(new_class_name.strip())
            st.rerun()
        else:
            st.warning("Enter a class name.")

if not classes:
    st.info("No classes yet. Create one above to get started!")
    st.stop()

# Select class
class_names = {c["id"]: c["name"] for c in classes}
selected_class_id = st.selectbox(
    "Select class",
    options=[c["id"] for c in classes],
    format_func=lambda x: class_names[x],
)

# Delete class
with st.expander("Danger zone"):
    if st.button(f"Delete '{class_names[selected_class_id]}'", type="secondary"):
        delete_class(selected_class_id)
        st.rerun()

st.divider()

# --- File Upload ---
st.subheader("Upload Files")
st.caption("Supports PDF, Markdown (.md), and plain text (.txt)")

uploaded_files = st.file_uploader(
    "Choose files",
    accept_multiple_files=True,
    type=["pdf", "md", "markdown", "txt"],
)

if uploaded_files:
    if st.button("Process Uploads", use_container_width=True, type="primary"):
        llm = None
        try:
            from core.llm_client import LLMClient
            llm = LLMClient()
        except ValueError:
            st.warning("No API key configured — topic labels will be auto-generated from headings.")

        for f in uploaded_files:
            with st.spinner(f"Processing {f.name}..."):
                # Extract text
                text = extract_text(f.name, f.read())
                if not text.strip():
                    st.warning(f"Could not extract text from {f.name}")
                    continue

                # Save material
                mat_id = add_material(selected_class_id, f.name, text)

                # Chunk
                chunks = chunk_by_sections(text)
                for i, chunk_text in enumerate(chunks):
                    topic = label_chunk_topic(chunk_text, llm)
                    add_chunk(mat_id, chunk_text, topic, None, i)

                st.success(f"✅ {f.name}: {len(chunks)} chunks extracted")

        # Generate exercises for new chunks
        st.divider()
        st.subheader("Generate Exercises")
        all_chunks = get_chunks_for_class(selected_class_id)
        existing_exercises = set()
        from core.database import get_exercises_for_class
        for ex in get_exercises_for_class(selected_class_id):
            existing_exercises.add(ex["chunk_id"])

        new_chunks = [c for c in all_chunks if c["id"] not in existing_exercises]

        if new_chunks and llm:
            if st.button(f"Generate exercises for {len(new_chunks)} new chunks", use_container_width=True):
                from core.lesson_engine import generate_exercises_for_chunk
                progress_bar = st.progress(0)
                for i, chunk in enumerate(new_chunks):
                    with st.spinner(f"Generating for: {chunk['topic_label']}..."):
                        try:
                            ids = generate_exercises_for_chunk(chunk["id"], selected_class_id, llm)
                            st.caption(f"  → {len(ids)} exercises for '{chunk['topic_label']}'")
                        except Exception as e:
                            st.warning(f"  → Failed for '{chunk['topic_label']}': {e}")
                    progress_bar.progress((i + 1) / len(new_chunks))
                st.success("Exercise generation complete!")

st.divider()

# --- Existing Materials ---
st.subheader("Uploaded Materials")
materials = get_materials(selected_class_id)
if not materials:
    st.info("No materials uploaded yet.")
else:
    for mat in materials:
        col1, col2, col3 = st.columns([4, 2, 1])
        with col1:
            st.write(f"📄 **{mat['filename']}**")
        with col2:
            st.caption(str(mat["uploaded_at"])[:10] if mat["uploaded_at"] else "")
        with col3:
            if st.button("🗑️", key=f"del_mat_{mat['id']}"):
                delete_material(mat["id"])
                st.rerun()

# --- Chunk / Exercise Summary ---
chunks = get_chunks_for_class(selected_class_id)
from core.database import get_exercises_for_class
exercises = get_exercises_for_class(selected_class_id)

st.divider()
col1, col2 = st.columns(2)
with col1:
    st.metric("Total Chunks", len(chunks))
with col2:
    st.metric("Total Exercises", len(exercises))

# Generate exercises button (for when materials are already uploaded)
if chunks and not uploaded_files:
    existing_exercises = {ex["chunk_id"] for ex in exercises}
    new_chunks = [c for c in chunks if c["id"] not in existing_exercises]
    if new_chunks:
        st.divider()
        if st.button(f"Generate exercises for {len(new_chunks)} chunks without exercises", use_container_width=True, type="primary"):
            try:
                from core.llm_client import LLMClient
                from core.lesson_engine import generate_exercises_for_chunk
                llm = LLMClient()
                progress_bar = st.progress(0)
                for i, chunk in enumerate(new_chunks):
                    with st.spinner(f"Generating for: {chunk['topic_label']}..."):
                        try:
                            ids = generate_exercises_for_chunk(chunk["id"], selected_class_id, llm)
                            st.caption(f"  → {len(ids)} exercises for '{chunk['topic_label']}'")
                        except Exception as e:
                            st.warning(f"  → Failed for '{chunk['topic_label']}': {e}")
                    progress_bar.progress((i + 1) / len(new_chunks))
                st.success("Exercise generation complete!")
                st.rerun()
            except ValueError as e:
                st.error(str(e))
