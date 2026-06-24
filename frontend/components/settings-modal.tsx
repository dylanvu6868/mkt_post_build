"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthStore } from "@/store/auth";
import { usePlanLimits } from "@/hooks/use-plan-limits";
import { normalizePlan, PLAN_META } from "@/lib/plan";
import { PlanUsageBar } from "@/components/plan-usage-bar";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

function AccountTab({ onClose }: { onClose: () => void }) {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const { data: planData } = usePlanLimits();
  const currentPlan = normalizePlan(user?.plan ?? planData?.plan);
  const plan = PLAN_META[currentPlan];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 p-4 rounded-xl bg-muted border border-border">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 text-amber-950 text-xl font-bold shrink-0">
          {user?.name?.charAt(0)?.toUpperCase() || "U"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-base font-bold text-foreground truncate">{user?.name}</p>
            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", plan.badgeBg, plan.badgeColor)}>
              {plan.name}
            </span>
          </div>
          <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
          {planData?.plan_expires_at && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Hết hạn: {new Date(planData.plan_expires_at).toLocaleDateString("vi-VN")}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-muted-foreground">Thông tin tài khoản</h4>
        <div className="space-y-2">
          {[
            { label: "Tên hiển thị", value: user?.name || "—" },
            { label: "Email", value: user?.email || "—" },
            { label: "Vai trò", value: user?.is_admin ? "Quản trị viên" : "Thành viên" },
            { label: "Gói hiện tại", value: plan.name },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between rounded-xl bg-muted border border-border px-4 py-3">
              <span className="text-sm text-muted-foreground">{item.label}</span>
              <span className="text-sm font-medium text-foreground">{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      {currentPlan !== "max" && (
        <div className="rounded-xl border border-yellow-500/30 bg-gradient-to-r from-yellow-500/10 to-amber-500/5 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-foreground">Nâng cấp gói</p>
              <p className="text-xs text-muted-foreground mt-0.5">Mở khóa thêm tính năng và tăng giới hạn</p>
            </div>
            <button
              onClick={() => { onClose(); router.push("/pricing"); }}
              className="rounded-xl bg-gradient-to-r from-yellow-400 to-amber-500 px-4 py-2 text-xs font-bold text-amber-950 hover:from-yellow-300 hover:to-amber-400 transition-all"
            >
              Xem gói
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function UsageTab() {
  const { data: planData } = usePlanLimits();
  const user = useAuthStore((s) => s.user);
  const currentPlan = normalizePlan(user?.plan ?? planData?.plan);
  const plan = PLAN_META[currentPlan];

  const usage = planData?.usage;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 p-4 rounded-xl bg-muted border border-border">
        <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider", plan.badgeBg, plan.badgeColor)}>
          {plan.name}
        </span>
        <span className="text-sm text-muted-foreground">Mức sử dụng hiện tại</span>
      </div>

      {usage ? (
        <div className="space-y-5">
          <PlanUsageBar label="Lượt tạo hôm nay" item={usage.daily_generations} />
          <PlanUsageBar label="Dự án" item={usage.projects} />
          <PlanUsageBar label="Brand Voice" item={usage.brand_profiles} />
          <PlanUsageBar label="Tài liệu KB" item={usage.kb_files} />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Đang tải...</p>
      )}
    </div>
  );
}

export function SettingsModal({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[650px] bg-background/95 backdrop-blur-3xl border-border text-foreground shadow-[0_0_40px_rgba(0,0,0,0.1)] dark:shadow-[0_0_80px_rgba(0,0,0,0.8)] p-0 overflow-hidden rounded-3xl">
        <div className="flex h-[500px]">
          <Tabs defaultValue="account" className="flex w-full h-full" orientation="vertical">
            <div className="w-[200px] border-r border-border bg-card/40 p-5 flex flex-col">
              <DialogHeader className="mb-6 text-left">
                <DialogTitle className="text-xl font-bold text-foreground tracking-tight">Cài đặt</DialogTitle>
              </DialogHeader>
              <TabsList className="flex flex-col h-auto bg-transparent space-y-1.5 p-0 items-stretch">
                <TabsTrigger value="account" className="justify-start px-3 py-2.5 text-[14px] font-medium text-muted-foreground data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none rounded-xl transition-all hover:bg-accent hover:text-muted-foreground data-[state=active]:hover:text-primary border border-transparent data-[state=active]:border-primary/20">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  Tài khoản
                </TabsTrigger>
                <TabsTrigger value="usage" className="justify-start px-3 py-2.5 text-[14px] font-medium text-muted-foreground data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none rounded-xl transition-all hover:bg-accent hover:text-muted-foreground data-[state=active]:hover:text-primary border border-transparent data-[state=active]:border-primary/20">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg>
                  Sử dụng
                </TabsTrigger>
              </TabsList>
              <div className="mt-auto h-24 bg-gradient-to-t from-card to-transparent pointer-events-none -mx-5 -mb-5" />
            </div>

            <div className="flex-1 p-8 bg-transparent overflow-y-auto">
              <TabsContent value="account" className="mt-0 h-full data-[state=active]:animate-in data-[state=active]:fade-in-50 data-[state=active]:slide-in-from-bottom-2">
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-foreground">Tài khoản</h2>
                  <p className="text-[14px] text-muted-foreground mt-1">Thông tin cá nhân và gói đăng ký của bạn.</p>
                </div>
                <AccountTab onClose={() => setOpen(false)} />
              </TabsContent>
              <TabsContent value="usage" className="mt-0 h-full data-[state=active]:animate-in data-[state=active]:fade-in-50 data-[state=active]:slide-in-from-bottom-2">
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-foreground">Mức sử dụng</h2>
                  <p className="text-[14px] text-muted-foreground mt-1">Theo dõi lượt sử dụng tính năng theo gói hiện tại.</p>
                </div>
                <UsageTab />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
