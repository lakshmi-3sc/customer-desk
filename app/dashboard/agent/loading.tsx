import { PageShell, KpiRowSkeleton } from "@/components/skeletons/page-shell";
import { Skeleton } from "@/components/ui/skeleton";

function TicketCardSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-4 flex items-start gap-3">
      <Skeleton className="h-2.5 w-2.5 rounded-full mt-1 shrink-0" />
      <div className="flex-1 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-3.5 w-16" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
        <Skeleton className="h-4 w-3/4" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
    </div>
  );
}

export default function AgentDashboardLoading() {
  return (
    <PageShell>
      <div className="flex items-center justify-between mb-6">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-52" />
        </div>
        <Skeleton className="h-9 w-24 rounded-lg" />
      </div>

      {/* KPIs */}
      <div className="mb-6">
        <KpiRowSkeleton />
      </div>

      {/* View toggle */}
      <div className="flex gap-2 mb-4">
        <Skeleton className="h-8 w-20 rounded-lg" />
        <Skeleton className="h-8 w-20 rounded-lg" />
      </div>

      {/* Two column layout */}
      <div className="grid grid-cols-2 gap-4">
        {/* Priority queue */}
        <div className="flex flex-col gap-3">
          <Skeleton className="h-4 w-28" />
          {Array.from({ length: 4 }).map((_, i) => <TicketCardSkeleton key={i} />)}
        </div>

        {/* AI insights + upcoming */}
        <div className="flex flex-col gap-3">
          <Skeleton className="h-4 w-32" />
          {/* AI insight box */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-4 flex flex-col gap-3">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-3.5 w-40" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
          </div>
          {Array.from({ length: 3 }).map((_, i) => <TicketCardSkeleton key={i} />)}
        </div>
      </div>
    </PageShell>
  );
}
