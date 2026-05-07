import { Skeleton } from "@/components/ui/skeleton";
import { AppSidebar } from "@/components/app-sidebar";
import { TopBar } from "@/components/top-bar";

/** Wraps a skeleton body with the real sidebar + topbar so layout doesn't jump */
export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar left={<Skeleton className="h-5 w-32" />} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

/** Single KPI card skeleton — matches the real card: left accent border, label, big number, delta, icon */
export function KpiCardSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 border-l-4 border-l-slate-200 dark:border-l-slate-700 p-4">
      <div className="flex items-start justify-between mb-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-4 w-4 rounded" />
      </div>
      <Skeleton className="h-8 w-14 mb-1.5" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

/** 4-column KPI row — drop this directly into any dashboard loading file */
export function KpiRowSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <KpiCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function TableRowSkeleton({ cols = 5 }: { cols?: number }) {
  const widths = ["w-20", "w-48", "w-24", "w-20", "w-28"];
  return (
    <div className="flex items-center gap-4 px-4 py-3.5 border-b border-slate-100 dark:border-slate-800">
      <Skeleton className="h-3.5 w-4 shrink-0" />
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} className={`h-3.5 ${widths[i % widths.length]}`} />
      ))}
    </div>
  );
}

export function ChartSkeleton({ className }: { className?: string }) {
  return (
    <div className={`bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-5 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-7 w-20 rounded-lg" />
      </div>
      <div className="flex items-end gap-1 h-40 mt-2">
        {Array.from({ length: 20 }).map((_, i) => (
          <Skeleton
            key={i}
            className="flex-1 rounded-t"
            style={{ height: `${30 + Math.sin(i * 0.8) * 40 + 40}%` }}
          />
        ))}
      </div>
    </div>
  );
}

export function CommentSkeleton() {
  return (
    <div className="flex gap-3 py-4">
      <Skeleton className="h-8 w-8 rounded-full shrink-0" />
      <div className="flex-1 flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-4/5" />
        <Skeleton className="h-3.5 w-2/3" />
      </div>
    </div>
  );
}
