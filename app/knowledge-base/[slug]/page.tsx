"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowLeft, BookOpen, Calendar, User, Clock, Share2, Copy, Check, ThumbsUp, ThumbsDown, Edit2, X } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { TopBar } from "@/components/top-bar";
import ReactMarkdown from "react-markdown";

const getCategoryColor = (category: string) => {
  const colors: Record<string, { bg: string; text: string; badge: string }> = {
    Production: { bg: "from-cyan-50 to-blue-50 dark:from-cyan-950/20 dark:to-blue-950/20", text: "text-cyan-700 dark:text-cyan-400", badge: "bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-400" },
    RawMaterial: { bg: "from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20", text: "text-orange-700 dark:text-orange-400", badge: "bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-400" },
    Replenishment: { bg: "from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20", text: "text-indigo-700 dark:text-indigo-400", badge: "bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400" },
  };
  return colors[category] || colors.Production;
};

const estimateReadTime = (content: string) => Math.max(1, Math.ceil(content.split(" ").length / 200));

export default function KBArticlePage() {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession();
  const slug = params.slug as string;

  const [article, setArticle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [helpful, setHelpful] = useState<"up" | "down" | null>(null);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [saving, setSaving] = useState(false);
  
  const isAdmin = session?.user?.role === 'THREESC_ADMIN';

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/knowledge-base?slug=${slug}`)
      .then((r) => {
        if (!r.ok) throw new Error("Article not found");
        return r.json();
      })
      .then((d) => {
        setArticle(d.article);
        setEditTitle(d.article.title);
        setEditContent(d.article.content);
        setEditCategory(d.article.category);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, [slug]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleHelpful = async (value: "up" | "down") => {
    setHelpful(value);
    setFeedbackSent(true);
    setTimeout(() => setFeedbackSent(false), 2000);

    try {
      await fetch(`/api/knowledge-base/${slug}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ helpful: value }),
      });
    } catch (err) {
      console.error("Failed to submit feedback:", err);
    }
  };

  const handleSaveArticle = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/knowledge-base/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle,
          content: editContent,
          category: editCategory,
        }),
      });

      if (!res.ok) throw new Error("Failed to save article");

      const data = await res.json();
      setArticle(data.article);
      setEditMode(false);
    } catch (err) {
      console.error("Failed to save article:", err);
      alert("Failed to save article");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex overflow-hidden bg-white dark:bg-slate-950">
        <AppSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <TopBar left={<div className="h-6 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />} />
          <main className="flex-1 overflow-y-auto">
            <div className="h-40 bg-slate-200 dark:bg-slate-800 animate-pulse" />
            <div className="max-w-4xl mx-auto px-8 py-8 space-y-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-full" />
              ))}
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="h-screen w-screen flex overflow-hidden bg-white dark:bg-slate-950">
        <AppSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <TopBar left={<div>Knowledge Base</div>} />
          <main className="flex-1 overflow-y-auto p-8">
            <div className="max-w-2xl mx-auto text-center py-16">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 mb-6">
                <BookOpen className="w-8 h-8 text-slate-400 dark:text-slate-500" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Article Not Found</h1>
              <p className="text-slate-600 dark:text-slate-400 mb-8">
                The article you're looking for doesn't exist or has been removed.
              </p>
              <button
                onClick={() => router.push("/knowledge-base")}
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#0052CC] hover:bg-[#0747A6] text-white rounded-lg font-semibold transition-all hover:shadow-lg"
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

  const categoryColors = getCategoryColor(article.category);
  const readTime = estimateReadTime(article.content);

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-white dark:bg-slate-950">
      <AppSidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar
          left={
            <nav className="flex items-center gap-2 text-sm">
              {typeof window !== "undefined" && window.history.length > 1 && (
                <>
                  <button onClick={() => router.back()} className="text-[#0052CC] hover:text-[#0747A6] font-medium transition-colors">
                    ← Back
                  </button>
                  <span className="text-slate-300">/</span>
                </>
              )}
              <button onClick={() => router.push("/knowledge-base")} className="text-[#0052CC] hover:text-[#0747A6] font-medium transition-colors">
                Knowledge Base
              </button>
              <span className="text-slate-300">/</span>
              <span className="text-slate-700 dark:text-slate-300 font-semibold truncate max-w-md">{article.title}</span>
            </nav>
          }
        />

        <main className="flex-1 overflow-y-auto">
          {/* Hero Header */}
          <div className={`bg-gradient-to-r ${categoryColors.bg} border-b border-slate-200 dark:border-slate-800`}>
            <div className="max-w-4xl mx-auto px-8 py-12">
              <div className="mb-6 flex items-center gap-3">
                <span className={`text-xs font-bold px-3 py-1.5 rounded-lg ${categoryColors.badge} uppercase tracking-wider`}>
                  {article.category}
                </span>
                <span className={`text-xs font-medium flex items-center gap-1 ${categoryColors.text}`}>
                  <Clock className="w-3.5 h-3.5" />
                  {readTime} min read
                </span>
              </div>
              <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-4 leading-tight">{article.title}</h1>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-sm">
                  {article.createdBy && (
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#0052CC] flex items-center justify-center text-white font-semibold text-xs">
                        {article.createdBy.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900 dark:text-slate-100">{article.createdBy.name}</p>
                      </div>
                    </div>
                  )}
                  {article.createdAt && (
                    <div className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4" />
                      {new Date(article.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyLink}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300 text-sm font-medium"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-green-600" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy Link
                      </>
                    )}
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => setEditMode(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0052CC] hover:bg-[#0747A6] text-white text-sm font-medium transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                      Edit
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <article className="max-w-4xl mx-auto px-8 py-12">
            <div className="prose dark:prose-invert max-w-none">
              <ReactMarkdown
                components={{
                  h2: ({ children }) => <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-6 mb-3 pt-4 border-t border-slate-200 dark:border-slate-800 first:mt-0 first:pt-0 first:border-0">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mt-5 mb-2.5">{children}</h3>,
                  p: ({ children }) => <p className="text-slate-700 dark:text-slate-300 mb-3 leading-relaxed text-sm">{children}</p>,
                  ul: ({ children }) => <ul className="space-y-1.5 mb-3 ml-4">{children}</ul>,
                  li: ({ children }) => <li className="text-slate-700 dark:text-slate-300 flex gap-3 before:content-['•'] before:text-[#0052CC] before:font-bold before:mr-1 text-sm">{children}</li>,
                  blockquote: ({ children }) => <blockquote className="border-l-4 border-[#0052CC] bg-blue-50 dark:bg-blue-950/20 pl-4 py-3 my-4 italic text-slate-700 dark:text-slate-300">{children}</blockquote>,
                  code: ({ children }) => <code className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-sm font-mono text-red-600 dark:text-red-400">{children}</code>,
                  pre: ({ children }) => <pre className="bg-slate-950 text-slate-50 p-6 rounded-lg overflow-x-auto mb-4 text-sm font-mono border border-slate-800">{children}</pre>,
                  table: ({ children }) => <div className="overflow-x-auto mb-4"><table className="w-full border-collapse">{children}</table></div>,
                  th: ({ children }) => <th className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold p-3 text-left border border-slate-200 dark:border-slate-700">{children}</th>,
                  td: ({ children }) => <td className="p-3 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">{children}</td>,
                }}
              >
                {article.content}
              </ReactMarkdown>
            </div>

            {/* Footer */}
            <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800">
              <div className="flex flex-col gap-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    Last updated <time>{new Date(article.updatedAt || article.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</time>
                  </div>
                  <button
                    onClick={() => router.push("/knowledge-base")}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#0052CC] hover:bg-[#0747A6] text-white rounded-lg font-semibold transition-all hover:shadow-lg"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Articles
                  </button>
                </div>

                <div className="flex items-center gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Was this helpful?</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleHelpful("up")}
                      disabled={feedbackSent}
                      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all ${
                        helpful === "up"
                          ? "bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400"
                          : "border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                      } ${feedbackSent ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      <ThumbsUp className="w-4 h-4" />
                      <span className="text-xs font-medium">Yes</span>
                    </button>
                    <button
                      onClick={() => handleHelpful("down")}
                      disabled={feedbackSent}
                      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all ${
                        helpful === "down"
                          ? "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400"
                          : "border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                      } ${feedbackSent ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      <ThumbsDown className="w-4 h-4" />
                      <span className="text-xs font-medium">No</span>
                    </button>
                  </div>
                  {feedbackSent && (
                    <span className="text-xs text-green-600 dark:text-green-400 font-medium">✓ Thank you for your feedback</span>
                  )}
                </div>
              </div>
            </div>
          </article>
        </main>

        {/* Edit Modal */}
        {editMode && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Edit Article</h2>
                <button
                  onClick={() => setEditMode(false)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Title
                  </label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0052CC]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Category
                  </label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0052CC]"
                  >
                    <option value="Production">Production</option>
                    <option value="RawMaterial">Raw Material</option>
                    <option value="Replenishment">Replenishment</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Content (Markdown)
                  </label>
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0052CC] font-mono text-sm h-48"
                  />
                </div>

                <div className="flex items-center gap-3 justify-end">
                  <button
                    onClick={() => setEditMode(false)}
                    className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveArticle}
                    disabled={saving}
                    className="px-6 py-2 rounded-lg bg-[#0052CC] hover:bg-[#0747A6] text-white font-medium transition-colors disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
