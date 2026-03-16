"""Simple offline training script for spending prediction.

Usage:
1) Put CSV as ml-model/expenses.csv with columns: day, expense
2) pip install pandas scikit-learn
3) python training.py
"""

from pathlib import Path

import pandas as pd
from sklearn.ensemble import RandomForestRegressor

DATA_PATH = Path(__file__).with_name("expenses.csv")


def main() -> None:
    if not DATA_PATH.exists():
        raise FileNotFoundError("Create expenses.csv with columns: day, expense")

    data = pd.read_csv(DATA_PATH)
    x = data[["day"]]
    y = data["expense"]

    model = RandomForestRegressor(random_state=42)
    model.fit(x, y)

    prediction = model.predict([[30]])
    print(f"Predicted expense for day 30: ₹{prediction[0]:.2f}")


if __name__ == "__main__":
    main()
