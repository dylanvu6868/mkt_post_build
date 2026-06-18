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
