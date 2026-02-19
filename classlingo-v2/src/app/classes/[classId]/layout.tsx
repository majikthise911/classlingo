"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Class } from "@/lib/db/types";
import { ClassTabs } from "@/components/nav/class-tabs";
import { Loader2 } from "lucide-react";

export default function ClassLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const classId = params.classId as string;
  const [cls, setCls] = useState<Class | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("classes")
      .select("*")
      .eq("id", classId)
      .single()
      .then(({ data }) => setCls(data));
  }, [classId]);

  if (!cls) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="-mx-4 -mt-6">
      <div className="px-4 py-3">
        <h1 className="text-xl font-bold">{cls.name}</h1>
      </div>
      <ClassTabs classId={classId} />
      <div className="px-4 py-4">{children}</div>
    </div>
  );
}
