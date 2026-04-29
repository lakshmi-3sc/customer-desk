"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { Lightbulb, Ticket, BookOpen, ChevronRight, X } from "lucide-react";

interface Suggestion {
  id: string;
  title: string;
  status?: string;
  resolvedAt?: string;
  category?: string;
}

interface SuggestionsData {
  tickets: Suggestion[];
  articles: Suggestion[];
}

export function TicketSuggestions({
  query,
  onTicketSelect,
}: {
  query: string;
  onTicketSelect?: (ticketId: string) => void;
}) {
  const router = useRouter();
  const [suggestions, setSuggestions] = useState<SuggestionsData>({
    tickets: [],
    articles: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const [selectedIndex, setSelectedIndex] = useState(-1);

  useEffect(() => {
    if (!query || query.length < 2) {
      setSuggestions({ tickets: [], articles: [] });
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/ticket-suggestions?q=${encodeURIComponent(query)}`
        );
        const data = await response.json();
        setSuggestions(data);
        setSelectedIndex(-1);
      } catch (err) {
        setError("Failed to load suggestions");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const allSuggestions = [
    ...suggestions.tickets.map((t) => ({ ...t, type: "ticket" as const })),
    ...suggestions.articles.map((a) => ({ ...a, type: "article" as const })),
  ];

  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    if (containerRef.current && typeof window !== "undefined") {
      const rect = containerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  }, [query, loading]);

  if (!query || query.length < 2 || (allSuggestions.length === 0 && !loading)) {
    return <div ref={containerRef} />;
  }

  const dropdownContent = (
    <div
      className="fixed bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-50 overflow-hidden"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        width: `${position.width}px`,
        maxWidth: `${position.width}px`,
      }}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
        <Lightbulb className="w-4 h-4 text-amber-500" />
        <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Smart Suggestions
        </span>
      </div>

      {loading ? (
        <div className="px-4 py-6 text-center">
          <div className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            Finding related articles and tickets...
          </div>
        </div>
      ) : error ? (
        <div className="px-4 py-4 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      ) : allSuggestions.length === 0 ? (
        <div className="px-4 py-6 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No related articles or tickets found
          </p>
        </div>
      ) : (
        <div className="max-h-96 overflow-y-auto">
          {/* Resolved Tickets Section */}
          {suggestions.tickets.length > 0 && (
            <div>
              <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/50 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide border-b border-slate-200 dark:border-slate-700">
                Similar Resolved Tickets ({suggestions.tickets.length})
              </div>
              <div className="space-y-1">
                {suggestions.tickets.map((ticket, idx) => (
                  <button
                    key={ticket.id}
                    onClick={() => {
                      if (onTicketSelect) {
                        onTicketSelect(ticket.id);
                      } else {
                        router.push(`/tickets/${ticket.id}`);
                      }
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors flex items-start gap-3 border-b border-slate-100 dark:border-slate-800 last:border-b-0"
                  >
                    <Ticket className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                        {ticket.title}
                      </p>
                      {ticket.resolvedAt && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          Resolved{" "}
                          {new Date(ticket.resolvedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* KB Articles Section */}
          {suggestions.articles.length > 0 && (
            <div>
              <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/50 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide border-b border-slate-200 dark:border-slate-700">
                Related Articles ({suggestions.articles.length})
              </div>
              <div className="space-y-1">
                {suggestions.articles.map((article) => (
                  <button
                    key={article.id}
                    onClick={() => {
                      router.push(`/knowledge-base/${article.id}`);
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-green-50 dark:hover:bg-green-950/30 transition-colors flex items-start gap-3 border-b border-slate-100 dark:border-slate-800 last:border-b-0"
                  >
                    <BookOpen className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                        {article.title}
                      </p>
                      {article.category && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          {article.category}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      {!loading && allSuggestions.length > 0 && (
        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400">
          💡 Tip: Review these suggestions before creating a new ticket
        </div>
      )}
    </div>
  );

  return (
    <>
      <div ref={containerRef} />
      {typeof window !== "undefined" &&
        createPortal(dropdownContent, document.body)}
    </>
  );
}
