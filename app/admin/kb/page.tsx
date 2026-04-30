"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Search,
  X,
  BookOpen,
  ChevronRight,
  Package,
  GitBranch,
  Factory,
  Clock,
  ArrowRight,
  ArrowUpRight,
  Plus,
  Edit2,
  Trash2,
  Eye,
  Loader2,
} from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { TopBar } from "@/components/top-bar";

const CATEGORIES = [
  { key: "Production", label: "Production Planning", icon: Factory, color: "text-cyan-600 dark:text-cyan-400", bg: "bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200 dark:border-cyan-800" },
  { key: "RawMaterial", label: "Raw Material Planning", icon: Package, color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-800" },
  { key: "Replenishment", label: "SaaS Replenishment", icon: GitBranch, color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800" },
  { key: "Troubleshooting", label: "Troubleshooting", icon: Factory, color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800" },
  { key: "BestPractices", label: "Best Practices", icon: BookOpen, color: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-950/40 border-green-200 dark:border-green-800" },
];

export default function AdminKBPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newContent, setNewContent] = useState("");
  const [saving, setSaving] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check authorization
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
              <span className="text-slate-600 dark:text-slate-400 font-semibold">Knowledge Base</span>
            </nav>
          }
        />

        <main className="flex-1 overflow-y-auto">
          {/* Hero search */}
          <div className="bg-gradient-to-br from-[#0052CC] to-[#0747A6] px-6 py-12">
            <div className="max-w-2xl mx-auto text-center">
              <BookOpen className="w-10 h-10 text-blue-200 mx-auto mb-3" />
              <h1 className="text-2xl font-bold text-white mb-2">How can we help?</h1>
              <p className="text-blue-200 text-sm mb-6">Search our Knowledge Base or browse by category</p>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  ref={searchRef}
                  type="text"
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setCategory(""); }}
                  placeholder="Search articles, guides, FAQs…"
                  autoFocus
                  className="w-full pl-12 pr-10 py-3.5 rounded-xl text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-white/50 shadow-lg"
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

          <div className="max-w-4xl mx-auto px-6 py-6 space-y-8">
            {/* New Article Button - Admin Only */}
            {is3SCAdmin && (
              <div className="flex justify-end">
                <button
                  onClick={() => setShowNewModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-[#0052CC] hover:bg-[#0747A6] text-white rounded-lg font-medium text-sm transition-colors shadow-md hover:shadow-lg"
                >
                  <Plus className="w-4 h-4" />
                  New Article
                </button>
              </div>
            )}

            {/* Category tiles — always visible */}
            <div>
              <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-4">Browse by Category</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {CATEGORIES.map(({ key, label, icon: Icon, color, bg }) => (
                  <button
                    key={key}
                    onClick={() => { setCategory(category === key ? "" : key); setQuery(""); }}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all hover:shadow-md ${
                      category === key
                        ? `${bg} shadow-md ring-2 ring-offset-2 ring-[#0052CC]/30`
                        : `${bg} hover:border-slate-300`
                    }`}
                  >
                    <Icon className={`w-6 h-6 ${color}`} />
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="h-40 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 animate-pulse" />
                    ))}
                  </div>
                ) : articles.length === 0 ? (
                  <div className="text-center py-10">
                    <Search className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                    <p className="text-sm text-slate-500 dark:text-slate-400">No articles found for "{query || category}"</p>
                    <p className="text-xs text-slate-400 mt-1">Try different keywords or browse by category</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {articles.map((article) => {
                      const cat = CATEGORIES.find((c) => c.key === article.category);
                      const Icon = cat?.icon ?? BookOpen;
                      return (
                        <div
                          key={article.id}
                          className="flex flex-col gap-3 p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-[#0052CC] dark:hover:border-blue-500 hover:shadow-lg transition-all group"
                        >
                          {/* Icon & Category Header */}
                          <div className="flex items-start justify-between">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${cat?.bg ?? "bg-slate-100"}`}>
                              <Icon className={`w-5 h-5 ${cat?.color ?? "text-slate-500"}`} />
                            </div>
                            <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                              {article.category}
                            </span>
                          </div>

                          {/* Title & Description */}
                          <div>
                            <h3 className="font-bold text-slate-900 dark:text-slate-100 group-hover:text-[#0052CC] dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                              {article.title}
                            </h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1.5 line-clamp-2">
                              {article.summary || article.description || "No description"}
                            </p>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2 mt-auto pt-3 border-t border-slate-200 dark:border-slate-700">
                            <button
                              onClick={() => router.push(`/knowledge-base/${article.slug || article.id}`)}
                              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-[#0052CC] hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                              View
                            </button>
                            {is3SCAdmin && (
                              <>
                                <button
                                  onClick={() => router.push(`/admin/kb/${article.slug || article.id}/edit`)}
                                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg transition-colors"
                                >
                                  <Edit2 className="w-4 h-4" />
                                  Edit
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Default: Popular articles when nothing searched */}
            {!showArticleList && (
              <PopularArticles router={router} />
            )}

          </div>
        </main>
      </div>

      {/* New Article Modal - Simple */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-lg max-w-md w-full">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">New Article</h2>
              <button
                onClick={() => {
                  setShowNewModal(false);
                  setNewTitle("");
                  setNewCategory("");
                  setNewContent("");
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newTitle || !newCategory) return;
                
                setSaving(true);
                try {
                  const res = await fetch("/api/knowledge-base", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      title: newTitle,
                      category: newCategory,
                      content: newContent,
                    }),
                  });

                  if (res.ok) {
                    const data = await res.json();
                    setShowNewModal(false);
                    setNewTitle("");
                    setNewCategory("");
                    setNewContent("");
                    fetchArticles(query, category);
                  }
                } catch (err) {
                  console.error(err);
                } finally {
                  setSaving(false);
                }
              }}
              className="p-6 space-y-4"
            >
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-slate-900 dark:text-white mb-1.5">Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Article title"
                  required
                  maxLength={100}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-slate-900 dark:text-white mb-1.5">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select category</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat.key} value={cat.key}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Content */}
              <div>
                <label className="block text-sm font-medium text-slate-900 dark:text-white mb-1.5">Content</label>
                <textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Article content"
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewModal(false);
                    setNewTitle("");
                    setNewCategory("");
                    setNewContent("");
                  }}
                  disabled={saving}
                  className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !newTitle || !newCategory}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function PopularArticles({ router }: { router: ReturnType<typeof useRouter> }) {
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/knowledge-base")
      .then((r) => r.json())
      .then((d) => {
        setArticles(d.articles ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div>
        <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-4">Essential Planning Guides</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-32 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (articles.length === 0) return null;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-1">Essential Planning Guides</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">Learn production planning, material management, and replenishment strategies</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {articles.map((article) => {
          const cat = CATEGORIES.find((c) => c.key === article.category);
          const Icon = cat?.icon ?? BookOpen;
          return (
            <button
              key={article.id}
              onClick={() => router.push(`/knowledge-base/${article.slug || article.id}`)}
              className="flex flex-col gap-3 p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-[#0052CC] dark:hover:border-blue-500 hover:shadow-lg transition-all text-left group"
            >
              {/* Icon & Category Header */}
              <div className="flex items-start justify-between">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${cat?.bg ?? "bg-slate-100"}`}>
                  <Icon className={`w-5 h-5 ${cat?.color ?? "text-slate-500"}`} />
                </div>
                <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                  {article.category}
                </span>
              </div>

              {/* Title & Summary */}
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 group-hover:text-[#0052CC] dark:group-hover:text-blue-400 transition-colors leading-snug mb-1.5">
                  {article.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                  {article.summary || article.content?.substring(0, 80) + "..."}
                </p>
              </div>

              {/* Read More Link */}
              <div className="flex items-center gap-1 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs font-medium text-[#0052CC] dark:text-blue-400 group-hover:gap-2 transition-all">
                <span>Read article</span>
                <ArrowRight className="w-3 h-3" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
