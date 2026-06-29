"use client";

import { useEffect, useState } from "react";
import { api } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

interface Overview {
  period_days: number;
  total_calls: number;
  total_cost: number;
  total_input_tokens: number;
  total_output_tokens: number;
  avg_latency_ms: number;
  error_count: number;
  error_rate: number;
}

interface ModelRow {
  model: string; provider: string; calls: number; cost: number;
  input_tokens: number; output_tokens: number; avg_latency_ms: number;
}

interface TypeRow {
  call_type: string; calls: number; cost: number; avg_latency_ms: number; errors: number;
}

interface DailyRow {
  day: string; calls: number; cost: number; tokens: number; errors: number;
}

interface UserRow {
  user_id: number; name: string; email: string; calls: number; cost: number; total_tokens: number;
}

interface ToolRow {
  tool_name: string; endpoint: string; calls: number; cost: number;
  avg_latency_ms: number; errors: number; avg_input_tokens: number; avg_output_tokens: number;
}

interface TraceRow {
  trace_id: string; started_at: string; call_count: number; total_cost: number;
  total_input: number; total_output: number; max_latency_ms: number; errors: number;
  call_type: string; user_id: number; user_name: string | null;
}

interface RecentCall {
  id: number; created_at: string; call_type: string; model: string; provider: string;
  endpoint: string; tool_name: string; input_tokens: number; output_tokens: number;
  total_cost: number; latency_ms: number; status: string; error_message: string | null;
  input_preview: string | null; output_preview: string | null;
  user_id: number; user_name: string; user_email: string; trace_id: string | null;
  conversation_id: number | null;
}

const PERIOD_OPTIONS = [
  { label: "7 ngày", value: 7 },
  { label: "14 ngày", value: 14 },
  { label: "30 ngày", value: 30 },
];

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}

function fmtCost(n: number): string {
  if (n < 0.01) return "$" + n.toFixed(4);
  return "$" + n.toFixed(2);
}

export default function AIOrchestrationPage() {
  const [days, setDays] = useState(7);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [models, setModels] = useState<ModelRow[]>([]);
  const [types, setTypes] = useState<TypeRow[]>([]);
  const [daily, setDaily] = useState<DailyRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [tools, setTools] = useState<ToolRow[]>([]);
  const [traces, setTraces] = useState<TraceRow[]>([]);
  const [recent, setRecent] = useState<RecentCall[]>([]);
  const [tab, setTab] = useState<"overview" | "calls" | "traces">("overview");
  const [loading, setLoading] = useState(true);
  const [callFilter, setCallFilter] = useState<string>("");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get<Overview>(`/admin/ai-orchestration/overview?days=${days}`),
      api.get<ModelRow[]>(`/admin/ai-orchestration/by-model?days=${days}`),
      api.get<TypeRow[]>(`/admin/ai-orchestration/by-type?days=${days}`),
      api.get<DailyRow[]>(`/admin/ai-orchestration/daily-trend?days=${days}`),
      api.get<UserRow[]>(`/admin/ai-orchestration/by-user?days=${days}`),
      api.get<ToolRow[]>(`/admin/ai-orchestration/by-tool?days=${days}`),
      api.get<TraceRow[]>(`/admin/ai-orchestration/traces?limit=30`),
    ]).then(([o, m, t, d, u, tl, tr]) => {
      setOverview(o); setModels(m); setTypes(t); setDaily(d); setUsers(u); setTools(tl); setTraces(tr);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [days]);

  useEffect(() => {
    const params = callFilter ? `&call_type=${callFilter}` : "";
    api.get<RecentCall[]>(`/admin/ai-orchestration/recent-calls?limit=50${params}`)
      .then(setRecent).catch(() => {});
  }, [callFilter]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
        <Skeleton className="h-72" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">AI Orchestration</h1>
          <p className="text-sm text-muted-foreground">Token usage, cost tracking, latency monitoring & error analysis</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border overflow-hidden">
            {PERIOD_OPTIONS.map((p) => (
              <button
                key={p.value}
                onClick={() => setDays(p.value)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${days === p.value ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-accent"}`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button onClick={() => setTab("overview")} className={`px-3 py-1.5 text-xs font-medium transition-colors ${tab === "overview" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-accent"}`}>Tổng quan</button>
            <button onClick={() => setTab("traces")} className={`px-3 py-1.5 text-xs font-medium transition-colors ${tab === "traces" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-accent"}`}>Traces</button>
            <button onClick={() => setTab("calls")} className={`px-3 py-1.5 text-xs font-medium transition-colors ${tab === "calls" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-accent"}`}>Chi tiết Calls</button>
          </div>
        </div>
      </div>

      {tab === "overview" ? (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card><CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Total AI Calls</p>
              <p className="text-2xl font-bold text-foreground">{fmt(overview?.total_calls ?? 0)}</p>
            </CardContent></Card>
            <Card><CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Total Cost</p>
              <p className="text-2xl font-bold text-green-500">{fmtCost(overview?.total_cost ?? 0)}</p>
            </CardContent></Card>
            <Card><CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Avg Latency</p>
              <p className="text-2xl font-bold text-blue-500">{fmt(overview?.avg_latency_ms ?? 0)}ms</p>
            </CardContent></Card>
            <Card><CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Error Rate</p>
              <p className={`text-2xl font-bold ${(overview?.error_rate ?? 0) > 5 ? "text-red-500" : "text-emerald-500"}`}>{overview?.error_rate ?? 0}%</p>
              <p className="text-xs text-muted-foreground">{overview?.error_count ?? 0} errors</p>
            </CardContent></Card>
          </div>

          {/* Token Summary */}
          <div className="grid grid-cols-2 gap-4">
            <Card><CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Input Tokens</p>
              <p className="text-xl font-bold text-foreground">{fmt(overview?.total_input_tokens ?? 0)}</p>
            </CardContent></Card>
            <Card><CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Output Tokens</p>
              <p className="text-xl font-bold text-foreground">{fmt(overview?.total_output_tokens ?? 0)}</p>
            </CardContent></Card>
          </div>

          {/* Daily Trend Chart */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Daily Trend</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={daily}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                  <Area type="monotone" dataKey="calls" stroke="#FACC15" fill="#FACC15" fillOpacity={0.15} name="Calls" />
                  <Area type="monotone" dataKey="errors" stroke="#ef4444" fill="#ef4444" fillOpacity={0.1} name="Errors" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* By Model */}
            <Card>
              <CardHeader><CardTitle className="text-sm">By Model</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {models.length === 0 && <p className="text-xs text-muted-foreground">No data yet</p>}
                  {models.map((m) => (
                    <div key={m.model} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                      <div>
                        <p className="text-xs font-semibold text-foreground">{m.model}</p>
                        <p className="text-[10px] text-muted-foreground">{m.provider} &middot; {m.calls} calls &middot; {m.avg_latency_ms}ms avg</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-green-500">{fmtCost(m.cost)}</p>
                        <p className="text-[10px] text-muted-foreground">{fmt(m.input_tokens + m.output_tokens)} tokens</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* By Type */}
            <Card>
              <CardHeader><CardTitle className="text-sm">By Call Type</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {types.length === 0 && <p className="text-xs text-muted-foreground">No data yet</p>}
                  {types.map((t) => (
                    <div key={t.call_type} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                      <div>
                        <p className="text-xs font-semibold text-foreground capitalize">{t.call_type}</p>
                        <p className="text-[10px] text-muted-foreground">{t.calls} calls &middot; {t.avg_latency_ms}ms avg</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-green-500">{fmtCost(t.cost)}</p>
                        {t.errors > 0 && <p className="text-[10px] text-red-400">{t.errors} errors</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* By Tool */}
          {tools.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Theo Tool / Endpoint</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border text-left text-muted-foreground">
                        <th className="pb-2 font-medium">Tool</th>
                        <th className="pb-2 font-medium">Endpoint</th>
                        <th className="pb-2 font-medium">Lượt gọi</th>
                        <th className="pb-2 font-medium">Chi phí</th>
                        <th className="pb-2 font-medium">Avg Latency</th>
                        <th className="pb-2 font-medium">Avg Tokens (in/out)</th>
                        <th className="pb-2 font-medium">Lỗi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tools.map((t) => (
                        <tr key={t.tool_name} className="border-b border-border/50">
                          <td className="py-2 font-medium text-foreground">{t.tool_name}</td>
                          <td className="py-2 font-mono text-muted-foreground">{t.endpoint || "-"}</td>
                          <td className="py-2">{t.calls}</td>
                          <td className="py-2 text-green-500">{fmtCost(t.cost)}</td>
                          <td className="py-2">{t.avg_latency_ms}ms</td>
                          <td className="py-2">
                            <span className="text-cyan-400">{fmt(t.avg_input_tokens)}</span>
                            <span className="text-muted-foreground mx-0.5">/</span>
                            <span className="text-amber-400">{fmt(t.avg_output_tokens)}</span>
                          </td>
                          <td className="py-2">{t.errors > 0 ? <span className="text-red-400">{t.errors}</span> : <span className="text-muted-foreground">0</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Top Users */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Top Users by AI Usage</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="pb-2 font-medium">User</th>
                      <th className="pb-2 font-medium">Calls</th>
                      <th className="pb-2 font-medium">Cost</th>
                      <th className="pb-2 font-medium">Tokens</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.user_id} className="border-b border-border/50">
                        <td className="py-2">
                          <p className="font-medium text-foreground">{u.name}</p>
                          <p className="text-[10px] text-muted-foreground">{u.email}</p>
                        </td>
                        <td className="py-2">{u.calls}</td>
                        <td className="py-2 text-green-500">{fmtCost(u.cost)}</td>
                        <td className="py-2">{fmt(u.total_tokens)}</td>
                      </tr>
                    ))}
                    {users.length === 0 && <tr><td colSpan={4} className="py-4 text-center text-muted-foreground">No data yet</td></tr>}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      ) : tab === "traces" ? (
        /* Traces Tab */
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Recent Traces</CardTitle>
            <p className="text-xs text-muted-foreground">Mỗi trace tương ứng 1 request (chat, lab, generate) — bao gồm nhiều LLM calls bên trong</p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="pb-2 font-medium">Trace ID</th>
                    <th className="pb-2 font-medium">Thời gian</th>
                    <th className="pb-2 font-medium">Loại</th>
                    <th className="pb-2 font-medium">User</th>
                    <th className="pb-2 font-medium">Số calls</th>
                    <th className="pb-2 font-medium">Tokens (in/out)</th>
                    <th className="pb-2 font-medium">Chi phí</th>
                    <th className="pb-2 font-medium">Max Latency</th>
                    <th className="pb-2 font-medium">Lỗi</th>
                  </tr>
                </thead>
                <tbody>
                  {traces.map((t) => (
                    <tr key={t.trace_id} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                      <td className="py-2 font-mono text-[10px] text-muted-foreground" title={t.trace_id}>{t.trace_id.slice(0, 12)}...</td>
                      <td className="py-2 whitespace-nowrap">{t.started_at ? new Date(t.started_at).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit", day: "2-digit", month: "2-digit" }) : "-"}</td>
                      <td className="py-2"><span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary capitalize">{t.call_type}</span></td>
                      <td className="py-2 text-foreground">{t.user_name || "-"}</td>
                      <td className="py-2 font-medium">{t.call_count}</td>
                      <td className="py-2">
                        <span className="text-cyan-400">{fmt(t.total_input)}</span>
                        <span className="text-muted-foreground mx-0.5">/</span>
                        <span className="text-amber-400">{fmt(t.total_output)}</span>
                      </td>
                      <td className="py-2 text-green-500">{fmtCost(t.total_cost)}</td>
                      <td className="py-2">{t.max_latency_ms}ms</td>
                      <td className="py-2">{t.errors > 0 ? <span className="text-red-400">{t.errors}</span> : <span className="text-emerald-500">0</span>}</td>
                    </tr>
                  ))}
                  {traces.length === 0 && <tr><td colSpan={9} className="py-8 text-center text-muted-foreground">Chưa có traces. Data sẽ xuất hiện khi người dùng sử dụng các tính năng AI.</td></tr>}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Recent Calls Tab */
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Recent AI Calls</CardTitle>
              <select
                value={callFilter}
                onChange={(e) => setCallFilter(e.target.value)}
                className="rounded-lg border border-border bg-card px-2 py-1 text-xs text-foreground"
              >
                <option value="">Tất cả</option>
                <option value="chat">Chat</option>
                <option value="lab">Lab</option>
                <option value="generate">Generate</option>
                <option value="mcp">MCP</option>
              </select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="pb-2 font-medium w-5"></th>
                    <th className="pb-2 font-medium">Thời gian</th>
                    <th className="pb-2 font-medium">Loại</th>
                    <th className="pb-2 font-medium">Model</th>
                    <th className="pb-2 font-medium">Tool / Endpoint</th>
                    <th className="pb-2 font-medium">User</th>
                    <th className="pb-2 font-medium">Tokens (in/out)</th>
                    <th className="pb-2 font-medium">Chi phí</th>
                    <th className="pb-2 font-medium">Latency</th>
                    <th className="pb-2 font-medium">Trace ID</th>
                    <th className="pb-2 font-medium">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((c) => (
                    <>
                      <tr
                        key={c.id}
                        className="border-b border-border/50 hover:bg-accent/30 transition-colors cursor-pointer"
                        onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
                      >
                        <td className="py-2 text-muted-foreground">{expandedId === c.id ? "▾" : "▸"}</td>
                        <td className="py-2 whitespace-nowrap">{c.created_at ? new Date(c.created_at).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit", day: "2-digit", month: "2-digit" }) : "-"}</td>
                        <td className="py-2"><span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary capitalize">{c.call_type}</span></td>
                        <td className="py-2 text-foreground font-medium">{c.model || "-"}</td>
                        <td className="py-2">
                          {c.tool_name && <span className="rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] text-blue-400">{c.tool_name}</span>}
                          {!c.tool_name && c.endpoint && <span className="text-muted-foreground">{c.endpoint}</span>}
                          {!c.tool_name && !c.endpoint && "-"}
                        </td>
                        <td className="py-2">
                          <p className="text-foreground">{c.user_name || "-"}</p>
                        </td>
                        <td className="py-2">
                          <span className="text-cyan-400">{fmt(c.input_tokens)}</span>
                          <span className="text-muted-foreground mx-0.5">/</span>
                          <span className="text-amber-400">{fmt(c.output_tokens)}</span>
                        </td>
                        <td className="py-2 text-green-500">{fmtCost(c.total_cost)}</td>
                        <td className="py-2">{c.latency_ms}ms</td>
                        <td className="py-2">
                          {c.trace_id
                            ? <span className="font-mono text-[10px] text-muted-foreground" title={c.trace_id}>{c.trace_id.slice(0, 8)}...</span>
                            : <span className="text-muted-foreground/40">-</span>
                          }
                        </td>
                        <td className="py-2">
                          {c.status === "success"
                            ? <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-500">OK</span>
                            : <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] text-red-500">Error</span>
                          }
                        </td>
                      </tr>
                      {expandedId === c.id && (
                        <tr key={`${c.id}-detail`} className="bg-accent/20">
                          <td colSpan={11} className="px-4 py-3">
                            <div className="grid grid-cols-2 gap-4">
                              {/* Metadata */}
                              <div className="space-y-2">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Chi tiết</p>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                                  <span className="text-muted-foreground">Provider:</span>
                                  <span className="text-foreground">{c.provider || "-"}</span>
                                  <span className="text-muted-foreground">Endpoint:</span>
                                  <span className="text-foreground font-mono">{c.endpoint || "-"}</span>
                                  <span className="text-muted-foreground">Tool:</span>
                                  <span className="text-foreground">{c.tool_name || "-"}</span>
                                  <span className="text-muted-foreground">Conversation ID:</span>
                                  <span className="text-foreground">{c.conversation_id || "-"}</span>
                                  <span className="text-muted-foreground">Trace ID:</span>
                                  <span className="text-foreground font-mono text-[10px]">{c.trace_id || "-"}</span>
                                  <span className="text-muted-foreground">Input tokens:</span>
                                  <span className="text-cyan-400">{c.input_tokens.toLocaleString()}</span>
                                  <span className="text-muted-foreground">Output tokens:</span>
                                  <span className="text-amber-400">{c.output_tokens.toLocaleString()}</span>
                                  <span className="text-muted-foreground">User:</span>
                                  <span className="text-foreground">{c.user_name} ({c.user_email})</span>
                                </div>
                                {c.error_message && (
                                  <div className="mt-2">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-red-400">Lỗi</p>
                                    <p className="mt-1 rounded bg-red-500/10 px-2 py-1 text-[11px] text-red-300 font-mono">{c.error_message}</p>
                                  </div>
                                )}
                              </div>
                              {/* Input/Output Preview */}
                              <div className="space-y-2">
                                {c.input_preview && (
                                  <div>
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Input Preview</p>
                                    <pre className="mt-1 max-h-32 overflow-y-auto rounded bg-card border border-border px-2 py-1.5 text-[11px] text-foreground/80 whitespace-pre-wrap break-words">{c.input_preview}</pre>
                                  </div>
                                )}
                                {c.output_preview && (
                                  <div>
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Output Preview</p>
                                    <pre className="mt-1 max-h-32 overflow-y-auto rounded bg-card border border-border px-2 py-1.5 text-[11px] text-foreground/80 whitespace-pre-wrap break-words">{c.output_preview}</pre>
                                  </div>
                                )}
                                {!c.input_preview && !c.output_preview && (
                                  <p className="text-xs text-muted-foreground italic">Không có preview data</p>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                  {recent.length === 0 && <tr><td colSpan={11} className="py-8 text-center text-muted-foreground">Chưa có dữ liệu AI calls. Data sẽ xuất hiện khi người dùng sử dụng chat, lab tools, hoặc tạo nội dung.</td></tr>}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
