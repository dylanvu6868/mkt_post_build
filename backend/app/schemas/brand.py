from pydantic import BaseModel, Field


class BrandProfileUpsert(BaseModel):
    project_id: int
    brand_name: str = ""
    tone: str = ""
    writing_style: str = ""
    preferred_words: list[str] = Field(default_factory=list)
    forbidden_words: list[str] = Field(default_factory=list)


class BrandProfileResponse(BaseModel):
    id: int
    project_id: int
    brand_name: str
    tone: str
    writing_style: str
    preferred_words: list[str]
    forbidden_words: list[str]

    model_config = {"from_attributes": True}
