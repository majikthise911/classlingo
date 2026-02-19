"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Week } from "@/lib/db/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Plus, Calendar, Trash2, Loader2 } from "lucide-react";

export default function WeeksPage() {
  const params = useParams();
  const classId = params.classId as string;
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const supabase = createClient();

  const loadWeeks = useCallback(async () => {
    const { data } = await supabase
      .from("weeks")
      .select("*")
      .eq("class_id", classId)
      .order("week_number", { ascending: true });
    setWeeks(data ?? []);
    setLoading(false);
  }, [classId, supabase]);

  useEffect(() => {
    loadWeeks();
  }, [loadWeeks]);

  async function handleCreate() {
    const nextNum = weeks.length > 0 ? Math.max(...weeks.map((w) => w.week_number)) + 1 : 1;
    await supabase.from("weeks").insert({
      class_id: classId,
      week_number: nextNum,
      title: newTitle.trim() || `Week ${nextNum}`,
    });
    setNewTitle("");
    setDialogOpen(false);
    loadWeeks();
  }

  async function handleDelete(weekId: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this week?")) return;
    await supabase.from("weeks").delete().eq("id", weekId);
    loadWeeks();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Weeks</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1 h-4 w-4" />
              Add Week
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Week</DialogTitle>
              <DialogDescription>Enter a title for this week (optional).</DialogDescription>
            </DialogHeader>
            <Input
              placeholder={`e.g., Keplerian Elements`}
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              autoFocus
            />
            <DialogFooter>
              <Button onClick={handleCreate}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {weeks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-8">
            <Calendar className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">No weeks added yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {weeks.map((week) => (
            <Link key={week.id} href={`/classes/${classId}/weeks/${week.id}`}>
              <Card className="transition-colors hover:bg-muted/50">
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium">
                      Week {week.week_number}
                      {week.title ? `: ${week.title}` : ""}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => handleDelete(week.id, e)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
