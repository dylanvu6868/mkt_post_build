"use client";

import { useAuthStore } from "@/store/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function Home() {
  const token = useAuthStore((s) => s.token);
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
    if (hydrated) {
      router.replace(token ? "/dashboard" : "/login");
    }
  }, [hydrated, token, router]);

  return null;
}
