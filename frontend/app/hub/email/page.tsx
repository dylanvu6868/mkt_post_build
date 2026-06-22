"use client";

import { useEffect, useState } from "react";
import { useMcpStore } from "@/store/mcp";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const btn = "inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition disabled:opacity-50";
const btn2 = "inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted transition disabled:opacity-50";
const inp = "w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50";
const ta = inp + " min-h-[120px] resize-y";

export default function EmailPage() {
  const { sending, emailStats, emailStatsLoading, sendEmail, sendBatchEmail, loadEmailStats } = useMcpStore();
  const [mode, setMode] = useState<"single" | "batch">("single");
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [html, setHtml] = useState("");
  const [batchData, setBatchData] = useState("");
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => { loadEmailStats(); }, [loadEmailStats]);

  const handleSend = async () => {
    setResult(null);
    try {
      if (mode === "single") {
        const emails = to.split(",").map(e => e.trim()).filter(Boolean);
        if (!emails.length || !subject || !html) return;
        await sendEmail(emails, subject, html);
        setResult(`Đã gửi tới ${emails.length} địa chỉ!`);
      } else {
        const recipients = JSON.parse(batchData) as Record<string, string>[];
        if (!recipients.length || !subject || !html) return;
        await sendBatchEmail(recipients, subject, html);
        setResult(`Đã gửi batch tới ${recipients.length} người!`);
      }
      setTo(""); setSubject(""); setHtml(""); setBatchData("");
      loadEmailStats();
    } catch (e: any) { setResult(`Lỗi: ${e.message}`); }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Email Marketing</h1>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader><CardTitle>Gửi Email</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <button onClick={() => setMode("single")} className={mode === "single" ? btn : btn2}>Email đơn</button>
              <button onClick={() => setMode("batch")} className={mode === "batch" ? btn : btn2}>Batch</button>
            </div>
            {mode === "single" ? (
              <input className={inp} placeholder="Địa chỉ email (phân cách bằng dấu phẩy)" value={to} onChange={e => setTo(e.target.value)} />
            ) : (
              <textarea className={ta} placeholder={'[\n  {"email":"a@b.com","name":"An"},\n  {"email":"c@d.com","name":"Binh"}\n]'} value={batchData} onChange={e => setBatchData(e.target.value)} />
            )}
            <input className={inp} placeholder="Tiêu đề email" value={subject} onChange={e => setSubject(e.target.value)} />
            <textarea className={ta + " min-h-[200px]"} placeholder="Nội dung HTML (dùng {{name}} cho biến cá nhân hóa)" value={html} onChange={e => setHtml(e.target.value)} />
            <div className="flex items-center gap-3">
              <button onClick={handleSend} disabled={sending || !subject || !html} className={btn}>
                {sending ? "Đang gửi..." : "Gửi email"}
              </button>
              {result && <p className="text-sm text-muted-foreground">{result}</p>}
            </div>
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader><CardTitle className="text-sm">Thống kê Email</CardTitle></CardHeader>
          <CardContent>
            {emailStatsLoading ? (
              <div className="space-y-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-6 w-full" />)}</div>
            ) : emailStats ? (
              <div className="space-y-4">
                <div className="flex justify-between"><span className="text-sm text-muted-foreground">Chiến dịch</span><span className="text-sm font-medium">{emailStats.campaigns}</span></div>
                <div className="flex justify-between"><span className="text-sm text-muted-foreground">Tổng gửi</span><span className="text-sm font-medium">{emailStats.total_sent}</span></div>
                <div className="flex justify-between"><span className="text-sm text-muted-foreground">Đã mở</span><span className="text-sm font-medium">{emailStats.total_opened} ({emailStats.open_rate}%)</span></div>
                <div className="flex justify-between"><span className="text-sm text-muted-foreground">Đã click</span><span className="text-sm font-medium">{emailStats.total_clicked} ({emailStats.click_rate}%)</span></div>
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground mb-1">Tỷ lệ mở</p>
                  <div className="h-2 rounded-full bg-muted overflow-hidden"><div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.min(emailStats.open_rate, 100)}%` }} /></div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Tỷ lệ click</p>
                  <div className="h-2 rounded-full bg-muted overflow-hidden"><div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(emailStats.click_rate, 100)}%` }} /></div>
                </div>
              </div>
            ) : <p className="text-sm text-muted-foreground">Chưa có dữ liệu.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
