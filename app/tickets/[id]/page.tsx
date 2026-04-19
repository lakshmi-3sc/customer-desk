"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  ChevronRight,
  Send,
  Loader2,
  User,
  Calendar,
  Tag,
  AlertCircle,
  CornerDownRight,
  MessageSquare,
  ShieldAlert,
  CheckCircle2,
  Paperclip,
  History,
  Bot,
  TriangleAlert,
  Lock,
  Lightbulb,
  Copy,
  Mail,
  AtSign,
  ExternalLink,
} from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { AppSidebar } from "@/components/app-sidebar";
import { TopBar } from "@/components/top-bar";
import { getSocket } from "@/lib/socket-client";

interface Ticket {
  id: string;
  ticketKey: string | null;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  category: string;
  slaBreached: boolean;
  slaBreachRisk: boolean;
  slaDueAt: string | null;
  createdAt: string;
  updatedAt: string;
  raisedBy: { id: string; name: string; email: string };
  assignedTo: { id: string; name: string; email: string } | null;
  project: { id: string; name: string } | null;
  aiCategory: string | null;
  aiPriority: string | null;
  aiSuggestedAgent: string | null;
  aiSummary: string | null;
  escalated: boolean;
  client?: { id: string; name: string } | null;
}

const STATUS_STEPS = [
  { key: 'OPEN', label: 'Open' },
  { key: 'ACKNOWLEDGED', label: 'Acknowledged' },
  { key: 'IN_PROGRESS', label: 'In Progress' },
  { key: 'RESOLVED', label: 'Resolved' },
  { key: 'CLOSED', label: 'Closed' },
] as const;

function StatusStepper({ status, onStep, canUpdate, updating }: {
  status: string;
  onStep: (s: string) => void;
  canUpdate: boolean;
  updating: boolean;
}) {
  const currentIdx = STATUS_STEPS.findIndex((s) => s.key === status);
  return (
    <div className="flex items-center gap-0 w-full">
      {STATUS_STEPS.map((step, idx) => {
        const done = idx < currentIdx;
        const active = idx === currentIdx;
        const isClickable = canUpdate && idx !== currentIdx && !updating;
        return (
          <div key={step.key} className="flex items-center flex-1 min-w-0">
            <button
              onClick={() => isClickable && onStep(step.key)}
              disabled={!isClickable}
              title={canUpdate ? `Move to ${step.label}` : step.label}
              className={`flex flex-col items-center gap-1 flex-1 min-w-0 py-1 rounded transition-colors ${
                isClickable ? 'cursor-pointer hover:opacity-80' : 'cursor-default'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                  done
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : active
                    ? 'bg-[#0052CC] border-[#0052CC] text-white'
                    : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-400'
                }`}
              >
                {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : <span>{idx + 1}</span>}
              </div>
              <span
                className={`text-[10px] font-medium leading-tight text-center truncate w-full px-0.5 ${
                  active
                    ? 'text-[#0052CC] dark:text-blue-400'
                    : done
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-400'
                }`}
              >
                {step.label}
              </span>
            </button>
            {idx < STATUS_STEPS.length - 1 && (
              <div
                className={`h-0.5 flex-shrink-0 w-4 mx-0.5 rounded transition-colors ${
                  idx < currentIdx ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

interface UserType {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Comment {
  id: string;
  content: string;
  isInternal?: boolean;
  author: { name: string };
  createdAt: string;
  parentId: string | null;
  replies?: Comment[];
}

const generateTicketKey = (project: { name: string } | null, ticketId: string): string => {
  if (!project) return `TKT-${ticketId.slice(0, 8).toUpperCase()}`;
  const projectKey = project.name
    .split(/\s+/)
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 4);
  const hash = ticketId.split("").reduce((acc, char) => ((acc << 5) - acc) + char.charCodeAt(0), 0);
  return `${projectKey}-${Math.abs(hash % 9999) + 1000}`;
};

function StatusLozenge({ status }: { status: string }) {
  const map: Record<string, string> = {
    OPEN: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
    IN_PROGRESS: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    RESOLVED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
    ACKNOWLEDGED: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
    CLOSED: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold ${map[status] ?? map.CLOSED}`}>
      {status.replace("_", " ")}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, { cls: string; dot: string }> = {
    CRITICAL: { cls: "text-red-600 dark:text-red-400", dot: "bg-red-500" },
    HIGH: { cls: "text-orange-600 dark:text-orange-400", dot: "bg-orange-500" },
    MEDIUM: { cls: "text-yellow-600 dark:text-yellow-400", dot: "bg-yellow-400" },
    LOW: { cls: "text-blue-600 dark:text-blue-400", dot: "bg-blue-400" },
  };
  const p = priority?.toUpperCase();
  const style = map[p] ?? { cls: "text-slate-500", dot: "bg-slate-400" };
  return (
    <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${style.cls}`}>
      <span className={`w-2.5 h-2.5 rounded-full ${style.dot}`} />
      {priority?.charAt(0) + priority?.slice(1).toLowerCase()}
    </span>
  );
}

interface CommentNodeProps {
  comment: Comment;
  depth: number;
  replyTo: { id: string; name: string } | null;
  replyText: string;
  submittingReply: boolean;
  onReplyClick: (id: string, name: string) => void;
  onReplyTextChange: (v: string) => void;
  onReplySubmit: (e: React.FormEvent) => void;
  getInitials: (name: string) => string;
  formatDate: (d: string) => string;
  currentUserName: string;
}

function CommentNode({
  comment, depth, replyTo, replyText, submittingReply,
  onReplyClick, onReplyTextChange, onReplySubmit,
  getInitials, formatDate, currentUserName,
}: CommentNodeProps) {
  const isReplying = replyTo?.id === comment.id;
  return (
    <div className={depth > 0 ? "ml-8 border-l-2 border-slate-100 dark:border-slate-700 pl-4" : ""}>
      <div className="flex gap-3">
        <div className={`${depth === 0 ? "w-8 h-8" : "w-7 h-7"} rounded-full bg-[#0747A6] text-white flex items-center justify-center text-xs font-bold flex-shrink-0`}>
          {getInitials(comment.author.name)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{comment.author.name}</span>
            <span className="text-xs text-slate-400">{formatDate(comment.createdAt)}</span>
          </div>
          <p className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 rounded p-3 break-words">{comment.content}</p>
          <button
            onClick={() => onReplyClick(comment.id, comment.author.name)}
            className="mt-1.5 flex items-center gap-1 text-xs text-slate-400 hover:text-[#0052CC] dark:hover:text-blue-400 transition-colors"
          >
            <MessageSquare className="w-3 h-3" />
            {isReplying ? "Cancel" : "Reply"}
          </button>

          {isReplying && (
            <form onSubmit={onReplySubmit} className="mt-2 space-y-2">
              <div className="flex gap-2 items-start">
                <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-1">
                  {getInitials(currentUserName)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-1 mb-1 text-xs text-slate-400">
                    <CornerDownRight className="w-3 h-3" />
                    <span>Replying to <span className="font-medium text-slate-600 dark:text-slate-300">{replyTo.name}</span></span>
                  </div>
                  <textarea
                    autoFocus
                    placeholder="Write a reply..."
                    value={replyText}
                    onChange={(e) => onReplyTextChange(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0052CC] resize-none"
                  />
                  <div className="flex justify-end mt-1">
                    <Button
                      type="submit"
                      disabled={submittingReply || !replyText.trim()}
                      className="bg-[#0052CC] hover:bg-[#0747A6] text-white text-xs h-7 px-3"
                    >
                      {submittingReply ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Send className="w-3 h-3 mr-1" />Reply</>}
                    </Button>
                  </div>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Nested replies */}
      {(comment.replies ?? []).length > 0 && (
        <div className="mt-3 space-y-3">
          {(comment.replies ?? []).map((reply) => (
            <CommentNode
              key={reply.id}
              comment={reply}
              depth={depth + 1}
              replyTo={replyTo}
              replyText={replyText}
              submittingReply={submittingReply}
              onReplyClick={onReplyClick}
              onReplyTextChange={onReplyTextChange}
              onReplySubmit={onReplySubmit}
              getInitials={getInitials}
              formatDate={formatDate}
              currentUserName={currentUserName}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function TicketDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession();
  const ticketId = params.id as string;

  const userRole = session?.user?.role as string | undefined;
  const is3SCTeam =
    userRole && ["THREESC_ADMIN", "THREESC_LEAD", "THREESC_AGENT"].includes(userRole);
  const isLead = userRole === "THREESC_LEAD";

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);
  const [replyText, setReplyText] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [users, setUsers] = useState<UserType[]>([]);
  const [updatingField, setUpdatingField] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<'conversation' | 'internal' | 'attachments' | 'ai-assist' | 'history'>('conversation');
  const [ticketHistory, setTicketHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [slaCountdown, setSlaCountdown] = useState<string>('');

  // Lead-specific state
  const [escalationNote, setEscalationNote] = useState('');
  const [escalating, setEscalating] = useState(false);
  const [escalationSuccess, setEscalationSuccess] = useState(false);
  const [aiOverride, setAiOverride] = useState(false);

  // Internal notes state
  const [internalText, setInternalText] = useState('');
  const [submittingInternal, setSubmittingInternal] = useState(false);

  // AI Assist state
  type AiAssistData = { suggestedReply: string; threadSummary: string; predictedResolutionHrs: number; estimatedRemainingHrs: number; similarIssues: { id: string; ticketKey: string | null; title: string; clientName: string; resolvedAt: string | null }[] };
  const [aiAssist, setAiAssist] = useState<AiAssistData | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiUsed, setAiUsed] = useState(false);
  const [emailNotify, setEmailNotify] = useState(true);

  // SLA countdown timer
  useEffect(() => {
    if (!ticket?.slaDueAt) { setSlaCountdown(''); return; }
    const compute = () => {
      const due = new Date(ticket.slaDueAt!).getTime();
      const now = Date.now();
      const diff = due - now;
      if (diff <= 0) {
        const over = Math.abs(diff);
        const h = Math.floor(over / 3600000);
        const m = Math.floor((over % 3600000) / 60000);
        setSlaCountdown(`Overdue by ${h > 0 ? `${h}h ` : ''}${m}m`);
      } else {
        const days = Math.floor(diff / 86400000);
        const h = Math.floor((diff % 86400000) / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        if (days > 0) setSlaCountdown(`Response due in ${days}d ${h}h`);
        else setSlaCountdown(`Response due in ${h}h ${m}m`);
      }
    };
    compute();
    const interval = setInterval(compute, 60000);
    return () => clearInterval(interval);
  }, [ticket?.slaDueAt]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`/api/dashboard/tickets/${ticketId}`);
        if (response.ok) {
          const data = await response.json();
          setTicket(data.ticket);
          const commentsResponse = await fetch(
            `/api/dashboard/tickets/${ticketId}/comments`,
          );
          if (commentsResponse.ok) {
            const commentsData = await commentsResponse.json();
            setComments(commentsData.comments || []);
          }

          // Fetch issue history
          setHistoryLoading(true);
          try {
            const histRes = await fetch(`/api/dashboard/activity?issueId=${data.ticket.id}`);
            if (histRes.ok) {
              const histData = await histRes.json();
              setTicketHistory(histData.activity ?? []);
            }
          } catch (e) {
            console.error(e);
          } finally {
            setHistoryLoading(false);
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

  // Real-time updates via Socket.IO
  useEffect(() => {
    if (!ticket?.id) return;
    const socket = getSocket();
    const roomId = ticket.id;

    const joinRoom = () => socket.emit("join:ticket", roomId);
    // Join immediately if already connected, otherwise wait for connect
    if (socket.connected) joinRoom();
    socket.on("connect", joinRoom);

    socket.on("ticket:updated", (updated: Ticket) => {
      setTicket((prev) => (prev?.id === updated.id ? updated : prev));
    });

    return () => {
      socket.emit("leave:ticket", roomId);
      socket.off("connect", joinRoom);
      socket.off("ticket:updated");
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket?.id]);

  const postComment = async (text: string, parentId?: string, isInternal?: boolean) => {
    const response = await fetch(`/api/dashboard/tickets/${ticketId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, ...(parentId ? { parentId } : {}), ...(isInternal ? { isInternal: true } : {}) }),
    });
    if (!response.ok) throw new Error("Failed to post comment");
    return (await response.json()).comment as Comment;
  };

  const addReplyToTree = (tree: Comment[], newComment: Comment): Comment[] =>
    tree.map((c) =>
      c.id === newComment.parentId
        ? { ...c, replies: [...(c.replies ?? []), { ...newComment, replies: [] }] }
        : { ...c, replies: addReplyToTree(c.replies ?? [], newComment) }
    );

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setSubmittingComment(true);
    try {
      const comment = await postComment(commentText);
      setComments((prev) => [...prev, { ...comment, replies: [] }]);
      setCommentText("");
    } catch (error) {
      console.error("Failed to add comment:", error);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleAddReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !replyTo) return;
    setSubmittingReply(true);
    try {
      const comment = await postComment(replyText, replyTo.id);
      setComments((prev) => addReplyToTree(prev, { ...comment, replies: [] }));
      setReplyText("");
      setReplyTo(null);
    } catch (error) {
      console.error("Failed to add reply:", error);
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleUpdateField = async (field: string, value: string | null) => {
    if (!ticket) return;

    setUpdatingField(field);

    try {
      const updateData =
        field === "assignee" ? { assignedToId: value }
        : field === "priority" ? { priority: value }
        : { status: value };

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

  const handleEscalate = async () => {
    if (!ticket) return;
    setEscalating(true);
    try {
      const res = await fetch('/api/lead/escalations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issueId: ticket.id, note: escalationNote }),
      });
      if (res.ok) {
        setEscalationNote('');
        setEscalationSuccess(true);
        setTicket((prev) => prev ? { ...prev, escalated: true } : prev);
        setTimeout(() => setEscalationSuccess(false), 3000);
      }
    } catch {} finally { setEscalating(false); }
  };

  const handleAddInternalNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!internalText.trim()) return;
    setSubmittingInternal(true);
    try {
      const comment = await postComment(internalText, undefined, true);
      setComments((prev) => [...prev, { ...comment, replies: [], isInternal: true }]);
      setInternalText('');
    } catch {} finally { setSubmittingInternal(false); }
  };

  const loadAiAssist = async () => {
    if (!ticket || aiAssist) return;
    setAiLoading(true);
    try {
      const res = await fetch(`/api/agent/ai-assist?issueId=${ticket.id}`);
      if (res.ok) setAiAssist(await res.json());
    } catch {} finally { setAiLoading(false); }
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("en-GB", {
      day: "numeric", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });

  const getInitials = (name: string) =>
    name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  if (loading) {
    return (
      <div className="flex h-screen w-screen">
        <AppSidebar />
        <div className="flex-1 flex items-center justify-center bg-[#F4F5F7] dark:bg-slate-950">
          <Loader2 className="w-6 h-6 animate-spin text-[#0052CC]" />
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex h-screen w-screen">
        <AppSidebar />
        <div className="flex-1 flex flex-col items-center justify-center bg-[#F4F5F7] dark:bg-slate-950 gap-4">
          <AlertCircle className="w-12 h-12 text-red-400" />
          <p className="text-lg font-semibold text-slate-700 dark:text-slate-300">Ticket not found</p>
          <Button variant="outline" size="sm" onClick={() => router.push("/tickets")}>Back to Issues</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <AppSidebar />

      <div className="flex-1 flex flex-col overflow-hidden bg-[#F4F5F7] dark:bg-slate-950">
        {/* Top breadcrumb bar */}
        <TopBar
          left={
            <nav className="flex items-center gap-1.5 text-sm">
              <button onClick={() => router.push("/dashboard")} className="text-[#0052CC] hover:underline">Dashboard</button>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <button onClick={() => router.push("/tickets")} className="text-[#0052CC] hover:underline">Issues</button>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-600 dark:text-slate-400 font-mono font-semibold">
                {ticket.ticketKey ?? ticket.id}
              </span>
            </nav>
          }
        />

        {/* Main content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto px-6 py-6">
            <div className="grid grid-cols-3 gap-6">

              {/* Left column (2/3): ticket header + description + activity */}
              <div className="col-span-2 space-y-4">

                {/* SLA banner */}
                {(ticket.slaBreached || ticket.slaBreachRisk || ticket.slaDueAt) && (
                  <div className={`flex items-start gap-3 px-4 py-3 rounded-lg border ${
                    ticket.slaBreached
                      ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/30'
                      : ticket.slaBreachRisk
                      ? 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50'
                  }`}>
                    <ShieldAlert className={`w-4 h-4 flex-shrink-0 mt-0.5 ${ticket.slaBreached ? 'text-red-600' : ticket.slaBreachRisk ? 'text-amber-600' : 'text-slate-400'}`} />
                    <div>
                      <p className={`text-sm font-semibold ${ticket.slaBreached ? 'text-red-800 dark:text-red-300' : ticket.slaBreachRisk ? 'text-amber-800 dark:text-amber-300' : 'text-slate-700 dark:text-slate-300'}`}>
                        {ticket.slaBreached ? 'SLA Breached' : ticket.slaBreachRisk ? 'SLA At Risk' : 'SLA Tracking'}
                      </p>
                      <p className={`text-xs mt-0.5 ${ticket.slaBreached ? 'text-red-600 dark:text-red-400' : ticket.slaBreachRisk ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'}`}>
                        {ticket.slaBreached
                          ? 'This issue has exceeded its SLA resolution target.'
                          : ticket.slaBreachRisk
                          ? 'This issue is approaching its SLA deadline — action recommended.'
                          : ''}
                        {slaCountdown && (
                          <span className={`${ticket.slaBreached || ticket.slaBreachRisk ? 'ml-1' : ''} font-semibold`}>
                            {slaCountdown}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                )}

                {/* Ticket header */}
                <div className="bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800 p-6">
                  <div className="flex items-start gap-3 mb-3">
                    <span className="font-mono text-xs font-bold px-2 py-1 bg-blue-50 dark:bg-blue-950 text-[#0052CC] dark:text-blue-300 rounded border border-blue-200 dark:border-blue-800">
                      {ticket.ticketKey ?? ticket.id}
                    </span>
                    <StatusLozenge status={ticket.status} />
                    <PriorityBadge priority={ticket.priority} />
                    <span className="text-xs px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
                      {ticket.category}
                    </span>
                  </div>
                  <h1 className="text-xl font-bold text-slate-900 dark:text-slate-50 leading-snug">
                    {ticket.title}
                  </h1>
                  {ticket.project && (
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                      Project: <span className="font-medium text-slate-700 dark:text-slate-300">{ticket.project.name}</span>
                    </p>
                  )}
                  {/* Status stepper */}
                  <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Progress</p>
                    <StatusStepper
                      status={ticket.status}
                      onStep={(s) => handleUpdateField('status', s)}
                      canUpdate={!!is3SCTeam}
                      updating={updatingField === 'status'}
                    />
                  </div>
                </div>

                {/* Description */}
                <div className="bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800 p-6">
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wide mb-3">Description</h2>
                  <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {ticket.description || <span className="text-slate-400 italic">No description provided</span>}
                  </p>
                </div>

                {/* Activity / Comments — tabbed */}
                <div className="bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800">
                  {/* Tab switcher */}
                  <div className="flex border-b border-slate-200 dark:border-slate-800 px-4 pt-1 overflow-x-auto">
                    {([
                      { key: 'conversation', label: 'Conversation', icon: MessageSquare },
                      ...(is3SCTeam ? [{ key: 'internal', label: 'Internal Notes', icon: Lock }] : []),
                      { key: 'attachments', label: 'Attachments', icon: Paperclip },
                      ...(is3SCTeam ? [{ key: 'ai-assist', label: 'AI Assist', icon: Bot }] : []),
                      { key: 'history', label: 'History', icon: History },
                    ] as const).map(({ key, label, icon: Icon }) => (
                      <button
                        key={key}
                        onClick={() => { setDetailTab(key as typeof detailTab); if (key === 'ai-assist') loadAiAssist(); }}
                        className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                          detailTab === key
                            ? key === 'internal' ? 'border-amber-500 text-amber-700 dark:text-amber-400 dark:border-amber-500'
                              : key === 'ai-assist' ? 'border-purple-500 text-purple-700 dark:text-purple-400 dark:border-purple-400'
                              : 'border-[#0052CC] text-[#0052CC] dark:text-blue-400 dark:border-blue-400'
                            : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {label}
                        {key === 'conversation' && comments.filter((c) => !c.isInternal).length > 0 && (
                          <span className="ml-1 text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full px-1.5">{comments.filter((c) => !c.isInternal).length}</span>
                        )}
                        {key === 'internal' && comments.filter((c) => c.isInternal).length > 0 && (
                          <span className="ml-1 text-xs bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-400 rounded-full px-1.5">{comments.filter((c) => c.isInternal).length}</span>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Conversation tab */}
                  {detailTab === 'conversation' && (
                    <div className="p-6">
                      {/* Email notification toggle — 3SC team */}
                      {is3SCTeam && (
                        <div className="flex items-center justify-between mb-4 px-3 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                            <Mail className="w-3.5 h-3.5" />
                            <span>Email customer on reply</span>
                          </div>
                          <button onClick={() => setEmailNotify((v) => !v)}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${emailNotify ? 'bg-[#0052CC]' : 'bg-slate-300 dark:bg-slate-600'}`}>
                            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform ${emailNotify ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
                          </button>
                        </div>
                      )}
                      {comments.filter((c) => !c.isInternal).length > 0 && (
                        <div className="space-y-5 mb-6">
                          {comments.filter((c) => !c.isInternal).map((c) => (
                            <CommentNode
                              key={c.id}
                              comment={c}
                              depth={0}
                              replyTo={replyTo}
                              replyText={replyText}
                              submittingReply={submittingReply}
                              onReplyClick={(id, name) => {
                                setReplyTo(replyTo?.id === id ? null : { id, name });
                                setReplyText("");
                              }}
                              onReplyTextChange={setReplyText}
                              onReplySubmit={handleAddReply}
                              getInitials={getInitials}
                              formatDate={formatDate}
                              currentUserName={session?.user?.name ?? ""}
                            />
                          ))}
                        </div>
                      )}
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {session?.user?.name ? getInitials(session.user.name) : "?"}
                        </div>
                        <form onSubmit={handleAddComment} className="flex-1 space-y-2">
                          <Label htmlFor="comment" className="sr-only">Add a comment</Label>
                          <div className="relative">
                            <textarea
                              id="comment"
                              placeholder={is3SCTeam ? "Reply to customer... (type @ to mention)" : "Add a comment..."}
                              value={commentText}
                              onChange={(e) => setCommentText(e.target.value)}
                              rows={3}
                              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0052CC] focus:border-[#0052CC] resize-none"
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <button type="button" title="Attach file"
                                className="p-1.5 rounded text-slate-400 hover:text-[#0052CC] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                <Paperclip className="w-3.5 h-3.5" />
                              </button>
                              <button type="button" title="Mention someone"
                                onClick={() => setCommentText((v) => v + '@')}
                                className="p-1.5 rounded text-slate-400 hover:text-[#0052CC] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                <AtSign className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <Button
                              type="submit"
                              disabled={submittingComment || !commentText.trim()}
                              className="bg-[#0052CC] hover:bg-[#0747A6] text-white text-sm h-8 px-4"
                            >
                              {submittingComment ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <><Send className="w-3.5 h-3.5 mr-1.5" />Send</>
                              )}
                            </Button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}

                  {/* Internal Notes tab — 3SC only */}
                  {detailTab === 'internal' && is3SCTeam && (
                    <div className="p-6">
                      <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                        <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        <p className="text-xs text-amber-800 dark:text-amber-300 font-medium">Internal notes are only visible to 3SC team members — not shown to customers.</p>
                      </div>
                      {comments.filter((c) => c.isInternal).length > 0 ? (
                        <div className="space-y-3 mb-5">
                          {comments.filter((c) => c.isInternal).map((note) => (
                            <div key={note.id} className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 rounded-lg p-4">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-6 h-6 rounded-full bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 flex items-center justify-center text-[10px] font-bold">
                                  {getInitials(note.author.name)}
                                </div>
                                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{note.author.name}</span>
                                <span className="text-[10px] bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded font-semibold">Internal</span>
                                <span className="text-[10px] text-slate-400 ml-auto">{formatDate(note.createdAt)}</span>
                              </div>
                              <p className="text-sm text-slate-700 dark:text-slate-300">{note.content}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="py-6 text-center mb-4">
                          <Lock className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                          <p className="text-sm text-slate-400">No internal notes yet</p>
                        </div>
                      )}
                      <form onSubmit={handleAddInternalNote} className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {session?.user?.name ? getInitials(session.user.name) : "?"}
                        </div>
                        <div className="flex-1">
                          <textarea
                            placeholder="Add an internal note (visible to 3SC team only)..."
                            value={internalText}
                            onChange={(e) => setInternalText(e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-md text-sm text-slate-900 dark:text-white placeholder:text-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                          />
                          <div className="flex justify-end mt-2">
                            <Button type="submit" disabled={submittingInternal || !internalText.trim()}
                              className="bg-amber-500 hover:bg-amber-600 text-white text-sm h-8 px-4">
                              {submittingInternal ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Lock className="w-3 h-3 mr-1.5" />Add Note</>}
                            </Button>
                          </div>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* AI Assist tab — 3SC only */}
                  {detailTab === 'ai-assist' && is3SCTeam && (
                    <div className="p-6 space-y-4">
                      {aiLoading ? (
                        <div className="flex items-center justify-center py-10 gap-2 text-slate-400">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span className="text-sm">Generating AI insights...</span>
                        </div>
                      ) : !aiAssist ? (
                        <div className="text-center py-8">
                          <Bot className="w-10 h-10 mx-auto mb-3 text-purple-300 dark:text-purple-700" />
                          <p className="text-sm text-slate-500 mb-3">AI Assist analyzes this issue and generates suggestions</p>
                          <Button onClick={loadAiAssist} className="bg-purple-600 hover:bg-purple-700 text-white text-sm h-8 px-4">
                            <Bot className="w-3.5 h-3.5 mr-1.5" />Load AI Suggestions
                          </Button>
                        </div>
                      ) : (
                        <>
                          {/* Thread Summary */}
                          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                              <MessageSquare className="w-3.5 h-3.5" />Thread Summary
                            </p>
                            <p className="text-sm text-slate-700 dark:text-slate-300">{aiAssist.threadSummary}</p>
                          </div>

                          {/* Predicted resolution */}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800 p-3 text-center">
                              <p className="text-xs text-slate-500 mb-1">Predicted Resolution</p>
                              <p className="text-xl font-black text-blue-700 dark:text-blue-400">{aiAssist.predictedResolutionHrs}h</p>
                            </div>
                            <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800 p-3 text-center">
                              <p className="text-xs text-slate-500 mb-1">Estimated Remaining</p>
                              <p className="text-xl font-black text-emerald-700 dark:text-emerald-400">{aiAssist.estimatedRemainingHrs}h</p>
                            </div>
                          </div>

                          {/* Suggested reply */}
                          <div className="bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800 p-4">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs font-semibold text-purple-700 dark:text-purple-400 uppercase tracking-wide flex items-center gap-1.5">
                                <Lightbulb className="w-3.5 h-3.5" />Suggested Reply
                              </p>
                              <div className="flex items-center gap-1.5">
                                <button onClick={() => navigator.clipboard?.writeText(aiAssist.suggestedReply)}
                                  className="p-1 rounded text-purple-500 hover:bg-purple-100 dark:hover:bg-purple-900 transition-colors" title="Copy">
                                  <Copy className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => { setCommentText(aiAssist.suggestedReply); setDetailTab('conversation'); setAiUsed(true); }}
                                  className="flex items-center gap-1 text-xs text-white bg-purple-600 hover:bg-purple-700 px-2.5 py-1 rounded font-semibold transition-colors">
                                  <Send className="w-3 h-3" />Use This
                                </button>
                              </div>
                            </div>
                            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{aiAssist.suggestedReply}</p>
                            {aiUsed && <p className="mt-2 text-xs text-emerald-600 font-medium">Copied to reply box ✓</p>}
                          </div>

                          {/* Similar past issues */}
                          {aiAssist.similarIssues.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                                <ExternalLink className="w-3.5 h-3.5" />Similar Past Issues
                              </p>
                              <div className="space-y-2">
                                {aiAssist.similarIssues.map((s) => (
                                  <button key={s.id} onClick={() => router.push(`/tickets/${s.ticketKey ?? s.id}`)}
                                    className="w-full text-left flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                    <span className="text-xs font-mono text-[#0052CC] dark:text-blue-400 font-bold">{s.ticketKey ?? s.id.slice(0, 8)}</span>
                                    <span className="text-xs text-slate-700 dark:text-slate-300 flex-1 truncate">{s.title}</span>
                                    <span className="text-[10px] text-slate-400">{s.clientName}</span>
                                    <ExternalLink className="w-3 h-3 text-slate-300 flex-shrink-0" />
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {/* Attachments tab */}
                  {detailTab === 'attachments' && (
                    <div className="p-6">
                      <div className="flex flex-col items-center justify-center py-10 text-center">
                        <Paperclip className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-3" />
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No attachments</p>
                        <p className="text-xs text-slate-400 mt-1">Files attached when creating the issue will appear here</p>
                      </div>
                    </div>
                  )}

                  {/* History tab */}
                  {detailTab === 'history' && (
                    <div className="divide-y divide-slate-50 dark:divide-slate-800">
                      {historyLoading ? (
                        <div className="p-6 flex justify-center">
                          <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                        </div>
                      ) : ticketHistory.length === 0 ? (
                        <div className="p-8 text-center">
                          <History className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                          <p className="text-sm text-slate-400">No history recorded yet</p>
                        </div>
                      ) : (
                        ticketHistory.map((entry: any) => (
                          <div key={entry.id} className="px-6 py-3 flex items-start gap-3">
                            <div className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <History className="w-2.5 h-2.5 text-slate-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-slate-700 dark:text-slate-300">
                                <span className="font-medium">{entry.changedBy?.name ?? 'System'}</span>
                                {' changed '}
                                <span className="font-medium">{entry.fieldChanged}</span>
                                {entry.oldValue && entry.newValue && (
                                  <span className="text-slate-500">
                                    {' from '}
                                    <span className="line-through text-xs">{entry.oldValue}</span>
                                    {' to '}
                                    <span className="font-semibold text-[#0052CC] dark:text-blue-400">{entry.newValue}</span>
                                  </span>
                                )}
                              </p>
                              <p className="text-xs text-slate-400 mt-0.5">
                                {new Date(entry.createdAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Right column (1/3): metadata */}
              <div className="space-y-3">

                {/* Status */}
                <div className="bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800 p-4">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Status</p>
                  {is3SCTeam ? (
                    <div>
                      <select
                        value={ticket.status}
                        onChange={(e) => handleUpdateField("status", e.target.value)}
                        disabled={updatingField === "status"}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0052CC] disabled:opacity-50"
                      >
                        <option value="OPEN">Open</option>
                        <option value="ACKNOWLEDGED">Acknowledged</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="RESOLVED">Resolved</option>
                        <option value="CLOSED">Closed</option>
                      </select>
                      {updatingField === "status" && <p className="text-xs text-slate-400 mt-1 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />Updating…</p>}
                    </div>
                  ) : (
                    <StatusLozenge status={ticket.status} />
                  )}
                </div>

                {/* Assignee */}
                <div className="bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800 p-4">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />Assignee
                  </p>
                  {is3SCTeam ? (
                    <div>
                      <select
                        value={ticket.assignedTo?.id || ""}
                        onChange={(e) => handleUpdateField("assignee", e.target.value || null)}
                        disabled={updatingField === "assignee"}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0052CC] disabled:opacity-50"
                      >
                        <option value="">Unassigned</option>
                        {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                      </select>
                      {updatingField === "assignee" && <p className="text-xs text-slate-400 mt-1 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />Updating…</p>}
                    </div>
                  ) : ticket.assignedTo ? (
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#0747A6] text-white flex items-center justify-center text-xs font-bold">
                        {getInitials(ticket.assignedTo.name)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{ticket.assignedTo.name}</p>
                        <p className="text-xs text-slate-500">{ticket.assignedTo.email}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400">Unassigned</p>
                  )}
                </div>

                {/* Reporter */}
                <div className="bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800 p-4">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />Reporter
                  </p>
                  {ticket.raisedBy ? (
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center text-xs font-bold">
                        {getInitials(ticket.raisedBy.name)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{ticket.raisedBy.name}</p>
                        <p className="text-xs text-slate-500">{ticket.raisedBy.email}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400">Unknown</p>
                  )}
                </div>

                {/* Priority */}
                <div className="bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800 p-4">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Priority</p>
                  <PriorityBadge priority={ticket.priority} />
                </div>

                {/* Dates */}
                <div className="bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800 p-4">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />Dates
                  </p>
                  <div className="space-y-2 text-sm">
                    <div>
                      <p className="text-xs text-slate-400 uppercase tracking-wide">Created</p>
                      <p className="text-slate-700 dark:text-slate-300 font-medium">{formatDate(ticket.createdAt)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 uppercase tracking-wide">Updated</p>
                      <p className="text-slate-700 dark:text-slate-300 font-medium">{formatDate(ticket.updatedAt)}</p>
                    </div>
                  </div>
                </div>

                {/* Category */}
                <div className="bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800 p-4">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5" />Category
                  </p>
                  <span className="text-xs px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                    {ticket.category}
                  </span>
                </div>

                {/* Priority override — Lead only */}
                {isLead && (
                  <div className="bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800 p-4">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Override Priority</p>
                    <select
                      value={ticket.priority}
                      onChange={(e) => handleUpdateField('priority', e.target.value)}
                      disabled={updatingField === 'priority'}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0052CC] disabled:opacity-50">
                      <option value="CRITICAL">Critical</option>
                      <option value="HIGH">High</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="LOW">Low</option>
                    </select>
                    {updatingField === 'priority' && <p className="text-xs text-slate-400 mt-1 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />Updating…</p>}
                  </div>
                )}

                {/* Escalation — Lead only */}
                {isLead && (
                  <div className="bg-white dark:bg-slate-900 rounded-md border border-amber-200 dark:border-amber-800 p-4">
                    <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                      <TriangleAlert className="w-3.5 h-3.5" />Escalate Issue
                    </p>
                    {ticket.escalated && (
                      <span className="inline-block mb-2 text-xs bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 px-2 py-0.5 rounded font-semibold">Already escalated</span>
                    )}
                    {escalationSuccess && (
                      <p className="text-xs text-emerald-600 mb-2 font-medium">Escalation recorded successfully.</p>
                    )}
                    <textarea
                      placeholder="Add escalation note (optional)..."
                      value={escalationNote}
                      onChange={(e) => setEscalationNote(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none mb-2"
                    />
                    <button
                      onClick={handleEscalate}
                      disabled={escalating}
                      className="w-full py-1.5 text-xs bg-amber-500 hover:bg-amber-600 text-white rounded font-semibold disabled:opacity-50 flex items-center justify-center gap-1">
                      {escalating ? <Loader2 className="w-3 h-3 animate-spin" /> : <TriangleAlert className="w-3 h-3" />}
                      {escalating ? 'Escalating...' : 'Mark as Escalated'}
                    </button>
                  </div>
                )}

                {/* AI Routing panel — 3SC team + if AI data exists */}
                {is3SCTeam && (ticket.aiCategory || ticket.aiPriority || ticket.aiSuggestedAgent) && (
                  <div className="bg-white dark:bg-slate-900 rounded-md border border-purple-200 dark:border-purple-800 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-semibold text-purple-700 dark:text-purple-400 uppercase tracking-wide flex items-center gap-1.5">
                        <Bot className="w-3.5 h-3.5" />AI Routing
                      </p>
                      {isLead && (
                        <button
                          onClick={() => setAiOverride((v) => !v)}
                          className="text-xs text-purple-600 dark:text-purple-400 hover:underline font-medium">
                          {aiOverride ? 'Cancel' : 'Override'}
                        </button>
                      )}
                    </div>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Category</span>
                        <span className="font-medium text-slate-800 dark:text-slate-200">{ticket.aiCategory ?? '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Priority</span>
                        <span className="font-medium text-slate-800 dark:text-slate-200">{ticket.aiPriority ?? '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Suggested Agent</span>
                        <span className="font-medium text-slate-800 dark:text-slate-200">{ticket.aiSuggestedAgent ?? '—'}</span>
                      </div>
                    </div>
                    {aiOverride && isLead && (
                      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                        <p className="text-xs text-slate-500 mb-1">Override AI decision by updating above fields directly.</p>
                        <select
                          onChange={(e) => handleUpdateField('assignee', e.target.value || null)}
                          defaultValue=""
                          className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:ring-2 focus:ring-purple-400 text-slate-800 dark:text-slate-200">
                          <option value="">Override assignee...</option>
                          {users.filter((u) => ['THREESC_AGENT', 'THREESC_LEAD'].includes(u.role)).map((u) => (
                            <option key={u.id} value={u.id}>{u.name}</option>
                          ))}
                        </select>
                        <select
                          onChange={(e) => { if (e.target.value) handleUpdateField('priority', e.target.value); }}
                          defaultValue=""
                          className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:ring-2 focus:ring-purple-400 text-slate-800 dark:text-slate-200">
                          <option value="">Override priority...</option>
                          <option value="CRITICAL">Critical</option>
                          <option value="HIGH">High</option>
                          <option value="MEDIUM">Medium</option>
                          <option value="LOW">Low</option>
                        </select>
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


