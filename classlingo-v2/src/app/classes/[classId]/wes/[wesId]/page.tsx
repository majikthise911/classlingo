"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { WesDocument } from "@/lib/db/types";
import { WesRenderer } from "@/components/wes/wes-renderer";
import { Loader2 } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default function WesViewerPage() {
  const params = useParams();
  const wesId = params.wesId as string;
  const [doc, setDoc] = useState<WesDocument | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("wes_documents")
      .select("*")
      .eq("id", wesId)
      .single()
      .then(({ data }) => {
        setDoc(data);
        setLoading(false);
      });
  }, [wesId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!doc) {
    return <p className="text-muted-foreground">WES not found.</p>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">{doc.title}</h2>
        <p className="text-sm text-muted-foreground">
          {doc.source === "generated" ? "Generated" : "Imported"} on {formatDate(doc.created_at)}
        </p>
      </div>
      <WesRenderer content={doc.markdown_content} />
    </div>
  );
}
