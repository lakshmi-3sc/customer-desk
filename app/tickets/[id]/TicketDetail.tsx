"use client";

import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  ChevronRight,
  Send,
  Loader2,
  User,
  Calendar,
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
  Clock,
  X,
} from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { AppSidebar } from "@/components/app-sidebar";
import { TopBar } from "@/components/top-bar";
import { getSocket } from "@/lib/socket-client";

interface Attachment {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number | null;
  fileType: string | null;
  uploadedBy: string;
  createdAt: string;
}

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
  resolvedAt: string | null;
  raisedBy: { id: string; name: string; email: string };
  assignedTo: { id: string; name: string; email: string } | null;
  project: { id: string; name: string } | null;
  aiCategory: string | null;
  aiPriority: string | null;
  aiSuggestedAgent: string | null;
  aiSummary: string | null;
  conversationSummary: string | null;
  escalated: boolean;
  client?: { id: string; name: string } | null;
  attachments?: Attachment[];
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
  const safeCurrentIdx = Math.max(currentIdx, 0);
  const progressWidth = `${(safeCurrentIdx / (STATUS_STEPS.length - 1)) * 100}%`;

  return (
    <div className="relative w-full py-1">
      <div className="absolute left-0 right-0 top-3 h-px bg-slate-200 dark:bg-slate-700" />
      <div
        className="absolute left-0 top-3 h-px bg-[#0052CC] transition-all"
        style={{ width: progressWidth }}
      />
      <div className="relative flex items-start justify-between">
        {STATUS_STEPS.map((step, idx) => {
          const done = idx < safeCurrentIdx;
          const active = idx === safeCurrentIdx;
          const isClickable = canUpdate && idx !== currentIdx && !updating;
          return (
            <button
              key={step.key}
              onClick={() => isClickable && onStep(step.key)}
              disabled={!isClickable}
              title={canUpdate ? `Move to ${step.label}` : step.label}
              className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded transition-colors ${
                isClickable ? 'cursor-pointer hover:text-[#0052CC]' : 'cursor-default'
              }`}
            >
              <div
                className={`z-10 flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-bold transition-colors ${
                  done
                    ? 'border-[#0052CC] bg-[#0052CC] text-white'
                    : active
                    ? 'border-[#0052CC] bg-white text-[#0052CC] ring-4 ring-blue-50 dark:bg-slate-900 dark:ring-blue-950/40'
                    : 'border-slate-300 bg-white text-slate-400 dark:border-slate-600 dark:bg-slate-900'
                }`}
              >
                {done ? <CheckCircle2 className="h-3 w-3" /> : <span>{idx + 1}</span>}
              </div>
              <span
                className={`w-full truncate text-center text-[10px] font-medium leading-tight ${
                  active
                    ? 'text-[#0052CC] dark:text-blue-400'
                    : done
                    ? 'text-slate-700 dark:text-slate-300'
                    : 'text-slate-400'
                }`}
              >
                {step.label}
              </span>
            </button>
          );
        })}
      </div>
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
  attachments?: Array<{
    id: string;
    fileName: string;
    fileUrl: string;
    fileSize: number | null;
    fileType: string | null;
    createdAt: string;
  }>;
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

function getSlaResponseTarget(priority: string) {
  const map: Record<string, string> = {
    CRITICAL: "1h response",
    HIGH: "4h response",
    MEDIUM: "8h response",
    LOW: "24h response",
  };
  return map[priority?.toUpperCase()] ?? "Response target";
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
    <div className={depth > 0 ? "border-l-2 border-slate-100 dark:border-slate-700 pl-3 sm:pl-4" : ""}>
      <div className="flex gap-3 min-w-0">
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
            className="mt-2 flex items-center gap-1 text-xs text-slate-400 hover:text-[#0052CC] dark:hover:text-blue-400 transition-colors"
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
                <div className="flex-1 min-w-0">
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

interface Props {
  initialTicket: Ticket;
  initialComments: Comment[];
  idOrKey: string; // URL param — used for API calls
}

export default function TicketDetail({ initialTicket, initialComments, idOrKey }: Props) {
  const router = useRouter();
  const { data: session } = useSession();

  // idOrKey is the URL segment (ticketKey or cuid) — API routes resolve it internally
  const ticketId = idOrKey;

  const userRole = session?.user?.role as string | undefined;
  const is3SCTeam =
    userRole && ["THREESC_ADMIN", "THREESC_LEAD", "THREESC_AGENT"].includes(userRole);
  const isLead = userRole === "THREESC_LEAD";

  // ── State seeded from server-fetched props — no loading needed ──
  const [ticket, setTicket] = useState<Ticket>(initialTicket);
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [conversationSummary, setConversationSummary] = useState<string | null>(
    initialTicket.conversationSummary
  );

  const [commentText, setCommentText] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);
  const [replyText, setReplyText] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [users, setUsers] = useState<UserType[]>([]);
  const [mentionableUsers, setMentionableUsers] = useState<UserType[]>([]);
  const [updatingField, setUpdatingField] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<'conversation' | 'internal' | 'attachments' | 'history'>('conversation');
  const [commentAttachments, setCommentAttachments] = useState<File[]>([]);
  const commentFileInputRef = useRef<HTMLInputElement>(null);
  const [ticketHistory, setTicketHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [slaCountdown, setSlaCountdown] = useState<string>('');
  const [mentionSuggestions, setMentionSuggestions] = useState<UserType[]>([]);
  const [showMentions, setShowMentions] = useState(false);

  // Lead-specific state
  const [escalationNote, setEscalationNote] = useState('');
  const [escalating, setEscalating] = useState(false);
  const [escalationSuccess, setEscalationSuccess] = useState(false);

  // Internal notes state
  const [internalText, setInternalText] = useState('');
  const [submittingInternal, setSubmittingInternal] = useState(false);

  const [summaryLoading, setSummaryLoading] = useState(false);
  const [emailNotify, setEmailNotify] = useState(true);

  // Smart routing state
  type AgentRoutingData = {
    id: string; name: string; email: string;
    openCount: number; totalResolved: number; categoryResolved: number;
    expertiseScore: number; workloadScore: number; compositeScore: number;
    expertiseLabel: string; avgResolutionHrs: number | null;
    aiReason: string;
  };
  const [routingAgents, setRoutingAgents] = useState<AgentRoutingData[]>([]);
  const [routingBest, setRoutingBest] = useState<AgentRoutingData | null>(null);
  const [routingLoading, setRoutingLoading] = useState(false);
  const [routingExpanded, setRoutingExpanded] = useState(false);
  const [routingAiSummary, setRoutingAiSummary] = useState('');

  // Resolution prediction state
  type PredictionData = {
    predictedHrs: number | null;
    displayLabel: string | null;
    confidence: string;
    confidenceReason: string;
    breakdown: string;
    inputs: {
      globalAvgHrs: number | null;
      globalSampleSize: number;
      agentAvgHrs: number | null;
      agentOpenCount: number;
      agentCategoryResolved: number;
      workloadPenaltyPct: number;
      adjustedBaseline: number | null;
    };
  };
  const [prediction, setPrediction] = useState<PredictionData | null>(null);
  const [predictionLoading, setPredictionLoading] = useState(false);

  // Similar resolutions state
  type SimilarResolution = {
    id: string;
    ticketKey: string | null;
    title: string;
    category: string;
    priority: string;
    resolvedAt: string | null;
    assignedTo: { name: string } | null;
    similarityScore: number;
    method: string;
    resolutionHints?: string[];
  };
  const [similarResolutions, setSimilarResolutions] = useState<SimilarResolution[]>([]);
  const [similarLoading, setSimilarLoading] = useState(false);

  // Fetch similar resolved tickets
  useEffect(() => {
    if (!ticket || !is3SCTeam) return;
    setSimilarLoading(true);
    fetch(`/api/dashboard/similar-tickets?ticketId=${ticket.id}`)
      .then(r => r.json())
      .then(data => setSimilarResolutions(data.similar ?? []))
      .catch(console.error)
      .finally(() => setSimilarLoading(false));
  }, [ticket?.id, is3SCTeam]);

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

  // Background: secondary data — non-blocking, page already visible
  useEffect(() => {
    if (!ticket?.id) return;
    setHistoryLoading(true);
    Promise.all([
      fetch(`/api/dashboard/activity?issueId=${ticket.id}`).then(r => r.ok ? r.json() : { activity: [] }),
      fetch("/api/dashboard/users").then(r => r.ok ? r.json() : []),
      fetch(`/api/dashboard/tickets/${ticketId}/mentionable-users`).then(r => r.ok ? r.json() : { users: [] }),
    ]).then(([histData, usersData, mentionableData]) => {
      setTicketHistory(histData.activity ?? []);
      setUsers(usersData);
      setMentionableUsers(mentionableData.users ?? []);
    }).catch(console.error).finally(() => setHistoryLoading(false));
  }, [ticket?.id]);

  // Real-time updates via Socket.IO
  useEffect(() => {
    if (!ticket?.id) return;
    const socket = getSocket();
    const roomId = ticket.id;
    const joinRoom = () => socket.emit("join:ticket", roomId);
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

  const handleCommentChange = (text: string) => {
    setCommentText(text);
    const lastAtIndex = text.lastIndexOf('@');
    if (lastAtIndex === -1) { setShowMentions(false); return; }
    const afterAt = text.substring(lastAtIndex + 1);
    if (afterAt.includes(' ')) { setShowMentions(false); return; }
    const query = afterAt.toLowerCase();
    const filtered = mentionableUsers.filter(u => u.name.toLowerCase().includes(query)).slice(0, 5);
    setMentionSuggestions(filtered);
    setShowMentions(filtered.length > 0);
  };

  const insertMention = (userName: string) => {
    const lastAtIndex = commentText.lastIndexOf('@');
    const beforeMention = commentText.substring(0, lastAtIndex);
    setCommentText(beforeMention + '@' + userName + ' ');
    setShowMentions(false);
  };

  const handleCommentFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) setCommentAttachments((prev) => [...prev, ...Array.from(files)]);
    if (commentFileInputRef.current) commentFileInputRef.current.value = '';
  };

  const removeCommentAttachment = (index: number) => {
    setCommentAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() && commentAttachments.length === 0) return;
    setSubmittingComment(true);
    try {
      const response = await fetch(`/api/dashboard/tickets/${ticketId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: commentText,
          attachments: commentAttachments.map((file) => ({
            name: file.name,
            size: file.size,
            type: file.type,
          })),
        }),
      });
      if (!response.ok) throw new Error("Failed to post comment");
      const data = await response.json();
      const comment = data.comment as Comment;
      setComments((prev) => [...prev, { ...comment, replies: [] }]);
      setCommentText("");
      setCommentAttachments([]);
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
        : field === "category" ? { category: value }
        : { status: value };
      const response = await fetch(`/api/dashboard/tickets/${ticketId}/update`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });
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

  // AI smart routing — loads in background after page is visible
  useEffect(() => {
    if (!ticket || !is3SCTeam) return;
    if (['RESOLVED', 'CLOSED'].includes(ticket.status)) return;
    setRoutingLoading(true);
    const params = new URLSearchParams({
      category: ticket.category,
      priority: ticket.priority,
      title: ticket.title,
    });
    fetch(`/api/dashboard/agent-routing?${params}`)
      .then(r => r.json())
      .then(data => {
        setRoutingAgents(data.agents ?? []);
        setRoutingBest(data.best ?? null);
        setRoutingAiSummary(data.aiSummary ?? '');
      })
      .catch(console.error)
      .finally(() => setRoutingLoading(false));
  }, [ticket?.id, is3SCTeam]);

  // Resolution prediction
  useEffect(() => {
    if (!ticket || !is3SCTeam) return;
    setPredictionLoading(true);
    fetch(`/api/dashboard/resolution-prediction?ticketId=${ticket.id}`)
      .then(r => r.json())
      .then(data => setPrediction(data))
      .catch(console.error)
      .finally(() => setPredictionLoading(false));
  }, [ticket?.id, ticket?.assignedTo?.id, is3SCTeam]);

  const loadConversationSummary = async () => {
    if (!ticket || conversationSummary) return;
    setSummaryLoading(true);
    try {
      const res = await fetch(`/api/dashboard/summarize-conversation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId: ticket.id })
      });
      if (res.ok) {
        const data = await res.json();
        setConversationSummary(data.summary);
      }
    } catch (e) {
      console.error('Failed to generate summary:', e);
    } finally {
      setSummaryLoading(false);
    }
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("en-GB", {
      day: "numeric", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });

  const getInitials = (name: string) =>
    name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="fixed inset-0 flex overflow-hidden">
      <AppSidebar />

        <div className="min-w-0 flex-1 flex flex-col overflow-hidden bg-[#F4F5F7] dark:bg-slate-950">
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
        <div className="min-w-0 flex-1 overflow-hidden">
          <div className="h-full min-w-0 flex gap-6 px-6 py-6 overflow-hidden">

              {/* Left column: ticket header + description + activity */}
              <div className="flex-[2] min-w-0 overflow-y-auto overflow-x-hidden pr-1">

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
                  {(ticket.slaBreached || ticket.slaBreachRisk || ticket.slaDueAt) && (
                    <div className={`mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border px-3 py-2 text-xs ${
                      ticket.slaBreached
                        ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/20 dark:text-red-300'
                        : ticket.slaBreachRisk
                        ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-300'
                        : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/20 dark:text-emerald-300'
                    }`}>
                      <span className="inline-flex items-center gap-1.5 font-semibold">
                        <ShieldAlert className="h-3.5 w-3.5" />
                        SLA:
                      </span>
                      <span>{slaCountdown || (ticket.slaBreached ? "Breached" : "Tracking")}</span>
                      <span className="text-slate-300 dark:text-slate-600">|</span>
                      <span>{getSlaResponseTarget(ticket.priority)}</span>
                      <span className="text-slate-300 dark:text-slate-600">|</span>
                      <span className="font-semibold">
                        {ticket.slaBreached ? "Breached" : ticket.slaBreachRisk ? "At risk" : "Healthy"}
                      </span>
                    </div>
                  )}
                </div>

                {/* Description */}
                <div className="bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800 p-6">
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wide mb-3">Description</h2>
                  <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {ticket.description || <span className="text-slate-400 italic">No description provided</span>}
                  </p>
                </div>

                {/* Activity / Comments — tabbed */}
                <div className="min-w-0 overflow-hidden bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800 flex flex-col">
                  {/* Tab switcher */}
                  <div className="flex border-b border-slate-200 dark:border-slate-800 px-4 pt-1 overflow-x-auto">
                    {([
                      { key: 'conversation', label: 'Conversation', icon: MessageSquare },
                      ...(is3SCTeam ? [{ key: 'internal', label: 'Internal Notes', icon: Lock }] : []),
                      { key: 'attachments', label: 'Attachments', icon: Paperclip },
                      { key: 'history', label: 'History', icon: History },
                    ] as const).map(({ key, label, icon: Icon }) => (
                      <button
                        key={key}
                        onClick={() => { setDetailTab(key as typeof detailTab); }}
                        className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                          detailTab === key
                            ? key === 'internal' ? 'border-amber-500 text-amber-700 dark:text-amber-400 dark:border-amber-500'
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
                    <div className="min-w-0 overflow-hidden p-6 space-y-4">
                      {comments.filter((c) => !c.isInternal).length > 0 && (
                        <div className="flex justify-end">
                          <button
                            onClick={loadConversationSummary}
                            disabled={summaryLoading || conversationSummary !== null}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                          {summaryLoading ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin text-purple-600 dark:text-purple-400" />
                              <span className="text-sm font-medium text-purple-700 dark:text-purple-400">Generating summary...</span>
                            </>
                          ) : conversationSummary ? (
                            <>
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                              <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Summary generated</span>
                            </>
                          ) : (
                            <>
                              <Bot className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                              <span className="text-sm font-medium text-purple-700 dark:text-purple-400">Summarize with AI</span>
                            </>
                          )}
                          </button>
                        </div>
                      )}

                      {conversationSummary && (
                        <div className="p-5 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/20 rounded-lg border border-purple-200 dark:border-purple-800 shadow-sm">
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-purple-100 dark:bg-purple-900/40 rounded-lg flex-shrink-0">
                              <Lightbulb className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wide mb-3">
                                AI Summary
                              </p>
                              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap break-words">
                                {conversationSummary
                                  .replace(/\*\*/g, '')
                                  .replace(/\*/g, '')
                                  .replace(/#+\s/g, '')
                                  .trim()}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {comments.filter((c) => !c.isInternal).length > 0 && (
                        <div className="min-w-0 space-y-5 mb-6 overflow-hidden">
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
                      <div className="flex min-w-0 gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {session?.user?.name ? getInitials(session.user.name) : "?"}
                        </div>
                        <form onSubmit={handleAddComment} className="min-w-0 flex-1 space-y-2">
                          <Label htmlFor="comment" className="sr-only">Add a comment</Label>
                          <div className="relative">
                            <textarea
                              id="comment"
                              placeholder={is3SCTeam ? "Reply to customer... (type @ to mention)" : "Add a comment..."}
                              value={commentText}
                              onChange={(e) => handleCommentChange(e.target.value)}
                              rows={3}
                              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0052CC] focus:border-[#0052CC] resize-none"
                            />
                            <input
                              type="file"
                              multiple
                              ref={commentFileInputRef}
                              onChange={handleCommentFileSelect}
                              className="hidden"
                            />
                            {showMentions && mentionSuggestions.length > 0 && (
                              <div className="absolute bottom-full left-0 mb-1 w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md shadow-lg z-10">
                                {mentionSuggestions.map((user) => (
                                  <button
                                    key={user.id}
                                    type="button"
                                    onClick={() => insertMention(user.name)}
                                    className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2"
                                  >
                                    <div className="w-5 h-5 rounded-full bg-slate-300 dark:bg-slate-600 text-slate-700 dark:text-slate-300 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                                      {user.name.substring(0, 2).toUpperCase()}
                                    </div>
                                    <span>{user.name}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          {commentAttachments.length > 0 && (
                            <div className="min-w-0 space-y-2 overflow-hidden bg-slate-50 dark:bg-slate-800/50 p-3 rounded-md border border-slate-200 dark:border-slate-700">
                              {commentAttachments.map((file, idx) => (
                                <div key={idx} className="flex min-w-0 items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                                  <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                                  <span className="min-w-0 flex-1 truncate">{file.name}</span>
                                  <span className="text-xs text-slate-500">({(file.size / 1024).toFixed(1)} KB)</span>
                                  <button
                                    type="button"
                                    onClick={() => removeCommentAttachment(idx)}
                                    className="p-0.5 text-slate-400 hover:text-red-600 transition-colors"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                title="Attach file"
                                onClick={() => commentFileInputRef.current?.click()}
                                className="p-1.5 rounded text-slate-400 hover:text-[#0052CC] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                <Paperclip className="w-3.5 h-3.5" />
                              </button>
                              <button type="button" title="Mention someone"
                                onClick={() => handleCommentChange(commentText + '@')}
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

                  {/* Attachments tab */}
                  {detailTab === 'attachments' && (
                    <div className="p-6">
                      {!ticket?.attachments || ticket.attachments.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-center">
                          <Paperclip className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-3" />
                          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No attachments</p>
                          <p className="text-xs text-slate-400 mt-1">Files attached when creating the issue will appear here</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {ticket.attachments.map((att) => (
                            <div key={att.id} className="flex items-center gap-3 p-3 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                              <Paperclip className="w-4 h-4 text-slate-400" />
                              <div className="flex-1 min-w-0">
                                <a
                                  href={att.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm font-medium text-[#0052CC] dark:text-blue-400 hover:underline block truncate"
                                  title={att.fileName}
                                >
                                  {att.fileName}
                                </a>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                  {att.fileSize ? `${(att.fileSize / 1024).toFixed(1)} KB` : 'Unknown size'} • {new Date(att.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                              <ExternalLink className="w-4 h-4 text-slate-400 flex-shrink-0" />
                            </div>
                          ))}
                        </div>
                      )}
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

              {/* Right column: metadata sidebar */}
              <div className="w-80 flex-shrink-0 overflow-y-auto overflow-x-hidden space-y-3 pb-6">

                {/* Top info card: Status, Assignee, Dates, Reporter */}
                <div className="bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800 p-4 space-y-4">
                  {/* Status */}
                  <div>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Status</p>
                    {is3SCTeam ? (
                      <select value={ticket.status} onChange={(e) => handleUpdateField("status", e.target.value)} disabled={updatingField === "status"} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0052CC] disabled:opacity-50">
                        <option value="OPEN">Open</option>
                        <option value="ACKNOWLEDGED">Acknowledged</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="RESOLVED">Resolved</option>
                        <option value="CLOSED">Closed</option>
                      </select>
                    ) : (
                      <StatusLozenge status={ticket.status} />
                    )}
                  </div>

                  <div className="border-t border-slate-100 dark:border-slate-800" />

                  {/* Assignee */}
                  <div>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1.5"><User className="w-3.5 h-3.5" />Assignee</p>
                    {is3SCTeam ? (
                      <select value={ticket.assignedTo?.id || ""} onChange={(e) => handleUpdateField("assignee", e.target.value || null)} disabled={updatingField === "assignee"} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0052CC] disabled:opacity-50">
                        <option value="">Unassigned</option>
                        {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                      </select>
                    ) : ticket.assignedTo ? (
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[#0747A6] text-white flex items-center justify-center text-xs font-bold flex-shrink-0">{getInitials(ticket.assignedTo.name)}</div>
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{ticket.assignedTo.name}</p>
                      </div>
                    ) : <p className="text-sm text-slate-400">Unassigned</p>}
                  </div>

                  <div className="border-t border-slate-100 dark:border-slate-800" />

                  {/* Dates */}
                  <div className="space-y-2 text-xs">
                    <div><p className="text-slate-500 dark:text-slate-400 font-medium">Created</p><p className="text-slate-700 dark:text-slate-300">{formatDate(ticket.createdAt)}</p></div>
                    <div><p className="text-slate-500 dark:text-slate-400 font-medium">Updated</p><p className="text-slate-700 dark:text-slate-300">{formatDate(ticket.updatedAt)}</p></div>
                  </div>

                  <div className="border-t border-slate-100 dark:border-slate-800" />

                  {/* Reporter */}
                  <div>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Reporter</p>
                    {ticket.raisedBy ? (
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center text-xs font-bold flex-shrink-0">{getInitials(ticket.raisedBy.name)}</div>
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{ticket.raisedBy.name}</p>
                      </div>
                    ) : <p className="text-sm text-slate-400">Unknown</p>}
                  </div>
                </div>

                {/* Priority & Category card */}
                <div className="bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800 p-4 space-y-4">
                  {/* Priority */}
                  <div>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Priority</p>
                    {is3SCTeam ? (
                      <select value={ticket.priority} onChange={(e) => handleUpdateField('priority', e.target.value)} disabled={updatingField === 'priority'} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0052CC] disabled:opacity-50">
                        <option value="CRITICAL">Critical</option>
                        <option value="HIGH">High</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="LOW">Low</option>
                      </select>
                    ) : <PriorityBadge priority={ticket.priority} />}
                    {is3SCTeam && ticket.aiPriority && ticket.aiPriority !== ticket.priority && (
                      <div className="mt-2 rounded-md border border-blue-100 bg-blue-50/70 px-2.5 py-2 text-xs dark:border-blue-900/50 dark:bg-blue-950/20">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-slate-600 dark:text-slate-300">
                            AI suggests <span className="font-semibold text-[#0052CC] dark:text-blue-300">{ticket.aiPriority}</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateField('priority', ticket.aiPriority!)}
                            disabled={updatingField === 'priority'}
                            className="text-[11px] font-semibold text-[#0052CC] hover:underline disabled:opacity-50"
                          >
                            Apply
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-slate-100 dark:border-slate-800" />

                  {/* Category */}
                  <div>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Category</p>
                    {is3SCTeam ? (
                      <select value={ticket.category} onChange={(e) => handleUpdateField('category', e.target.value)} disabled={updatingField === 'category'} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0052CC] disabled:opacity-50">
                        <option value="FEATURE_REQUEST">Feature Request</option>
                        <option value="BUG">Bug</option>
                        <option value="DATA_ACCURACY">Data Accuracy</option>
                        <option value="PERFORMANCE">Performance</option>
                        <option value="ACCESS_SECURITY">Access/Security</option>
                      </select>
                    ) : (
                      <span className="inline-block text-xs px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">{ticket.category.replace(/_/g, ' ')}</span>
                    )}
                    {is3SCTeam && ticket.aiCategory && ticket.aiCategory !== ticket.category && (
                      <div className="mt-2 rounded-md border border-blue-100 bg-blue-50/70 px-2.5 py-2 text-xs dark:border-blue-900/50 dark:bg-blue-950/20">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-slate-600 dark:text-slate-300">
                            AI suggests <span className="font-semibold text-[#0052CC] dark:text-blue-300">{ticket.aiCategory.replace(/_/g, ' ')}</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateField('category', ticket.aiCategory!)}
                            disabled={updatingField === 'category'}
                            className="text-[11px] font-semibold text-[#0052CC] hover:underline disabled:opacity-50"
                          >
                            Apply
                          </button>
                        </div>
                        {ticket.aiSummary && (
                          <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-slate-500 dark:text-slate-400">{ticket.aiSummary}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Smart Assign — 3SC team only, only for active tickets */}
                {is3SCTeam && !['RESOLVED', 'CLOSED'].includes(ticket.status) && (
                  <div className="bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-[#0052CC] flex items-center justify-center">
                          <User className="w-3.5 h-3.5 text-white" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">Smart Assign</p>
                          <p className="text-[10px] text-slate-400">AI-powered by expertise &amp; workload</p>
                        </div>
                      </div>
                      {routingAgents.length > 1 && (
                        <button onClick={() => setRoutingExpanded(v => !v)} className="text-[10px] text-[#0052CC] dark:text-blue-400 font-medium hover:underline">
                          {routingExpanded ? 'Show less' : `All ${routingAgents.length} agents`}
                        </button>
                      )}
                    </div>

                    <div className="p-4">
                      {routingLoading ? (
                        <div className="flex items-center gap-2 py-2">
                          <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                          <span className="text-xs text-slate-400">AI analysing expertise &amp; workload…</span>
                        </div>
                      ) : routingBest ? (
                        <div className="space-y-3">
                          {routingAiSummary && (
                            <div className="flex items-start gap-1.5 bg-blue-50 dark:bg-blue-950/30 rounded-md px-3 py-2">
                              <Bot className="w-3.5 h-3.5 text-[#0052CC] dark:text-blue-400 flex-shrink-0 mt-0.5" />
                              <p className="text-[10px] text-slate-600 dark:text-slate-300 leading-snug">{routingAiSummary}</p>
                            </div>
                          )}

                          <div className="rounded-lg border-2 border-[#0052CC]/20 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-8 h-8 rounded-full bg-[#0747A6] text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                                {getInitials(routingBest.name)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{routingBest.name}</p>
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#0052CC] text-white uppercase tracking-wide flex-shrink-0">Best Match</span>
                                </div>
                                <p className="text-[10px] text-slate-500 truncate">{routingBest.email}</p>
                              </div>
                            </div>

                            {routingBest.aiReason && (
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 italic mb-2 leading-snug">"{routingBest.aiReason}"</p>
                            )}

                            <div className="grid grid-cols-2 gap-2 mb-3">
                              <div className="bg-white dark:bg-slate-800 rounded p-2 text-center">
                                <p className="text-base font-bold text-[#0052CC] dark:text-blue-400">{routingBest.categoryResolved}</p>
                                <p className="text-[10px] text-slate-500 leading-tight">{ticket?.category?.replace(/_/g, ' ')} resolved</p>
                              </div>
                              <div className="bg-white dark:bg-slate-800 rounded p-2 text-center">
                                <p className={`text-base font-bold ${routingBest.openCount <= 3 ? 'text-emerald-600' : routingBest.openCount <= 6 ? 'text-amber-500' : 'text-red-500'}`}>
                                  {routingBest.openCount}
                                </p>
                                <p className="text-[10px] text-slate-500 leading-tight">open tickets</p>
                              </div>
                            </div>

                            <div className="flex items-center justify-between mb-3">
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                routingBest.expertiseLabel === 'Expert' ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300' :
                                routingBest.expertiseLabel === 'Experienced' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300' :
                                routingBest.expertiseLabel === 'Familiar' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' :
                                'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                              }`}>
                                {routingBest.expertiseLabel}
                              </span>
                              {routingBest.avgResolutionHrs !== null && (
                                <span className="text-[10px] text-slate-400">~{routingBest.avgResolutionHrs}h avg resolve</span>
                              )}
                            </div>

                            <button
                              onClick={() => handleUpdateField('assignee', routingBest.id)}
                              disabled={updatingField === 'assignee' || ticket?.assignedTo?.id === routingBest.id}
                              className={`w-full py-2 text-xs font-semibold rounded-md transition-colors flex items-center justify-center gap-1.5 ${
                                ticket?.assignedTo?.id === routingBest.id
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 cursor-default'
                                  : 'bg-[#0052CC] hover:bg-[#0747A6] text-white disabled:opacity-50'
                              }`}
                            >
                              {updatingField === 'assignee' ? (
                                <><Loader2 className="w-3 h-3 animate-spin" />Assigning…</>
                              ) : ticket?.assignedTo?.id === routingBest.id ? (
                                <>✓ Currently Assigned</>
                              ) : (
                                <>Assign to {routingBest.name.split(' ')[0]}</>
                              )}
                            </button>
                          </div>

                          {routingExpanded && routingAgents.slice(1).map((agent) => (
                            <div key={agent.id} className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 flex items-start gap-3">
                              <div className="w-7 h-7 rounded-full bg-slate-300 dark:bg-slate-600 text-slate-700 dark:text-slate-200 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                                {getInitials(agent.name)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 mb-0.5">
                                  <p className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate">{agent.name}</p>
                                  <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                                    agent.expertiseLabel === 'Expert' ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300' :
                                    agent.expertiseLabel === 'Experienced' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300' :
                                    agent.expertiseLabel === 'Familiar' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' :
                                    'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                  }`}>{agent.expertiseLabel}</span>
                                </div>
                                {agent.aiReason && (
                                  <p className="text-[10px] text-slate-400 italic mb-1 leading-snug">"{agent.aiReason}"</p>
                                )}
                                <span className="text-[10px] text-slate-500">{agent.categoryResolved} resolved · {agent.openCount} open</span>
                                <div className="w-full h-1 bg-slate-100 dark:bg-slate-700 rounded-full mt-1.5">
                                  <div
                                    className={`h-1 rounded-full transition-all ${agent.openCount <= 3 ? 'bg-emerald-400' : agent.openCount <= 6 ? 'bg-amber-400' : 'bg-red-400'}`}
                                    style={{ width: `${Math.min(100, (agent.openCount / 10) * 100)}%` }}
                                  />
                                </div>
                              </div>
                              <button
                                onClick={() => handleUpdateField('assignee', agent.id)}
                                disabled={updatingField === 'assignee' || ticket?.assignedTo?.id === agent.id}
                                className={`text-xs px-2.5 py-1 rounded font-medium flex-shrink-0 transition-colors ${
                                  ticket?.assignedTo?.id === agent.id
                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                    : 'bg-slate-100 hover:bg-[#0052CC] hover:text-white dark:bg-slate-700 dark:hover:bg-blue-700 text-slate-700 dark:text-slate-300'
                                }`}
                              >
                                {ticket?.assignedTo?.id === agent.id ? '✓' : 'Assign'}
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 py-2 text-center">No agents available</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Resolution Time Prediction — 3SC team only */}
                {is3SCTeam && (
                  <div className="bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-emerald-600 flex items-center justify-center">
                        <Clock className="w-3.5 h-3.5 text-white" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">Resolution Prediction</p>
                        <p className="text-[10px] text-slate-400">AI + historical data</p>
                      </div>
                    </div>

                    <div className="p-4">
                      {predictionLoading ? (
                        <div className="flex items-center gap-2 py-1">
                          <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                          <span className="text-xs text-slate-400">Calculating…</span>
                        </div>
                      ) : prediction?.displayLabel ? (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{prediction.displayLabel}</p>
                              <p className="text-[10px] text-slate-400 mt-0.5">estimated resolution time</p>
                            </div>
                            <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${
                              prediction.confidence === 'High' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' :
                              prediction.confidence === 'Medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' :
                              'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                            }`}>
                              {prediction.confidence} confidence
                            </span>
                          </div>

                          <div className="bg-slate-50 dark:bg-slate-800 rounded-md p-2.5 space-y-1.5">
                            <div className="flex justify-between text-[10px]">
                              <span className="text-slate-500">Global avg ({prediction.inputs.globalSampleSize} tickets)</span>
                              <span className="font-medium text-slate-700 dark:text-slate-300">
                                {prediction.inputs.globalAvgHrs !== null ? `${prediction.inputs.globalAvgHrs}h` : 'N/A'}
                              </span>
                            </div>
                            <div className="flex justify-between text-[10px]">
                              <span className="text-slate-500">Agent personal avg</span>
                              <span className="font-medium text-slate-700 dark:text-slate-300">
                                {prediction.inputs.agentAvgHrs !== null ? `${prediction.inputs.agentAvgHrs}h` : 'No history'}
                              </span>
                            </div>
                            {prediction.inputs.workloadPenaltyPct > 0 && (
                              <div className="flex justify-between text-[10px]">
                                <span className="text-amber-600 dark:text-amber-400">Workload penalty</span>
                                <span className="font-medium text-amber-600 dark:text-amber-400">+{prediction.inputs.workloadPenaltyPct}%</span>
                              </div>
                            )}
                            <div className="border-t border-slate-200 dark:border-slate-700 pt-1 flex justify-between text-[10px]">
                              <span className="text-slate-500 font-semibold">Adjusted baseline</span>
                              <span className="font-bold text-slate-800 dark:text-slate-200">
                                {prediction.inputs.adjustedBaseline !== null ? `${prediction.inputs.adjustedBaseline}h` : 'N/A'}
                              </span>
                            </div>
                          </div>

                          <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug italic">
                            "{prediction.breakdown}"
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 py-1 text-center">Not enough data to predict</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Similar Resolved Tickets — 3SC team only */}
                {is3SCTeam && (
                  <div className="bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center">
                        <Lightbulb className="w-3.5 h-3.5 text-white" />
                      </div>
                      <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">Similar Resolved</p>
                    </div>

                    <div className="p-3">
                      {similarLoading ? (
                        <div className="flex items-center gap-2 py-1">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
                          <span className="text-[10px] text-slate-400">Searching…</span>
                        </div>
                      ) : similarResolutions.length > 0 ? (
                        <div className="space-y-2">
                          {similarResolutions.map((sim) => (
                            <div key={sim.id} className="p-2 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 space-y-2">
                              <button
                                onClick={() => router.push(`/tickets/${sim.ticketKey ?? sim.id}`)}
                                className="w-full text-left group"
                              >
                                <div className="flex items-start justify-between gap-2 mb-1">
                                  <p className="text-[10px] font-medium text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 line-clamp-2 flex-1">
                                    {sim.title}
                                  </p>
                                  <span className="text-[9px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 px-1.5 py-0.5 rounded flex-shrink-0">
                                    {sim.similarityScore}%
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 text-[9px] text-slate-500">
                                  <span className="inline-block px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">
                                    {sim.category.replace(/_/g, " ")}
                                  </span>
                                  <span>•</span>
                                  <span>{sim.priority}</span>
                                </div>
                              </button>
                              {sim.resolutionHints && sim.resolutionHints.length > 0 && (
                                <div className="pt-1 border-t border-slate-200 dark:border-slate-700">
                                  <p className="text-[9px] font-semibold text-slate-700 dark:text-slate-300 mb-1">How it was resolved:</p>
                                  <p className="text-[9px] text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed">
                                    {sim.resolutionHints[0]}
                                  </p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[10px] text-slate-400 py-2 text-center">No similar resolved tickets</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Escalation — Lead only */}
                {isLead && (
                  <div className="bg-white dark:bg-slate-900 rounded-md border border-amber-200 dark:border-amber-800 p-4">
                    <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-2 flex items-center gap-1.5"><TriangleAlert className="w-3.5 h-3.5" />Escalate Issue</p>
                    {ticket.escalated && <span className="inline-block mb-2 text-xs bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 px-2 py-0.5 rounded font-semibold">Already escalated</span>}
                    {escalationSuccess && <p className="text-xs text-emerald-600 mb-2 font-medium">Escalation recorded successfully.</p>}
                    <textarea placeholder="Add escalation note (optional)..." value={escalationNote} onChange={(e) => setEscalationNote(e.target.value)} rows={2} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none mb-2" />
                    <button onClick={handleEscalate} disabled={escalating} className="w-full py-1.5 text-xs bg-amber-500 hover:bg-amber-600 text-white rounded font-semibold disabled:opacity-50 flex items-center justify-center gap-1">
                      {escalating ? <Loader2 className="w-3 h-3 animate-spin" /> : <TriangleAlert className="w-3 h-3" />}
                      {escalating ? 'Escalating...' : 'Mark as Escalated'}
                    </button>
                  </div>
                )}

              </div>
          </div>
        </div>
      </div>
    </div>
  );
}
