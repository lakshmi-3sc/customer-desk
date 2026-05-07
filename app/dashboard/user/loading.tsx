import { PageShell } from "@/components/skeletons/page-shell";
import { Skeleton } from "@/components/ui/skeleton";

export default function UserDashboardLoading() {
  return (
    <PageShell>
      {/* Greeting */}
      <div className="mb-6 flex flex-col gap-2">
        <Skeleton className="h-8 w-52" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* Quick actions */}
      <div className="flex gap-3 mb-6">
        <Skeleton className="h-10 w-36 rounded-lg" />
        <Skeleton className="h-10 w-36 rounded-lg" />
      </div>

      {/* Insights + recent issues */}
      <div className="grid grid-cols-3 gap-4">
        {/* Insights */}
        <div className="col-span-1 flex flex-col gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-4 flex gap-3">
              <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
              <div className="flex-1 flex flex-col gap-2">
                <Skeleton className="h-3.5 w-20" />
                <Skeleton className="h-6 w-12" />
              </div>
            </div>
          ))}
        </div>

        {/* Recent issues */}
        <div className="col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
            <Skeleton className="h-4 w-28" />
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 last:border-0">
              <Skeleton className="h-3.5 w-16 shrink-0" />
              <Skeleton className="h-3.5 flex-1" />
              <Skeleton className="h-5 w-20 rounded-full shrink-0" />
              <Skeleton className="h-2.5 w-2.5 rounded-full shrink-0" />
              <Skeleton className="h-3.5 w-20 shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
