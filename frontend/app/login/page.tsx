"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/services/api";
import { toast } from "sonner";
import { Check, Mail, Lock, Sparkles, Search, TrendingUp, Calendar, ShieldCheck, Zap } from "lucide-react";

declare global {
  interface Window {
    google?: any;
    FB?: any;
    fbAsyncInit?: () => void;
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

  // Forgot password state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  const googleHiddenRef = useRef<HTMLDivElement>(null);

  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
  const facebookAppId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || "1307206617791657";

  const checkFbLoginStatus = useCallback(() => {
    window.FB?.getLoginStatus((response: any) => {
      if (response.status === "connected" && response.authResponse) {
        console.log("[FB] Already connected, token available");
      }
    });
  }, []);

  useEffect(() => {
    if (!facebookAppId) return;
    window.fbAsyncInit = function () {
      window.FB?.init({ appId: facebookAppId, cookie: true, xfbml: true, version: "v21.0" });
      checkFbLoginStatus();
    };
    if (window.FB) {
      window.FB.init({ appId: facebookAppId, cookie: true, xfbml: true, version: "v21.0" });
      checkFbLoginStatus();
    }
  }, [facebookAppId, checkFbLoginStatus]);

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


  useEffect(() => {
    initGoogle();
  }, [initGoogle, isRegister]);

  const handleFacebookLogin = () => {
    if (!window.FB) {
      toast.info("Đăng nhập Facebook sắp ra mắt!");
      return;
    }
    window.FB.login(
      async (response: any) => {
        if (!response.authResponse) {
          toast.error("Facebook login cancelled");
          return;
        }
        setSocialLoading(true);
        try {
          await socialLogin("facebook", response.authResponse.accessToken);
          toast.success("Đăng nhập & kết nối Facebook thành công!");
          router.push("/dashboard");
        } catch {
          toast.error("Facebook login failed");
        } finally {
          setSocialLoading(false);
        }
      },
      { scope: "email,public_profile,pages_show_list,pages_read_engagement,pages_manage_posts,pages_read_user_content" }
    );
  };

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
      if (!res.ok) {
        throw new Error("Failed to send reset code");
      }
      toast.success("Mã reset đã được gửi đến email của bạn");
      setCodeSent(true); // Move to the code-entry step
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
        body: JSON.stringify({
          email: forgotEmail,
          code: resetCode,
          new_password: newPassword,
        }),
      });
      if (!res.ok) {
        throw new Error("Failed to reset password");
      }
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

  return (
    <>
      {googleClientId && (
        <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" onLoad={initGoogle} />
      )}
      {facebookAppId && (
        <Script
          src="https://connect.facebook.net/en_US/sdk.js"
          strategy="afterInteractive"
        />
      )}

      <main
        className="h-screen w-full text-neutral-100 flex flex-col lg:flex-row relative overflow-hidden font-sans"
        style={{ background: "linear-gradient(135deg, #080600 0%, #150f00 35%, #221800 65%, #302200 100%)" }}
      >
        {/* Ambient glows */}
        <div className="absolute top-0 left-0 w-[55%] h-[55%] rounded-full bg-yellow-600/6 blur-[200px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[45%] h-[45%] rounded-full bg-amber-500/10 blur-[160px] pointer-events-none" />

        {/* ══════════════════════════════════
            LEFT COLUMN — Brand & Features
        ══════════════════════════════════ */}
        <div className="hidden lg:flex lg:w-1/2 h-full flex-col relative z-10">
          
          {/* Content container — Căn giữa dọc bình thường */}
          <div className="flex-1 flex flex-col justify-center px-12 xl:px-20 pb-10">
            <div className="flex flex-col w-full max-w-[560px]">

              {/* Logo in flow - Đặt trực tiếp vào luồng nội dung, kích thước lớn hơn một chút */}
              <div className="mb-10 shrink-0">
                <img
                  src="/logo.png"
                  alt="Vitba.ai"
                  className="h-28 w-auto object-contain object-left drop-shadow-[0_0_24px_rgba(234,179,8,0.6)] rounded-lg"
                />
              </div>

              {/* Badge pill */}
              <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full border border-yellow-500/30 bg-gradient-to-r from-yellow-500/10 to-amber-500/5 w-fit mb-6 shadow-[0_0_15px_rgba(234,179,8,0.1)]">
                <Sparkles className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                <span className="text-[11px] font-bold tracking-widest text-yellow-400 uppercase">
                  Nền tảng Content Marketing đột phá
                </span>
              </div>

              {/* Headline - Dùng ngắt dòng <br /> thay vì khoá cứng bằng whitespace-nowrap gây lỗi */}
              <h1 className="text-[36px] xl:text-[44px] font-extrabold tracking-tight leading-[1.25] mb-5">
                Tạo nội dung ấn tượng. <br className="hidden lg:block" />
                <span className="whitespace-nowrap">
                  Thu hút <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-200">đúng khách hàng.</span>
                </span>
              </h1>

              {/* Description */}
              <p className="text-[15px] text-neutral-400 leading-relaxed mb-10 max-w-[480px]">
                Vitba.ai giúp bạn nghiên cứu, viết, tối ưu và quản lý nội dung hiệu quả – tất cả trong một nền tảng thông minh.
              </p>

              {/* Feature 2×2 grid */}
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: <Sparkles className="w-5 h-5 text-yellow-400" />, label: "Viết nội dung", sub: "AI thông minh" },
                  { icon: <Search className="w-5 h-5 text-yellow-400" />, label: "Nghiên cứu", sub: "thị trường" },
                  { icon: <TrendingUp className="w-5 h-5 text-yellow-400" />, label: "Tối ưu SEO", sub: "toàn diện" },
                  { icon: <Calendar className="w-5 h-5 text-yellow-400" />, label: "Lập kế hoạch", sub: "nội dung" },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 bg-white/[0.06] border border-white/10 rounded-2xl p-4 hover:bg-white/[0.1] hover:border-yellow-500/30 transition-all duration-300 hover:shadow-[0_0_20px_rgba(234,179,8,0.1)] group"
                  >
                    <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 shrink-0 group-hover:scale-110 group-hover:bg-yellow-500/20 group-hover:shadow-[0_0_15px_rgba(234,179,8,0.2)] transition-all duration-300">
                      {item.icon}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[14px] font-semibold text-neutral-200 leading-tight mb-1">
                        {item.label}
                      </span>
                      <span className="text-[11px] text-neutral-500 font-medium leading-tight">
                        {item.sub}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════
            RIGHT COLUMN — Auth Form
        ══════════════════════════════════ */}
        <div className="w-full lg:w-1/2 h-full flex items-center justify-center p-4 sm:p-8 relative z-10">
          {/* Nới rộng form card lên max-w-[460px] để tiêu đề không rớt dòng */}
          <div className="w-full max-w-[460px]">

            {/* Mobile-only Logo */}
            <div className="lg:hidden flex justify-center mb-6">
              <img src="/logo.png" alt="Vitba.ai" className="h-10 w-auto object-contain" />
            </div>

            {/* Glass card */}
            <div className="w-full bg-[#0a0804]/60 backdrop-blur-3xl border border-white/10 rounded-3xl p-8 lg:p-10 shadow-[0_8px_32px_rgba(0,0,0,0.8)] relative overflow-hidden">
              {/* Accent top line */}
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-yellow-500/80 to-transparent" />

              <h2 className="text-[22px] font-bold mb-2 tracking-tight">
                {isRegister ? "Tạo tài khoản mới" : "Chào mừng bạn đến với Vitba.ai"}
                {!isRegister && <span className="text-yellow-400 ml-2">👋</span>}
              </h2>
              <p className="text-neutral-400 text-[13px] mb-8">
                {isRegister
                  ? "Đăng ký để trải nghiệm sức mạnh AI Content"
                  : "Đăng nhập để tiếp tục hành trình sáng tạo"}
              </p>

              <form onSubmit={isRegister ? handleRegister : handleLogin} className="space-y-4">
                {isRegister && (
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-500">
                        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                      </svg>
                    </div>
                    <Input
                      type="text"
                      placeholder="Họ và tên"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      required
                      className="pl-10 h-12 bg-white/[0.06] border-white/10 focus-visible:ring-yellow-500/50 focus-visible:border-yellow-500/50 text-neutral-100 rounded-xl text-sm placeholder:text-neutral-500 transition-all hover:bg-white/[0.1]"
                    />
                  </div>
                )}

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="w-4 h-4 text-neutral-500" />
                  </div>
                  <Input
                    type="email"
                    placeholder="Email của bạn"
                    value={isRegister ? regEmail : loginEmail}
                    onChange={(e) => isRegister ? setRegEmail(e.target.value) : setLoginEmail(e.target.value)}
                    required
                    className="pl-10 h-12 bg-white/[0.06] border-white/10 focus-visible:ring-yellow-500/50 focus-visible:border-yellow-500/50 text-neutral-100 rounded-xl text-sm placeholder:text-neutral-500 transition-all hover:bg-white/[0.1]"
                  />
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="w-4 h-4 text-neutral-500" />
                  </div>
                  <Input
                    type="password"
                    placeholder="Mật khẩu"
                    value={isRegister ? regPassword : loginPassword}
                    onChange={(e) => isRegister ? setRegPassword(e.target.value) : setLoginPassword(e.target.value)}
                    required
                    className="pl-10 h-12 bg-white/[0.06] border-white/10 focus-visible:ring-yellow-500/50 focus-visible:border-yellow-500/50 text-neutral-100 rounded-xl text-sm placeholder:text-neutral-500 transition-all hover:bg-white/[0.1]"
                  />
                </div>

                {!isRegister && (
                  <div className="flex items-center justify-between pt-0.5">
                    <label className="flex items-center gap-2 cursor-pointer" onClick={(e) => { e.preventDefault(); setRememberMe(!rememberMe); }}>
                      <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors ${rememberMe ? "bg-yellow-500 border-yellow-500" : "bg-transparent border-neutral-600"}`}>
                        {rememberMe && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                      </div>
                      <span className="text-[11px] text-neutral-400 select-none hover:text-neutral-300 transition-colors">Ghi nhớ đăng nhập</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(true)}
                      className="text-[11px] text-yellow-500/80 hover:text-yellow-400 transition-colors"
                    >
                      Quên mật khẩu?
                    </button>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isRegister ? regLoading : loginLoading}
                  className="w-full h-12 mt-4 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-primary-foreground font-bold rounded-xl shadow-[0_4px_20px_rgba(234,179,8,0.3)] hover:shadow-[0_8px_30px_rgba(234,179,8,0.4)] transition-all duration-300 border-0 text-[15px] tracking-wide"
                >
                  {(isRegister ? regLoading : loginLoading)
                    ? "Đang xử lý..."
                    : isRegister ? "Tạo tài khoản" : "Đăng nhập"}
                </Button>
              </form>

              {/* Divider */}
              <div className="my-7 relative flex items-center justify-center">
                <div className="absolute w-full h-px bg-white/10" />
                <span className="relative bg-[#0a0804] px-4 text-[11px] text-neutral-500 font-semibold uppercase tracking-widest">
                  hoặc tiếp tục với
                </span>
              </div>

              {/* Social login buttons */}
              <div className="w-full flex items-center justify-center gap-4">
                {googleClientId && (
                  <div className="relative w-12 h-12 rounded-full overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-center bg-white/[0.06] border border-white/10 rounded-full pointer-events-none z-0">
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
                <button
                  type="button"
                  onClick={handleFacebookLogin}
                  disabled={socialLoading}
                  className="w-12 h-12 rounded-full bg-white/[0.06] border border-white/10 hover:bg-white/[0.1] hover:border-[#1877F2]/40 hover:shadow-[0_0_15px_rgba(24,119,242,0.15)] transition-all duration-300 flex items-center justify-center disabled:opacity-50 group"
                  title="Đăng nhập bằng Facebook"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#1877F2">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </button>
                {socialLoading && (
                  <p className="text-xs text-neutral-400">Đang xử lý...</p>
                )}
              </div>

              {/* Switch login/register */}
              <div className="mt-8 text-center text-[13px] text-neutral-400 font-medium">
                {isRegister ? "Đã có tài khoản? " : "Chưa có tài khoản? "}
                <button
                  onClick={() => setIsRegister(!isRegister)}
                  className="text-yellow-400 font-bold hover:text-yellow-300 transition-colors underline-offset-4 hover:underline"
                >
                  {isRegister ? "Đăng nhập ngay" : "Đăng ký ngay"}
                </button>
              </div>
            </div>

            {/* Trust badges */}
            <div className="mt-8 grid grid-cols-3 gap-4 px-2">
              <div className="text-center group">
                <div className="flex items-center justify-center gap-1.5 text-yellow-500/80 text-xs font-semibold mb-1 group-hover:text-yellow-400 transition-colors">
                  <ShieldCheck className="w-4 h-4" /> Bảo mật
                </div>
                <p className="text-[11px] text-neutral-500 leading-tight">Mã hóa end-to-end</p>
              </div>
              <div className="text-center group">
                <div className="flex items-center justify-center gap-1.5 text-yellow-500/80 text-xs font-semibold mb-1 group-hover:text-yellow-400 transition-colors">
                  <Zap className="w-4 h-4" /> Nhanh 10x
                </div>
                <p className="text-[11px] text-neutral-500 leading-tight">So với viết tay</p>
              </div>
              <div className="text-center group">
                <div className="flex items-center justify-center gap-1.5 text-yellow-500/80 text-xs font-semibold mb-1 group-hover:text-yellow-400 transition-colors">
                  <Sparkles className="w-4 h-4" /> Chất lượng
                </div>
                <p className="text-[11px] text-neutral-500 leading-tight">Chuẩn SEO Google</p>
              </div>
            </div>
          </div>
        </div>

        {/* Forgot Password Modal */}
        {showForgotPassword && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-[#0a0804]/95 backdrop-blur-3xl border border-white/10 rounded-3xl p-8 shadow-[0_8px_32px_rgba(0,0,0,0.8)] relative">
              <button
                onClick={() => { setShowForgotPassword(false); setCodeSent(false); setResetCode(""); setNewPassword(""); }}
                className="absolute top-4 right-4 text-neutral-500 hover:text-neutral-300 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>

              <h3 className="text-[20px] font-bold mb-2">Quên mật khẩu</h3>
              <p className="text-neutral-400 text-[13px] mb-6">
                {!codeSent ? "Nhập email của bạn để nhận mã reset" : "Nhập mã reset và mật khẩu mới"}
              </p>

              {!codeSent ? (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="w-4 h-4 text-neutral-500" />
                    </div>
                    <Input
                      type="email"
                      placeholder="Email của bạn"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      required
                      className="pl-10 h-12 bg-white/[0.06] border-white/10 focus-visible:ring-yellow-500/50 focus-visible:border-yellow-500/50 text-neutral-100 rounded-xl text-sm placeholder:text-neutral-500 transition-all hover:bg-white/[0.1]"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={forgotLoading}
                    className="w-full h-12 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-primary-foreground font-bold rounded-xl shadow-[0_4px_20px_rgba(234,179,8,0.3)] hover:shadow-[0_8px_30px_rgba(234,179,8,0.4)] transition-all duration-300 border-0 text-[15px] tracking-wide"
                  >
                    {forgotLoading ? "Đang gửi..." : "Gửi mã reset"}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-500">
                        <rect width="20" height="16" x="2" y="4" rx="2"/><path d="m6 8-2 6 2 6"/><path d="m18 8 2 6-2 6"/>
                      </svg>
                    </div>
                    <Input
                      type="text"
                      placeholder="Mã reset (6 chữ số)"
                      value={resetCode}
                      onChange={(e) => setResetCode(e.target.value)}
                      required
                      maxLength={6}
                      className="pl-10 h-12 bg-white/[0.06] border-white/10 focus-visible:ring-yellow-500/50 focus-visible:border-yellow-500/50 text-neutral-100 rounded-xl text-sm placeholder:text-neutral-500 transition-all hover:bg-white/[0.1]"
                    />
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="w-4 h-4 text-neutral-500" />
                    </div>
                    <Input
                      type="password"
                      placeholder="Mật khẩu mới"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={8}
                      className="pl-10 h-12 bg-white/[0.06] border-white/10 focus-visible:ring-yellow-500/50 focus-visible:border-yellow-500/50 text-neutral-100 rounded-xl text-sm placeholder:text-neutral-500 transition-all hover:bg-white/[0.1]"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={resetLoading}
                    className="w-full h-12 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-primary-foreground font-bold rounded-xl shadow-[0_4px_20px_rgba(234,179,8,0.3)] hover:shadow-[0_8px_30px_rgba(234,179,8,0.4)] transition-all duration-300 border-0 text-[15px] tracking-wide"
                  >
                    {resetLoading ? "Đang xử lý..." : "Reset mật khẩu"}
                  </Button>
                  <button
                    type="button"
                    onClick={() => { setCodeSent(false); setResetCode(""); }}
                    className="w-full text-[11px] text-neutral-500 hover:text-neutral-300 transition-colors"
                  >
                    Quay lại gửi lại mã
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </main>
    </>
  );
}
