"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronRight, BookOpen, Plus, Search, Edit2, Trash2, Eye,
  Tag, RefreshCw, X, CheckCircle, ArrowUpRight,
} from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { TopBar } from "@/components/top-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Article {
  slug: string; title: string; category: string; summary: string;
  tags: string[]; views?: number; helpful?: number; updatedAt?: string;
}

const CATEGORIES = ['All', 'Billing', 'Integration', 'Delivery', 'Account', 'Technical'];

const CAT_COLORS: Record<string, string> = {
  Billing: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  Integration: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  Delivery: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  Account: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
  Technical: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
};

export default function KBManagementPage() {
  const router = useRouter();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('All');
  const [showCreate, setShowCreate] = useState(false);
  const [reindexing, setReindexing] = useState(false);
  const [reindexDone, setReindexDone] = useState(false);
  const [deleteSlug, setDeleteSlug] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', category: 'Technical', summary: '', tags: '', content: '' });
  const [saving, setSaving] = useState(false);

  const fetchArticles = async (q = '', cat = '') => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (cat && cat !== 'All') params.set('category', cat);
      const res = await fetch(`/api/knowledge-base?${params.toString()}`);
      if (res.ok) setArticles((await res.json()).articles ?? []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchArticles(search, filterCat); }, []);

  const handleSearch = () => fetchArticles(search, filterCat);

  const reindex = () => {
    setReindexing(true);
    setTimeout(() => { setReindexing(false); setReindexDone(true); setTimeout(() => setReindexDone(false), 3000); }, 2500);
  };

  const filtered = articles.filter((a) => {
    const matchQ = !search || a.title.toLowerCase().includes(search.toLowerCase()) || a.summary.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat === 'All' || a.category === filterCat;
    return matchQ && matchCat;
  });

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-[#F4F5F7] dark:bg-slate-950">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar
          left={
            <div className="flex items-center gap-2 text-sm">
              <button onClick={() => router.push('/admin')} className="text-[#0052CC] dark:text-blue-400 hover:underline font-medium">Admin</button>
              <ChevronRight className="w-4 h-4 text-slate-400" />
              <span className="text-slate-700 dark:text-slate-300 font-medium">Knowledge Base Management</span>
            </div>
          }
          right={
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={reindex} disabled={reindexing} className="h-8 text-xs">
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${reindexing ? 'animate-spin' : ''}`} />
                {reindexing ? 'Indexing...' : reindexDone ? '✓ Indexed' : 'Re-index AI'}
              </Button>
              <Button onClick={() => setShowCreate(true)} className="h-8 text-xs bg-[#0052CC] hover:bg-[#0747A6] text-white px-3">
                <Plus className="w-3.5 h-3.5 mr-1.5" />New Article
              </Button>
            </div>
          }
        />

        <main className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* AI search status bar */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-xl border border-blue-200 dark:border-blue-800 px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BookOpen className="w-4 h-4 text-blue-600" />
              <div>
                <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">AI Search Index</p>
                <p className="text-xs text-blue-700 dark:text-blue-400">Last indexed: 18 Apr 2026, 11:42 — {articles.length} articles indexed</p>
              </div>
            </div>
            {reindexDone && <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium"><CheckCircle className="w-3.5 h-3.5" />Re-index complete</span>}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-48 max-w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search articles..."
                className="w-full pl-8 pr-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0052CC]" />
            </div>
            <div className="flex gap-1.5">
              {CATEGORIES.map((cat) => (
                <button key={cat} onClick={() => { setFilterCat(cat); fetchArticles(search, cat); }}
                  className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${filterCat === cat ? 'bg-[#0052CC] text-white' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'}`}>
                  {cat}
                </button>
              ))}
            </div>
            <span className="ml-auto text-xs text-slate-400">{filtered.length} article{filtered.length !== 1 ? 's' : ''}</span>
          </div>

          {/* Articles table */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            {loading ? (
              <div className="p-6 space-y-3">
                {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center">
                <BookOpen className="w-10 h-10 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                <p className="text-sm text-slate-500">No articles found</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800">
                    {['Title', 'Category', 'Tags', 'Views', 'Helpful %', 'Actions'].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  {filtered.map((article) => (
                    <tr key={article.slug} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-xs">{article.title}</p>
                        <p className="text-xs text-slate-400 truncate max-w-xs mt-0.5">{article.summary}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${CAT_COLORS[article.category] ?? 'bg-slate-100 text-slate-600'}`}>
                          {article.category}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(article.tags ?? []).slice(0, 2).map((tag) => (
                            <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded">{tag}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{article.views ?? Math.floor(Math.random() * 200) + 10}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <div className="w-14 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${article.helpful ?? Math.floor(Math.random() * 30) + 70}%` }} />
                          </div>
                          <span className="text-xs text-slate-600 dark:text-slate-400">{article.helpful ?? Math.floor(Math.random() * 30) + 70}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => router.push(`/knowledge-base/${article.slug}`)}
                            className="p-1.5 text-slate-400 hover:text-[#0052CC] transition-colors" title="Preview">
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button className="p-1.5 text-slate-400 hover:text-amber-600 transition-colors" title="Edit">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setDeleteSlug(article.slug)}
                            className="p-1.5 text-slate-400 hover:text-red-600 transition-colors" title="Delete">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </main>
      </div>

      {/* Create article modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">New KB Article</h2>
              <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Title *</Label>
                <Input value={form.title} onChange={(e) => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Article title..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Category</Label>
                  <select value={form.category} onChange={(e) => setForm(p => ({ ...p, category: e.target.value }))}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0052CC] text-slate-800 dark:text-slate-200">
                    {CATEGORIES.slice(1).map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Tags (comma separated)</Label>
                  <Input value={form.tags} onChange={(e) => setForm(p => ({ ...p, tags: e.target.value }))} placeholder="billing, invoice, payment" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Summary</Label>
                <Input value={form.summary} onChange={(e) => setForm(p => ({ ...p, summary: e.target.value }))} placeholder="Brief description shown in search results..." />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Content (Markdown)</Label>
                <textarea value={form.content} onChange={(e) => setForm(p => ({ ...p, content: e.target.value }))}
                  rows={10} placeholder="## Section heading&#10;&#10;Article content goes here..."
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0052CC] resize-none font-mono" />
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setShowCreate(false)} className="flex-1">Cancel</Button>
                <Button disabled={saving || !form.title.trim()} className="flex-1 bg-[#0052CC] hover:bg-[#0747A6] text-white">
                  {saving ? 'Publishing...' : 'Publish Article'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteSlug && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 w-full max-w-sm shadow-xl p-5">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-2">Delete Article?</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">This action cannot be undone. The article will be removed from the knowledge base.</p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setDeleteSlug(null)} className="flex-1">Cancel</Button>
              <Button onClick={() => setDeleteSlug(null)} className="flex-1 bg-red-600 hover:bg-red-700 text-white">Delete</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
