"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  X,
  BookOpen,
  CreditCard,
  Plug,
  Truck,
  UserCog,
  Wrench,
  ArrowUpRight,
  ChevronRight,
} from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { TopBar } from "@/components/top-bar";

const CATEGORIES = [
  { key: "Billing", label: "Billing FAQ", icon: CreditCard, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800" },
  { key: "Integration", label: "Integration Guides", icon: Plug, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800" },
  { key: "Delivery", label: "Delivery Tracking", icon: Truck, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800" },
  { key: "Account", label: "Account Setup", icon: UserCog, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800" },
  { key: "Technical", label: "Technical Support", icon: Wrench, color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800" },
];

export default function KnowledgeBasePage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

          <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">

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
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-16 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 animate-pulse" />
                    ))}
                  </div>
                ) : articles.length === 0 ? (
                  <div className="text-center py-10">
                    <Search className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                    <p className="text-sm text-slate-500 dark:text-slate-400">No articles found for "{query || category}"</p>
                    <p className="text-xs text-slate-400 mt-1">Try different keywords or raise an issue with our support team</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {articles.map((article) => {
                      const cat = CATEGORIES.find((c) => c.key === article.category);
                      const Icon = cat?.icon ?? BookOpen;
                      return (
                        <button
                          key={article.slug}
                          onClick={() => router.push(`/knowledge-base/${article.slug}`)}
                          className="w-full flex items-start gap-4 p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-[#0052CC] dark:hover:border-blue-500 hover:shadow-sm transition-all text-left group"
                        >
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${cat?.bg ?? "bg-slate-100"}`}>
                            <Icon className={`w-4 h-4 ${cat?.color ?? "text-slate-500"}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 group-hover:text-[#0052CC] dark:group-hover:text-blue-400 transition-colors">
                              {article.title}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{article.summary}</p>
                            <span className="inline-block mt-1 text-[10px] font-medium text-slate-400 uppercase tracking-wide">{article.category}</span>
                          </div>
                          <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-[#0052CC] flex-shrink-0 mt-0.5 transition-colors" />
                        </button>
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
    </div>
  );
}

function PopularArticles({ router }: { router: ReturnType<typeof useRouter> }) {
  const [articles, setArticles] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/knowledge-base")
      .then((r) => r.json())
      .then((d) => setArticles((d.articles ?? []).slice(0, 6)))
      .catch(() => {});
  }, []);

  if (articles.length === 0) return null;

  return (
    <div>
      <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-4">Popular Articles</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {articles.map((article) => {
          const cat = CATEGORIES.find((c) => c.key === article.category);
          const Icon = cat?.icon ?? BookOpen;
          return (
            <button
              key={article.slug}
              onClick={() => router.push(`/knowledge-base/${article.slug}`)}
              className="flex items-start gap-3 p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-[#0052CC] dark:hover:border-blue-500 hover:shadow-sm transition-all text-left group"
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${cat?.bg ?? "bg-slate-100"}`}>
                <Icon className={`w-3.5 h-3.5 ${cat?.color ?? "text-slate-500"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 group-hover:text-[#0052CC] dark:group-hover:text-blue-400 transition-colors truncate">
                  {article.title}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">{article.summary}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
