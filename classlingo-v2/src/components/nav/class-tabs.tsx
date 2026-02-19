"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { FileText, Calendar, BookMarked, GraduationCap, StickyNote, TrendingUp } from "lucide-react";

interface ClassTabsProps {
  classId: string;
}

const tabs = [
  { segment: "weeks", icon: Calendar, label: "Weeks" },
  { segment: "files", icon: FileText, label: "Files" },
  { segment: "wes", icon: BookMarked, label: "WES" },
  { segment: "lessons", icon: GraduationCap, label: "Lessons" },
  { segment: "notes", icon: StickyNote, label: "Notes" },
  { segment: "progress", icon: TrendingUp, label: "Progress" },
];

export function ClassTabs({ classId }: ClassTabsProps) {
  const pathname = usePathname();

  return (
    <div className="border-b">
      <div className="mx-auto max-w-2xl overflow-x-auto">
        <nav className="flex gap-1 px-4 py-2">
          {tabs.map((tab) => {
            const href = `/classes/${classId}/${tab.segment}`;
            const isActive = pathname.includes(`/${tab.segment}`);
            return (
              <Link
                key={tab.segment}
                href={href}
                className={cn(
                  "flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
