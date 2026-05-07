import { PageShell } from "@/components/skeletons/page-shell";
import { Skeleton } from "@/components/ui/skeleton";

export default function KnowledgeBaseLoading() {
  return (
    <PageShell>
      {/* Hero search */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 p-10 mb-6 flex flex-col items-center gap-4">
        <Skeleton className="h-12 w-12 rounded-xl" />
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-5 w-72" />
        <Skeleton className="h-12 w-full max-w-xl rounded-xl mt-2" />
      </div>

      {/* Category tiles */}
      <div className="grid grid-cols-5 gap-3 mb-8">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-4 flex flex-col items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-3.5 w-20" />
          </div>
        ))}
      </div>

      {/* Popular articles */}
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-5 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-7 w-7 rounded-lg shrink-0" />
              <Skeleton className="h-3.5 w-20" />
            </div>
            <Skeleton className="h-5 w-4/5" />
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-3/4" />
          </div>
        ))}
      </div>
    </PageShell>
  );
}
