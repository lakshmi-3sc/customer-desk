"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowLeft, Loader2, Check, AlertCircle } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { TopBar } from "@/components/top-bar";

const CATEGORIES = [
  { key: "Production", label: "Production Planning" },
  { key: "RawMaterial", label: "Raw Material Planning" },
  { key: "Replenishment", label: "SaaS Replenishment" },
  { key: "Troubleshooting", label: "Troubleshooting" },
  { key: "BestPractices", label: "Best Practices" },
];

export default function EditArticlePage() {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession();
  const slug = params.slug as string;

  // Article state
  const [article, setArticle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit form state
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Check authorization
  useEffect(() => {
    if (session && session.user?.role !== "THREESC_ADMIN") {
      router.replace("/admin/kb");
    }
  }, [session, router]);

  // Load article
  useEffect(() => {
    const fetchArticle = async () => {
      try {
        const res = await fetch(`/api/knowledge-base/${slug}`);
        if (!res.ok) throw new Error("Failed to load article");
        const data = await res.json();
        setArticle(data);
        setTitle(data.title);
        setCategory(data.category);
        setContent(data.content);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load article");
      } finally {
        setLoading(false);
      }
    };

    if (slug) fetchArticle();
  }, [slug]);

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const res = await fetch(`/api/knowledge-base/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, category }),
      });

      if (!res.ok) {
        throw new Error(res.status === 403 ? "Unauthorized" : "Failed to save article");
      }

      setSaveSuccess(true);
      setTimeout(() => router.push("/admin/kb"), 1500);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save article");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-screen flex bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col">
        <TopBar />
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-6 py-8">
            {/* Back button */}
            <button
              onClick={() => router.push("/admin/kb")}
              className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Knowledge Base
            </button>

            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Edit Article</h1>
              <p className="text-slate-600 dark:text-slate-400">Update the article content, title, and category</p>
            </div>

            {/* Loading state */}
            {loading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-[#0052CC] animate-spin" />
              </div>
            )}

            {/* Error state */}
            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3 mb-6">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-red-900 dark:text-red-200">Error</p>
                  <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
                </div>
              </div>
            )}

            {/* Form */}
            {article && !error && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSave();
                }}
                className="space-y-6"
              >
                {/* Title */}
                <div>
                  <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                    Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0052CC]/50 focus:border-[#0052CC]"
                    placeholder="Article title"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0052CC]/50 focus:border-[#0052CC]"
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
                  <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                    Content (Markdown)
                  </label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="w-full h-64 px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0052CC]/50 focus:border-[#0052CC] font-mono text-sm"
                    placeholder="Enter markdown content..."
                  />
                </div>

                {/* Save success */}
                {saveSuccess && (
                  <div className="p-4 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 rounded-lg flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-green-900 dark:text-green-200">Saved successfully</p>
                      <p className="text-sm text-green-800 dark:text-green-300">Redirecting to KB...</p>
                    </div>
                  </div>
                )}

                {/* Save error */}
                {saveError && (
                  <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-red-900 dark:text-red-200">Save failed</p>
                      <p className="text-sm text-red-800 dark:text-red-300">{saveError}</p>
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex items-center gap-3 pt-6 border-t border-slate-200 dark:border-slate-700">
                  <button
                    type="submit"
                    disabled={saving || saveSuccess}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#0052CC] hover:bg-[#0747A6] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold transition-colors"
                  >
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    {saving ? "Saving..." : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push("/admin/kb")}
                    disabled={saving}
                    className="px-6 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
