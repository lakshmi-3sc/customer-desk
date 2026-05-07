import { PageShell, KpiRowSkeleton, ChartSkeleton, TableRowSkeleton } from "@/components/skeletons/page-shell";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminDashboardLoading() {
  return (
    <PageShell>
      <div className="flex items-center justify-between mb-6">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-7 w-44" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-24 rounded-lg" />
      </div>

      {/* KPIs */}
      <div className="mb-6">
        <KpiRowSkeleton />
      </div>

      {/* Chart + alerts */}
      <div className="grid grid-cols-5 gap-4 mb-4">
        <ChartSkeleton className="col-span-3" />
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
          {/* AI stats */}
          <div className="flex gap-2 mt-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-6 flex-1 rounded-full" />
            ))}
          </div>
        </div>
      </div>

      {/* Customer health table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <Skeleton className="h-4 w-36" />
        </div>
        <div className="flex gap-4 px-5 py-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800">
          {["w-36", "w-12", "w-16", "w-20", "w-20", "w-16"].map((w, i) => (
            <Skeleton key={i} className={`h-3 ${w}`} />
          ))}
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <TableRowSkeleton key={i} cols={5} />
        ))}
      </div>
    </PageShell>
  );
}
