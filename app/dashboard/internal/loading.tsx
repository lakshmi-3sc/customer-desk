import { PageShell, KpiRowSkeleton, ChartSkeleton, TableRowSkeleton } from "@/components/skeletons/page-shell";
import { Skeleton } from "@/components/ui/skeleton";

export default function InternalDashboardLoading() {
  return (
    <PageShell>
      {/* Page title */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-24 rounded-lg" />
      </div>

      {/* KPI cards */}
      <div className="mb-6">
        <KpiRowSkeleton />
      </div>

      {/* AI insight cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-4 flex gap-3">
            <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
            <div className="flex flex-col gap-2 flex-1">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
            </div>
          </div>
        ))}
      </div>

      {/* Chart + alerts */}
      <div className="grid grid-cols-5 gap-4">
        <ChartSkeleton className="col-span-3" />

        {/* Alerts panel */}
        <div className="col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-5">
          <Skeleton className="h-4 w-28 mb-4" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-2.5 border-b border-slate-100 dark:border-slate-800 last:border-0">
              <Skeleton className="h-7 w-7 rounded-lg shrink-0" />
              <div className="flex-1 flex flex-col gap-1.5">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Customer health table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 mt-4 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <Skeleton className="h-4 w-36" />
        </div>
        <div className="flex items-center gap-4 px-5 py-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800">
          {["w-32", "w-16", "w-16", "w-20", "w-20", "w-16"].map((w, i) => (
            <Skeleton key={i} className={`h-3 ${w}`} />
          ))}
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <TableRowSkeleton key={i} cols={5} />
        ))}
      </div>
    </PageShell>
  );
}
