import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
import joblib
import os

# Create model directory if it doesn't exist
os.makedirs('model', exist_ok=True)

print("=" * 60)
print("SMARTLOAN ML MODEL TRAINING")
print("=" * 60)

# Load data
print("\n[1] Loading synthetic data...")
df = pd.read_csv('data/synthetic_data.csv')
print(f"✓ Loaded {len(df)} records")

# Prepare features and target
feature_columns = ['loan_amount', 'duration', 'monthly_income', 'existing_debts', 'credit_score', 'debt_to_income_ratio', 'loan_to_income_ratio']
X = df[feature_columns].copy()
y = df['approved'].copy()

print(f"✓ Features: {len(feature_columns)}")
print(f"✓ Target distribution: {(y==1).sum()} approved, {(y==0).sum()} rejected")

# Split data
print("\n[2] Splitting data (80/20 train/test)...")
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
print(f"✓ Train set: {len(X_train)} samples")
print(f"✓ Test set: {len(X_test)} samples")

# Scale features
print("\n[3] Scaling features...")
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)
print("✓ StandardScaler applied")

# Train model
print("\n[4] Training Random Forest Classifier...")
model = RandomForestClassifier(
    n_estimators=100,
    max_depth=15,
    min_samples_split=5,
    min_samples_leaf=2,
    random_state=42,
    n_jobs=-1
)
model.fit(X_train_scaled, y_train)
print("✓ Model trained successfully")

# Evaluate
print("\n[5] Model Evaluation:")
train_score = model.score(X_train_scaled, y_train)
test_score = model.score(X_test_scaled, y_test)
print(f"  - Training Accuracy: {train_score:.4f}")
print(f"  - Testing Accuracy:  {test_score:.4f}")

# Feature importance
print("\n[6] Feature Importance:")
for name, importance in sorted(zip(feature_columns, model.feature_importances_), key=lambda x: x[1], reverse=True):
    print(f"  - {name}: {importance:.4f}")

# Save model and scaler
print("\n[7] Saving model and scaler...")
os.makedirs('model', exist_ok=True)
joblib.dump(model, 'model/loan_model.pkl')
joblib.dump(scaler, 'model/scaler.pkl')
print("✓ Model saved to model/loan_model.pkl")
print("✓ Scaler saved to model/scaler.pkl")

print("\n" + "=" * 60)
print("TRAINING COMPLETE")
print("=" * 60)
