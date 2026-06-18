import { useState, useCallback } from "react";
import { api } from "@/services/api";

interface JobStatus {
  id: number;
  status: "queued" | "running" | "done" | "error";
  current_step: string | null;
  result: Record<string, unknown> | null;
  error: string | null;
}

export function useGenerate() {
  const [jobId, setJobId] = useState<number | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [polling, setPolling] = useState(false);

  const start = useCallback(
    async (payload: {
      project_id: number;
      content_type: string;
      brief: string;
      marketing_goal: string;
    }) => {
      setJobStatus(null);
      const data = await api.post<{ job_id: number; status: string }>(
        "/generate",
        payload,
      );
      setJobId(data.job_id);
      setPolling(true);

      const poll = async () => {
        const status = await api.get<JobStatus>(`/generate/${data.job_id}`);
        setJobStatus(status);
        if (status.status === "done" || status.status === "error") {
          setPolling(false);
          return;
        }
        setTimeout(poll, 1000);
      };
      poll();
    },
    [],
  );

  const reset = useCallback(() => {
    setJobId(null);
    setJobStatus(null);
    setPolling(false);
  }, []);

  return { start, jobId, jobStatus, polling, reset };
}
