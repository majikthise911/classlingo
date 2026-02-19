"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Material } from "@/lib/db/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, File, Trash2, Loader2 } from "lucide-react";

export default function FilesPage() {
  const params = useParams();
  const classId = params.classId as string;
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [parseStatus, setParseStatus] = useState<Record<string, string>>({});

  const supabase = createClient();

  const loadMaterials = useCallback(async () => {
    const { data } = await supabase
      .from("materials")
      .select("*")
      .eq("class_id", classId)
      .order("uploaded_at", { ascending: false });
    setMaterials(data ?? []);
    setLoading(false);
  }, [classId, supabase]);

  useEffect(() => {
    loadMaterials();
  }, [loadMaterials]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    for (const file of Array.from(files)) {
      // Upload to Supabase Storage
      const storagePath = `${user.id}/${classId}/${Date.now()}-${file.name}`;
      await supabase.storage.from("course-materials").upload(storagePath, file);

      // Parse content via API
      const formData = new FormData();
      formData.append("file", file);
      formData.append("classId", classId);
      formData.append("storagePath", storagePath);

      const res = await fetch("/api/materials/parse", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setParseStatus((prev) => ({
          ...prev,
          [file.name]: `Parsed: ${data.chunks} chunks extracted`,
        }));
      } else {
        setParseStatus((prev) => ({
          ...prev,
          [file.name]: "Parse failed",
        }));
      }
    }

    setUploading(false);
    loadMaterials();
    // Reset file input
    e.target.value = "";
  }

  async function handleDelete(material: Material) {
    if (!confirm(`Delete ${material.filename}?`)) return;
    if (material.storage_path) {
      await supabase.storage.from("course-materials").remove([material.storage_path]);
    }
    await supabase.from("materials").delete().eq("id", material.id);
    loadMaterials();
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
      {/* Upload Button */}
      <div>
        <label>
          <input
            type="file"
            className="hidden"
            accept=".pdf,.md,.txt,.markdown"
            multiple
            onChange={handleUpload}
            disabled={uploading}
          />
          <Button asChild className="w-full cursor-pointer" size="lg" disabled={uploading}>
            <span>
              {uploading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              {uploading ? "Uploading..." : "Upload Materials"}
            </span>
          </Button>
        </label>
        <p className="mt-1 text-center text-xs text-muted-foreground">
          PDF, Markdown, or text files
        </p>
      </div>

      {/* Parse status */}
      {Object.entries(parseStatus).map(([name, status]) => (
        <p key={name} className="text-sm text-muted-foreground">
          {name}: {status}
        </p>
      ))}

      {/* Materials list */}
      {materials.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-8">
            <File className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">No files uploaded yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {materials.map((mat) => (
            <Card key={mat.id}>
              <CardContent className="flex items-center justify-between p-3">
                <div className="flex items-center gap-3">
                  <File className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{mat.filename}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(mat.uploaded_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(mat)}
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
