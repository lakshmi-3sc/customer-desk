"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  Clock,
  Send,
  Loader2,
  User,
  Calendar,
  Tag,
  ChevronRight,
} from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";

interface Ticket {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  category: string;
  createdAt: string;
  updatedAt: string;
  raisedBy: { id: string; name: string; email: string };
  assignedTo: { id: string; name: string; email: string } | null;
  project: { id: string; name: string } | null;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Comment {
  id: string;
  content: string;
  author: { name: string };
  createdAt: string;
}

export default function TicketDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession();
  const ticketId = params.id as string;

  // Check user role
  const userRole = session?.user?.role as string | undefined;
  const is3SCTeam =
    userRole &&
    ["THREESC_ADMIN", "THREESC_LEAD", "THREESC_AGENT"].includes(userRole);

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [loading, setLoading] = useState(true);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [updatingField, setUpdatingField] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch ticket details
        const response = await fetch(`/api/dashboard/tickets/${ticketId}`);
        if (response.ok) {
          const data = await response.json();
          setTicket(data.ticket);
          // Fetch comments for this ticket
          const commentsResponse = await fetch(
            `/api/dashboard/tickets/${ticketId}/comments`,
          );
          if (commentsResponse.ok) {
            const commentsData = await commentsResponse.json();
            setComments(commentsData.comments || []);
          }
        } else {
          console.error("Ticket not found");
        }

        // Fetch available users for dropdowns
        const usersResponse = await fetch("/api/dashboard/users");
        if (usersResponse.ok) {
          const usersData = await usersResponse.json();
          setUsers(usersData);
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (ticketId) {
      fetchData();
    }
  }, [ticketId]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!commentText.trim()) return;

    setSubmittingComment(true);

    try {
      const response = await fetch(
        `/api/dashboard/tickets/${ticketId}/comments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: commentText }),
        },
      );

      if (response.ok) {
        const data = await response.json();
        setComments([...comments, data.comment]);
        setCommentText("");
      }
    } catch (error) {
      console.error("Failed to add comment:", error);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleUpdateField = async (field: string, value: string | null) => {
    if (!ticket) return;

    setUpdatingField(field);

    try {
      const updateData =
        field === "assignee" ? { assignedToId: value } : { status: value };

      const response = await fetch(
        `/api/dashboard/tickets/${ticketId}/update`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updateData),
        },
      );

      if (response.ok) {
        const updatedTicket = await response.json();
        setTicket(updatedTicket);
      } else {
        console.error("Failed to update ticket");
      }
    } catch (error) {
      console.error("Failed to update ticket:", error);
    } finally {
      setUpdatingField(null);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case "critical":
        return "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-200";
      case "high":
        return "bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-200";
      case "medium":
        return "bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-200";
      case "low":
        return "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-200";
      default:
        return "bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toUpperCase()) {
      case "OPEN":
        return <AlertCircle className="w-5 h-5" />;
      case "RESOLVED":
        return <CheckCircle className="w-5 h-5" />;
      case "IN_PROGRESS":
        return <Clock className="w-5 h-5" />;
      default:
        return null;
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* Header with Breadcrumbs */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm flex-shrink-0">
        <div className="px-6 py-4">
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-2">
            <button
              onClick={() => router.push("/dashboard")}
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors"
            >
              Dashboard
            </button>
            <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-600" />
            {ticket && (
              <>
                <button
                  onClick={() => {
                    // Navigate to tickets list filtered by status
                    router.push(`/tickets?status=${ticket.status}`);
                  }}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors"
                >
                  {ticket.status}
                </button>
                <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-600" />
                <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                  Ticket #{ticket.id.split("-").pop()}
                </span>
              </>
            )}
            {!ticket && !loading && (
              <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                Ticket Not Found
              </span>
            )}
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto">
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <p className="text-slate-600 dark:text-slate-400">
                Loading ticket...
              </p>
            </div>
          ) : ticket ? (
            <div className="space-y-6">
              {/* Header Card - Title and Key Info */}
              <Card className="dark:border-slate-800 dark:bg-slate-900 border-2">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="font-mono text-sm font-bold px-3 py-1 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded-full">
                          #{ticket.id.split("-").pop()}
                        </span>
                        <Badge className={getPriorityColor(ticket.priority)}>
                          {ticket.priority}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="dark:border-slate-600 dark:text-slate-300"
                        >
                          {ticket.category}
                        </Badge>
                      </div>
                      <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-50">
                        {ticket.title}
                      </h2>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                      {getStatusIcon(ticket.status)}
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        {ticket.status}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600 dark:text-slate-400 text-sm">
                    {ticket.project && `Project: ${ticket.project.name}`}
                  </p>
                </CardContent>
              </Card>

              {/* Main Content Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Description and Details */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Description Card */}
                  <Card className="dark:border-slate-800 dark:bg-slate-900">
                    <CardHeader>
                      <CardTitle className="text-slate-900 dark:text-slate-50">
                        Description
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                        {ticket.description || "No description provided"}
                      </p>
                    </CardContent>
                  </Card>

                  {/* Comments Section */}
                  <Card className="dark:border-slate-800 dark:bg-slate-900">
                    <CardHeader>
                      <CardTitle className="dark:text-slate-50">
                        Comments ({comments.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Comments List */}
                      {comments.length > 0 && (
                        <div className="space-y-3 max-h-80 overflow-y-auto pb-4 border-b border-slate-200 dark:border-slate-700">
                          {comments.map((comment) => (
                            <div
                              key={comment.id}
                              className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                  {comment.author.name}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                  {formatDate(comment.createdAt)}
                                </p>
                              </div>
                              <p className="text-sm text-slate-700 dark:text-slate-300">
                                {comment.content}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add Comment Form */}
                      <form
                        onSubmit={handleAddComment}
                        className="space-y-3 pt-2"
                      >
                        <Label
                          htmlFor="comment"
                          className="text-slate-900 dark:text-slate-200 font-semibold"
                        >
                          Add Comment
                        </Label>
                        <textarea
                          id="comment"
                          placeholder="Share your thoughts or updates..."
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                        />
                        <Button
                          type="submit"
                          disabled={submittingComment || !commentText.trim()}
                          className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white"
                        >
                          {submittingComment ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Posting...
                            </>
                          ) : (
                            <>
                              <Send className="w-4 h-4 mr-2" />
                              Post Comment
                            </>
                          )}
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                </div>

                {/* Right Column - Metadata and Actions */}
                <div className="space-y-4">
                  {/* Status Card */}
                  <Card className="dark:border-slate-800 dark:bg-slate-900">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                        Status
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {is3SCTeam ? (
                        <>
                          <select
                            value={ticket.status}
                            onChange={(e) =>
                              handleUpdateField("status", e.target.value)
                            }
                            disabled={updatingField === "status"}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 disabled:opacity-50"
                          >
                            <option value="OPEN">Open</option>
                            <option value="ACKNOWLEDGED">Acknowledged</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="RESOLVED">Resolved</option>
                            <option value="CLOSED">Closed</option>
                          </select>
                          {updatingField === "status" && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                              <Loader2 className="w-3 h-3 animate-spin" />{" "}
                              Updating...
                            </p>
                          )}
                        </>
                      ) : (
                        <div className="px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-md text-slate-900 dark:text-white font-medium">
                          {ticket.status}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Assignee Card */}
                  <Card className="dark:border-slate-800 dark:bg-slate-900">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold text-slate-900 dark:text-slate-50 flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Assignee
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {is3SCTeam ? (
                        <>
                          <select
                            value={ticket.assignedTo?.id || ""}
                            onChange={(e) =>
                              handleUpdateField("assignee", e.target.value || null)
                            }
                            disabled={updatingField === "assignee"}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 disabled:opacity-50"
                          >
                            <option value="">Unassigned</option>
                            {users.map((user) => (
                              <option key={user.id} value={user.id}>
                                {user.name}
                              </option>
                            ))}
                          </select>
                          {ticket.assignedTo && (
                            <p className="text-xs text-slate-600 dark:text-slate-400">
                              {ticket.assignedTo.email}
                            </p>
                          )}
                          {updatingField === "assignee" && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                              <Loader2 className="w-3 h-3 animate-spin" />{" "}
                              Updating...
                            </p>
                          )}
                        </>
                      ) : (
                        <div className="space-y-2">
                          {ticket.assignedTo ? (
                            <>
                              <div className="px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-md text-slate-900 dark:text-white text-sm font-medium">
                                {ticket.assignedTo.name}
                              </div>
                              <p className="text-xs text-slate-600 dark:text-slate-400">
                                {ticket.assignedTo.email}
                              </p>
                            </>
                          ) : (
                            <div className="px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-md text-slate-600 dark:text-slate-400 text-sm">
                              Unassigned
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Created By Card */}
                  <Card className="dark:border-slate-800 dark:bg-slate-900">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold text-slate-900 dark:text-slate-50 flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Created By
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {ticket.raisedBy ? (
                        <>
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                            {ticket.raisedBy.name}
                          </p>
                          <p className="text-xs text-slate-600 dark:text-slate-400">
                            {ticket.raisedBy.email}
                          </p>
                        </>
                      ) : (
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          No creator information
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Timeline Card */}
                  <Card className="dark:border-slate-800 dark:bg-slate-900">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold text-slate-900 dark:text-slate-50 flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Timeline
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                          CREATED
                        </p>
                        <p className="font-medium text-slate-900 dark:text-slate-100">
                          {formatDate(ticket.createdAt)}
                        </p>
                      </div>
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                        <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                          LAST UPDATED
                        </p>
                        <p className="font-medium text-slate-900 dark:text-slate-100">
                          {formatDate(ticket.updatedAt)}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Category Card */}
                  <Card className="dark:border-slate-800 dark:bg-slate-900">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold text-slate-900 dark:text-slate-50 flex items-center gap-2">
                        <Tag className="w-4 h-4" />
                        Category
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Badge
                        variant="outline"
                        className="dark:border-slate-600 dark:text-slate-300"
                      >
                        {ticket.category}
                      </Badge>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          ) : (
            <Card className="dark:border-slate-800 dark:bg-slate-900">
              <CardContent className="p-12 text-center">
                <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-500 opacity-50" />
                <p className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-2">
                  Ticket Not Found
                </p>
                <p className="text-slate-600 dark:text-slate-400">
                  The ticket you're looking for doesn't exist.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
