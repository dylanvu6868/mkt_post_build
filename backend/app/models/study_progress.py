from datetime import datetime
from typing import Dict, Any

from sqlalchemy import JSON, DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base

class StudyProgress(Base):
    __tablename__ = "study_progress"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    topic_id: Mapped[str] = mapped_column(String(100), primary_key=True)
    
    # Store {"completed": ["q1", "q2"], "score": 10, "last_accessed": ...}
    progress_data: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)
    
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
