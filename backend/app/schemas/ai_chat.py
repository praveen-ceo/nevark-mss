from __future__ import annotations
from typing import Any
from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=500)


class ChatResponse(BaseModel):
    answer: str
    intent: str
    data: list[dict[str, Any]] = []
