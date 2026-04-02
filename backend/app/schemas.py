from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class IncomeCreate(BaseModel):
    amount: float = Field(gt=0)
    source: str = "Other"
    income_bucket: Literal["cash_in_hand", "bank_account"] = "cash_in_hand"
    date: datetime
    note: str = ""


class ExpenseCreate(BaseModel):
    amount: float = Field(gt=0)
    category: str
    expense_bucket: Literal["cash_in_hand", "bank_account"] = "cash_in_hand"
    date: datetime
    note: str = ""


class Transaction(BaseModel):
    id: int
    kind: Literal["income", "expense"]
    amount: float
    date: datetime
    source: str | None = None
    income_bucket: Literal["cash_in_hand", "bank_account"] | None = None
    category: str | None = None
    note: str = ""


class Summary(BaseModel):
    balance: float
    total_income: float
    total_expense: float
    income_cash_in_hand: float = 0
    income_bank_account: float = 0
    expense_cash_in_hand: float = 0
    expense_bank_account: float = 0
