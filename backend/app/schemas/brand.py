from pydantic import BaseModel, Field, field_validator


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
    preferred_words: list[str] = []
    forbidden_words: list[str] = []

    @field_validator("preferred_words", "forbidden_words", mode="before")
    @classmethod
    def coerce_none_to_list(cls, v):
        return v if v is not None else []

    model_config = {"from_attributes": True}
