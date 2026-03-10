import joblib
import numpy as np

# Load the trained model and scaler
model = joblib.load('model/loan_model.pkl')
scaler = joblib.load('model/scaler.pkl')

print("=" * 70)
print("LOAN ELIGIBILITY TEST - Customer Profile from Screenshot")
print("=" * 70)

# Customer details from the screenshot:
# - Monthly Income: Rs. 500,000/month (LKR 500,000)
# - Loan Amount: 999,997 LKR (~1 Million)
# - Loan Type: Home Loan
# - Term: 18 Months
# - Interest Rate: 8.5%
# - Collateral: Property worth 100,000 LKR

customer_name = "deshan dinidu"
monthly_income = 500000  # LKR
loan_amount = 999997     # LKR
duration = 18            # months
collateral_value = 100000 # LKR
existing_debts = 0       # Assumed (not shown in screenshot)
credit_score = 700       # Assumed good score for high earner

# Calculate ratios
debt_to_income_ratio = existing_debts / monthly_income
loan_to_income_ratio = loan_amount / monthly_income
collateral_to_loan_ratio = collateral_value / loan_amount

print("\nCustomer Details:")
print(f"  Name: {customer_name}")
print(f"  Monthly Income: LKR {monthly_income:,}")
print(f"  Loan Amount: LKR {loan_amount:,}")
print(f"  Duration: {duration} months")
print(f"  Collateral Value: LKR {collateral_value:,}")
print(f"  Existing Debts: LKR {existing_debts:,}")
print(f"  Credit Score: {credit_score}")
print(f"\nCalculated Ratios:")
print(f"  Debt-to-Income Ratio: {debt_to_income_ratio:.2f}")
print(f"  Loan-to-Income Ratio: {loan_to_income_ratio:.2f}")
print(f"  Collateral-to-Loan Ratio: {collateral_to_loan_ratio:.2f}")

# Prepare features for prediction
# Feature order: ['loan_amount', 'duration', 'monthly_income', 'existing_debts', 
#                 'credit_score', 'debt_to_income_ratio', 'loan_to_income_ratio']
features = np.array([[
    loan_amount,
    duration,
    monthly_income,
    existing_debts,
    credit_score,
    debt_to_income_ratio,
    loan_to_income_ratio
]])

# Scale features
features_scaled = scaler.transform(features)

# Get prediction
prediction = model.predict(features_scaled)[0]
prediction_proba = model.predict_proba(features_scaled)[0]

print("\n" + "=" * 70)
print("AI RISK ASSESSMENT RESULTS")
print("=" * 70)

approval_probability = prediction_proba[1] * 100
risk_score = prediction_proba[0] * 100

print(f"\nApproval Probability: {approval_probability:.1f}%")
print(f"Risk Score: {risk_score:.1f}%")
print(f"\nPrediction: {'APPROVED ✓' if prediction == 1 else 'REJECTED ✗'}")

if approval_probability >= 70:
    print("Status: AUTO-APPROVE")
elif approval_probability >= 50:
    print("Status: REVIEW REQUIRED")
else:
    print("Status: HIGH RISK")

print("\n" + "=" * 70)

# Test with a few variations
print("\n\nTESTING VARIATIONS:")
print("=" * 70)

test_cases = [
    {
        "name": "Same profile, better credit (750)",
        "loan_amount": 999997,
        "duration": 18,
        "monthly_income": 500000,
        "existing_debts": 0,
        "credit_score": 750
    },
    {
        "name": "Same profile, more collateral (1M)",
        "loan_amount": 999997,
        "duration": 18,
        "monthly_income": 500000,
        "existing_debts": 0,
        "credit_score": 700,
        "collateral": 1000000
    },
    {
        "name": "Same profile, longer term (36 months)",
        "loan_amount": 999997,
        "duration": 36,
        "monthly_income": 500000,
        "existing_debts": 0,
        "credit_score": 700
    }
]

for case in test_cases:
    collateral = case.get('collateral', 100000)
    debt_to_income = case['existing_debts'] / case['monthly_income']
    loan_to_income = case['loan_amount'] / case['monthly_income']
    collateral_to_loan = collateral / case['loan_amount']
    
    features = np.array([[
        case['loan_amount'],
        case['duration'],
        case['monthly_income'],
        case['existing_debts'],
        case['credit_score'],
        debt_to_income,
        loan_to_income
    ]])
    
    features_scaled = scaler.transform(features)
    prediction = model.predict(features_scaled)[0]
    proba = model.predict_proba(features_scaled)[0]
    
    print(f"\n{case['name']}:")
    print(f"  Approval: {proba[1]*100:.1f}% | Risk: {proba[0]*100:.1f}%")
    print(f"  Result: {'APPROVED ✓' if prediction == 1 else 'REJECTED ✗'}")

print("\n" + "=" * 70)
