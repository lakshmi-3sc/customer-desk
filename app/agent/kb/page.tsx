"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, BookOpen, ChevronRight, Clock, Tag, CheckCircle, Loader2, X, ExternalLink } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { TopBar } from "@/components/top-bar";

interface KbIssue {
  id: string;
  ticketKey: string | null;
  title: string;
  description: string | null;
  category: string;
  priority: string;
  resolvedAt: string | null;
  client: { name: string };
  _count: { comments: number };
}

const CATEGORY_COLOR: Record<string, string> = {
  BUG: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  FEATURE_REQUEST: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  DELIVERY: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  BILLING: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300",
  GENERAL: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  TECHNICAL: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300",
};

const PRIORITY_DOT: Record<string, string> = {
  CRITICAL: "bg-red-500", HIGH: "bg-amber-500", MEDIUM: "bg-blue-400", LOW: "bg-slate-400",
};

const CATEGORIES = ["BUG", "FEATURE_REQUEST", "DELIVERY", "BILLING", "GENERAL", "TECHNICAL"];

export default function AgentKbPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [issues, setIssues] = useState<KbIssue[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 350);
    return () => clearTimeout(t);
  }, [query]);

  const search = useCallback(async () => {
    if (!debouncedQuery && !categoryFilter) { setIssues([]); setHasSearched(false); return; }
    setLoading(true);
    setHasSearched(true);
    try {
      const params = new URLSearchParams({ status: "RESOLVED" });
      if (debouncedQuery) params.append("search", debouncedQuery);
      if (categoryFilter) params.append("category", categoryFilter);
      params.append("limit", "20");
      const res = await fetch(`/api/agent/kb?${params.toString()}`);
      if (res.ok) setIssues((await res.json()).issues ?? []);
    } catch {} finally { setLoading(false); }
  }, [debouncedQuery, categoryFilter]);

  useEffect(() => { search(); }, [search]);

  const clearSearch = () => { setQuery(""); setDebouncedQuery(""); setCategoryFilter(""); setIssues([]); setHasSearched(false); };

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-[#F4F5F7] dark:bg-slate-950">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar left={<span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Knowledge Base</span>} />

        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto space-y-6">

            {/* Header */}
            <div className="text-center pb-2">
              <div className="w-12 h-12 bg-blue-50 dark:bg-blue-950/50 rounded-xl flex items-center justify-center mx-auto mb-3 border border-blue-200 dark:border-blue-800">
                <BookOpen className="w-6 h-6 text-[#0052CC] dark:text-blue-400" />
              </div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-slate-50">Internal Knowledge Base</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Search past resolved issues for reference and reuse solutions</p>
            </div>

            {/* Search bar */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search resolved issues by keyword, title, or description..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full pl-9 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0052CC] focus:border-[#0052CC]"
                  autoFocus
                />
                {(query || categoryFilter) && (
                  <button onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-slate-500 font-medium">Filter by category:</span>
                {CATEGORIES.map((cat) => (
                  <button key={cat} onClick={() => setCategoryFilter((v) => v === cat ? "" : cat)}
                    className={`text-[10px] px-2 py-1 rounded-full font-semibold border transition-colors ${categoryFilter === cat ? 'bg-[#0052CC] text-white border-[#0052CC]' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-[#0052CC] hover:text-[#0052CC]'}`}>
                    {cat.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>

            {/* Results */}
            {loading ? (
              <div className="flex items-center justify-center py-12 gap-2 text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">Searching...</span>
              </div>
            ) : !hasSearched ? (
              <div className="text-center py-12 text-slate-400">
                <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Type a keyword or select a category to search resolved issues</p>
              </div>
            ) : issues.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No resolved issues found matching your search</p>
                <button onClick={clearSearch} className="mt-3 text-xs text-[#0052CC] hover:underline">Clear search</button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-slate-500 font-medium">{issues.length} result{issues.length !== 1 ? "s" : ""} found</p>
                {issues.map((issue) => (
                  <button key={issue.id} onClick={() => router.push(`/tickets/${issue.ticketKey ?? issue.id}`)}
                    className="w-full text-left bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 hover:border-[#0052CC]/40 hover:shadow-sm transition-all group">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-xs font-mono font-bold text-[#0052CC] dark:text-blue-400">{issue.ticketKey ?? issue.id.slice(0, 8)}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${CATEGORY_COLOR[issue.category] ?? CATEGORY_COLOR.GENERAL}`}>
                            <Tag className="inline w-2.5 h-2.5 mr-0.5" />{issue.category.replace("_", " ")}
                          </span>
                          <span className="flex items-center gap-1 text-[10px] text-slate-500">
                            <span className={`w-1.5 h-1.5 rounded-full ${PRIORITY_DOT[issue.priority] ?? 'bg-slate-400'}`} />
                            {issue.priority}
                          </span>
                          <span className="text-[10px] text-slate-400">{issue.client.name}</span>
                        </div>
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 group-hover:text-[#0052CC] transition-colors line-clamp-1">{issue.title}</p>
                        {issue.description && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{issue.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-2">
                          {issue.resolvedAt && (
                            <span className="flex items-center gap-1 text-[10px] text-slate-400">
                              <Clock className="w-2.5 h-2.5" />Resolved {new Date(issue.resolvedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400">{issue._count.comments} comment{issue._count.comments !== 1 ? "s" : ""}</span>
                        </div>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#0052CC] transition-colors flex-shrink-0" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
