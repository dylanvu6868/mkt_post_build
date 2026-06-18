from pydantic import BaseModel, Field


class GenerateRequest(BaseModel):
    project_id: int
    content_type: str = Field(default="facebook_post", max_length=50)
    brief: str = Field(min_length=3, max_length=2000)
    marketing_goal: str = Field(default="", max_length=500)


class JobResponse(BaseModel):
    job_id: int
    status: str


class JobStatusResponse(BaseModel):
    id: int
    status: str
    current_step: str | None = None
    result: dict | None = None
    error: str | None = None
