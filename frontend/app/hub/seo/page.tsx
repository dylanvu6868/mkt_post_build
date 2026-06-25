"use client";

import { useEffect, useState } from "react";
import {
  useMcpStore,
  type SeoResult,
  type SeoIssue,
  type SeoAuditDetail,
} from "@/store/mcp";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { btn, inp, ta } from "@/lib/ui-tokens";

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function scoreColor(score: number): string {
  if (score >= 80) return "text-green-600";
  if (score >= 50) return "text-amber-500";
  return "text-red-500";
}

function scoreBgColor(score: number): string {
  if (score >= 80) return "bg-green-500";
  if (score >= 50) return "bg-amber-500";
  return "bg-red-500";
}

function scoreRingColor(score: number): string {
  if (score >= 80) return "stroke-green-500";
  if (score >= 50) return "stroke-amber-500";
  return "stroke-red-500";
}

function severityBadgeVariant(
  severity: SeoIssue["severity"]
): "destructive" | "secondary" | "outline" {
  if (severity === "critical") return "destructive";
  if (severity === "warning") return "secondary";
  return "outline";
}

function severityLabel(severity: SeoIssue["severity"]): string {
  if (severity === "critical") return "Nghiêm trọng";
  if (severity === "warning") return "Cảnh báo";
  return "Thông tin";
}

/* ------------------------------------------------------------------ */
/*  Score Gauge (circular SVG)                                          */
/* ------------------------------------------------------------------ */
function ScoreGauge({ score }: { score: number }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="140" height="140" className="-rotate-90">
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          className="stroke-muted"
          strokeWidth="10"
        />
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          className={scoreRingColor(score)}
          strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center" style={{ width: 140, height: 140 }}>
        <span className={`text-3xl font-bold ${scoreColor(score)}`}>{score}</span>
        <span className="text-xs text-muted-foreground">/ 100</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Stat Cell                                                           */
/* ------------------------------------------------------------------ */
function StatCell({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border px-3 py-2 text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Issues List                                                         */
/* ------------------------------------------------------------------ */
function IssuesList({ issues }: { issues: SeoIssue[] }) {
  if (issues.length === 0) {
    return <p className="text-sm text-muted-foreground">Không có vấn đề nào.</p>;
  }
  return (
    <ul className="space-y-2">
      {issues.map((issue, idx) => (
        <li key={idx} className="flex items-start gap-2 text-sm">
          <Badge variant={severityBadgeVariant(issue.severity)} className="shrink-0 mt-0.5">
            {severityLabel(issue.severity)}
          </Badge>
          <span>{issue.message}</span>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/*  Suggestions List                                                    */
/* ------------------------------------------------------------------ */
function SuggestionsList({ suggestions }: { suggestions: string[] }) {
  if (suggestions.length === 0) {
    return <p className="text-sm text-muted-foreground">Không có đề xuất nào.</p>;
  }
  return (
    <ul className="space-y-1.5">
      {suggestions.map((s, idx) => (
        <li key={idx} className="flex items-start gap-2 text-sm">
          <span className="text-primary mt-0.5 shrink-0">&#x2022;</span>
          <span>{s}</span>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/*  Result Panel (shared between analyze tab and audit detail dialog)    */
/* ------------------------------------------------------------------ */
function ResultPanel({ result }: { result: SeoResult }) {
  return (
    <div className="space-y-6">
      {/* Score gauge + key metrics */}
      <div className="flex flex-col sm:flex-row items-center gap-6">
        <div className="relative">
          <ScoreGauge score={result.score} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 flex-1">
          <StatCell label="Tiêu đề" value={result.title.exists ? `${result.title.length} ký tự` : "Thiếu"} />
          <StatCell label="Meta Description" value={result.meta_description.exists ? `${result.meta_description.length} ký tự` : "Thiếu"} />
          <StatCell label="H1" value={result.headings.h1_count} />
          <StatCell label="Số từ" value={result.word_count} />
          <StatCell label="Ảnh thiếu alt" value={`${result.images.missing_alt}/${result.images.total}`} />
          <StatCell label="Liên kết" value={`${result.links.internal} nội / ${result.links.external} ngoại`} />
        </div>
      </div>

      {/* Issues */}
      <div>
        <h3 className="text-sm font-semibold mb-2">Vấn đề ({result.issues.length})</h3>
        <IssuesList issues={result.issues} />
      </div>

      {/* Suggestions */}
      <div>
        <h3 className="text-sm font-semibold mb-2">Đề xuất ({result.suggestions.length})</h3>
        <SuggestionsList suggestions={result.suggestions} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab: Phân tích (Analyze)                                            */
/* ------------------------------------------------------------------ */
function AnalyzeTab() {
  const { seoResult, seoAnalyzing, analyzeSeo } = useMcpStore();
  const [url, setUrl] = useState("");

  const handleAnalyze = async () => {
    if (!url.trim()) {
      toast.error("Vui lòng nhập URL");
      return;
    }
    try {
      await analyzeSeo({ url: url.trim() });
      toast.success("Phân tích hoàn tất!");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Lỗi phân tích SEO";
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-primary via-primary/70 to-primary/40"></div>
        <CardHeader>
          <CardTitle>Phân tích SEO</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <input
              className={inp}
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAnalyze();
              }}
            />
            <button
              className={btn + " shrink-0"}
              onClick={handleAnalyze}
              disabled={seoAnalyzing || !url.trim()}
            >
              {seoAnalyzing ? "Đang phân tích..." : "Phân tích"}
            </button>
          </div>
        </CardContent>
      </Card>

      {seoAnalyzing && (
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-primary via-primary/70 to-primary/40"></div>
          <CardContent className="pt-6 space-y-3">
            <Skeleton className="h-32 w-32 rounded-full mx-auto" />
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      )}

      {!seoAnalyzing && seoResult && (
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-primary via-primary/70 to-primary/40"></div>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <span>Điểm SEO</span>
              <Badge className={scoreBgColor(seoResult.score) + " text-white"}>
                {seoResult.score}/100
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResultPanel result={seoResult} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab: Từ khóa (Keywords)                                             */
/* ------------------------------------------------------------------ */
function KeywordsTab() {
  const { keywords, keywordsLoading, analyzeKeywords } = useMcpStore();
  const [text, setText] = useState("");

  const handleAnalyze = async () => {
    if (!text.trim()) {
      toast.error("Vui lòng nhập nội dung văn bản");
      return;
    }
    try {
      await analyzeKeywords(text.trim());
      toast.success("Phân tích từ khóa hoàn tất!");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Lỗi phân tích từ khóa";
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-primary via-primary/70 to-primary/40"></div>
        <CardHeader>
          <CardTitle>Phân tích từ khóa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <textarea
            className={ta}
            placeholder="Dán nội dung văn bản cần phân tích từ khóa..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button
            className={btn}
            onClick={handleAnalyze}
            disabled={keywordsLoading || !text.trim()}
          >
            {keywordsLoading ? "Đang phân tích..." : "Phân tích từ khóa"}
          </button>
        </CardContent>
      </Card>

      {keywordsLoading && (
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-primary via-primary/70 to-primary/40"></div>
          <CardContent className="pt-6 space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </CardContent>
        </Card>
      )}

      {!keywordsLoading && keywords.length > 0 && (
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-primary via-primary/70 to-primary/40"></div>
          <CardHeader>
            <CardTitle>Mật độ từ khóa</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2 px-3 font-semibold">Từ khóa</th>
                    <th className="py-2 px-3 font-semibold text-right">Số lần</th>
                    <th className="py-2 px-3 font-semibold text-right">Mật độ (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {keywords.map((kw) => (
                    <tr key={kw.keyword} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-2 px-3 font-medium">{kw.keyword}</td>
                      <td className="py-2 px-3 text-right">{kw.count}</td>
                      <td className="py-2 px-3 text-right">{kw.density.toFixed(2)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Audit Detail Dialog                                                 */
/* ------------------------------------------------------------------ */
function AuditDetailDialog({
  audit,
  open,
  onOpenChange,
}: {
  audit: SeoAuditDetail | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Chi tiết Audit</DialogTitle>
          <DialogDescription>
            {audit ? `${audit.url ?? "N/A"} - ${audit.created_at}` : ""}
          </DialogDescription>
        </DialogHeader>
        {audit && audit.meta_data ? (
          <ResultPanel result={audit.meta_data} />
        ) : audit ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className={`text-3xl font-bold ${scoreColor(audit.score)}`}>
                {audit.score}
              </span>
              <span className="text-muted-foreground">/ 100</span>
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-2">Vấn đề</h3>
              <IssuesList issues={audit.issues ?? []} />
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-2">Đề xuất</h3>
              <SuggestionsList suggestions={audit.suggestions ?? []} />
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-20 w-full" />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab: Lịch sử (History)                                              */
/* ------------------------------------------------------------------ */
function HistoryTab() {
  const { seoAudits, seoAuditsLoading, seoAuditDetail, loadSeoAudits, loadSeoAudit } =
    useMcpStore();
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    loadSeoAudits();
  }, [loadSeoAudits]);

  const handleRowClick = async (id: number) => {
    try {
      await loadSeoAudit(id);
      setDetailOpen(true);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Lỗi tải chi tiết audit";
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-primary via-primary/70 to-primary/40"></div>
        <CardHeader>
          <CardTitle>Lịch sử phân tích</CardTitle>
        </CardHeader>
        <CardContent>
          {seoAuditsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : seoAudits.length === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa có lịch sử phân tích nào.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2 px-3 font-semibold">URL</th>
                    <th className="py-2 px-3 font-semibold">Tiêu đề</th>
                    <th className="py-2 px-3 font-semibold text-center">Điểm</th>
                    <th className="py-2 px-3 font-semibold text-right">Ngày</th>
                  </tr>
                </thead>
                <tbody>
                  {seoAudits.map((audit) => (
                    <tr
                      key={audit.id}
                      className="border-b last:border-0 hover:bg-muted/50 cursor-pointer"
                      onClick={() => handleRowClick(audit.id)}
                    >
                      <td className="py-2 px-3 max-w-[200px] truncate">{audit.url ?? "(HTML trực tiếp)"}</td>
                      <td className="py-2 px-3 max-w-[200px] truncate">{audit.title || "-"}</td>
                      <td className="py-2 px-3 text-center">
                        <Badge className={scoreBgColor(audit.score) + " text-white"}>
                          {audit.score}
                        </Badge>
                      </td>
                      <td className="py-2 px-3 text-right text-muted-foreground">
                        {audit.created_at.slice(0, 10)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <AuditDetailDialog
        audit={seoAuditDetail}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                           */
/* ------------------------------------------------------------------ */
export default function SeoPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Search className="h-8 w-8 text-primary" />
          <span className="bg-gradient-to-r from-primary to-primary/60 text-transparent bg-clip-text">SEO Tools</span>
        </h1>
        <p className="mt-2 text-muted-foreground text-lg">
          Tối ưu hóa SEO cho website và phân tích hiệu quả từ khóa.
        </p>
      </div>

      <Tabs defaultValue="analyze" className="space-y-6">
        <TabsList className="bg-muted/50 p-1 flex-wrap gap-1">
          <TabsTrigger value="analyze" className="rounded-lg data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm">Phân tích</TabsTrigger>
          <TabsTrigger value="keywords" className="rounded-lg data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm">Từ khóa</TabsTrigger>
          <TabsTrigger value="history" className="rounded-lg data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm">Lịch sử</TabsTrigger>
        </TabsList>

        <TabsContent value="analyze">
          <AnalyzeTab />
        </TabsContent>

        <TabsContent value="keywords">
          <KeywordsTab />
        </TabsContent>

        <TabsContent value="history">
          <HistoryTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
