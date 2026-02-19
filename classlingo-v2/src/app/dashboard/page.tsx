"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Class, UserProfile, DailyStats } from "@/lib/db/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Flame, Heart, Zap, Trophy, BookOpen, GraduationCap, Loader2 } from "lucide-react";

export default function DashboardPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [classes, setClasses] = useState<Class[]>([]);
  const [todayStats, setTodayStats] = useState<DailyStats | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const [profileRes, classesRes, statsRes] = await Promise.all([
        supabase.from("user_profile").select("*").single(),
        supabase.from("classes").select("*").order("created_at", { ascending: false }),
        supabase.from("daily_stats").select("*").eq("date", new Date().toISOString().split("T")[0]).single(),
      ]);

      if (profileRes.data) setProfile(profileRes.data);
      if (classesRes.data) setClasses(classesRes.data);
      if (statsRes.data) setTodayStats(statsRes.data);
      setLoading(false);
    }
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const xpInLevel = (profile?.total_xp ?? 0) % 100;

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-3">
        <Card className="text-center">
          <CardContent className="p-3">
            <Flame className="mx-auto h-6 w-6 text-streak" />
            <p className="mt-1 text-2xl font-bold">{profile?.current_streak ?? 0}</p>
            <p className="text-xs text-muted-foreground">Streak</p>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="p-3">
            <Heart className="mx-auto h-6 w-6 fill-current text-hearts" />
            <p className="mt-1 text-2xl font-bold">{profile?.hearts ?? 5}</p>
            <p className="text-xs text-muted-foreground">Hearts</p>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="p-3">
            <Zap className="mx-auto h-6 w-6 fill-current text-xp" />
            <p className="mt-1 text-2xl font-bold">{profile?.total_xp ?? 0}</p>
            <p className="text-xs text-muted-foreground">XP</p>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="p-3">
            <Trophy className="mx-auto h-6 w-6 text-primary" />
            <p className="mt-1 text-2xl font-bold">{profile?.level ?? 1}</p>
            <p className="text-xs text-muted-foreground">Level</p>
          </CardContent>
        </Card>
      </div>

      {/* Level Progress */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between text-sm">
            <span>Level {profile?.level ?? 1}</span>
            <span className="text-muted-foreground">{xpInLevel}/100 XP</span>
          </div>
          <Progress value={xpInLevel} className="mt-2 h-2" />
        </CardContent>
      </Card>

      {/* Today's Activity */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Today</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-xp">{todayStats?.xp_earned ?? 0}</p>
              <p className="text-xs text-muted-foreground">XP earned</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{todayStats?.exercises_completed ?? 0}</p>
              <p className="text-xs text-muted-foreground">Exercises</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{todayStats?.lessons_completed ?? 0}</p>
              <p className="text-xs text-muted-foreground">Lessons</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Classes */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Your Classes</h2>
          <Link href="/classes">
            <Button variant="outline" size="sm">
              <BookOpen className="mr-1 h-4 w-4" />
              View All
            </Button>
          </Link>
        </div>

        {classes.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-8">
              <GraduationCap className="h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">No classes yet</p>
              <Link href="/classes">
                <Button>Create Your First Class</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {classes.map((cls) => (
              <Link key={cls.id} href={`/classes/${cls.id}/weeks`}>
                <Card className="transition-colors hover:bg-muted/50">
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <p className="font-medium">{cls.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Created {new Date(cls.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Button variant="default" size="sm">
                      <GraduationCap className="mr-1 h-4 w-4" />
                      Study
                    </Button>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
