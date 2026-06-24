"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const SYSTEM_INFO = [
  { label: "Framework", value: "Next.js 14 + FastAPI" },
  { label: "Database", value: "PostgreSQL (Supabase)" },
  { label: "Vector DB", value: "Qdrant" },
  { label: "LLM Provider", value: "DeepSeek" },
  { label: "Auth", value: "JWT + Google OAuth" },
  { label: "Hosting", value: "Docker Compose" },
];

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Cài đặt hệ thống</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Cấu hình và thông tin hệ thống</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-[15px]">Thông tin hệ thống</CardTitle>
              <Badge variant="secondary" className="bg-green-500/10 text-green-500 border-green-500/20">Online</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {SYSTEM_INFO.map((item) => (
                <div key={item.label} className="flex items-center justify-between text-[12px]">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-mono font-medium text-foreground">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-[15px]">Bảo mật</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { label: "JWT Algorithm", value: "HS256" },
                { label: "Token Expiry", value: "30 ngày" },
                { label: "CORS", value: "localhost:3000, 3001" },
                { label: "CSP Headers", value: "Enabled" },
                { label: "Rate Limiting", value: "Enabled" },
                { label: "Password Hashing", value: "bcrypt" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between text-[12px]">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-mono font-medium text-foreground">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-[15px]">Gói dịch vụ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { plan: "Lite", price: "Miễn phí", limit: "5 lượt/ngày, 1 dự án" },
                { plan: "Pro", price: "89.000₫/tháng", limit: "30 lượt/ngày, 5 dự án" },
                { plan: "Max", price: "219.000₫/tháng", limit: "Không giới hạn" },
              ].map((item) => (
                <div key={item.plan} className="flex items-center justify-between rounded-xl border border-border p-3">
                  <div>
                    <p className="text-[13px] font-medium text-foreground">{item.plan}</p>
                    <p className="text-[11px] text-muted-foreground">{item.limit}</p>
                  </div>
                  <span className="text-[12px] font-mono font-semibold text-foreground">{item.price}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-[15px]">Tích hợp</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { name: "Google OAuth", status: "Đã kết nối", active: true },
                { name: "DeepSeek API", status: "Đã kết nối", active: true },
                { name: "Qdrant Vector DB", status: "Đã kết nối", active: true },
                { name: "VNPay / MoMo", status: "Chưa tích hợp", active: false },
                { name: "Email (SMTP)", status: "Chưa tích hợp", active: false },
              ].map((item) => (
                <div key={item.name} className="flex items-center justify-between text-[12px]">
                  <span className="text-foreground">{item.name}</span>
                  <Badge variant={item.active ? "default" : "secondary"} className={item.active ? "bg-green-500/10 text-green-500 border-green-500/20 text-[10px]" : "text-[10px]"}>
                    {item.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
