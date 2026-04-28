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
    <header className="h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 flex-shrink-0 shadow-sm gap-4">
      {/* Left: breadcrumb / title */}
      <div className="flex items-center min-w-0 flex-shrink-0">{left}</div>

      {/* Centre: search */}
      <form onSubmit={handleSearch} className="flex-1 max-w-md mx-auto">
        <div
          className={`flex items-center gap-2 rounded-md border px-3 py-1.5 transition-colors ${
            focused
              ? "border-[#0052CC] bg-white dark:bg-slate-800 dark:border-blue-500"
              : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-600"
          }`}
        >
          <Search className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Search tickets…"
            className="flex-1 bg-transparent text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 outline-none min-w-0"
          />
          {query ? (
            <button
              type="button"
              onClick={clearSearch}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex-shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-[10px] text-slate-400 dark:text-slate-500 font-mono flex-shrink-0">
              ⌘K
            </kbd>
          )}
        </div>
      </form>

      {/* Right: extra actions + notifications + profile */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {right}
        <NotificationBell />
        <ProfileDropdown />
      </div>
    </header>
  );
}
