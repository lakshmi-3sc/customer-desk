"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { ProfileDropdown } from "./profile-dropdown";
import { NotificationBell } from "./notification-bell";

interface TopBarProps {
  /** Left side: breadcrumb / title content */
  left: React.ReactNode;
  /** Right side: extra actions (refresh button etc.) — optional */
  right?: React.ReactNode;
}

export function TopBar({ left, right }: TopBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (q) {
      router.push(`/tickets?search=${encodeURIComponent(q)}`);
      inputRef.current?.blur();
    }
  };

  const clearSearch = () => {
    setQuery("");
    inputRef.current?.focus();
  };

  // ⌘K / Ctrl+K global shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <header className="h-14 bg-white/95 dark:bg-slate-950/95 border-b border-slate-200 dark:border-slate-800 flex items-center px-6 flex-shrink-0 gap-4 backdrop-blur">
      {/* Left: breadcrumb / title */}
      <div className="flex min-w-0 flex-1 items-center">{left}</div>

      {/* Centre: search */}
      <form onSubmit={handleSearch} className="hidden md:block w-full max-w-sm flex-shrink-0">
        <div
          className={`flex h-9 items-center gap-2 rounded-lg border px-3 transition-colors ${
            focused
              ? "border-[#0052CC]/60 bg-white ring-3 ring-blue-100/70 dark:bg-slate-900 dark:border-blue-500 dark:ring-blue-950/40"
              : "border-slate-200 bg-slate-50/80 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/80 dark:hover:border-slate-700"
          }`}
        >
          <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Search tickets…"
            className="min-w-0 flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-200"
          />
          {query ? (
            <button
              type="button"
              onClick={clearSearch}
              className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300 flex-shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <kbd className="hidden lg:inline-flex items-center px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-[10px] text-slate-400 dark:text-slate-500 font-mono flex-shrink-0">
              ⌘K
            </kbd>
          )}
        </div>
      </form>

      {/* Right: extra actions + notifications + profile */}
      <div className="flex flex-shrink-0 items-center gap-1.5">
        {right}
        {right && <div className="mx-1 h-6 w-px bg-slate-200 dark:bg-slate-800" />}
        <NotificationBell />
        <ProfileDropdown />
      </div>
    </header>
  );
}
