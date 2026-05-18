"use client";

import {
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Lightbulb,
  Tag,
  Ticket,
  X,
} from "lucide-react";
import ReactMarkdown from "react-markdown";

interface DrawerItem {
  id: string;
  type: "article" | "ticket";
  title: string;
  ticketKey?: string | null;
  slug?: string;
  content?: string;
  description?: string;
  category?: string;
  status?: string;
  resolvedAt?: string;
  resolution?: string;
  priority?: string;
}

interface SuggestionDrawerProps {
  isOpen: boolean;
  item: DrawerItem | null;
  items: DrawerItem[];
  onClose: () => void;
  onSelectItem: (item: DrawerItem) => void;
}

export function SuggestionDrawer({
  isOpen,
  item,
  items,
  onClose,
  onSelectItem,
}: SuggestionDrawerProps) {
  if (!isOpen || !item) return null;

  const currentIndex = items.findIndex((i) => i.id === item.id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < items.length - 1;
  const ticketHref = item.type === "ticket" ? `/tickets/${item.ticketKey ?? item.id}` : null;
  const articleHref = item.type === "article" && item.slug ? `/knowledge-base/${item.slug}` : null;
  const openHref = ticketHref ?? articleHref;

  const handlePrev = () => {
    if (hasPrev) onSelectItem(items[currentIndex - 1]);
  };

  const handleNext = () => {
    if (hasNext) onSelectItem(items[currentIndex + 1]);
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[10000] bg-black/30 backdrop-blur-sm transition-opacity duration-300 dark:bg-black/50"
        style={{ pointerEvents: "none" }}
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 right-0 z-[10001] flex h-[100dvh] w-full max-w-[640px] animate-in flex-col overflow-hidden bg-white shadow-2xl duration-300 slide-in-from-right-96 dark:bg-slate-950">
        <div className="relative shrink-0 border-b border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="absolute inset-x-0 top-0 h-1 bg-[#0052CC]" />
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="mb-1.5 flex items-center gap-2">
                {item.type === "article" ? (
                  <>
                    <BookOpen className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                      Knowledge Article
                    </span>
                  </>
                ) : (
                  <>
                    <Ticket className="h-4 w-4 text-[#0052CC] dark:text-blue-400" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                      Resolved Ticket{" "}
                      {item.ticketKey ? (
                        <span className="font-mono text-[#0052CC] dark:text-blue-300">
                          /{item.ticketKey}
                        </span>
                      ) : null}
                    </span>
                  </>
                )}
              </div>
              <h2 className="line-clamp-2 text-base font-bold leading-snug text-slate-900 dark:text-slate-100">
                {item.title}
              </h2>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {openHref && (
                <a
                  href={openHref}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-2.5 text-xs font-semibold text-[#0052CC] transition-colors hover:border-blue-300 hover:bg-blue-100 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/50"
                >
                  {item.type === "ticket" ? "Open ticket" : "Open article"}
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <div className="flex flex-1 gap-1">
              {items.map((_, i) => (
                <div
                  key={i}
                  className={`h-1 rounded-full transition-all ${
                    i === currentIndex
                      ? "flex-grow bg-[#0052CC]"
                      : "flex-1 bg-slate-300 dark:bg-slate-600"
                  }`}
                />
              ))}
            </div>
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
              {currentIndex + 1}/{items.length}
            </span>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/60 px-5 py-5 dark:bg-slate-950">
          {item.type === "article" ? (
            <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              {item.category && (
                <div className="inline-flex items-center gap-2">
                  <Tag className="h-4 w-4 text-slate-500" />
                  <span className="rounded-lg bg-green-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-green-700 dark:bg-green-950 dark:text-green-400">
                    {item.category}
                  </span>
                </div>
              )}
              <div className="prose max-w-none dark:prose-invert">
                <ReactMarkdown
                  components={{
                    h2: ({ children }) => (
                      <h2 className="mb-3 mt-6 border-t border-slate-200 pt-4 text-lg font-bold text-slate-900 first:mt-0 first:border-0 first:pt-0 dark:border-slate-800 dark:text-slate-100">
                        {children}
                      </h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="mb-2.5 mt-5 text-base font-semibold text-slate-900 dark:text-slate-100">
                        {children}
                      </h3>
                    ),
                    p: ({ children }) => (
                      <p className="mb-3 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                        {children}
                      </p>
                    ),
                    ul: ({ children }) => <ul className="mb-3 ml-4 space-y-1.5">{children}</ul>,
                    li: ({ children }) => (
                      <li className="flex gap-3 text-sm text-slate-700 before:mr-1 before:font-bold before:text-[#0052CC] before:content-['•'] dark:text-slate-300">
                        {children}
                      </li>
                    ),
                    blockquote: ({ children }) => (
                      <blockquote className="my-4 border-l-4 border-[#0052CC] bg-blue-50 py-3 pl-4 text-slate-700 dark:bg-blue-950/20 dark:text-slate-300">
                        {children}
                      </blockquote>
                    ),
                  }}
                >
                  {item.content || ""}
                </ReactMarkdown>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-2 rounded-lg border border-green-200 bg-green-100 px-3 py-1.5 dark:border-green-800 dark:bg-green-950">
                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-green-700 dark:text-green-400">
                    {item.status || "Resolved"}
                  </span>
                </div>
                {item.resolvedAt && (
                  <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                    <Calendar className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      {new Date(item.resolvedAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                )}
              </div>

              <div className="grid gap-4">
                <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Reported problem
                    </h3>
                  </div>
                  <p className="p-4 text-sm leading-6 text-slate-700 dark:text-slate-300">
                    {item.description || "No description available"}
                  </p>
                </section>

                <section className="overflow-hidden rounded-lg border border-emerald-200 bg-white shadow-sm dark:border-emerald-900/60 dark:bg-slate-900">
                  <div className="flex items-center gap-2 border-b border-emerald-100 bg-emerald-50 px-4 py-3 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                      Resolved outcome
                    </h3>
                  </div>
                  <p className="p-4 text-sm leading-6 text-slate-700 dark:text-slate-300">
                    {item.resolution || "No resolution summary was saved for this ticket. Open the ticket to review the full conversation."}
                  </p>
                </section>
              </div>

              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/50 dark:bg-amber-950/20">
                <div className="flex gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white text-amber-600 shadow-sm dark:bg-slate-900 dark:text-amber-400">
                    <Lightbulb className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Before creating this ticket
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                      Compare the issue with this resolved case. If it matches, try the resolved outcome first; if it still fails, continue creating the ticket.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div
          className="shrink-0 flex items-center justify-between border-t border-slate-200 bg-white px-5 py-3 dark:border-slate-800 dark:bg-slate-900"
          style={{ pointerEvents: "auto" }}
        >
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition-all hover:border-blue-400 hover:text-slate-900 hover:shadow-md dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-blue-500 dark:hover:text-slate-100"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handlePrev}
              disabled={!hasPrev}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition-all hover:border-blue-400 hover:text-slate-900 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-blue-500 dark:hover:text-slate-100"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {currentIndex + 1} of {items.length}
            </span>
          </div>

          <button
            type="button"
            onClick={handleNext}
            disabled={!hasNext}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white shadow-md transition-all hover:bg-blue-700 hover:shadow-lg disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none dark:bg-blue-600 dark:hover:bg-blue-700 dark:disabled:bg-slate-700"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </>
  );
}
