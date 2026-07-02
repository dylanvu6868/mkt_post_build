"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * useState persisted to localStorage — khôi phục bản nháp khi người dùng
 * thoát trang giữa chừng rồi quay lại.
 *
 * Giá trị object được merge nông với `initial` để an toàn khi thêm field mới.
 * Chỉ dùng cho INPUT của form (chuỗi/object nhỏ), không dùng cho kết quả lớn.
 */
export function useLocalDraft<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) {
        const parsed = JSON.parse(raw);
        setValue((prev) =>
          parsed !== null &&
          typeof parsed === "object" &&
          !Array.isArray(parsed) &&
          prev !== null &&
          typeof prev === "object" &&
          !Array.isArray(prev)
            ? ({ ...(prev as object), ...(parsed as object) } as T)
            : (parsed as T)
        );
      }
    } catch {
      /* dữ liệu hỏng → bỏ qua, dùng initial */
    }
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (!hydrated) return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch {
        /* quota đầy → bỏ qua */
      }
    }, 400);
    return () => clearTimeout(t);
  }, [key, value, hydrated]);

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(key);
    } catch {
      /* noop */
    }
  }, [key]);

  return [value, setValue, clearDraft] as const;
}
