from pydantic import BaseModel


class GenerateRequest(BaseModel):
    project_id: int
    content_type: str = "facebook_post"
    brief: str
    marketing_goal: str = ""


class JobResponse(BaseModel):
    job_id: int
    status: str


class JobStatusResponse(BaseModel):
    id: int
    status: str
    current_step: str | None = None
    result: dict | None = None
    error: str | None = None
