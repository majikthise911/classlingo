"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Note } from "@/lib/db/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, StickyNote, Save, Loader2, X } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";

export default function NotesPage() {
  const params = useParams();
  const classId = params.classId as string;
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);

  const supabase = createClient();

  const loadNotes = useCallback(async () => {
    const { data } = await supabase
      .from("notes")
      .select("*")
      .eq("class_id", classId)
      .order("updated_at", { ascending: false });
    setNotes(data ?? []);
    setLoading(false);
  }, [classId, supabase]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  async function handleCreate() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("notes")
      .insert({ class_id: classId, user_id: user.id, title: "Untitled", content: "" })
      .select()
      .single();

    if (data) {
      setActiveNote(data);
      setEditTitle(data.title);
      setEditContent(data.content);
      loadNotes();
    }
  }

  function openNote(note: Note) {
    setActiveNote(note);
    setEditTitle(note.title);
    setEditContent(note.content);
  }

  async function handleSave() {
    if (!activeNote) return;
    setSaving(true);
    await supabase
      .from("notes")
      .update({ title: editTitle, content: editContent })
      .eq("id", activeNote.id);
    setSaving(false);
    loadNotes();
  }

  async function handleDelete(noteId: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("Delete this note?")) return;
    await supabase.from("notes").delete().eq("id", noteId);
    if (activeNote?.id === noteId) setActiveNote(null);
    loadNotes();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  // Editor view
  if (activeNote) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setActiveNote(null)}>
            <X className="h-5 w-5" />
          </Button>
          <Input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="text-lg font-semibold"
            placeholder="Note title"
          />
          <Button onClick={handleSave} disabled={saving} size="sm">
            {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
            Save
          </Button>
        </div>
        <Textarea
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          placeholder="Write your notes here... (Markdown supported)"
          className="min-h-[50vh] font-mono text-sm"
        />
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-4">
      <Button onClick={handleCreate} className="w-full">
        <Plus className="mr-1 h-4 w-4" />
        New Note
      </Button>

      {notes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-8">
            <StickyNote className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">No notes yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {notes.map((note) => (
            <Card
              key={note.id}
              className="cursor-pointer transition-colors hover:bg-muted/50"
              onClick={() => openNote(note)}
            >
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium">{note.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {note.content.slice(0, 80) || "Empty note"}{" "}
                    &middot; {formatRelativeTime(note.updated_at)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => handleDelete(note.id, e)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
