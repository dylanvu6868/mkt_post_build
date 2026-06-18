"use client";

import { useState, useEffect, useRef } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApiError } from "@/services/api";
import { toast } from "sonner";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; callback: (response: { credential: string }) => void }) => void;
          renderButton: (element: HTMLElement, config: { theme: string; size: string; width: number }) => void;
        };
      };
    };
    FB?: {
      init: (config: { appId: string; version: string }) => void;
      login: (callback: (response: { authResponse?: { accessToken: string } }) => void, config: { scope: string }) => void;
    };
  }
}

export default function LoginPage() {
  const router = useRouter();
  const { login, register, socialLogin } = useAuthStore();

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regLoading, setRegLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(false);

  const googleBtnRef = useRef<HTMLDivElement>(null);

  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
  const facebookAppId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID ?? "";

  useEffect(() => {
    if (!googleClientId || !window.google || !googleBtnRef.current) return;
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
    window.google.accounts.id.renderButton(googleBtnRef.current, {
      theme: "outline",
      size: "large",
      width: 400,
    });
  }, [googleClientId, socialLogin, router]);

  const handleFacebookLogin = () => {
    if (!window.FB) {
      toast.error("Facebook SDK not loaded");
      return;
    }
    window.FB.login(
      async (response) => {
        if (!response.authResponse) {
          toast.error("Facebook login cancelled");
          return;
        }
        setSocialLoading(true);
        try {
          await socialLogin("facebook", response.authResponse.accessToken);
          router.push("/dashboard");
        } catch {
          toast.error("Facebook login failed");
        } finally {
          setSocialLoading(false);
        }
      },
      { scope: "email,public_profile" },
    );
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    try {
      await login(loginEmail, loginPassword);
      router.push("/dashboard");
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Login failed",
      );
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
      toast.error(
        err instanceof ApiError ? err.message : "Registration failed",
      );
    } finally {
      setRegLoading(false);
    }
  };

  return (
    <>
      {googleClientId && (
        <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" />
      )}
      {facebookAppId && (
        <Script
          src="https://connect.facebook.net/en_US/sdk.js"
          strategy="afterInteractive"
          onLoad={() => {
            window.FB?.init({ appId: facebookAppId, version: "v19.0" });
          }}
        />
      )}
      <main className="flex min-h-screen items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">AI Marketing Platform</CardTitle>
            <CardDescription>
              Sign in or create an account to get started
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(googleClientId || facebookAppId) && (
              <div className="space-y-3 mb-6">
                {googleClientId && (
                  <div ref={googleBtnRef} className="flex justify-center" />
                )}
                {facebookAppId && (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    disabled={socialLoading}
                    onClick={handleFacebookLogin}
                  >
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                    Continue with Facebook
                  </Button>
                )}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Or continue with email
                    </span>
                  </div>
                </div>
              </div>
            )}
            <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <Input
                    id="login-password"
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loginLoading}>
                  {loginLoading ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reg-name">Name</Label>
                  <Input
                    id="reg-name"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-email">Email</Label>
                  <Input
                    id="reg-email"
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-password">Password</Label>
                  <Input
                    id="reg-password"
                    type="password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={regLoading}>
                  {regLoading ? "Creating account..." : "Create Account"}
                </Button>
              </form>
            </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
