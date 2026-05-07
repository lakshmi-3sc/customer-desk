import { PageShell } from "@/components/skeletons/page-shell";
import { Skeleton } from "@/components/ui/skeleton";

export default function CreateTicketLoading() {
  return (
    <PageShell>
      {/* Title */}
      <div className="mb-6">
        <Skeleton className="h-7 w-36 mb-1.5" />
        <Skeleton className="h-4 w-60" />
      </div>

      <div className="max-w-2xl flex flex-col gap-4">
        {/* Project selector */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-5">
          <Skeleton className="h-4 w-16 mb-3" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>

        {/* Issue details */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-5 flex flex-col gap-4">
          <Skeleton className="h-4 w-24 mb-1" />
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-28 w-full rounded-lg" />
          </div>
        </div>

        {/* Priority + Category */}
        <div className="grid grid-cols-2 gap-4">
          {["Priority", "Category"].map((label) => (
            <div key={label} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-5">
              <Skeleton className="h-3.5 w-16 mb-3" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
          ))}
        </div>

        {/* Attachments */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-5">
          <Skeleton className="h-3.5 w-24 mb-3" />
          <Skeleton className="h-24 w-full rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700" />
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Skeleton className="h-10 w-20 rounded-lg" />
          <Skeleton className="h-10 w-28 rounded-lg" />
        </div>
      </div>
    </PageShell>
  );
}
