"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader2, Target, BookOpen, TrendingUp, Calendar } from "lucide-react";

interface TopicStat {
  topic: string;
  total: number;
  correct: number;
  accuracy: number;
}

interface StatsData {
  totalExercises: number;
  totalSeen: number;
  totalCorrect: number;
  accuracy: number;
  topicStats: TopicStat[];
  recentDays: { date: string; xp: number; exercises: number }[];
}

export default function ProgressPage() {
  const params = useParams();
  const classId = params.classId as string;
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      // Get exercises with progress
      const { data: exercises } = await supabase
        .from("exercises")
        .select("topic, progress(times_seen, times_correct)")
        .eq("class_id", classId);

      const { count } = await supabase
        .from("exercises")
        .select("id", { count: "exact", head: true })
        .eq("class_id", classId);

      // Get recent daily stats
      const { data: { user } } = await supabase.auth.getUser();
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 7);
      const { data: dailyStats } = await supabase
        .from("daily_stats")
        .select("date, xp_earned, exercises_completed")
        .eq("user_id", user?.id ?? "")
        .gte("date", cutoff.toISOString().split("T")[0])
        .order("date", { ascending: true });

      // Calculate topic stats
      const topicMap = new Map<string, { total: number; correct: number }>();
      let totalSeen = 0;
      let totalCorrect = 0;

      for (const ex of exercises ?? []) {
        const progress = (ex.progress as { times_seen: number; times_correct: number }[])?.[0];
        if (!progress) continue;

        totalSeen += progress.times_seen;
        totalCorrect += progress.times_correct;

        const existing = topicMap.get(ex.topic) ?? { total: 0, correct: 0 };
        existing.total += progress.times_seen;
        existing.correct += progress.times_correct;
        topicMap.set(ex.topic, existing);
      }

      const topicStats: TopicStat[] = Array.from(topicMap.entries())
        .map(([topic, data]) => ({
          topic,
          total: data.total,
          correct: data.correct,
          accuracy: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
        }))
        .sort((a, b) => a.accuracy - b.accuracy);

      setStats({
        totalExercises: count ?? 0,
        totalSeen,
        totalCorrect,
        accuracy: totalSeen > 0 ? Math.round((totalCorrect / totalSeen) * 100) : 0,
        topicStats,
        recentDays: (dailyStats ?? []).map((d) => ({
          date: d.date,
          xp: d.xp_earned,
          exercises: d.exercises_completed,
        })),
      });
      setLoading(false);
    }
    load();
  }, [classId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      {/* Overview */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <BookOpen className="mx-auto h-6 w-6 text-primary" />
            <p className="mt-1 text-2xl font-bold">{stats.totalExercises}</p>
            <p className="text-xs text-muted-foreground">Exercises</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Target className="mx-auto h-6 w-6 text-success" />
            <p className="mt-1 text-2xl font-bold">{stats.accuracy}%</p>
            <p className="text-xs text-muted-foreground">Accuracy</p>
          </CardContent>
        </Card>
      </div>

      {/* 7-day activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5" />
            Last 7 Days
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats.recentDays.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity yet</p>
          ) : (
            <div className="flex items-end gap-1">
              {stats.recentDays.map((day) => {
                const maxXp = Math.max(...stats.recentDays.map((d) => d.xp), 1);
                const height = Math.max(8, (day.xp / maxXp) * 80);
                return (
                  <div key={day.date} className="flex flex-1 flex-col items-center gap-1">
                    <div
                      className="w-full rounded-t bg-primary"
                      style={{ height: `${height}px` }}
                      title={`${day.xp} XP, ${day.exercises} exercises`}
                    />
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(day.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "narrow" })}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Topic breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5" />
            Topics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {stats.topicStats.length === 0 ? (
            <p className="text-sm text-muted-foreground">Complete some exercises to see topic breakdown</p>
          ) : (
            stats.topicStats.map((topic) => (
              <div key={topic.topic} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="truncate">{topic.topic}</span>
                  <span className="text-muted-foreground">{topic.accuracy}%</span>
                </div>
                <Progress
                  value={topic.accuracy}
                  className={`h-2 ${topic.accuracy < 50 ? "[&>div]:bg-destructive" : topic.accuracy < 75 ? "[&>div]:bg-warning" : "[&>div]:bg-success"}`}
                />
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
