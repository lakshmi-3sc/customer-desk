"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronRight, Paperclip, Loader2, X, AlertCircle, CheckCircle, Upload } from "lucide-react";
import { useSession } from "next-auth/react";
import { AppSidebar } from "@/components/app-sidebar";
import { TopBar } from "@/components/top-bar";
import { TicketSuggestions } from "@/components/TicketSuggestions";
import { SuggestionDrawer } from "@/components/SuggestionDrawer";

interface Attachment {
  id: string;
  name: string;
  size: number;
  type?: string;
  file?: File;
}

export default function CreateTicketPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const userRole = session?.user?.role as string | undefined;
  const is3SCTeam = userRole && ["THREESC_ADMIN", "THREESC_LEAD", "THREESC_AGENT"].includes(userRole);

  // Redirect 3SC team away — they don't raise tickets
  useEffect(() => {
    if (is3SCTeam) router.replace("/tickets");
  }, [is3SCTeam, router]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [category, setCategory] = useState("BUG");
  const [projectId, setProjectId] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [allSuggestions, setAllSuggestions] = useState<any[]>([]);

  // Clear error whenever suggestions appear
  useEffect(() => {
    if (allSuggestions.length > 0) {
      setError("");
    }
  }, [allSuggestions]);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await fetch("/api/dashboard/projects");
        if (res.ok) {
          const data = await res.json();
          setProjects(data.projects || []);
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchProjects();
    // Clear any previous errors and success messages on page load
    setError("");
    setSuccess("");
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) addFiles(Array.from(files));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const addFiles = (files: File[]) => {
    files.forEach((file) => {
      setAttachments((prev) => [
        ...prev,
        {
          id: Math.random().toString(36).substr(2, 9),
          name: file.name,
          size: file.size,
          type: file.type,
          file: file
        },
      ]);
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(Array.from(e.dataTransfer.files));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!title.trim()) return setError("Title is required");
    if (!description.trim()) return setError("Description is required");
    if (!projectId) return setError("Please select a project");

    setLoading(true);
    try {
      const res = await fetch("/api/dashboard/tickets/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          priority,
          category,
          projectId,
          attachments: attachments.map((a) => ({
            name: a.name,
            size: a.size,
            type: a.type || 'application/octet-stream'
          }))
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSuccess(`Issue created: ${data.ticketId ?? ""}`);
        router.push(`/tickets/${data.ticketId ?? ""}`);
      } else {
        setError("Failed to create issue. Please try again.");
      }
    } catch (err) {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const PRIORITIES = [
    { value: "LOW", label: "Low", dot: "bg-blue-400" },
    { value: "MEDIUM", label: "Medium", dot: "bg-yellow-400" },
    { value: "HIGH", label: "High", dot: "bg-orange-500" },
    { value: "CRITICAL", label: "Critical", dot: "bg-red-500" },
  ];

  const CATEGORIES = [
    { value: "BUG", label: "Bug" },
    { value: "FEATURE_REQUEST", label: "Feature Request" },
    { value: "DATA_ACCURACY", label: "Data Accuracy" },
    { value: "PERFORMANCE", label: "Performance" },
    { value: "ACCESS_SECURITY", label: "Access & Security" },
  ];

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-[#F4F5F7] dark:bg-slate-950">
      <AppSidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <TopBar
          left={
            <nav className="flex items-center gap-2 text-sm">
              <button
                onClick={() => router.push("/dashboard")}
                className="text-[#0052CC] dark:text-blue-400 hover:underline font-medium"
              >
                Overview
              </button>
              <ChevronRight className="w-4 h-4 text-slate-400" />
              <button
                onClick={() => router.push("/tickets")}
                className="text-[#0052CC] dark:text-blue-400 hover:underline font-medium"
              >
                Issues
              </button>
              <ChevronRight className="w-4 h-4 text-slate-400" />
              <span className="text-slate-600 dark:text-slate-400">Create Issue</span>
            </nav>
          }
        />

        {/* Content */}
        <main className="flex-1 overflow-hidden">
          <div className="max-w-3xl mx-auto overflow-y-auto h-full p-6">
            <div className="mb-6">
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Create Issue
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Fill in the details below to submit a new support issue.
              </p>
            </div>

            {error && allSuggestions.length === 0 && !drawerOpen && (
              <div className="flex items-start gap-3 p-4 mb-5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                </div>
                <button
                  onClick={() => setError("")}
                  className="flex-shrink-0 text-red-400 hover:text-red-600 dark:hover:text-red-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {success && (
              <div className="flex items-start gap-3 p-3 mb-5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-emerald-700 dark:text-emerald-400">{success}</p>
              </div>
            )}

            <div>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Project selector — most important, shown first */}
              <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-5">
                <div className="space-y-1.5">
                  <Label htmlFor="project" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Project <span className="text-red-500">*</span>
                  </Label>
                  <select
                    id="project"
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0052CC] focus:border-transparent cursor-pointer"
                  >
                    <option value="">Select a project...</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Issue details */}
              <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-5 space-y-4">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800 pb-3">
                  Issue Details
                </h3>

                {/* Title */}
                <div className="space-y-1.5">
                  <Label htmlFor="title" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Summary <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="title"
                    placeholder="Brief summary of the issue"
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      if (error) setError("");
                    }}
                    className="h-10 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus-visible:ring-[#0052CC]"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <Label htmlFor="description" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Description <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <textarea
                      id="description"
                      placeholder="Describe the issue in detail — steps to reproduce, expected vs actual behaviour..."
                      value={description}
                      onChange={(e) => {
                        setDescription(e.target.value);
                        if (error) setError("");
                      }}
                      rows={6}
                      className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0052CC] focus:border-transparent resize-none"
                    />
                    <TicketSuggestions
                      query={description}
                      onItemClick={(item, type) => {
                        setSelectedItem({ ...item, type });
                        setDrawerOpen(true);
                      }}
                      onSuggestionsChange={setAllSuggestions}
                    />
                  </div>
                </div>

                {/* Priority + Category row */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="priority" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Priority
                    </Label>
                    <select
                      id="priority"
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0052CC] focus:border-transparent cursor-pointer"
                    >
                      {PRIORITIES.map((p) => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="category" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Category
                    </Label>
                    <select
                      id="category"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0052CC] focus:border-transparent cursor-pointer"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Attachments — drag & drop */}
              <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-5">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                  Attachments
                </h3>
                <input ref={fileInputRef} type="file" multiple onChange={handleFileSelect} className="hidden" />

                {/* Drop zone */}
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex flex-col items-center justify-center gap-2 px-4 py-8 rounded-lg border-2 border-dashed cursor-pointer transition-colors ${
                    isDragging
                      ? 'border-[#0052CC] bg-blue-50 dark:bg-blue-950/30'
                      : 'border-slate-300 dark:border-slate-600 hover:border-[#0052CC] dark:hover:border-blue-500 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <Upload className={`w-6 h-6 ${isDragging ? 'text-[#0052CC]' : 'text-slate-400'}`} />
                  <div className="text-center">
                    <p className={`text-sm font-medium ${isDragging ? 'text-[#0052CC]' : 'text-slate-600 dark:text-slate-400'}`}>
                      {isDragging ? 'Drop files here' : 'Drag & drop files here'}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">or click to browse — any file type, up to 10 MB each</p>
                  </div>
                </div>

                {attachments.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {attachments.map((att) => (
                      <div
                        key={att.id}
                        className="flex items-center gap-3 p-2.5 bg-slate-50 dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700"
                      >
                        <Paperclip className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-800 dark:text-slate-200 truncate">{att.name}</p>
                          <p className="text-xs text-slate-400">{formatFileSize(att.size)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setAttachments((prev) => prev.filter((a) => a.id !== att.id)); }}
                          className="text-slate-400 hover:text-red-500 transition-colors flex-shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  className="h-9 text-sm border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="h-9 text-sm bg-[#0052CC] hover:bg-[#0747A6] text-white px-6"
                >
                  {loading ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating...</>
                  ) : (
                    "Create Issue"
                  )}
                </Button>
              </div>
            </form>
            </div>
          </div>
        </main>

        {/* Suggestion Drawer */}
        <SuggestionDrawer
          isOpen={drawerOpen}
          item={selectedItem}
          items={allSuggestions}
          onClose={() => setDrawerOpen(false)}
          onSelectItem={(item) => setSelectedItem(item)}
        />
      </div>
    </div>
  );
}
