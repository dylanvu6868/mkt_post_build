"use client";

import { useState } from "react";
import { notFound } from "next/navigation";
import { useLabTool } from "@/hooks/use-lab-tool";
import { findLabTool } from "@/lib/lab-tools";
import { MarkdownRenderer } from "@/lib/markdown";
import {
  LabBreadcrumb,
  ToolHeader,
  RunButton,
  ErrorBox,
  LabInput,
  LabTextarea,
  ResultBox,
  EmptyState,
} from "@/components/lab-ui";
import { FlaskConical } from "lucide-react";

interface GenericToolResult {
  title: string;
  summary: string;
  content: string;
  key_points: string[];
}

export default function GenericLabToolPage({ params }: { params: { toolId: string } }) {
  const tool = findLabTool(params.toolId);
  if (!tool || !tool.fields) {
    notFound();
  }

  const fields = tool.fields!;
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(fields.map((f) => [f.key, ""]))
  );
  const [copied, setCopied] = useState(false);
  const { run, result, loading, error } = useLabTool<GenericToolResult>(`/generic/${tool.id}`);

  const requiredFilled = fields
    .filter((f) => f.required)
    .every((f) => values[f.key]?.trim());

  function setValue(key: string, v: string) {
    setValues((prev) => ({ ...prev, [key]: v }));
  }

  function handleCopy() {
    if (result?.content) {
      navigator.clipboard.writeText(result.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <LabBreadcrumb tool={tool.name} />
      <ToolHeader name={tool.name} description={tool.tagline} tag={tool.tag} />
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {fields.map((field) =>
            field.type === "textarea" ? (
              <LabTextarea
                key={field.key}
                label={field.label}
                value={values[field.key]}
                onChange={(v) => setValue(field.key, v)}
                placeholder={field.placeholder ?? ""}
              />
            ) : (
              <LabInput
                key={field.key}
                label={field.label}
                value={values[field.key]}
                onChange={(v) => setValue(field.key, v)}
                placeholder={field.placeholder}
              />
            )
          )}
          <RunButton
            loading={loading}
            disabled={!requiredFilled}
            onClick={() => run({ inputs: values })}
            loadingText="Đang xử lý..."
            idleText="Chạy công cụ"
          />
          {error && <ErrorBox message={error} />}
        </div>
        <div className="lg:col-span-3 space-y-4">
          {result ? (
            <>
              <ResultBox title={result.title} onCopy={handleCopy} copied={copied}>
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">{result.summary}</p>
                  <div className="prose prose-sm max-w-none prose-headings:text-foreground prose-headings:font-bold prose-h2:text-lg prose-h2:mt-4 prose-p:text-foreground/80 prose-li:text-foreground/80 prose-strong:text-foreground">
                    <MarkdownRenderer content={result.content} />
                  </div>
                </div>
              </ResultBox>
              {result.key_points.length > 0 && (
                <div className="rounded-xl border border-primary/25 bg-primary/5 p-4 space-y-2">
                  <p className="text-[10px] font-bold text-primary uppercase tracking-wider">Điểm chính</p>
                  <ul className="list-disc list-inside space-y-1">
                    {result.key_points.map((point, i) => (
                      <li key={i} className="text-xs text-foreground/80">{point}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <EmptyState
              icon={<FlaskConical size={20} />}
              text="Điền thông tin bên trái và nhấn &quot;Chạy công cụ&quot;"
            />
          )}
        </div>
      </div>
    </div>
  );
}
