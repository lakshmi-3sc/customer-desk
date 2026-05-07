import { PageShell, KpiRowSkeleton, TableRowSkeleton } from "@/components/skeletons/page-shell";
import { Skeleton } from "@/components/ui/skeleton";

export default function LeadDashboardLoading() {
  return (
    <PageShell>
      <div className="flex items-center justify-between mb-6">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-7 w-44" />
          <Skeleton className="h-4 w-60" />
        </div>
        <Skeleton className="h-9 w-24 rounded-lg" />
      </div>

      {/* KPIs */}
      <div className="mb-6">
        <KpiRowSkeleton />
      </div>

      {/* Ops summary strip */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-4 mb-6 flex items-center gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2 flex-1">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-6 w-12" />
          </div>
        ))}
      </div>

      {/* Two column */}
      <div className="grid grid-cols-5 gap-4">
        {/* Agent performance table */}
        <div className="col-span-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
            <Skeleton className="h-4 w-36" />
          </div>
          <div className="flex gap-4 px-5 py-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800">
            {["w-32", "w-16", "w-16", "w-24", "w-24"].map((w, i) => (
              <Skeleton key={i} className={`h-3 ${w}`} />
            ))}
          </div>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 last:border-0">
              <div className="flex items-center gap-2 w-32">
                <Skeleton className="h-7 w-7 rounded-full shrink-0" />
                <Skeleton className="h-3.5 flex-1" />
              </div>
              {["w-10", "w-10", "w-16", "w-20"].map((w, j) => (
                <Skeleton key={j} className={`h-3.5 ${w}`} />
              ))}
            </div>
          ))}
        </div>

        {/* Escalations */}
        <div className="col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-4 flex flex-col gap-3">
          <Skeleton className="h-4 w-24 mb-1" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
              <Skeleton className="h-2 w-2 rounded-full mt-1.5 shrink-0" />
              <div className="flex-1 flex flex-col gap-1.5">
                <Skeleton className="h-3.5 w-3/4" />
                <div className="flex gap-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
