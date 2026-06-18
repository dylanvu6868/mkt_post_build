# M6 — Expand Content Types + README + Polish

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the remaining 4 content types (SEO Blog, Email, Landing Page, TikTok Script), update the frontend to let users pick content type and render each type's output, and ship a project README + polished `.env.example`.

**Architecture:** Add Pydantic draft schemas per content type. The copywriter agent routes by `content_type` to produce the right schema. The reviewer becomes type-aware so its `final_content` matches the draft schema. `SUPPORTED_CONTENT_TYPES` expands from `{"facebook_post"}` to all five. The frontend generate page gets a type selector and a per-type result renderer. The history page also renders per-type output.

**Tech Stack:** FastAPI, SQLAlchemy 2.0 async, Pydantic v2, LangGraph, pytest-asyncio, Next.js 14, React 18, TypeScript, shadcn/ui, TanStack Query.

## Global Constraints

- Python 3.12+, FastAPI, SQLAlchemy 2.0 async (asyncpg), Alembic, Pydantic v2
- Next.js 14 App Router, `@/*` path alias, shadcn/ui, Zustand, TanStack Query
- All external LLM calls mocked in tests via `provider_available: False`
- Mock mode returns schema-valid sample data so the full pipeline runs offline
- Ownership enforcement on all backend endpoints
- Five content types: `facebook_post`, `seo_blog`, `email`, `landing_page`, `tiktok_script`

---

## File Structure

```
backend/
  app/
    schemas/
      agents.py                        # MODIFY: add 4 new draft schemas + union + Review generalized
    agents/
      copywriter.py                    # MODIFY: route by content_type, mock data per type
      reviewer.py                      # MODIFY: accept any draft type, type-aware review
    api/
      generate.py                      # MODIFY: expand SUPPORTED_CONTENT_TYPES
  tests/
    test_agents.py                     # MODIFY: add tests for each new content type
    test_generate.py                   # MODIFY: update test that rejected tiktok_script → now accepts it

frontend/
  app/(app)/
    generate/
      page.tsx                         # MODIFY: add content_type selector, per-type result renderer
    history/
      page.tsx                         # MODIFY: per-type output rendering in list + dialog

README.md                              # CREATE: project README
.env.example                           # MODIFY: add RAG settings, comments
```

---

### Task 1: Backend — add 4 new draft schemas + generalize copywriter + reviewer

**Files:**
- Modify: `backend/app/schemas/agents.py`
- Modify: `backend/app/agents/copywriter.py`
- Modify: `backend/app/agents/reviewer.py`
- Modify: `backend/app/api/generate.py`
- Modify: `backend/tests/test_agents.py`
- Modify: `backend/tests/test_generate.py`

**Interfaces:**
- Consumes: `generate_structured()` from `app.agents.base`, `GraphState` from `app.graph.state`, existing `FacebookPostDraft` and `Review` schemas
- Produces: `SeoBlogDraft`, `EmailDraft`, `LandingPageDraft`, `TikTokScriptDraft` schemas, `DRAFT_SCHEMAS` dict mapping content_type → schema class, updated `Review` with `final_content: dict` (generic), expanded `SUPPORTED_CONTENT_TYPES`

- [ ] **Step 1: Write failing tests for new content types** — append to `backend/tests/test_agents.py`

```python
async def test_copywriter_mock_produces_seo_blog():
    state = _downstream_state()
    state["content_type"] = "seo_blog"
    state["fused_brief"] = {"unified_brief": "write a blog post"}
    out = await copywriter(state)
    assert "seo_title" in out["draft"]
    assert "blog_content" in out["draft"]
    assert "faq" in out["draft"]


async def test_copywriter_mock_produces_email():
    state = _downstream_state()
    state["content_type"] = "email"
    state["fused_brief"] = {"unified_brief": "write an email"}
    out = await copywriter(state)
    assert "subject" in out["draft"]
    assert "body" in out["draft"]
    assert "cta" in out["draft"]


async def test_copywriter_mock_produces_landing_page():
    state = _downstream_state()
    state["content_type"] = "landing_page"
    state["fused_brief"] = {"unified_brief": "write a landing page"}
    out = await copywriter(state)
    assert "headline" in out["draft"]
    assert "subheadline" in out["draft"]
    assert "benefits" in out["draft"]
    assert "cta" in out["draft"]


async def test_copywriter_mock_produces_tiktok_script():
    state = _downstream_state()
    state["content_type"] = "tiktok_script"
    state["fused_brief"] = {"unified_brief": "write a tiktok script"}
    out = await copywriter(state)
    assert "hook" in out["draft"]
    assert "script" in out["draft"]
    assert "cta" in out["draft"]


async def test_reviewer_mock_handles_seo_blog():
    state = _downstream_state()
    state["content_type"] = "seo_blog"
    state["draft"] = {
        "seo_title": "title",
        "meta_description": "desc",
        "outline": ["intro"],
        "blog_content": "content",
        "faq": [{"question": "q", "answer": "a"}],
    }
    out = await reviewer(state)
    assert 0 <= out["review"]["score"] <= 100
    assert out["final"]["seo_title"]


async def test_reviewer_mock_handles_email():
    state = _downstream_state()
    state["content_type"] = "email"
    state["draft"] = {"subject": "s", "body": "b", "cta": "c"}
    out = await reviewer(state)
    assert 0 <= out["review"]["score"] <= 100
    assert out["final"]["subject"]
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `.\.venv\Scripts\python.exe -m pytest tests/test_agents.py -v`
Expected: FAIL — `_downstream_state()` doesn't set `content_type`, new copywriter/reviewer logic doesn't exist yet.

- [ ] **Step 3: Add draft schemas to `backend/app/schemas/agents.py`**

Replace the entire file:

```python
from pydantic import BaseModel, Field


class Plan(BaseModel):
    tasks: list[str] = Field(default_factory=lambda: ["research", "seo", "brand"])


class Research(BaseModel):
    pain_points: list[str]
    customer_motivations: list[str]
    product_benefits: list[str]
    industry_context: str


class SEO(BaseModel):
    primary_keyword: str
    secondary_keywords: list[str]
    search_intent: str
    meta_description: str


class BrandContext(BaseModel):
    relevant_context: list[str]
    brand_notes: str


class FusedBrief(BaseModel):
    unified_brief: str


# --- Content type drafts ---

class FacebookPostDraft(BaseModel):
    hook: str
    body: str
    cta: str
    hashtags: list[str]


class FAQItem(BaseModel):
    question: str
    answer: str


class SeoBlogDraft(BaseModel):
    seo_title: str
    meta_description: str
    outline: list[str]
    blog_content: str
    faq: list[FAQItem]


class EmailDraft(BaseModel):
    subject: str
    body: str
    cta: str


class LandingPageDraft(BaseModel):
    headline: str
    subheadline: str
    benefits: list[str]
    cta: str


class TikTokScriptDraft(BaseModel):
    hook: str
    script: str
    cta: str


DRAFT_SCHEMAS: dict[str, type[BaseModel]] = {
    "facebook_post": FacebookPostDraft,
    "seo_blog": SeoBlogDraft,
    "email": EmailDraft,
    "landing_page": LandingPageDraft,
    "tiktok_script": TikTokScriptDraft,
}


class Review(BaseModel):
    score: int
    suggestions: list[str]
    final_content: dict
```

- [ ] **Step 4: Update `backend/app/agents/copywriter.py`** — route by content_type

Replace the entire file:

```python
from typing import Any

from pydantic import BaseModel

from app.agents.base import generate_structured
from app.schemas.agents import (
    DRAFT_SCHEMAS,
    EmailDraft,
    FAQItem,
    FacebookPostDraft,
    LandingPageDraft,
    SeoBlogDraft,
    TikTokScriptDraft,
)

SYSTEM_TEMPLATES: dict[str, str] = {
    "facebook_post": (
        "You are an expert Facebook copywriter. Use the AIDA framework. Honor the "
        "brand voice (tone, preferred and forbidden words) if provided. Return a "
        "structured post with a hook, body, CTA, and hashtags."
    ),
    "seo_blog": (
        "You are an expert SEO blog writer. Write a search-optimized blog post with "
        "an SEO title, meta description, outline, full blog content, and FAQ section. "
        "Honor the brand voice if provided."
    ),
    "email": (
        "You are an expert email marketer. Write a marketing email with a compelling "
        "subject line, engaging body, and clear CTA. Honor the brand voice if provided."
    ),
    "landing_page": (
        "You are an expert landing page copywriter. Write a high-converting landing "
        "page with headline, subheadline, benefits list, and CTA. Honor the brand "
        "voice if provided."
    ),
    "tiktok_script": (
        "You are an expert TikTok content creator. Write a short, engaging TikTok "
        "script with a hook (first 3 seconds), main script, and CTA. Honor the brand "
        "voice if provided."
    ),
}


def _format_brand_voice(brand_profile: dict[str, Any]) -> str:
    if not brand_profile:
        return ""

    parts: list[str] = []
    if brand_profile.get("brand_name"):
        parts.append(f"Brand name: {brand_profile['brand_name']}")
    if brand_profile.get("tone"):
        parts.append(f"Tone: {brand_profile['tone']}")
    if brand_profile.get("writing_style"):
        parts.append(f"Writing style: {brand_profile['writing_style']}")
    if brand_profile.get("preferred_words"):
        parts.append(
            f"Preferred words (use these): {', '.join(brand_profile['preferred_words'])}"
        )
    if brand_profile.get("forbidden_words"):
        parts.append(
            f"Forbidden words (NEVER use these): {', '.join(brand_profile['forbidden_words'])}"
        )

    if not parts:
        return ""
    return "Brand voice:\n" + "\n".join(parts)


def _mock_draft(content_type: str, brief: str, brand_profile: dict[str, Any]) -> BaseModel:
    brand_name = brand_profile.get("brand_name", "")
    tone = brand_profile.get("tone", "")
    tag = (brief.replace(" ", "") or "marketing").lower()

    hook_prefix = f"{brand_name}: " if brand_name else ""
    tone_note = f" Our {tone} approach sets us apart." if tone else ""

    if content_type == "facebook_post":
        return FacebookPostDraft(
            hook=f"{hook_prefix}Struggling with {brief}? You're not alone. \U0001f680",
            body=(
                f"Meet the smarter way to handle {brief}. Built to save you "
                f"time and deliver real results — so you can focus on what "
                f"matters most.{tone_note}"
            ),
            cta="\U0001f449 Learn more today!",
            hashtags=[f"#{tag}", "#marketing", "#growth"],
        )

    if content_type == "seo_blog":
        return SeoBlogDraft(
            seo_title=f"{hook_prefix}{brief.title()} — The Complete Guide",
            meta_description=f"Learn everything about {brief}. Tips, strategies, and expert insights.",
            outline=["Introduction", "Key Benefits", "How It Works", "Conclusion"],
            blog_content=(
                f"# {brief.title()}\n\n"
                f"In today's market, {brief} is more important than ever.{tone_note} "
                f"This comprehensive guide covers everything you need to know."
            ),
            faq=[
                FAQItem(question=f"What is {brief}?", answer=f"{brief} is a key strategy for modern marketing."),
                FAQItem(question=f"Why is {brief} important?", answer=f"It helps businesses grow and reach their audience."),
            ],
        )

    if content_type == "email":
        return EmailDraft(
            subject=f"{hook_prefix}Discover the power of {brief}",
            body=(
                f"Hi there,\n\nWe wanted to share something exciting about {brief}. "
                f"Our latest insights show that this approach can transform your results.{tone_note}"
            ),
            cta="Click here to learn more",
        )

    if content_type == "landing_page":
        return LandingPageDraft(
            headline=f"{hook_prefix}{brief.title()} — Transform Your Results",
            subheadline=f"The smarter way to approach {brief} for modern businesses",
            benefits=[
                f"Save time with automated {brief}",
                "Get real, measurable results",
                "Easy to set up and use",
            ],
            cta="Get Started Free",
        )

    # tiktok_script
    return TikTokScriptDraft(
        hook=f"{hook_prefix}Stop scrolling! This changes everything about {brief} \U0001f525",
        script=(
            f"Here's why {brief} matters more than ever. "
            f"Most people get this wrong, but here's the secret.{tone_note}"
        ),
        cta=f"Follow for more tips on {brief}!",
    )


async def copywriter(state: dict[str, Any]) -> dict[str, Any]:
    brief = state["brief"]
    brand_profile = state.get("brand_profile") or {}
    content_type = state.get("content_type", "facebook_post")

    if not state.get("provider_available"):
        draft = _mock_draft(content_type, brief, brand_profile)
        return {"draft": draft.model_dump()}

    system = SYSTEM_TEMPLATES.get(content_type, SYSTEM_TEMPLATES["facebook_post"])
    schema = DRAFT_SCHEMAS.get(content_type, FacebookPostDraft)

    brand_voice_section = _format_brand_voice(brand_profile)
    user = (
        f"Topic: {brief}\n"
        f"Creative brief: {state.get('fused_brief')}\n"
        f"{brand_voice_section}"
    )
    result = await generate_structured("smart", system, user, schema)
    return {"draft": result.model_dump()}
```

- [ ] **Step 5: Update `backend/app/agents/reviewer.py`** — handle all content types

Replace the entire file:

```python
from typing import Any

from app.agents.base import generate_structured
from app.schemas.agents import DRAFT_SCHEMAS, Review

SYSTEM_TEMPLATES: dict[str, str] = {
    "facebook_post": (
        "You are a senior content editor. Score the draft from 0 to 100, list concrete "
        "suggestions, and return an improved final version of the Facebook post "
        "(single pass — no further revision)."
    ),
    "seo_blog": (
        "You are a senior content editor specializing in SEO. Score the blog draft from "
        "0 to 100, list concrete suggestions for SEO and readability, and return an "
        "improved final version (single pass — no further revision)."
    ),
    "email": (
        "You are a senior email marketing editor. Score the email draft from 0 to 100, "
        "list concrete suggestions for open rate and conversion, and return an improved "
        "final version (single pass — no further revision)."
    ),
    "landing_page": (
        "You are a senior conversion copywriter. Score the landing page draft from "
        "0 to 100, list concrete suggestions for conversion optimization, and return "
        "an improved final version (single pass — no further revision)."
    ),
    "tiktok_script": (
        "You are a senior TikTok content strategist. Score the script from 0 to 100, "
        "list concrete suggestions for engagement and watch time, and return an "
        "improved final version (single pass — no further revision)."
    ),
}


async def reviewer(state: dict[str, Any]) -> dict[str, Any]:
    draft = state.get("draft", {})
    content_type = state.get("content_type", "facebook_post")

    if not state.get("provider_available"):
        final = dict(draft)
        if "cta" in final:
            final["cta"] = f"{final['cta']} Limited time only!".strip()
        review = Review(
            score=85,
            suggestions=["Tighten the hook.", "Add urgency to the CTA."],
            final_content=final,
        )
        return {
            "review": review.model_dump(),
            "final": final,
        }

    system = SYSTEM_TEMPLATES.get(content_type, SYSTEM_TEMPLATES["facebook_post"])
    user = f"Content type: {content_type}\nBrief: {state['brief']}\nDraft to review: {draft}"
    result = await generate_structured("smart", system, user, Review)
    return {
        "review": result.model_dump(),
        "final": result.final_content,
    }
```

- [ ] **Step 6: Update `backend/app/api/generate.py`** — expand SUPPORTED_CONTENT_TYPES

Change line 16:

```python
SUPPORTED_CONTENT_TYPES = {"facebook_post", "seo_blog", "email", "landing_page", "tiktok_script"}
```

- [ ] **Step 7: Update `backend/tests/test_agents.py`** — add `content_type` to `_downstream_state()` and fix existing tests

Update `_downstream_state()` to include `content_type`:

```python
def _downstream_state():
    return {
        "brief": "eco-friendly water bottles",
        "marketing_goal": "brand awareness",
        "content_type": "facebook_post",
        "provider_available": False,
        "brand_profile": {},
        "research": {
            "pain_points": ["p"],
            "customer_motivations": ["m"],
            "product_benefits": ["b"],
            "industry_context": "c",
        },
        "seo": {
            "primary_keyword": "eco water bottle",
            "secondary_keywords": ["reusable bottle"],
            "search_intent": "informational",
            "meta_description": "m",
        },
        "brand_context": {"relevant_context": [], "brand_notes": "none"},
        "errors": [],
    }
```

Update the existing reviewer test to use `dict` for `final_content` validation:

```python
async def test_reviewer_mock_scores_and_returns_final():
    state = _downstream_state()
    state["draft"] = {
        "hook": "h",
        "body": "b",
        "cta": "Buy now",
        "hashtags": ["#eco"],
    }
    out = await reviewer(state)
    review = Review(**out["review"])
    assert 0 <= review.score <= 100
    assert review.suggestions
    assert out["final"]["hook"]
```

- [ ] **Step 8: Update `backend/tests/test_generate.py`** — tiktok_script is now valid

Change the `test_generate_rejects_unsupported_content_type` test to use a truly unsupported type:

```python
async def test_generate_rejects_unsupported_content_type(client):
    token = await _register(client, "ct@example.com")
    headers = {"Authorization": f"Bearer {token}"}
    project_id = await _project(client, headers)
    resp = await client.post(
        "/generate",
        json={
            "project_id": project_id,
            "content_type": "billboard_ad",
            "brief": "x",
        },
        headers=headers,
    )
    assert resp.status_code == 400
```

- [ ] **Step 9: Run full backend test suite**

Run: `.\.venv\Scripts\python.exe -m pytest tests/ -v`
Expected: All tests PASS (existing + 6 new agent tests).

- [ ] **Step 10: Commit**

```bash
git add backend/app/schemas/agents.py backend/app/agents/copywriter.py \
  backend/app/agents/reviewer.py backend/app/api/generate.py \
  backend/tests/test_agents.py backend/tests/test_generate.py
git commit -m "feat(backend): expand to 5 content types (seo_blog, email, landing_page, tiktok_script)"
```

---

### Task 2: Frontend — content type selector + per-type result rendering

**Files:**
- Modify: `frontend/app/(app)/generate/page.tsx`
- Modify: `frontend/app/(app)/history/page.tsx`

**Interfaces:**
- Consumes: `useGenerate()` hook (unchanged), `useProjectStore`, shadcn components, `useHistory()` + `useDeleteHistory()`
- Produces: updated generate page with content_type select, per-type renderers in both generate and history pages

- [ ] **Step 1: Modify `frontend/app/(app)/generate/page.tsx`**

Replace the entire file:

```tsx
"use client";

import { useState } from "react";
import { useProjectStore } from "@/store/project";
import { useGenerate } from "@/hooks/use-generate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const AGENT_STEPS = [
  "planner",
  "research",
  "seo",
  "brand",
  "fusion",
  "copywriter",
  "reviewer",
];

const CONTENT_TYPES = [
  { value: "facebook_post", label: "Facebook Post" },
  { value: "seo_blog", label: "SEO Blog" },
  { value: "email", label: "Email" },
  { value: "landing_page", label: "Landing Page" },
  { value: "tiktok_script", label: "TikTok Script" },
];

function DraftRenderer({
  contentType,
  draft,
}: {
  contentType: string;
  draft: Record<string, unknown>;
}) {
  if (contentType === "facebook_post") {
    const d = draft as {
      hook?: string;
      body?: string;
      cta?: string;
      hashtags?: string[];
    };
    return (
      <div className="space-y-4">
        <Field label="HOOK" value={d.hook} bold />
        <Field label="BODY" value={d.body} pre />
        <Field label="CTA" value={d.cta} medium />
        {d.hashtags && (
          <div className="flex gap-1 flex-wrap">
            {d.hashtags.map((tag) => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (contentType === "seo_blog") {
    const d = draft as {
      seo_title?: string;
      meta_description?: string;
      outline?: string[];
      blog_content?: string;
      faq?: { question: string; answer: string }[];
    };
    return (
      <div className="space-y-4">
        <Field label="SEO TITLE" value={d.seo_title} bold />
        <Field label="META DESCRIPTION" value={d.meta_description} />
        {d.outline && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">
              OUTLINE
            </p>
            <ul className="list-disc list-inside text-sm space-y-1">
              {d.outline.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        )}
        <Field label="BLOG CONTENT" value={d.blog_content} pre />
        {d.faq && d.faq.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">
              FAQ
            </p>
            <div className="space-y-2">
              {d.faq.map((item, i) => (
                <div key={i} className="rounded-md border p-3">
                  <p className="text-sm font-medium">{item.question}</p>
                  <p className="text-sm text-muted-foreground">{item.answer}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (contentType === "email") {
    const d = draft as { subject?: string; body?: string; cta?: string };
    return (
      <div className="space-y-4">
        <Field label="SUBJECT" value={d.subject} bold />
        <Field label="BODY" value={d.body} pre />
        <Field label="CTA" value={d.cta} medium />
      </div>
    );
  }

  if (contentType === "landing_page") {
    const d = draft as {
      headline?: string;
      subheadline?: string;
      benefits?: string[];
      cta?: string;
    };
    return (
      <div className="space-y-4">
        <Field label="HEADLINE" value={d.headline} bold />
        <Field label="SUBHEADLINE" value={d.subheadline} />
        {d.benefits && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">
              BENEFITS
            </p>
            <ul className="list-disc list-inside text-sm space-y-1">
              {d.benefits.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          </div>
        )}
        <Field label="CTA" value={d.cta} medium />
      </div>
    );
  }

  if (contentType === "tiktok_script") {
    const d = draft as { hook?: string; script?: string; cta?: string };
    return (
      <div className="space-y-4">
        <Field label="HOOK (first 3s)" value={d.hook} bold />
        <Field label="SCRIPT" value={d.script} pre />
        <Field label="CTA" value={d.cta} medium />
      </div>
    );
  }

  return (
    <pre className="text-sm whitespace-pre-wrap">
      {JSON.stringify(draft, null, 2)}
    </pre>
  );
}

function Field({
  label,
  value,
  bold,
  medium,
  pre,
}: {
  label: string;
  value?: string;
  bold?: boolean;
  medium?: boolean;
  pre?: boolean;
}) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
      <p
        className={
          bold
            ? "text-lg font-semibold"
            : medium
              ? "font-medium"
              : pre
                ? "whitespace-pre-wrap"
                : ""
        }
      >
        {value}
      </p>
    </div>
  );
}

export default function GeneratePage() {
  const activeProject = useProjectStore((s) => s.activeProject);
  const { start, jobStatus, polling, reset } = useGenerate();

  const [brief, setBrief] = useState("");
  const [goal, setGoal] = useState("");
  const [contentType, setContentType] = useState("facebook_post");
  const [loading, setLoading] = useState(false);

  if (!activeProject) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Content Generator</h1>
        <p className="text-muted-foreground">
          Select a project first from the Projects page.
        </p>
      </div>
    );
  }

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brief.trim()) return;
    setLoading(true);
    try {
      await start({
        project_id: activeProject.id,
        content_type: contentType,
        brief: brief.trim(),
        marketing_goal: goal.trim(),
      });
    } catch {
      toast.error("Failed to start generation");
    } finally {
      setLoading(false);
    }
  };

  const draft = jobStatus?.result?.draft as Record<string, unknown> | undefined;

  const review = jobStatus?.result?.review as
    | { score?: number; suggestions?: string[] }
    | undefined;

  const typeLabel =
    CONTENT_TYPES.find((t) => t.value === contentType)?.label ?? contentType;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Content Generator</h1>

      {!jobStatus && (
        <Card>
          <CardHeader>
            <CardTitle>Generate Content</CardTitle>
            <CardDescription>
              Choose a content type, describe your topic, and the AI agents will
              create it
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleGenerate} className="space-y-4 max-w-lg">
              <div className="space-y-2">
                <Label htmlFor="content-type">Content Type</Label>
                <Select value={contentType} onValueChange={setContentType}>
                  <SelectTrigger id="content-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTENT_TYPES.map((ct) => (
                      <SelectItem key={ct.value} value={ct.value}>
                        {ct.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="brief">Topic / Brief</Label>
                <Textarea
                  id="brief"
                  value={brief}
                  onChange={(e) => setBrief(e.target.value)}
                  placeholder="e.g. eco-friendly water bottles for active lifestyles"
                  rows={3}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="goal">Marketing Goal (optional)</Label>
                <Input
                  id="goal"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="e.g. awareness, engagement, conversion"
                />
              </div>
              <Button type="submit" disabled={loading}>
                {loading ? "Starting..." : "Generate"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {jobStatus && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Agent Pipeline
                <Badge
                  variant={
                    jobStatus.status === "done"
                      ? "default"
                      : jobStatus.status === "error"
                        ? "destructive"
                        : "secondary"
                  }
                >
                  {jobStatus.status}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 flex-wrap">
                {AGENT_STEPS.map((step) => {
                  const currentIdx = AGENT_STEPS.indexOf(
                    jobStatus.current_step ?? "",
                  );
                  const stepIdx = AGENT_STEPS.indexOf(step);
                  let variant: "default" | "secondary" | "outline" = "outline";
                  if (jobStatus.status === "done" || stepIdx < currentIdx) {
                    variant = "default";
                  } else if (stepIdx === currentIdx) {
                    variant = "secondary";
                  }
                  return (
                    <Badge key={step} variant={variant}>
                      {step}
                    </Badge>
                  );
                })}
              </div>
              {polling && (
                <p className="mt-3 text-sm text-muted-foreground animate-pulse">
                  Processing...
                </p>
              )}
              {jobStatus.status === "error" && (
                <p className="mt-3 text-sm text-destructive">
                  Error: {jobStatus.error}
                </p>
              )}
            </CardContent>
          </Card>

          {jobStatus.status === "done" && draft && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Generated {typeLabel}
                  {review?.score != null && (
                    <Badge variant="secondary">
                      Score: {review.score}/100
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <DraftRenderer contentType={contentType} draft={draft} />
                {review?.suggestions && review.suggestions.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      REVIEWER SUGGESTIONS
                    </p>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      {review.suggestions.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {(jobStatus.status === "done" || jobStatus.status === "error") && (
            <Button
              variant="outline"
              onClick={() => {
                reset();
                setBrief("");
                setGoal("");
              }}
            >
              Generate Another
            </Button>
          )}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Modify `frontend/app/(app)/history/page.tsx`** — per-type rendering

Replace the entire file:

```tsx
"use client";

import { useState } from "react";
import { useProjectStore } from "@/store/project";
import { useHistory, useDeleteHistory } from "@/hooks/use-history";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface HistoryItem {
  id: number;
  project_id: number;
  content_type: string;
  prompt: string;
  output: Record<string, unknown> | null;
  score: number | null;
  created_at: string;
}

const TYPE_LABELS: Record<string, string> = {
  facebook_post: "Facebook Post",
  seo_blog: "SEO Blog",
  email: "Email",
  landing_page: "Landing Page",
  tiktok_script: "TikTok Script",
};

function DraftViewer({
  contentType,
  draft,
}: {
  contentType: string;
  draft: Record<string, unknown>;
}) {
  if (contentType === "facebook_post") {
    const d = draft as {
      hook?: string;
      body?: string;
      cta?: string;
      hashtags?: string[];
    };
    return (
      <div className="space-y-4">
        <ViewField label="HOOK" value={d.hook} bold />
        <ViewField label="BODY" value={d.body} pre />
        <ViewField label="CTA" value={d.cta} />
        {d.hashtags && (
          <div className="flex gap-1 flex-wrap">
            {d.hashtags.map((tag) => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (contentType === "seo_blog") {
    const d = draft as {
      seo_title?: string;
      meta_description?: string;
      outline?: string[];
      blog_content?: string;
      faq?: { question: string; answer: string }[];
    };
    return (
      <div className="space-y-4">
        <ViewField label="SEO TITLE" value={d.seo_title} bold />
        <ViewField label="META DESCRIPTION" value={d.meta_description} />
        {d.outline && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">OUTLINE</p>
            <ul className="list-disc list-inside text-sm space-y-1">
              {d.outline.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        )}
        <ViewField label="BLOG CONTENT" value={d.blog_content} pre />
        {d.faq && d.faq.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">FAQ</p>
            <div className="space-y-2">
              {d.faq.map((item, i) => (
                <div key={i} className="rounded-md border p-3">
                  <p className="text-sm font-medium">{item.question}</p>
                  <p className="text-sm text-muted-foreground">{item.answer}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (contentType === "email") {
    const d = draft as { subject?: string; body?: string; cta?: string };
    return (
      <div className="space-y-4">
        <ViewField label="SUBJECT" value={d.subject} bold />
        <ViewField label="BODY" value={d.body} pre />
        <ViewField label="CTA" value={d.cta} />
      </div>
    );
  }

  if (contentType === "landing_page") {
    const d = draft as {
      headline?: string;
      subheadline?: string;
      benefits?: string[];
      cta?: string;
    };
    return (
      <div className="space-y-4">
        <ViewField label="HEADLINE" value={d.headline} bold />
        <ViewField label="SUBHEADLINE" value={d.subheadline} />
        {d.benefits && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">BENEFITS</p>
            <ul className="list-disc list-inside text-sm space-y-1">
              {d.benefits.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          </div>
        )}
        <ViewField label="CTA" value={d.cta} />
      </div>
    );
  }

  if (contentType === "tiktok_script") {
    const d = draft as { hook?: string; script?: string; cta?: string };
    return (
      <div className="space-y-4">
        <ViewField label="HOOK (first 3s)" value={d.hook} bold />
        <ViewField label="SCRIPT" value={d.script} pre />
        <ViewField label="CTA" value={d.cta} />
      </div>
    );
  }

  return (
    <pre className="text-sm whitespace-pre-wrap">
      {JSON.stringify(draft, null, 2)}
    </pre>
  );
}

function ViewField({
  label,
  value,
  bold,
  pre,
}: {
  label: string;
  value?: string;
  bold?: boolean;
  pre?: boolean;
}) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
      <p
        className={
          bold ? "text-lg font-semibold" : pre ? "whitespace-pre-wrap" : ""
        }
      >
        {value}
      </p>
    </div>
  );
}

export default function HistoryPage() {
  const activeProject = useProjectStore((s) => s.activeProject);
  const { data: history, isLoading } = useHistory(activeProject?.id);
  const deleteHistory = useDeleteHistory();
  const [selected, setSelected] = useState<HistoryItem | null>(null);

  if (!activeProject) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">History</h1>
        <p className="text-muted-foreground">
          Select a project first from the Projects page.
        </p>
      </div>
    );
  }

  const handleDelete = async (id: number) => {
    try {
      await deleteHistory.mutateAsync(id);
      setSelected(null);
      toast.success("History item deleted");
    } catch {
      toast.error("Failed to delete");
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">History</h1>

      {isLoading && (
        <p className="text-muted-foreground">Loading history...</p>
      )}

      {!isLoading && !history?.length && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No content generated yet. Go to Generate to create your first post.
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {history?.map((item) => (
          <Card key={item.id}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-base">{item.prompt}</CardTitle>
                <CardDescription>
                  {TYPE_LABELS[item.content_type] ?? item.content_type}{" "}
                  &middot;{" "}
                  {new Date(item.created_at).toLocaleDateString()}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {item.score !== null && (
                  <Badge variant="secondary">{item.score}/100</Badge>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelected(item)}
                >
                  View
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(item.id)}
                  disabled={deleteHistory.isPending}
                >
                  Delete
                </Button>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selected?.prompt}</DialogTitle>
          </DialogHeader>
          {selected?.output?.draft && (
            <DraftViewer
              contentType={selected.content_type}
              draft={selected.output.draft as Record<string, unknown>}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

- [ ] **Step 3: Verify frontend build**

```powershell
cd E:\product\mkt_post_build\frontend
npm run build
```

Expected: Build passes with zero errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/app/\(app\)/generate/page.tsx frontend/app/\(app\)/history/page.tsx
git commit -m "feat(frontend): add content type selector + per-type result rendering"
```

---

### Task 3: README + .env.example polish

**Files:**
- Create: `README.md` (project root)
- Modify: `.env.example`

**Interfaces:** none — documentation only.

- [ ] **Step 1: Create `README.md`**

```markdown
# AI Marketing Multi-Agent Platform

An AI-powered marketing content generation platform. A multi-agent system (LangGraph) researches, gathers brand context, generates content, reviews it, and returns a polished marketing asset — all while honoring per-project brand voice.

## Features

- **Multi-Agent Pipeline** — 7 specialized AI agents (Planner, Research, SEO, Brand, Fusion, Copywriter, Reviewer) orchestrated via LangGraph
- **5 Content Types** — Facebook Post, SEO Blog, Email, Landing Page, TikTok Script
- **Brand Voice** — Per-project tone, style, preferred/forbidden words injected into generation
- **RAG Knowledge Base** — Upload PDF/DOCX/TXT documents; Brand agent retrieves relevant context via Qdrant vector search
- **Content History** — Auto-saved generations with score, viewable and deletable
- **JWT Auth** — Register/login with bcrypt password hashing
- **Dark/Light Theme** — Toggle between themes

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI, Python 3.12+, SQLAlchemy 2.0 (async), Alembic, Pydantic v2 |
| AI/ML | LangGraph, LangChain, OpenAI / Anthropic (provider-agnostic) |
| Embeddings | fastembed (BAAI/bge-small-en-v1.5) — local, free |
| Vector DB | Qdrant |
| Database | PostgreSQL 16 |
| Frontend | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS 3, shadcn/ui |
| State | Zustand (client), TanStack Query (server) |

## Quick Start

### Prerequisites

- Docker & Docker Compose
- An OpenAI or Anthropic API key (optional — runs in mock mode without one)

### 1. Clone and configure

```bash
git clone https://github.com/dylanvu6868/mkt_post_build.git
cd mkt_post_build
cp .env.example .env
# Edit .env — add your API key(s) or leave blank for mock mode
```

### 2. Start the stack

```bash
docker compose up --build -d
```

This starts 4 services:
- **db** — PostgreSQL 16 on port 5432
- **qdrant** — Qdrant vector DB on port 6333
- **backend** — FastAPI on port 8000
- **frontend** — Next.js on port 3000

### 3. Run migrations

```bash
docker compose exec backend alembic upgrade head
```

### 4. Open the app

Visit [http://localhost:3000](http://localhost:3000)

1. Register an account
2. Create a project
3. (Optional) Upload brand documents in Knowledge Base
4. (Optional) Configure Brand Voice
5. Go to Generate → pick a content type → enter a brief → Generate
6. View results in History

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Create user, return JWT |
| POST | `/auth/login` | Login, return JWT |
| POST | `/projects` | Create project |
| GET | `/projects` | List user's projects |
| POST | `/documents/upload` | Upload + ingest document into RAG |
| GET | `/documents` | List documents for a project |
| POST | `/brand-profile` | Upsert brand voice config |
| GET | `/brand-profile` | Get brand voice config |
| POST | `/generate` | Start generation pipeline (async) |
| GET | `/generate/{job_id}` | Poll job status + result |
| GET | `/history` | List content history |
| DELETE | `/history/{id}` | Delete a history item |
| GET | `/health` | Health check |

## Development

### Backend (without Docker)

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend (without Docker)

```bash
cd frontend
npm install
npm run dev
```

### Running Tests

```bash
cd backend
python -m pytest tests/ -v
```

Tests use in-memory SQLite and mock mode (no API keys needed).

## Mock Mode

When no LLM API key is configured (or `LLM_PROVIDER=mock`), every agent returns schema-valid sample data. The full pipeline runs offline — useful for development and testing.

## License

MIT
```

- [ ] **Step 2: Update `.env.example`**

```
# ======================
# AI Marketing Platform
# ======================

# LLM Provider (openai | anthropic | mock)
# Set to "mock" or leave API keys blank for offline mode
LLM_PROVIDER=openai
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
LLM_MODEL_FAST=gpt-4o-mini
LLM_MODEL_SMART=gpt-4o

# Database
DATABASE_URL=postgresql+asyncpg://postgres:postgres@db:5432/marketing

# Qdrant (vector database)
QDRANT_URL=http://qdrant:6333
QDRANT_COLLECTION_NAME=marketing_docs

# Auth
JWT_SECRET=change-me-in-prod
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# RAG settings
EMBEDDING_MODEL=BAAI/bge-small-en-v1.5
RAG_CHUNK_SIZE=800
RAG_CHUNK_OVERLAP=100
RAG_TOP_K=5
```

- [ ] **Step 3: Commit**

```bash
git add README.md .env.example
git commit -m "docs: add project README + polish .env.example"
```

---

### Task 4: Final verification

**Files:** none (verification only).

- [ ] **Step 1: Run full backend test suite**

```powershell
cd E:\product\mkt_post_build\backend
.\.venv\Scripts\python.exe -m pytest tests/ -v
```

Expected: All tests pass.

- [ ] **Step 2: Rebuild and verify Docker stack**

```powershell
cd E:\product\mkt_post_build
docker compose up --build -d
docker compose exec backend alembic upgrade head
docker compose ps
```

Expected: All 4 services Up, migrations applied.

- [ ] **Step 3: Verify new content types via API**

```powershell
# Register + get token + create project
$body = @{name="Test"; email="m6test@example.com"; password="secret123"} | ConvertTo-Json
$reg = Invoke-RestMethod -Uri "http://localhost:8000/auth/register" -Method POST -Body $body -ContentType "application/json"
$headers = @{Authorization="Bearer $($reg.access_token)"}
$proj = Invoke-RestMethod -Uri "http://localhost:8000/projects" -Method POST -Body (@{name="M6 Test"} | ConvertTo-Json) -ContentType "application/json" -Headers $headers

# Generate each content type
foreach ($ct in @("seo_blog", "email", "landing_page", "tiktok_script")) {
    $gen = Invoke-RestMethod -Uri "http://localhost:8000/generate" -Method POST -Body (@{project_id=$proj.id; content_type=$ct; brief="test $ct"} | ConvertTo-Json) -ContentType "application/json" -Headers $headers
    $poll = Invoke-RestMethod -Uri "http://localhost:8000/generate/$($gen.job_id)" -Method GET -Headers $headers
    Write-Output "$ct : status=$($poll.status)"
}
```

Expected: All 4 return `status=done`.

- [ ] **Step 4: Verify frontend shows content type selector**

Open `http://localhost:3000/generate` in browser. Verify the content type dropdown shows all 5 types.

- [ ] **Step 5: Verify history shows correct content type labels**

Navigate to History. Verify entries show "SEO Blog", "Email", etc. instead of raw keys.

---

## Definition of Done (M6)

- Backend: All 5 content types generate successfully through the pipeline. Mock mode produces schema-valid output for all types. All backend tests pass.
- Frontend: Generate page has content type selector. Result display and History page render per-type fields.
- `README.md` with quick start, architecture, API reference, dev setup.
- `.env.example` with all config vars documented.
- Docker stack builds and runs with all features working.

## Self-review notes

- **Spec coverage:**
  - §6 content types: Facebook Post (hook, body, cta, hashtags) ✓, SEO Blog (seo_title, meta_description, outline, blog_content, faq) ✓, Email (subject, body, cta) ✓, Landing Page (headline, subheadline, benefits, cta) ✓, TikTok Script (hook, script, cta) ✓
  - §12 M6: "Expand remaining 4 content types + README + polish" ✓
- **Type consistency:** `DRAFT_SCHEMAS` dict keys match `SUPPORTED_CONTENT_TYPES` set, match frontend `CONTENT_TYPES` array values, match `SYSTEM_TEMPLATES` keys in both copywriter and reviewer. `Review.final_content` changed from `FacebookPostDraft` to `dict` to be type-agnostic.
- **No placeholders:** every step has complete code.
- **Test update:** `test_generate_rejects_unsupported_content_type` now uses `"billboard_ad"` since `"tiktok_script"` is now valid.
