"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Header } from "@/components/nav/header";
import { BottomNav } from "@/components/nav/bottom-nav";
import { createClient } from "@/lib/supabase/client";
import type { UserProfile } from "@/lib/db/types";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (isLoginPage) return;

    const supabase = createClient();
    supabase
      .from("user_profile")
      .select("*")
      .single()
      .then(({ data }) => {
        if (data) setProfile(data);
      });
  }, [isLoginPage, pathname]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen pb-16 sm:pb-0">
      <Header
        streak={profile?.current_streak ?? 0}
        hearts={profile?.hearts ?? 5}
        xp={profile?.total_xp ?? 0}
      />
      <main className="mx-auto max-w-2xl px-4 py-6">{children}</main>
      <BottomNav />
    </div>
  );
}
