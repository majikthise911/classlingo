"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Week, Material } from "@/lib/db/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { File, Upload, BookMarked, Loader2 } from "lucide-react";

export default function WeekDetailPage() {
  const params = useParams();
  const classId = params.classId as string;
  const weekId = params.weekId as string;
  const [week, setWeek] = useState<Week | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [allMaterials, setAllMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  const load = useCallback(async () => {
    const [weekRes, matsRes, allMatsRes] = await Promise.all([
      supabase.from("weeks").select("*").eq("id", weekId).single(),
      supabase.from("materials").select("*").eq("week_id", weekId),
      supabase.from("materials").select("*").eq("class_id", classId).is("week_id", null),
    ]);
    setWeek(weekRes.data);
    setMaterials(matsRes.data ?? []);
    setAllMaterials(allMatsRes.data ?? []);
    setLoading(false);
  }, [classId, weekId, supabase]);

  useEffect(() => {
    load();
  }, [load]);

  async function assignMaterial(materialId: string) {
    await supabase.from("materials").update({ week_id: weekId }).eq("id", materialId);
    load();
  }

  async function unassignMaterial(materialId: string) {
    await supabase.from("materials").update({ week_id: null }).eq("id", materialId);
    load();
  }

  if (loading || !week) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          Week {week.week_number}{week.title ? `: ${week.title}` : ""}
        </h2>
        <Link href={`/classes/${classId}/wes/generate?weekId=${weekId}`}>
          <Button size="sm">
            <BookMarked className="mr-1 h-4 w-4" />
            Generate WES
          </Button>
        </Link>
      </div>

      {/* Assigned materials */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Assigned Materials</CardTitle>
        </CardHeader>
        <CardContent>
          {materials.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No materials assigned to this week yet.
            </p>
          ) : (
            <div className="space-y-2">
              {materials.map((mat) => (
                <div key={mat.id} className="flex items-center justify-between rounded-md bg-muted p-2">
                  <div className="flex items-center gap-2">
                    <File className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{mat.filename}</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => unassignMaterial(mat.id)}>
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Unassigned materials to add */}
      {allMaterials.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Available Materials</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {allMaterials.map((mat) => (
                <div key={mat.id} className="flex items-center justify-between rounded-md border p-2">
                  <div className="flex items-center gap-2">
                    <Upload className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{mat.filename}</span>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => assignMaterial(mat.id)}>
                    Assign
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
