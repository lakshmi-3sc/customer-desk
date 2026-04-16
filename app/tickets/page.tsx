'use client';

import { useEffect, useState, Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle, Clock, ChevronRight } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

interface Ticket {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
}

function TicketsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  // Get query parameters
  const status = searchParams.get('status') || 'OPEN';
  const priority = searchParams.get('priority');
  const category = searchParams.get('category');

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        // Build the query URL with all parameters
        const params = new URLSearchParams();
        params.append('status', status);
        if (priority) params.append('priority', priority);
        if (category) params.append('category', category);

        const response = await fetch(`/api/dashboard/tickets?${params.toString()}`, {
          cache: 'no-store',
        });
        const data = await response.json();
        // Sort by updatedAt in descending order (most recent first)
        const sortedTickets = (data.tickets || [])
          .sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        setTickets(sortedTickets);
      } catch (error) {
        console.error('Failed to fetch tickets:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
  }, [status, priority, category]);

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'critical':
        return 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-200';
      case 'high':
        return 'bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-200';
      case 'medium':
        return 'bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-200';
      case 'low':
        return 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-200';
      default:
        return 'bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toUpperCase()) {
      case 'OPEN':
        return <AlertCircle className="w-4 h-4" />;
      case 'RESOLVED':
        return <CheckCircle className="w-4 h-4" />;
      case 'IN_PROGRESS':
        return <Clock className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusLabel = (status: string) => {
    switch (status.toUpperCase()) {
      case 'OPEN':
        return 'Open Tickets';
      case 'IN_PROGRESS':
        return 'In Progress Tickets';
      case 'RESOLVED':
        return 'Resolved Tickets';
      case 'CLOSED':
        return 'Closed Tickets';
      default:
        return 'Tickets';
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm flex-shrink-0">
        <div className="px-6 py-4">
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-2 mb-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors"
            >
              Dashboard
            </button>
            <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-600" />
            <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">
              {getStatusLabel(status)}
            </span>
          </nav>

          {/* Page Title */}
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
              {getStatusLabel(status)}
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {tickets.length} ticket{tickets.length !== 1 ? 's' : ''} found
            </p>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto">
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <p className="text-slate-600 dark:text-slate-400">
                Loading tickets...
              </p>
            </div>
          ) : tickets.length === 0 ? (
            <Card className="dark:border-slate-800 dark:bg-slate-900">
              <CardContent className="p-12 text-center">
                <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500 opacity-50" />
                <p className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-2">
                  No {status} Tickets
                </p>
                <p className="text-slate-600 dark:text-slate-400">
                  {status === 'OPEN'
                    ? 'Great job! All tickets have been resolved.'
                    : 'No tickets found for this filter.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {tickets.map((ticket) => (
                <Card
                  key={ticket.id}
                  className="dark:border-slate-800 dark:bg-slate-900 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() =>
                    router.push(`/tickets/${ticket.id}`)
                  }
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-mono text-sm font-bold text-blue-600 dark:text-blue-400">
                            #{ticket.id.split('-').pop()}
                          </span>
                          <Badge className={getPriorityColor(ticket.priority)}>
                            {ticket.priority}
                          </Badge>
                          <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                            {getStatusIcon(ticket.status)}
                            <span className="text-xs">{ticket.status}</span>
                          </div>
                        </div>
                        <p className="font-semibold text-slate-900 dark:text-slate-50 truncate mb-1">
                          {ticket.title}
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                          {ticket.description || 'No description'}
                        </p>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {formatDate(ticket.createdAt)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function TicketsPage() {
  return (
    <Suspense fallback={
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <p className="text-slate-600 dark:text-slate-400">Loading tickets...</p>
      </div>
    }>
      <TicketsContent />
    </Suspense>
  );
}
