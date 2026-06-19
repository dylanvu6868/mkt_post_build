"use client";

import { useAuthStore } from "@/store/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  const refreshUser = useAuthStore((s) => s.refreshUser);
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const unsub = useAuthStore.persist.onFinishHydration(() => setHydrated(true));
    setHydrated(useAuthStore.persist.hasHydrated());
    return () => {
      if (unsub) unsub();
    };
  }, []);

  useEffect(() => {
    if (hydrated && !token) {
      router.replace("/login");
    }
    if (hydrated && token) {
      refreshUser();
    }
  }, [hydrated, token, router, refreshUser]);

  if (!hydrated || !token) return null;
  
  return <>{children}</>;
}
