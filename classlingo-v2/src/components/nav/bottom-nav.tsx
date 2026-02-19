"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BookOpen, GraduationCap, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", icon: Home, label: "Home" },
  { href: "/classes", icon: BookOpen, label: "Classes" },
  { href: "/dashboard", icon: GraduationCap, label: "Learn" },
  { href: "/settings", icon: BarChart3, label: "More" },
];

export function BottomNav() {
  const pathname = usePathname();

  // Hide on lesson play page
  if (pathname.includes("/lessons/play")) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:hidden">
      <div className="mx-auto flex max-w-2xl items-center justify-around py-2">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-1 text-xs",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
