import { PageShell, TableRowSkeleton } from "@/components/skeletons/page-shell";
import { Skeleton } from "@/components/ui/skeleton";

export default function TicketsLoading() {
  return (
    <PageShell>
      {/* Page title */}
      <div className="flex items-center justify-between mb-5">
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 mb-4">
        {["w-10", "w-12", "w-20", "w-20", "w-16", "w-14"].map((w, i) => (
          <Skeleton key={i} className={`h-8 ${w} rounded-md`} />
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 mb-4">
        <Skeleton className="h-9 flex-1 max-w-xs rounded-lg" />
        {["w-24", "w-24", "w-24", "w-20"].map((w, i) => (
          <Skeleton key={i} className={`h-9 ${w} rounded-lg`} />
        ))}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
        {/* Table header */}
        <div className="flex items-center gap-4 px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800">
          <Skeleton className="h-3.5 w-4" />
          {["w-12", "w-36", "w-24", "w-20", "w-24", "w-20"].map((w, i) => (
            <Skeleton key={i} className={`h-3.5 ${w}`} />
          ))}
        </div>
        {Array.from({ length: 10 }).map((_, i) => (
          <TableRowSkeleton key={i} cols={6} />
        ))}
      </div>
    </PageShell>
  );
}
