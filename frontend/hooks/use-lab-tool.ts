"use client";

import { useState, useCallback } from "react";
import { api } from "@/services/api";

interface UseLabToolReturn<T> {
  run: (body: Record<string, unknown>) => Promise<void>;
  result: T | null;
  setResult: (value: T | null) => void;
  loading: boolean;
  error: string | null;
  reset: () => void;
}

export function useLabTool<T>(endpoint: string): UseLabToolReturn<T> {
  const [result, setResult] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (body: Record<string, unknown>) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await api.post<T>(`/api/lab${endpoint}`, body);
      setResult(data);
    } catch (e: unknown) {
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError("Có lỗi xảy ra. Vui lòng thử lại.");
      }
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return { run, result, setResult, loading, error, reset };
}
