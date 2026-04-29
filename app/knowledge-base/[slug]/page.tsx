"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, BookOpen, Calendar, User } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { TopBar } from "@/components/top-bar";
import ReactMarkdown from "react-markdown";

export default function KBArticlePage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  const [article, setArticle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;

    fetch(`/api/knowledge-base?slug=${slug}`)
      .then((r) => {
        if (!r.ok) throw new Error("Article not found");
        return r.json();
      })
      .then((d) => {
        setArticle(d.article);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, [slug]);

  if (loading) {
    return (
      <div className="h-screen w-screen flex overflow-hidden bg-[#F4F5F7] dark:bg-slate-950">
        <AppSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <TopBar left={<div className="h-6 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />} />
          <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-3xl mx-auto space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-6 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-full" />
              ))}
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="h-screen w-screen flex overflow-hidden bg-[#F4F5F7] dark:bg-slate-950">
        <AppSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <TopBar left={<div>Knowledge Base</div>} />
          <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-3xl mx-auto text-center py-12">
              <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">Article Not Found</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                Sorry, we couldn't find the article you're looking for.
              </p>
              <button
                onClick={() => router.push("/knowledge-base")}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#0052CC] hover:bg-[#0747A6] text-white rounded-lg font-medium transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Knowledge Base
              </button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-[#F4F5F7] dark:bg-slate-950">
      <AppSidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar
          left={
            <nav className="flex items-center gap-1.5 text-sm">
              <button onClick={() => router.push("/knowledge-base")} className="text-[#0052CC] hover:underline">
                Knowledge Base
              </button>
              <span className="text-slate-400">/</span>
              <span className="text-slate-600 dark:text-slate-400 font-semibold max-w-xs truncate">{article.title}</span>
            </nav>
          }
        />

        <main className="flex-1 overflow-y-auto">
          <article className="max-w-3xl mx-auto px-6 py-8 space-y-6">
            <div className="space-y-4">
              <button
                onClick={() => router.push("/knowledge-base")}
                className="flex items-center gap-1.5 text-xs font-semibold text-[#0052CC] dark:text-blue-400 hover:underline mb-4"
              >
                <ArrowLeft className="w-3 h-3" />
                Back
              </button>

              <div>
                <div className="inline-flex items-center gap-2 mb-3">
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-950 text-[#0052CC] dark:text-blue-400 uppercase tracking-wide">
                    {article.category}
                  </span>
                </div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">{article.title}</h1>
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                  {article.createdBy && (
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" />
                      <span>{article.createdBy.name}</span>
                    </div>
                  )}
                  {article.createdAt && (
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{new Date(article.createdAt).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6 prose dark:prose-invert prose-sm max-w-none">
              <ReactMarkdown
                components={{
                  h2: ({ children }) => <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-6 mb-3 first:mt-0">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mt-4 mb-2">{children}</h3>,
                  p: ({ children }) => <p className="text-slate-700 dark:text-slate-300 mb-3 leading-relaxed">{children}</p>,
                  ul: ({ children }) => <ul className="list-disc list-inside space-y-2 mb-3 text-slate-700 dark:text-slate-300">{children}</ul>,
                  li: ({ children }) => <li className="ml-2">{children}</li>,
                  code: ({ children }) => <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-sm font-mono">{children}</code>,
                  pre: ({ children }) => <pre className="bg-slate-950 text-slate-50 p-4 rounded-lg overflow-x-auto mb-3 text-sm">{children}</pre>,
                }}
              >
                {article.content}
              </ReactMarkdown>
            </div>

            <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <div>Last updated {new Date(article.updatedAt || article.createdAt).toLocaleDateString()}</div>
              <button
                onClick={() => router.push("/knowledge-base")}
                className="text-[#0052CC] dark:text-blue-400 hover:underline font-semibold"
              >
                View all articles
              </button>
            </div>
          </article>
        </main>
      </div>
    </div>
  );
}
