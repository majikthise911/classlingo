"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { WesDocument } from "@/lib/db/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, FileUp, BookMarked, Trash2, Loader2 } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";

export default function WesListPage() {
  const params = useParams();
  const classId = params.classId as string;
  const [documents, setDocuments] = useState<WesDocument[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  async function load() {
    const { data } = await supabase
      .from("wes_documents")
      .select("*")
      .eq("class_id", classId)
      .order("created_at", { ascending: false });
    setDocuments(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [classId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleDelete(wesId: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this WES?")) return;
    await supabase.from("wes_documents").delete().eq("id", wesId);
    load();
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
      <div className="flex gap-2">
        <Link href={`/classes/${classId}/wes/generate`} className="flex-1">
          <Button className="w-full" size="lg">
            <Plus className="mr-1 h-4 w-4" />
            Generate WES
          </Button>
        </Link>
        <Link href={`/classes/${classId}/wes/import`}>
          <Button variant="outline" size="lg">
            <FileUp className="mr-1 h-4 w-4" />
            Import
          </Button>
        </Link>
      </div>

      {documents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-8">
            <BookMarked className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">No WES documents yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <Link key={doc.id} href={`/classes/${classId}/wes/${doc.id}`}>
              <Card className="transition-colors hover:bg-muted/50">
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium">{doc.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {doc.source === "generated" ? "Generated" : "Imported"} {formatRelativeTime(doc.created_at)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => handleDelete(doc.id, e)}
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
