"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession as useSessionHook } from "next-auth/react";
import {
  Search,
  X,
  BookOpen,
  ChevronRight,
  Plus,
  Edit2,
  Trash2,
  Factory,
  Clock,
  ArrowUpRight,
} from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { TopBar } from "@/components/top-bar";

const CATEGORIES = [
  { key: "Troubleshooting", label: "Troubleshooting", color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800" },
  { key: "BestPractices", label: "Best Practices", color: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-950/40 border-green-200 dark:border-green-800" },
  { key: "Production", label: "Production Planning", color: "text-cyan-600 dark:text-cyan-400", bg: "bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200 dark:border-cyan-800" },
  { key: "RawMaterial", label: "Raw Material Planning", color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-800" },
  { key: "Replenishment", label: "SaaS Replenishment", color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800" },
];

export default function InternalKnowledgeBasePage() {
  const router = useRouter();
  const { data: session } = useSessionHook();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Redirect non-3SC users
  useEffect(() => {
    if (session && !["THREESC_ADMIN", "THREESC_LEAD", "THREESC_AGENT"].includes(session.user?.role)) {
      router.replace("/dashboard");
    }
  }, [session, router]);

  const is3SCAdmin = session?.user?.role === "THREESC_ADMIN";

  const fetchArticles = async (q: string, cat: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (cat) params.set("category", cat);
      const res = await fetch(`/api/knowledge-base?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setArticles(data.articles ?? []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchArticles(query, category);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, category]);

  const showArticleList = query.length > 0 || category.length > 0;

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-[#F4F5F7] dark:bg-slate-950">
      <AppSidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar
          left={
            <nav className="flex items-center gap-1.5 text-sm">
              <button onClick={() => router.push("/dashboard")} className="text-[#0052CC] hover:underline">Dashboard</button>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-600 dark:text-slate-400 font-semibold">Internal KB</span>
            </nav>
          }
          right={
            is3SCAdmin && (
              <button
                onClick={() => router.push("/internal-knowledge-base/new")}
                className="flex items-center gap-2 px-4 py-2 bg-[#0052CC] hover:bg-[#0747A6] text-white rounded-lg font-medium text-sm transition-colors"
              >
                <Plus className="w-4 h-4" />
                New Article
              </button>
            )
          }
        />

        <main className="flex-1 overflow-y-auto">
          {/* Hero search */}
          <div className="bg-gradient-to-br from-purple-600 to-purple-700 px-6 py-12">
            <div className="max-w-2xl mx-auto">
              <h1 className="text-3xl font-bold text-white mb-2">Internal Knowledge Base</h1>
              <p className="text-purple-100 mb-8 text-sm">For 3SC Team - Troubleshooting guides, best practices, and documentation</p>

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                <input
                  ref={searchRef}
                  type="text"
                  placeholder="Search articles..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0052CC] focus:border-transparent"
                />
                {query && (
                  <button
                    onClick={() => setQuery("")}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">

            {/* Category tiles */}
            <div>
              <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-4">Browse by Category</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {CATEGORIES.map(({ key, label, color, bg }) => (
                  <button
                    key={key}
                    onClick={() => { setCategory(category === key ? "" : key); setQuery(""); }}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all hover:shadow-md ${
                      category === key
                        ? `${bg} shadow-md ring-2 ring-offset-2 ring-purple-500/30`
                        : `${bg} hover:border-slate-300`
                    }`}
                  >
                    <Factory className={`w-6 h-6 ${color}`} />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 text-center leading-tight">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Articles list */}
            {showArticleList && (
              <div>
                <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-4">
                  {loading ? "Searching…" : `${articles.length} article${articles.length !== 1 ? "s" : ""} found`}
                </h2>
                {loading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-20 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 animate-pulse" />
                    ))}
                  </div>
                ) : articles.length === 0 ? (
                  <div className="text-center py-10">
                    <Search className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                    <p className="text-sm text-slate-500 dark:text-slate-400">No articles found</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {articles.map((article) => {
                      const cat = CATEGORIES.find((c) => c.key === article.category);
                      return (
                        <div
                          key={article.slug}
                          className="flex items-start gap-4 p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-600 hover:shadow-sm transition-all group"
                        >
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${cat?.bg ?? "bg-slate-100"}`}>
                            <BookOpen className={`w-4 h-4 ${cat?.color ?? "text-slate-500"}`} />
                          </div>
                          <div className="flex-1 min-w-0 cursor-pointer" onClick={() => router.push(`/internal-knowledge-base/${article.slug}`)}>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 group-hover:text-purple-700 dark:group-hover:text-purple-400 transition-colors">
                                {article.title}
                              </p>
                              {article.isInternal && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-[10px] font-semibold uppercase">
                                  Internal
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{article.summary}</p>
                            <span className="inline-block mt-1 text-[10px] font-medium text-slate-400 uppercase tracking-wide">{article.category}</span>
                          </div>

                          {/* Admin Actions */}
                          {is3SCAdmin && (
                            <div className="flex items-center gap-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => router.push(`/internal-knowledge-base/${article.slug}/edit`)}
                                className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-lg text-blue-600 dark:text-blue-400 transition-colors"
                                title="Edit article"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm("Delete this article?")) {
                                    // TODO: Implement delete
                                  }
                                }}
                                className="p-2 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg text-red-600 dark:text-red-400 transition-colors"
                                title="Delete article"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Default: Popular articles */}
            {!showArticleList && (
              <PopularArticles router={router} is3SCAdmin={is3SCAdmin} />
            )}

          </div>
        </main>
      </div>
    </div>
  );
}

function PopularArticles({ router, is3SCAdmin }: { router: ReturnType<typeof useRouter>, is3SCAdmin: boolean }) {
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/knowledge-base")
      .then((r) => r.json())
      .then((d) => {
        setArticles(d.articles ?? []);
        setLoading(false);
      });
  }, []);

  if (loading) return null;

  return (
    <div>
      <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-4">All Articles</h2>
      <div className="space-y-3">
        {articles.slice(0, 10).map((article) => {
          const cat = CATEGORIES.find((c) => c.key === article.category);
          return (
            <div
              key={article.slug}
              className="flex items-start gap-4 p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-600 hover:shadow-sm transition-all group cursor-pointer"
              onClick={() => router.push(`/internal-knowledge-base/${article.slug}`)}
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${cat?.bg ?? "bg-slate-100"}`}>
                <BookOpen className={`w-4 h-4 ${cat?.color ?? "text-slate-500"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 group-hover:text-purple-700 dark:group-hover:text-purple-400">
                  {article.title}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{article.summary}</p>
              </div>
              {is3SCAdmin && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/internal-knowledge-base/${article.slug}/edit`);
                  }}
                  className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-lg text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
