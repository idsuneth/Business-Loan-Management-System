"""
SmartLoan BLMS - Comprehensive Test Suite
==========================================
Tests: Unit Testing, AI Model Validation, Edge Cases, Sri Lanka Rules
"""

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix, classification_report
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
import sys
import os

# ============================================================
# SETUP - Load model, scaler, and data
# ============================================================
print("=" * 70)
print("SMARTLOAN BLMS - COMPREHENSIVE TEST SUITE")
print("=" * 70)

model = joblib.load('model/loan_model.pkl')
scaler = joblib.load('model/scaler.pkl')
df = pd.read_csv('data/synthetic_data.csv')

feature_columns = ['loan_amount', 'duration', 'monthly_income', 'existing_debts',
                   'credit_score', 'debt_to_income_ratio', 'loan_to_income_ratio']

total_tests = 0
passed_tests = 0

def test(name, condition, details=""):
    global total_tests, passed_tests
    total_tests += 1
    status = "PASS" if condition else "FAIL"
    if condition:
        passed_tests += 1
    print(f"  [{status}] {name}" + (f" - {details}" if details else ""))
    return condition


# ============================================================
# TEST 1: UNIT TESTING - EMI Calculation Formula
# ============================================================
print("\n" + "=" * 70)
print("TEST 1: UNIT TESTING - EMI Calculation Formula")
print("=" * 70)

def calculate_emi(principal, annual_rate, months):
    if months == 0 or annual_rate == 0:
        return principal / max(months, 1)
    monthly_rate = annual_rate / 12 / 100
    emi = principal * monthly_rate * ((1 + monthly_rate) ** months) / (((1 + monthly_rate) ** months) - 1)
    return emi

# TC-EMI-01: Standard EMI calculation
emi = calculate_emi(1000000, 12, 24)
expected_emi = 47073  # Known correct value for 1M at 12% for 24 months
test("TC-EMI-01: Standard EMI (1M, 12%, 24mo)", abs(emi - expected_emi) < 100,
     f"Calculated: LKR {emi:,.0f}, Expected: ~LKR {expected_emi:,}")

# TC-EMI-02: Zero interest rate
emi_zero = calculate_emi(1200000, 0, 12)
test("TC-EMI-02: Zero interest rate", abs(emi_zero - 100000) < 1,
     f"Calculated: LKR {emi_zero:,.0f}, Expected: LKR 100,000")

# TC-EMI-03: High interest rate
emi_high = calculate_emi(500000, 18, 36)
test("TC-EMI-03: High interest (500K, 18%, 36mo)", emi_high > 0 and emi_high < 500000,
     f"Calculated: LKR {emi_high:,.0f}")

# TC-EMI-04: Short term loan
emi_short = calculate_emi(100000, 15, 6)
test("TC-EMI-04: Short term (100K, 15%, 6mo)", emi_short > 16000 and emi_short < 18000,
     f"Calculated: LKR {emi_short:,.0f}")

# TC-EMI-05: Large loan amount
emi_large = calculate_emi(10000000, 14, 84)
test("TC-EMI-05: Large loan (10M, 14%, 84mo)", emi_large > 0,
     f"Calculated: LKR {emi_large:,.0f}")


# ============================================================
# TEST 2: UNIT TESTING - Risk Score Calculation
# ============================================================
print("\n" + "=" * 70)
print("TEST 2: UNIT TESTING - Risk Score Calculation")
print("=" * 70)

def calculate_risk_score(probability):
    return int((1 - probability) * 100)

# TC-RISK-01: High probability = Low risk
test("TC-RISK-01: High prob (0.9) = Low risk",
     calculate_risk_score(0.9) <= 10, f"Risk: {calculate_risk_score(0.9)}")

# TC-RISK-02: Low probability = High risk
test("TC-RISK-02: Low prob (0.2) = High risk",
     calculate_risk_score(0.2) == 80, f"Risk: {calculate_risk_score(0.2)}")

# TC-RISK-03: Zero probability
test("TC-RISK-03: Zero probability = Max risk",
     calculate_risk_score(0.0) == 100, f"Risk: {calculate_risk_score(0.0)}")

# TC-RISK-04: Full probability
test("TC-RISK-04: Full probability = Zero risk",
     calculate_risk_score(1.0) == 0, f"Risk: {calculate_risk_score(1.0)}")


# ============================================================
# TEST 3: UNIT TESTING - DTI & LTI Ratio Calculations
# ============================================================
print("\n" + "=" * 70)
print("TEST 3: UNIT TESTING - DTI & LTI Ratio Calculations")
print("=" * 70)

# TC-DTI-01: Standard DTI
income = 100000
debts = 30000
emi_val = 20000
dti = (debts + emi_val) / income
test("TC-DTI-01: Standard DTI ratio", abs(dti - 0.5) < 0.001,
     f"DTI: {dti:.2%}")

# TC-DTI-02: Zero debts
dti_zero = (0 + 15000) / 200000
test("TC-DTI-02: Zero existing debts DTI", dti_zero < 0.1,
     f"DTI: {dti_zero:.2%}")

# TC-LTI-01: Standard LTI
lti = 2000000 / 100000
test("TC-LTI-01: Standard LTI ratio", abs(lti - 20.0) < 0.01,
     f"LTI: {lti:.2f}")

# TC-LTI-02: Small loan LTI
lti_small = 50000 / 500000
test("TC-LTI-02: Small loan LTI (low risk)", lti_small < 1.0,
     f"LTI: {lti_small:.2f}")


# ============================================================
# TEST 4: UNIT TESTING - Data Preprocessing Validation
# ============================================================
print("\n" + "=" * 70)
print("TEST 4: UNIT TESTING - Data Preprocessing Validation")
print("=" * 70)

# TC-DATA-01: Dataset size
test("TC-DATA-01: Dataset has 5000 records", len(df) == 5000,
     f"Records: {len(df)}")

# TC-DATA-02: All features present
test("TC-DATA-02: All 7 training features present",
     all(col in df.columns for col in feature_columns),
     f"Columns: {list(df.columns)}")

# TC-DATA-03: No null values in features
null_count = df[feature_columns].isnull().sum().sum()
test("TC-DATA-03: No null values in training features", null_count == 0,
     f"Null count: {null_count}")

# TC-DATA-04: Target column exists and is binary
test("TC-DATA-04: Target 'approved' is binary (0/1)",
     set(df['approved'].unique()) == {0, 1},
     f"Unique values: {sorted(df['approved'].unique())}")

# TC-DATA-05: Credit score range valid (300-900)
test("TC-DATA-05: Credit scores in valid range (300-900)",
     df['credit_score'].min() >= 300 and df['credit_score'].max() <= 900,
     f"Range: {df['credit_score'].min()} - {df['credit_score'].max()}")

# TC-DATA-06: Loan amounts are positive
test("TC-DATA-06: All loan amounts positive",
     (df['loan_amount'] > 0).all(),
     f"Min: LKR {df['loan_amount'].min():,.0f}")

# TC-DATA-07: Monthly incomes are positive
test("TC-DATA-07: All monthly incomes positive",
     (df['monthly_income'] > 0).all(),
     f"Min: LKR {df['monthly_income'].min():,.0f}")

# TC-DATA-08: Class distribution is reasonable (not extremely skewed)
approval_rate = df['approved'].mean()
test("TC-DATA-08: Class balance reasonable (20%-80% approval)",
     0.2 <= approval_rate <= 0.8,
     f"Approval rate: {approval_rate:.1%}")


# ============================================================
# TEST 5: AI MODEL VALIDATION - Accuracy, Precision, Recall
# ============================================================
print("\n" + "=" * 70)
print("TEST 5: AI MODEL VALIDATION - Accuracy, Precision, Recall, F1")
print("=" * 70)

X = df[feature_columns].copy()
y = df['approved'].copy()

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

test_scaler = StandardScaler()
X_train_scaled = test_scaler.fit_transform(X_train)
X_test_scaled = test_scaler.transform(X_test)

y_pred = model.predict(scaler.transform(X_test))

accuracy = accuracy_score(y_test, y_pred)
precision = precision_score(y_test, y_pred)
recall = recall_score(y_test, y_pred)
f1 = f1_score(y_test, y_pred)

print(f"\n  Model Performance on Test Set (1000 samples):")
print(f"  -----------------------------------------------")
print(f"  Accuracy:  {accuracy:.4f} ({accuracy*100:.1f}%)")
print(f"  Precision: {precision:.4f} ({precision*100:.1f}%)")
print(f"  Recall:    {recall:.4f} ({recall*100:.1f}%)")
print(f"  F1 Score:  {f1:.4f} ({f1*100:.1f}%)")

# Confusion Matrix
cm = confusion_matrix(y_test, y_pred)
tn, fp, fn, tp = cm.ravel()
print(f"\n  Confusion Matrix:")
print(f"  -----------------")
print(f"  True Negatives  (Correctly Rejected): {tn}")
print(f"  False Positives (Wrongly Approved):   {fp}")
print(f"  False Negatives (Wrongly Rejected):   {fn}")
print(f"  True Positives  (Correctly Approved):  {tp}")

# TC-MODEL-01: Accuracy >= 85%
test("TC-MODEL-01: Accuracy >= 85%", accuracy >= 0.85,
     f"Accuracy: {accuracy:.1%}")

# TC-MODEL-02: Precision >= 80%
test("TC-MODEL-02: Precision >= 80%", precision >= 0.80,
     f"Precision: {precision:.1%}")

# TC-MODEL-03: Recall >= 80%
test("TC-MODEL-03: Recall >= 80%", recall >= 0.80,
     f"Recall: {recall:.1%}")

# TC-MODEL-04: F1 Score >= 80%
test("TC-MODEL-04: F1 Score >= 80%", f1 >= 0.80,
     f"F1: {f1:.1%}")

# Classification Report
print(f"\n  Full Classification Report:")
print("  " + classification_report(y_test, y_pred).replace("\n", "\n  "))


# ============================================================
# TEST 6: FEATURE IMPORTANCE VALIDATION
# ============================================================
print("\n" + "=" * 70)
print("TEST 6: FEATURE IMPORTANCE VALIDATION")
print("=" * 70)

importances = dict(zip(feature_columns, model.feature_importances_))
sorted_features = sorted(importances.items(), key=lambda x: x[1], reverse=True)

print("\n  Feature Importance Ranking:")
for i, (feat, imp) in enumerate(sorted_features, 1):
    bar = "█" * int(imp * 50)
    print(f"  {i}. {feat:<25} {imp:.4f} {bar}")

# TC-FEAT-01: No feature has zero importance
test("TC-FEAT-01: All features have non-zero importance",
     all(v > 0 for v in importances.values()))

# TC-FEAT-02: Top feature is financial-related
top_feature = sorted_features[0][0]
financial_features = ['debt_to_income_ratio', 'monthly_income', 'loan_amount', 'credit_score', 'loan_to_income_ratio']
test("TC-FEAT-02: Top feature is financial metric",
     top_feature in financial_features, f"Top: {top_feature}")


# ============================================================
# TEST 7: PREDICTION TESTS - Known Scenarios
# ============================================================
print("\n" + "=" * 70)
print("TEST 7: PREDICTION TESTS - Known Customer Scenarios")
print("=" * 70)

def predict_customer(loan_amt, duration, income, debts, credit, label=""):
    dti = (debts + calculate_emi(loan_amt, 15, duration)) / income if income > 0 else 1
    lti = loan_amt / income if income > 0 else 100
    features = np.array([[loan_amt, duration, income, debts, credit, dti, lti]])
    features_scaled = scaler.transform(features)
    prob = model.predict_proba(features_scaled)[0][1] * 100
    pred = model.predict(features_scaled)[0]
    return prob, pred

# TC-PRED-01: High income, small loan = HIGH approval
prob, pred = predict_customer(100000, 24, 500000, 0, 800, "High earner, small loan")
test("TC-PRED-01: High income, small loan -> Approved",
     prob > 50, f"Probability: {prob:.1f}%")

# TC-PRED-02: Low income, huge loan = LOW approval
prob, pred = predict_customer(10000000, 24, 40000, 10000, 450, "Low earner, huge loan")
test("TC-PRED-02: Low income, huge loan -> Rejected",
     prob < 40, f"Probability: {prob:.1f}%")

# TC-PRED-03: Good credit improves score
prob_low, _ = predict_customer(1000000, 36, 150000, 10000, 550)
prob_high, _ = predict_customer(1000000, 36, 150000, 10000, 800)
test("TC-PRED-03: Higher credit score -> Higher probability",
     prob_high > prob_low,
     f"Credit 550: {prob_low:.1f}% vs Credit 800: {prob_high:.1f}%")

# TC-PRED-04: Lower loan amount improves score
prob_big, _ = predict_customer(5000000, 36, 200000, 0, 700)
prob_small, _ = predict_customer(500000, 36, 200000, 0, 700)
test("TC-PRED-04: Smaller loan -> Higher probability",
     prob_small > prob_big,
     f"5M loan: {prob_big:.1f}% vs 500K loan: {prob_small:.1f}%")

# TC-PRED-05: Longer duration reduces monthly burden
prob_short, _ = predict_customer(2000000, 12, 150000, 0, 700)
prob_long, _ = predict_customer(2000000, 60, 150000, 0, 700)
test("TC-PRED-05: Longer term -> Higher probability",
     prob_long >= prob_short,
     f"12mo: {prob_short:.1f}% vs 60mo: {prob_long:.1f}%")

# TC-PRED-06: Existing debts reduce score (high debt impact)
prob_nodebt, _ = predict_customer(1000000, 36, 200000, 0, 700)
prob_debt, _ = predict_customer(1000000, 36, 200000, 120000, 700)
test("TC-PRED-06: Significant existing debts -> Lower probability",
     prob_nodebt > prob_debt,
     f"No debts: {prob_nodebt:.1f}% vs 120K debts: {prob_debt:.1f}%")


# ============================================================
# TEST 8: SRI LANKA LENDING RULES (Post-Prediction Guardrails)
# ============================================================
print("\n" + "=" * 70)
print("TEST 8: SRI LANKA LENDING RULES - Post-Prediction Guardrails")
print("=" * 70)

def apply_sl_rules(income, debts, loan_amount, duration, interest_rate=15):
    emi = calculate_emi(loan_amount, interest_rate, duration)
    after_emi = income - debts - emi
    total_debt = debts + emi

    # Get base ML probability
    dti = total_debt / income if income > 0 else 1
    lti = loan_amount / income if income > 0 else 100
    features = np.array([[loan_amount, duration, income, debts, 700, dti, lti]])
    base_prob = model.predict_proba(scaler.transform(features))[0][1] * 100

    # Apply rules
    adjusted_prob = base_prob
    if total_debt >= income:
        adjusted_prob = 0
    elif after_emi < 5000:
        adjusted_prob = 0
    elif after_emi < 10000:
        adjusted_prob = min(adjusted_prob, 15)

    return base_prob, adjusted_prob, after_emi

# TC-SL-01: Total debt >= income -> 0%
base, adj, after = apply_sl_rules(50000, 30000, 500000, 12)
test("TC-SL-01: Debt >= Income -> Probability = 0%",
     adj == 0, f"After EMI: LKR {after:,.0f}, Base: {base:.1f}% -> Adjusted: {adj:.1f}%")

# TC-SL-02: After EMI < 5000 -> 0%
base, adj, after = apply_sl_rules(60000, 20000, 800000, 12)
test("TC-SL-02: After EMI < 5000 -> Probability = 0%",
     adj == 0, f"After EMI: LKR {after:,.0f}, Base: {base:.1f}% -> Adjusted: {adj:.1f}%")

# TC-SL-03: After EMI 5000-10000 -> Capped at 15%
base, adj, after = apply_sl_rules(80000, 10000, 1500000, 18)
test("TC-SL-03: After EMI < 10000 -> Capped at 15%",
     adj <= 15, f"After EMI: LKR {after:,.0f}, Base: {base:.1f}% -> Adjusted: {adj:.1f}%")

# TC-SL-04: Comfortable after EMI -> No cap applied
base, adj, after = apply_sl_rules(300000, 10000, 1000000, 48)
test("TC-SL-04: After EMI >= 10000 -> No reduction",
     adj == base, f"After EMI: LKR {after:,.0f}, Base: {base:.1f}% -> Adjusted: {adj:.1f}%")


# ============================================================
# TEST 9: EDGE CASES
# ============================================================
print("\n" + "=" * 70)
print("TEST 9: EDGE CASES")
print("=" * 70)

# TC-EDGE-01: Minimum loan amount
prob, pred = predict_customer(100000, 12, 100000, 0, 600)
test("TC-EDGE-01: Minimum loan amount (100K)", prob >= 0 and prob <= 100,
     f"Probability: {prob:.1f}%")

# TC-EDGE-02: Maximum credit score
prob, pred = predict_customer(500000, 36, 200000, 0, 900)
test("TC-EDGE-02: Maximum credit score (900)", prob > 50,
     f"Probability: {prob:.1f}%")

# TC-EDGE-03: Minimum credit score
prob, pred = predict_customer(500000, 36, 200000, 50000, 300)
test("TC-EDGE-03: Minimum credit score (300)", prob >= 0,
     f"Probability: {prob:.1f}%")

# TC-EDGE-04: Very long duration
prob, pred = predict_customer(5000000, 84, 200000, 0, 700)
test("TC-EDGE-04: Max duration (84 months)", prob >= 0 and prob <= 100,
     f"Probability: {prob:.1f}%")

# TC-EDGE-05: Model returns valid probability range
features = np.array([[1000000, 36, 200000, 0, 700, 0.15, 5.0]])
proba = model.predict_proba(scaler.transform(features))[0]
test("TC-EDGE-05: Probabilities sum to 1.0",
     abs(sum(proba) - 1.0) < 0.001, f"Sum: {sum(proba):.6f}")


# ============================================================
# TEST 10: MODEL CONSISTENCY
# ============================================================
print("\n" + "=" * 70)
print("TEST 10: MODEL CONSISTENCY - Same input = Same output")
print("=" * 70)

features = np.array([[999997, 18, 500000, 0, 700, 0.04, 2.0]])
results = []
for i in range(5):
    prob = model.predict_proba(scaler.transform(features))[0][1]
    results.append(prob)

test("TC-CONS-01: 5 identical predictions are consistent",
     max(results) - min(results) < 0.0001,
     f"All probabilities: {results[0]:.6f}, variance: {max(results)-min(results):.8f}")


# ============================================================
# FINAL SUMMARY
# ============================================================
print("\n" + "=" * 70)
print("TEST SUMMARY")
print("=" * 70)
print(f"\n  Total Tests:  {total_tests}")
print(f"  Passed:       {passed_tests}")
print(f"  Failed:       {total_tests - passed_tests}")
print(f"  Pass Rate:    {passed_tests/total_tests*100:.1f}%")
print(f"\n  Model Metrics:")
print(f"    Accuracy:   {accuracy:.1%}")
print(f"    Precision:  {precision:.1%}")
print(f"    Recall:     {recall:.1%}")
print(f"    F1 Score:   {f1:.1%}")
print("=" * 70)

if passed_tests == total_tests:
    print("\n  ★ ALL TESTS PASSED SUCCESSFULLY ★")
else:
    print(f"\n  ⚠ {total_tests - passed_tests} TEST(S) FAILED")
print("=" * 70)
