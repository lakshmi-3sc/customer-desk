"use client";

import { useState } from "react";
import { X, BookOpen, Ticket, ChevronLeft, ChevronRight, Calendar, Tag, CheckCircle2, Lightbulb } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface DrawerItem {
  id: string;
  type: "article" | "ticket";
  title: string;
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

  const handlePrev = () => {
    if (hasPrev) onSelectItem(items[currentIndex - 1]);
  };

  const handleNext = () => {
    if (hasNext) onSelectItem(items[currentIndex + 1]);
  };

  return (
    <>
      {/* Overlay - visual only, click X button to close */}
      <div
        className="fixed inset-0 z-40 transition-opacity duration-300 bg-black/30 dark:bg-black/50 backdrop-blur-sm"
        style={{ pointerEvents: "none" }}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-screen w-full max-w-lg bg-white dark:bg-slate-950 shadow-2xl z-50 flex flex-col overflow-hidden animate-in slide-in-from-right-96 duration-300">
        {/* Header */}
        <div className="relative px-6 py-5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                {item.type === "article" ? (
                  <>
                    <BookOpen className="w-4 h-4 text-green-600 dark:text-green-400" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">Knowledge Article</span>
                  </>
                ) : (
                  <>
                    <Ticket className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">Resolved Ticket</span>
                  </>
                )}
              </div>
              <h2 className="text-lg font-bold leading-snug text-slate-900 dark:text-slate-100">
                {item.title}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-600 dark:text-slate-400"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Progress indicator */}
          <div className="mt-3 flex items-center gap-2">
            <div className="flex-1 flex gap-1">
              {items.map((_, i) => (
                <div
                  key={i}
                  className={`h-1 rounded-full transition-all ${
                    i === currentIndex
                      ? "bg-[#0052CC] flex-grow"
                      : "bg-slate-300 dark:bg-slate-600 flex-1"
                  }`}
                />
              ))}
            </div>
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
              {currentIndex + 1}/{items.length}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {item.type === "article" ? (
            <div className="space-y-4">
              {item.category && (
                <div className="inline-flex items-center gap-2">
                  <Tag className="w-4 h-4 text-slate-500" />
                  <span className="text-xs font-semibold px-3 py-1 rounded-lg bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400 uppercase tracking-wider">
                    {item.category}
                  </span>
                </div>
              )}
              <div className="prose dark:prose-invert max-w-none">
                <ReactMarkdown
                  components={{
                    h2: ({ children }) => (
                      <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-6 mb-3 pt-4 border-t border-slate-200 dark:border-slate-800 first:mt-0 first:pt-0 first:border-0">
                        {children}
                      </h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mt-5 mb-2.5">
                        {children}
                      </h3>
                    ),
                    p: ({ children }) => (
                      <p className="text-slate-700 dark:text-slate-300 mb-3 leading-relaxed text-sm">
                        {children}
                      </p>
                    ),
                    ul: ({ children }) => (
                      <ul className="space-y-1.5 mb-3 ml-4">{children}</ul>
                    ),
                    li: ({ children }) => (
                      <li className="text-slate-700 dark:text-slate-300 flex gap-3 before:content-['•'] before:text-[#0052CC] before:font-bold before:mr-1 text-sm">
                        {children}
                      </li>
                    ),
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-4 border-[#0052CC] bg-blue-50 dark:bg-blue-950/20 pl-4 py-3 my-4 italic text-slate-700 dark:text-slate-300">
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
            <div className="space-y-4">
              {/* Status Badges */}
              <div className="flex flex-wrap gap-2">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-100 dark:bg-green-950 border border-green-200 dark:border-green-800">
                  <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <span className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wider">
                    {item.status || "Resolved"}
                  </span>
                </div>
                {item.resolvedAt && (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <Calendar className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                    <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                      {new Date(item.resolvedAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                )}
              </div>

              {/* Problem Section */}
              <div className="space-y-2">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                  Problem
                </h3>
                <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 bg-red-50 dark:bg-red-950/20 p-3 rounded-lg border border-red-200 dark:border-red-900/40">
                  {item.description || "No description available"}
                </p>
              </div>

              {/* Solution Section */}
              {item.resolution && (
                <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                    Solution
                  </h3>
                  <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 bg-green-50 dark:bg-green-950/20 p-3 rounded-lg border border-green-200 dark:border-green-900/40">
                    {item.resolution}
                  </p>
                </div>
              )}

              {/* Insight Section */}
              <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                  💡 Before Creating
                </h3>
                <ul className="space-y-1.5 ml-4">
                  <li className="text-slate-700 dark:text-slate-300 flex gap-3 before:content-['•'] before:text-[#0052CC] before:font-bold before:mr-1 text-sm">
                    Compare with the problem above
                  </li>
                  <li className="text-slate-700 dark:text-slate-300 flex gap-3 before:content-['•'] before:text-[#0052CC] before:font-bold before:mr-1 text-sm">
                    Try the suggested solution first
                  </li>
                  <li className="text-slate-700 dark:text-slate-300 flex gap-3 before:content-['•'] before:text-[#0052CC] before:font-bold before:mr-1 text-sm">
                    Only create if issue persists
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer - Non-blocking navigation */}
        <div
          className="border-t border-slate-200 dark:border-slate-800 px-6 py-5 bg-slate-50 dark:bg-slate-900 flex items-center justify-between"
          style={{ pointerEvents: "auto" }}
        >
          <button
            onClick={handlePrev}
            disabled={!hasPrev}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md dark:hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all text-slate-700 dark:text-slate-300 font-medium text-sm hover:text-slate-900 dark:hover:text-slate-100"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>

          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {currentIndex + 1} of {items.length}
            </span>
          </div>

          <button
            onClick={handleNext}
            disabled={!hasNext}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed transition-all text-white font-medium text-sm shadow-md hover:shadow-lg disabled:shadow-none"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );
}
