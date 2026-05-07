"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Lightbulb, Ticket, BookOpen, ChevronRight } from "lucide-react";

interface Suggestion {
  id: string;
  title: string;
  status?: string;
  resolvedAt?: string;
  category?: string;
  slug?: string;
  content?: string;
  description?: string;
  type?: "ticket" | "article";
}

interface SuggestionsData {
  tickets: Suggestion[];
  articles: Suggestion[];
}

export function TicketSuggestions({
  query,
  onTicketSelect,
  onItemClick,
  onSuggestionsChange,
}: {
  query: string;
  onTicketSelect?: (ticketId: string) => void;
  onItemClick?: (item: Suggestion, type: "article" | "ticket") => void;
  onSuggestionsChange?: (suggestions: Suggestion[]) => void;
}) {
  const router = useRouter();
  const [suggestions, setSuggestions] = useState<SuggestionsData>({
    tickets: [],
    articles: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!query || query.length < 5) {
      setSuggestions({ tickets: [], articles: [] });
      onSuggestionsChange?.([]);
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
        if (onSuggestionsChange) {
          const allItems = [...(data.tickets || []), ...(data.articles || [])];
          onSuggestionsChange(allItems);
        }
      } catch (err) {
        setError("Failed to load suggestions");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, onSuggestionsChange]);

  const allSuggestions = [
    ...suggestions.tickets.map((t) => ({ ...t, type: "ticket" as const })),
    ...suggestions.articles.map((a) => ({ ...a, type: "article" as const })),
  ];

  // Show dropdown while user is typing (query >= 2 chars), keep it visible during loading
  if (!query || query.length < 2) {
    return null;
  }

  return (
    <div
      className="relative w-full mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-40 overflow-hidden"
    >
      {/* Header with gradient accent */}
      <div className="px-4 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2 bg-gradient-to-r from-amber-50 dark:from-amber-950/30 to-transparent">
        <div className="flex items-center gap-2.5 flex-1">
          <div className="p-1.5 bg-amber-100 dark:bg-amber-900/40 rounded-md">
            <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Smart Suggestions
            </span>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">AI-powered recommendations</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="px-4 py-8 text-center">
          <div className="inline-flex flex-col items-center gap-3">
            <div className="flex gap-1">
              <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse" />
              <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: "0.2s" }} />
              <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: "0.4s" }} />
            </div>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Searching knowledge base and resolved tickets...
            </p>
          </div>
        </div>
      ) : error ? (
        <div className="px-4 py-4 bg-red-50 dark:bg-red-950/20 border-t border-slate-200 dark:border-slate-700">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      ) : allSuggestions.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <div className="inline-flex flex-col items-center gap-2">
            <div className="text-2xl">🔍</div>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
              No suggestions yet
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-500 max-w-xs">
              Type more details to find related articles or similar resolved tickets
            </p>
          </div>
        </div>
      ) : (
        <div className="max-h-96 overflow-y-auto">
          {/* Resolved Tickets Section */}
          {suggestions.tickets.length > 0 && (
            <div>
              <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/50 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide border-b border-slate-200 dark:border-slate-700">
                Similar Resolved Tickets ({suggestions.tickets.length})
              </div>
              <div className="space-y-0.5 p-2">
                {suggestions.tickets.map((ticket) => (
                  <button
                    type="button"
                    key={ticket.id}
                    onClick={() => {
                      if (onItemClick) {
                        onItemClick(ticket, "ticket");
                      } else if (onTicketSelect) {
                        onTicketSelect(ticket.id);
                      } else {
                        router.push(`/tickets/${ticket.id}`);
                      }
                    }}
                    className="w-full px-3 py-2.5 text-left hover:bg-blue-50 dark:hover:bg-blue-950/40 active:bg-blue-100 dark:active:bg-blue-900/30 transition-all duration-150 flex items-start gap-3 border border-transparent hover:border-blue-200 dark:hover:border-blue-800 rounded-md group"
                  >
                    <div className="p-2 bg-blue-100 dark:bg-blue-950/40 rounded-md group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors flex-shrink-0">
                      <Ticket className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 line-clamp-2 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
                        {ticket.title}
                      </p>
                      {ticket.resolvedAt && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                          ✓ Resolved {new Date(ticket.resolvedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-blue-500 flex-shrink-0 transition-colors" />
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
              <div className="space-y-0.5 p-2">
                {suggestions.articles.map((article) => (
                  <button
                    type="button"
                    key={article.id}
                    onClick={() => {
                      if (onItemClick) {
                        onItemClick(article, "article");
                      } else {
                        router.push(`/knowledge-base/${article.slug}`);
                      }
                    }}
                    className="w-full px-3 py-2.5 text-left hover:bg-green-50 dark:hover:bg-green-950/40 active:bg-green-100 dark:active:bg-green-900/30 transition-all duration-150 flex items-start gap-3 border border-transparent hover:border-green-200 dark:hover:border-green-800 rounded-md group"
                  >
                    <div className="p-2 bg-green-100 dark:bg-green-950/40 rounded-md group-hover:bg-green-200 dark:group-hover:bg-green-900/50 transition-colors flex-shrink-0">
                      <BookOpen className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 line-clamp-2 group-hover:text-green-700 dark:group-hover:text-green-300 transition-colors">
                        {article.title}
                      </p>
                      {article.category && (
                        <div className="mt-1 flex items-center gap-1.5">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-950/50 text-xs font-medium text-green-700 dark:text-green-300">
                            {article.category}
                          </span>
                        </div>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-green-500 flex-shrink-0 transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      {!loading && allSuggestions.length > 0 && (
        <div className="px-4 py-3 bg-gradient-to-r from-blue-50 dark:from-blue-950/20 to-transparent border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-start gap-2.5 text-xs">
            <span className="text-base">💡</span>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              <span className="font-semibold">Pro Tip:</span> Review these AI-powered suggestions to see if your issue was already resolved
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
