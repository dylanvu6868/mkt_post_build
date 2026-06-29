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

interface RecentCall {
  id: number; created_at: string; call_type: string; model: string; provider: string;
  endpoint: string; tool_name: string; input_tokens: number; output_tokens: number;
  total_cost: number; latency_ms: number; status: string; error_message: string | null;
  input_preview: string | null; output_preview: string | null;
  user_id: number; user_name: string; user_email: string; trace_id: string | null;
  conversation_id: number | null;
}

const PERIOD_OPTIONS = [
  { label: "7 ngay", value: 7 },
  { label: "14 ngay", value: 14 },
  { label: "30 ngay", value: 30 },
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
  const [recent, setRecent] = useState<RecentCall[]>([]);
  const [tab, setTab] = useState<"overview" | "calls">("overview");
  const [loading, setLoading] = useState(true);
  const [callFilter, setCallFilter] = useState<string>("");

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get<Overview>(`/admin/ai-orchestration/overview?days=${days}`),
      api.get<ModelRow[]>(`/admin/ai-orchestration/by-model?days=${days}`),
      api.get<TypeRow[]>(`/admin/ai-orchestration/by-type?days=${days}`),
      api.get<DailyRow[]>(`/admin/ai-orchestration/daily-trend?days=${days}`),
      api.get<UserRow[]>(`/admin/ai-orchestration/by-user?days=${days}`),
    ]).then(([o, m, t, d, u]) => {
      setOverview(o); setModels(m); setTypes(t); setDaily(d); setUsers(u);
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
            <button onClick={() => setTab("overview")} className={`px-3 py-1.5 text-xs font-medium transition-colors ${tab === "overview" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-accent"}`}>Overview</button>
            <button onClick={() => setTab("calls")} className={`px-3 py-1.5 text-xs font-medium transition-colors ${tab === "calls" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-accent"}`}>Recent Calls</button>
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
                <option value="">All types</option>
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
                    <th className="pb-2 font-medium">Time</th>
                    <th className="pb-2 font-medium">Type</th>
                    <th className="pb-2 font-medium">Model</th>
                    <th className="pb-2 font-medium">User</th>
                    <th className="pb-2 font-medium">Tokens</th>
                    <th className="pb-2 font-medium">Cost</th>
                    <th className="pb-2 font-medium">Latency</th>
                    <th className="pb-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((c) => (
                    <tr key={c.id} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                      <td className="py-2 whitespace-nowrap">{c.created_at ? new Date(c.created_at).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }) : "-"}</td>
                      <td className="py-2"><span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary capitalize">{c.call_type}</span></td>
                      <td className="py-2 text-foreground">{c.model || "-"}</td>
                      <td className="py-2">
                        <p className="text-foreground">{c.user_name || "-"}</p>
                      </td>
                      <td className="py-2">{fmt(c.input_tokens + c.output_tokens)}</td>
                      <td className="py-2 text-green-500">{fmtCost(c.total_cost)}</td>
                      <td className="py-2">{c.latency_ms}ms</td>
                      <td className="py-2">
                        {c.status === "success"
                          ? <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-500">OK</span>
                          : <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] text-red-500" title={c.error_message || ""}>Error</span>
                        }
                      </td>
                    </tr>
                  ))}
                  {recent.length === 0 && <tr><td colSpan={8} className="py-8 text-center text-muted-foreground">No AI calls recorded yet. Data will appear after users interact with chat, lab tools, or content generation.</td></tr>}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
