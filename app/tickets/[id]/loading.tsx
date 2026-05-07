import { PageShell, CommentSkeleton } from "@/components/skeletons/page-shell";
import { Skeleton } from "@/components/ui/skeleton";

export default function TicketDetailLoading() {
  return (
    <PageShell>
      <div className="flex gap-6 h-full">
        {/* Left panel */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">
          {/* Ticket header */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Skeleton className="h-6 w-20 rounded-md" />
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-14 rounded-full" />
            </div>
            <Skeleton className="h-7 w-3/4 mb-2" />
            <Skeleton className="h-4 w-56" />
          </div>

          {/* SLA bar */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-4">
            <div className="flex items-center gap-4">
              <Skeleton className="h-4 w-8" />
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          </div>

          {/* Tabs + content */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 flex-1">
            {/* Tab bar */}
            <div className="flex gap-1 px-4 pt-4 border-b border-slate-100 dark:border-slate-800 pb-0">
              {["w-24", "w-24", "w-20", "w-16"].map((w, i) => (
                <Skeleton key={i} className={`h-8 ${w} rounded-t-md`} />
              ))}
            </div>
            {/* Comments */}
            <div className="p-4 divide-y divide-slate-100 dark:divide-slate-800">
              {Array.from({ length: 4 }).map((_, i) => (
                <CommentSkeleton key={i} />
              ))}
            </div>
            {/* Reply box */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800">
              <Skeleton className="h-20 w-full rounded-lg" />
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="w-72 shrink-0 flex flex-col gap-4">
          {/* Status + assignee */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-4 flex flex-col gap-4">
            {[
              { label: "w-14", value: "w-full" },
              { label: "w-20", value: "w-full" },
              { label: "w-16", value: "w-full" },
            ].map((item, i) => (
              <div key={i} className="flex flex-col gap-1.5">
                <Skeleton className={`h-3 ${item.label}`} />
                <Skeleton className={`h-9 ${item.value} rounded-lg`} />
              </div>
            ))}
          </div>

          {/* Metadata */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-4 flex flex-col gap-3">
            <Skeleton className="h-3.5 w-20 mb-1" />
            {["w-full", "w-4/5", "w-3/4", "w-full"].map((w, i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton className="h-3 w-20" />
                <Skeleton className={`h-3 ${w.replace("w-full","w-28").replace("w-4/5","w-24").replace("w-3/4","w-20")}`} />
              </div>
            ))}
          </div>

          {/* AI suggestions */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-4 flex flex-col gap-3">
            <Skeleton className="h-3.5 w-32 mb-1" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 dark:bg-slate-800">
                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                <div className="flex-1 flex flex-col gap-1.5">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-5 w-8 rounded-full shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
