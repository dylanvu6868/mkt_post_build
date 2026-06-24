"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/services/api";
import { toast } from "sonner";
import {
  Check, Mail, Lock, Sparkles, Search, TrendingUp, Calendar,
  ShieldCheck, Zap, User,
} from "lucide-react";

declare global {
  interface Window {
    google?: any;
  }
}

export default function LoginPage() {
  const router = useRouter();
  const { login, register, socialLogin } = useAuthStore();

  const [isRegister, setIsRegister] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regLoading, setRegLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(false);

  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  const googleHiddenRef = useRef<HTMLDivElement>(null);
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

  const initGoogle = useCallback(() => {
    if (!googleClientId || !window.google || !googleHiddenRef.current) return;
    googleHiddenRef.current.innerHTML = "";
    window.google.accounts.id.initialize({
      client_id: googleClientId,
      callback: async (response: { credential: string }) => {
        setSocialLoading(true);
        try {
          await socialLogin("google", response.credential);
          router.push("/dashboard");
        } catch {
          toast.error("Google login failed");
        } finally {
          setSocialLoading(false);
        }
      },
    });
    window.google.accounts.id.renderButton(googleHiddenRef.current, {
      type: "icon",
      size: "large",
    });
  }, [googleClientId, socialLogin, router]);

  useEffect(() => { initGoogle(); }, [initGoogle, isRegister]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    try {
      await login(loginEmail, loginPassword);
      router.push("/dashboard");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Login failed");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegLoading(true);
    try {
      await register(regName, regEmail, regPassword);
      router.push("/dashboard");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Registration failed");
    } finally {
      setRegLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
      const res = await fetch(`${baseUrl}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail }),
      });
      if (!res.ok) throw new Error("Failed to send reset code");
      toast.success("Mã reset đã được gửi đến email của bạn");
      setCodeSent(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send reset code");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
      const res = await fetch(`${baseUrl}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail, code: resetCode, new_password: newPassword }),
      });
      if (!res.ok) throw new Error("Failed to reset password");
      toast.success("Mật khẩu đã được reset thành công");
      setShowForgotPassword(false);
      setCodeSent(false);
      setForgotEmail("");
      setResetCode("");
      setNewPassword("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reset password");
    } finally {
      setResetLoading(false);
    }
  };

  const inputCls = "pl-10 h-12 bg-card border-border focus-visible:ring-ring/30 focus-visible:border-primary/50 text-foreground rounded-xl text-sm placeholder:text-muted-foreground transition-all hover:bg-accent/50";
  const btnCls = "w-full h-12 rounded-2xl bg-primary text-primary-foreground font-bold text-[15px] tracking-wide glow-yellow hover:opacity-90 transition-all duration-200 active:scale-[0.98] disabled:opacity-50";

  return (
    <>
      {googleClientId && (
        <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" onLoad={initGoogle} />
      )}
      <main className="h-screen w-full bg-black text-foreground flex flex-col lg:flex-row relative overflow-hidden">
        {/* ─── Background Smoke Effect ─── */}
        <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/25 rounded-full blur-[150px] animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: "1s" }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/15 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: "2s" }} />
        </div>

        {/* ─── LEFT — Brand Panel ─── */}
        <div className="hidden lg:flex lg:w-1/2 h-full relative z-10">
          <div className="absolute inset-0 -z-10 bg-grid opacity-40" />
          <div className="flex-1 flex items-center justify-center p-12 xl:p-20">
            <div className="w-full max-w-[520px]">
              <div className="panel-block p-4">
                <div className="surface-card p-8 xl:p-10">
                  <div className="mb-8">
                    <img src="/logo.png" alt="Vitba.ai" className="h-20 w-auto object-contain object-left" />
                  </div>

                  <span className="pill-tag mb-5">
                    <Sparkles className="h-3.5 w-3.5" /> Nền tảng AI Marketing
                  </span>

                  <h1 className="text-[32px] xl:text-[38px] font-black tracking-tight leading-[1.15] mb-4">
                    Tạo nội dung ấn tượng.{" "}
                    <span className="text-primary">Thu hút đúng khách hàng.</span>
                  </h1>

                  <p className="text-sm text-muted-foreground leading-relaxed mb-8 max-w-[420px]">
                    Vitba.ai giúp bạn nghiên cứu, viết, tối ưu và quản lý nội dung hiệu quả — tất cả trong một nền tảng thông minh.
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { icon: Sparkles, label: "Viết nội dung", sub: "AI thông minh" },
                      { icon: Search, label: "Nghiên cứu", sub: "thị trường" },
                      { icon: TrendingUp, label: "Tối ưu SEO", sub: "toàn diện" },
                      { icon: Calendar, label: "Lập kế hoạch", sub: "nội dung" },
                    ].map((item, i) => {
                      const Icon = item.icon;
                      return (
                        <div key={i} className="flex items-center gap-3 rounded-2xl border border-border bg-background p-3.5 hover:border-primary/40 transition-all group">
                          <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary shrink-0 group-hover:bg-primary/25 transition">
                            <Icon className="h-5 w-5" />
                          </span>
                          <div>
                            <div className="text-[13px] font-semibold leading-tight">{item.label}</div>
                            <div className="text-[11px] text-muted-foreground">{item.sub}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── RIGHT — Auth Form ─── */}
        <div className="w-full lg:w-1/2 h-full flex items-center justify-center p-5 sm:p-8 relative z-10">
          <div className="w-full max-w-[440px]">
            <div className="lg:hidden flex justify-center mb-6">
              <img src="/logo.png" alt="Vitba.ai" className="h-10 w-auto object-contain" />
            </div>

            <div className="w-full rounded-[2rem] border border-border bg-card p-8 lg:p-10 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary/80 to-transparent" />

              <h2 className="text-[22px] font-extrabold mb-1.5 tracking-tight">
                {isRegister ? "Tạo tài khoản mới" : "Chào mừng trở lại"}
              </h2>
              <p className="text-muted-foreground text-[13px] mb-7">
                {isRegister ? "Đăng ký để trải nghiệm sức mạnh AI Content" : "Đăng nhập để tiếp tục hành trình sáng tạo"}
              </p>

              <form onSubmit={isRegister ? handleRegister : handleLogin} className="space-y-3.5">
                {isRegister && (
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none"><User className="w-4 h-4 text-muted-foreground" /></div>
                    <Input type="text" placeholder="Họ và tên" value={regName} onChange={(e) => setRegName(e.target.value)} required className={inputCls} />
                  </div>
                )}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none"><Mail className="w-4 h-4 text-muted-foreground" /></div>
                  <Input type="email" placeholder="Email của bạn" value={isRegister ? regEmail : loginEmail} onChange={(e) => isRegister ? setRegEmail(e.target.value) : setLoginEmail(e.target.value)} required className={inputCls} />
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none"><Lock className="w-4 h-4 text-muted-foreground" /></div>
                  <Input type="password" placeholder="Mật khẩu" value={isRegister ? regPassword : loginPassword} onChange={(e) => isRegister ? setRegPassword(e.target.value) : setLoginPassword(e.target.value)} required className={inputCls} />
                </div>

                {!isRegister && (
                  <div className="flex items-center justify-between pt-0.5">
                    <label className="flex items-center gap-2 cursor-pointer" onClick={(e) => { e.preventDefault(); setRememberMe(!rememberMe); }}>
                      <div className={`w-4 h-4 rounded-md border-2 flex items-center justify-center transition-all ${rememberMe ? "bg-primary border-primary" : "border-border"}`}>
                        {rememberMe && <Check className="w-2.5 h-2.5 text-primary-foreground" strokeWidth={3} />}
                      </div>
                      <span className="text-xs text-muted-foreground select-none">Ghi nhớ đăng nhập</span>
                    </label>
                    <button type="button" onClick={() => setShowForgotPassword(true)} className="text-xs text-primary hover:underline transition-colors">
                      Quên mật khẩu?
                    </button>
                  </div>
                )}

                <button type="submit" disabled={isRegister ? regLoading : loginLoading} className={btnCls}>
                  {(isRegister ? regLoading : loginLoading) ? "Đang xử lý..." : isRegister ? "Tạo tài khoản" : "Đăng nhập"}
                </button>
              </form>

              <div className="my-6 relative flex items-center justify-center">
                <div className="absolute w-full h-px bg-border" />
                <span className="relative bg-card px-4 text-[11px] text-muted-foreground font-semibold uppercase tracking-widest">
                  hoặc tiếp tục với
                </span>
              </div>

              <div className="w-full flex items-center justify-center gap-4">
                {googleClientId && (
                  <div className="relative w-12 h-12 rounded-full overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-center bg-card border border-border rounded-full pointer-events-none z-0">
                      <svg width="20" height="20" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                    </div>
                    <div ref={googleHiddenRef} className="absolute inset-0 z-10 opacity-[0.01] cursor-pointer [&_iframe]{width:48px!important;height:48px!important;border-radius:50%!important}" />
                  </div>
                )}
                {socialLoading && <p className="text-xs text-muted-foreground">Đang xử lý...</p>}
              </div>

              <div className="mt-7 text-center text-[13px] text-muted-foreground font-medium">
                {isRegister ? "Đã có tài khoản? " : "Chưa có tài khoản? "}
                <button onClick={() => setIsRegister(!isRegister)} className="text-primary font-bold hover:underline underline-offset-4 transition-colors">
                  {isRegister ? "Đăng nhập ngay" : "Đăng ký ngay"}
                </button>
              </div>
            </div>

            <div className="mt-7 grid grid-cols-3 gap-4 px-2">
              {[
                { icon: ShieldCheck, label: "Bảo mật", sub: "Mã hóa end-to-end" },
                { icon: Zap, label: "Nhanh 10x", sub: "So với viết tay" },
                { icon: Sparkles, label: "Chất lượng", sub: "Chuẩn SEO Google" },
              ].map((b, i) => {
                const Icon = b.icon;
                return (
                  <div key={i} className="text-center group">
                    <div className="flex items-center justify-center gap-1.5 text-primary text-xs font-semibold mb-1">
                      <Icon className="w-4 h-4" /> {b.label}
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-tight">{b.sub}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Forgot Password Modal */}
        {showForgotPassword && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-[2rem] border border-border bg-card p-8 relative">
              <button onClick={() => { setShowForgotPassword(false); setCodeSent(false); setResetCode(""); setNewPassword(""); }} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>

              <h3 className="text-xl font-extrabold mb-2">Quên mật khẩu</h3>
              <p className="text-muted-foreground text-[13px] mb-6">
                {!codeSent ? "Nhập email của bạn để nhận mã reset" : "Nhập mã reset và mật khẩu mới"}
              </p>

              {!codeSent ? (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none"><Mail className="w-4 h-4 text-muted-foreground" /></div>
                    <Input type="email" placeholder="Email của bạn" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} required className={inputCls} />
                  </div>
                  <button type="submit" disabled={forgotLoading} className={btnCls}>{forgotLoading ? "Đang gửi..." : "Gửi mã reset"}</button>
                </form>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none"><Lock className="w-4 h-4 text-muted-foreground" /></div>
                    <Input type="text" placeholder="Mã reset (6 chữ số)" value={resetCode} onChange={(e) => setResetCode(e.target.value)} required maxLength={6} className={inputCls} />
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none"><Lock className="w-4 h-4 text-muted-foreground" /></div>
                    <Input type="password" placeholder="Mật khẩu mới" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} className={inputCls} />
                  </div>
                  <button type="submit" disabled={resetLoading} className={btnCls}>{resetLoading ? "Đang xử lý..." : "Reset mật khẩu"}</button>
                  <button type="button" onClick={() => { setCodeSent(false); setResetCode(""); }} className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors">Quay lại gửi lại mã</button>
                </form>
              )}
            </div>
          </div>
        )}
      </main>
    </>
  );
}
