from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class IncomeCreate(BaseModel):
    amount: float = Field(gt=0)
    source: str = "Other"
    date: datetime
    note: str = ""


class ExpenseCreate(BaseModel):
    amount: float = Field(gt=0)
    category: str
    date: datetime
    note: str = ""


class Transaction(BaseModel):
    id: int
    kind: Literal["income", "expense"]
    amount: float
    date: datetime
    source: str | None = None
    category: str | None = None
    note: str = ""


class Summary(BaseModel):
    balance: float
    total_income: float
    total_expense: float
