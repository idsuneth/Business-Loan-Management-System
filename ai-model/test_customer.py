import joblib
import numpy as np

# Load the trained model and scaler
model = joblib.load('model/loan_model.pkl')
scaler = joblib.load('model/scaler.pkl')

print("=" * 70)
print("TESTING EXACT CUSTOMER PROFILE FROM SCREENSHOT")
print("=" * 70)

# Exact customer details from screenshot
monthly_income = 500000  # LKR 500,000/month
loan_amount = 19996      # LKR 19,996 (shown as Rs. 19,396 in screenshot)
duration = 18            # months (from screenshot dropdown)
existing_debts = 0       # No past loans
credit_score = 700       # Assuming good score for high earner

# Calculate ratios - MATCHING TRAINING DATA FORMAT
debt_to_income_ratio = existing_debts / monthly_income
loan_to_income_ratio = loan_amount / monthly_income  # Full loan amount, NOT divided by 12

print(f"\nCustomer Profile:")
print(f"  Monthly Income: LKR {monthly_income:,}")
print(f"  Loan Amount: LKR {loan_amount:,}")
print(f"  Duration: {duration} months")
print(f"  Existing Debts: LKR {existing_debts:,}")
print(f"  Credit Score: {credit_score}")
print(f"\nCalculated Ratios:")
print(f"  Debt-to-Income: {debt_to_income_ratio:.4f} ({debt_to_income_ratio*100:.2f}%)")
print(f"  Loan-to-Income: {loan_to_income_ratio:.4f} ({loan_to_income_ratio*100:.2f}%)")

# Prepare features matching training format
# ['loan_amount', 'duration', 'monthly_income', 'existing_debts', 'credit_score', 'debt_to_income_ratio', 'loan_to_income_ratio']
features = np.array([[
    loan_amount,
    duration,
    monthly_income,
    existing_debts,
    credit_score,
    debt_to_income_ratio,
    loan_to_income_ratio
]])

print(f"\nFeatures Array: {features}")

# Scale features
features_scaled = scaler.transform(features)

# Get prediction
prediction = model.predict(features_scaled)[0]
probability = model.predict_proba(features_scaled)[0]

approval_prob = probability[1] * 100
risk_score = probability[0] * 100

print("\n" + "=" * 70)
print("PREDICTION RESULTS")
print("=" * 70)
print(f"Approval Probability: {approval_prob:.1f}%")
print(f"Risk Score: {risk_score:.1f}%")
print(f"Prediction: {'APPROVED ✓' if prediction == 1 else 'REJECTED ✗'}")

if approval_prob >= 90:
    print("Status: ⭐ EXCELLENT - AUTO-APPROVE")
elif approval_prob >= 70:
    print("Status: ✓ GOOD - AUTO-APPROVE")
elif approval_prob >= 50:
    print("Status: ⚠ REVIEW REQUIRED")
else:
    print("Status: ✗ HIGH RISK")

print("\nAnalysis:")
print(f"  - Loan is only {loan_to_income_ratio*100:.2f}% of monthly income")
print(f"  - This is an EXTREMELY LOW RISK profile")
print(f"  - Should be 100% approved!")
print("=" * 70)
