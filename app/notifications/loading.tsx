import { PageShell } from "@/components/skeletons/page-shell";
import { Skeleton } from "@/components/ui/skeleton";

function NotificationRowSkeleton() {
  return (
    <div className="flex items-start gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-800 last:border-0">
      <Skeleton className="h-9 w-9 rounded-full shrink-0" />
      <div className="flex-1 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-4/5" />
      </div>
      <Skeleton className="h-2.5 w-2.5 rounded-full shrink-0 mt-1" />
    </div>
  );
}

export default function NotificationsLoading() {
  return (
    <PageShell>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-7 w-36" />
          <Skeleton className="h-5 w-8 rounded-full" />
        </div>
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>

      {/* Today group */}
      <div className="mb-4">
        <Skeleton className="h-3.5 w-12 mb-3" />
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => <NotificationRowSkeleton key={i} />)}
        </div>
      </div>

      {/* Yesterday group */}
      <div className="mb-4">
        <Skeleton className="h-3.5 w-20 mb-3" />
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
          {Array.from({ length: 3 }).map((_, i) => <NotificationRowSkeleton key={i} />)}
        </div>
      </div>

      {/* Older group */}
      <div>
        <Skeleton className="h-3.5 w-24 mb-3" />
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
          {Array.from({ length: 3 }).map((_, i) => <NotificationRowSkeleton key={i} />)}
        </div>
      </div>
    </PageShell>
  );
}
