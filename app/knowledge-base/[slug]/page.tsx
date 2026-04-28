"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ChevronRight,
  BookOpen,
  CreditCard,
  Plug,
  Truck,
  UserCog,
  Wrench,
  ArrowLeft,
  Plus,
  Tag,
} from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { TopBar } from "@/components/top-bar";

const CATEGORY_META: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  Billing: { icon: CreditCard, color: "text-emerald-600", bg: "bg-emerald-100 dark:bg-emerald-950" },
  Integration: { icon: Plug, color: "text-blue-600", bg: "bg-blue-100 dark:bg-blue-950" },
  Delivery: { icon: Truck, color: "text-amber-600", bg: "bg-amber-100 dark:bg-amber-950" },
  Account: { icon: UserCog, color: "text-purple-600", bg: "bg-purple-100 dark:bg-purple-950" },
  Technical: { icon: Wrench, color: "text-red-600", bg: "bg-red-100 dark:bg-red-950" },
};

/** Very basic markdown-to-HTML renderer for our limited article syntax */
function renderContent(content: string): string {
  return content
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-bold text-slate-900 dark:text-slate-100 mt-6 mb-3">$1</h2>')
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold text-slate-800 dark:text-slate-200 mt-5 mb-2">$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-slate-900 dark:text-slate-100">$1</strong>')
    .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-xs font-mono text-slate-800 dark:text-slate-200">$1</code>')
    .replace(/```[\w]*\n([\s\S]*?)```/gm, '<pre class="mt-2 mb-3 p-4 bg-slate-900 dark:bg-slate-950 text-slate-100 rounded-lg overflow-x-auto text-xs font-mono leading-relaxed">$1</pre>')
    .replace(/^\| (.+) \|$/gm, (_, row) => {
      const cells = row.split(" | ").map((c: string) => `<td class="px-3 py-2 text-sm text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">${c}</td>`).join("");
      return `<tr>${cells}</tr>`;
    })
    .replace(/(<tr>[\s\S]*?<\/tr>[\s\S]*?)+/g, (m) => `<table class="w-full border-collapse my-3">${m}</table>`)
    .replace(/^\|[-| ]+\|$/gm, '')
    .replace(/^- (.+)$/gm, '<li class="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300 mt-1"><span class="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#0052CC] flex-shrink-0"></span>$1</li>')
    .replace(/(<li[\s\S]*?<\/li>\n?)+/g, (m) => `<ul class="mt-2 mb-3 space-y-1">${m}</ul>`)
    .replace(/^\d+\. (.+)$/gm, '<li class="text-sm text-slate-700 dark:text-slate-300 mt-1 ml-4 list-decimal">$1</li>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-[#0052CC] dark:text-blue-400 hover:underline font-medium">$1</a>')
    .replace(/\n\n/g, '</p><p class="text-sm text-slate-700 dark:text-slate-300 leading-relaxed mt-3">')
    .replace(/^([^<].+)$/gm, '<p class="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">$1</p>');
}

export default function KnowledgeBaseArticlePage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  const [article, setArticle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [relatedArticles, setRelatedArticles] = useState<any[]>([]);

  useEffect(() => {
    const fetchArticle = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/knowledge-base?slug=${encodeURIComponent(slug)}`);
        if (res.ok) {
          const data = await res.json();
          setArticle(data.article);
          // Fetch related (same category)
          if (data.article?.category) {
            const relRes = await fetch(`/api/knowledge-base?category=${encodeURIComponent(data.article.category)}`);
            if (relRes.ok) {
              const relData = await relRes.json();
              setRelatedArticles((relData.articles ?? []).filter((a: any) => a.slug !== slug).slice(0, 3));
            }
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchArticle();
  }, [slug]);

  const meta = article ? CATEGORY_META[article.category] : null;
  const Icon = meta?.icon ?? BookOpen;

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-[#F4F5F7] dark:bg-slate-950">
      <AppSidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar
          left={
            <nav className="flex items-center gap-1.5 text-sm">
              <button onClick={() => router.push("/dashboard")} className="text-[#0052CC] hover:underline">Dashboard</button>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <button onClick={() => router.push("/knowledge-base")} className="text-[#0052CC] hover:underline">Knowledge Base</button>
              {article && (
                <>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  <button
                    onClick={() => router.push(`/knowledge-base?category=${encodeURIComponent(article.category)}`)}
                    className="text-[#0052CC] hover:underline"
                  >
                    {article.category}
                  </button>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-slate-600 dark:text-slate-400 truncate max-w-[200px]">{article.title}</span>
                </>
              )}
            </nav>
          }
        />

        <main className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="max-w-3xl mx-auto px-6 py-8 space-y-4 animate-pulse">
              <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-3/4" />
              <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-full" />
              <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-5/6" />
              <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-full" />
            </div>
          ) : !article ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <BookOpen className="w-12 h-12 text-slate-300" />
              <p className="text-slate-500">Article not found</p>
              <button onClick={() => router.push("/knowledge-base")} className="text-[#0052CC] hover:underline text-sm flex items-center gap-1">
                <ArrowLeft className="w-4 h-4" /> Back to Knowledge Base
              </button>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto px-6 py-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Article body */}
                <div className="lg:col-span-2">
                  {/* Back link */}
                  <button
                    onClick={() => router.push("/knowledge-base")}
                    className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#0052CC] transition-colors mb-6"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Knowledge Base
                  </button>

                  {/* Article header */}
                  <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 mb-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${meta?.bg ?? "bg-slate-100"}`}>
                        <Icon className={`w-5 h-5 ${meta?.color ?? "text-slate-500"}`} />
                      </div>
                      <div>
                        <span className={`text-xs font-semibold uppercase tracking-wide ${meta?.color ?? "text-slate-500"}`}>
                          {article.category}
                        </span>
                        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 leading-snug mt-0.5">
                          {article.title}
                        </h1>
                      </div>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800 pt-3">
                      {article.summary}
                    </p>
                    {/* Tags */}
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {(article.tags ?? []).map((tag: string) => (
                        <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-400">
                          <Tag className="w-2.5 h-2.5" />{tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Article content */}
                  <div
                    className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 prose-custom"
                    dangerouslySetInnerHTML={{ __html: renderContent(article.content) }}
                  />

                  {/* Was this helpful? */}
                  <div className="mt-6 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 text-center">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Was this article helpful?</p>
                    <div className="flex justify-center gap-3">
                      <button className="px-4 py-2 text-sm font-medium rounded-md border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors">
                        👍 Yes, this helped
                      </button>
                      <button
                        onClick={() => router.push("/create-ticket")}
                        className="px-4 py-2 text-sm font-medium rounded-md border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        No — raise an issue
                      </button>
                    </div>
                  </div>
                </div>

                {/* Sidebar: related articles */}
                <div className="space-y-4">
                  {relatedArticles.length > 0 && (
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
                      <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">Related Articles</h3>
                      <div className="space-y-2">
                        {relatedArticles.map((rel) => (
                          <button
                            key={rel.slug}
                            onClick={() => router.push(`/knowledge-base/${rel.slug}`)}
                            className="w-full text-left group"
                          >
                            <p className="text-sm font-medium text-slate-800 dark:text-slate-200 group-hover:text-[#0052CC] dark:group-hover:text-blue-400 transition-colors leading-snug">
                              {rel.title}
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{rel.summary}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* CTA */}
                  <div className="bg-[#0052CC] rounded-xl p-5 text-white">
                    <p className="text-sm font-semibold mb-1">Still need help?</p>
                    <p className="text-xs text-blue-200 mb-3">Our support team is here to help you.</p>
                    <button
                      onClick={() => router.push("/create-ticket")}
                      className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-white text-[#0052CC] rounded-lg text-sm font-semibold hover:bg-blue-50 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Raise an Issue
                    </button>
                  </div>
                </div>

              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
