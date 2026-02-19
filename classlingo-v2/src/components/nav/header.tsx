"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flame, Heart, Zap, Settings } from "lucide-react";

interface HeaderProps {
  streak?: number;
  hearts?: number;
  xp?: number;
}

export function Header({ streak = 0, hearts = 5, xp = 0 }: HeaderProps) {
  const pathname = usePathname();

  // Hide header on lesson play page for immersive experience
  if (pathname.includes("/lessons/play")) return null;

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
        <Link href="/dashboard" className="text-lg font-bold text-primary">
          Classlingo
        </Link>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 text-sm font-medium text-streak">
            <Flame className="h-4 w-4" />
            <span>{streak}</span>
          </div>
          <div className="flex items-center gap-1 text-sm font-medium text-hearts">
            <Heart className="h-4 w-4 fill-current" />
            <span>{hearts}</span>
          </div>
          <div className="flex items-center gap-1 text-sm font-medium text-xp">
            <Zap className="h-4 w-4 fill-current" />
            <span>{xp}</span>
          </div>
          <Link href="/settings" className="text-muted-foreground hover:text-foreground">
            <Settings className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </header>
  );
}
