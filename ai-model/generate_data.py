import pandas as pd
import numpy as np
import random

# --- CONFIGURATION & SEED ---
np.random.seed(42)
num_rows = 5000  # More data for better training

# --- SRI LANKAN NAMES & DATA LISTS ---
first_names = [
    "Kasun", "Nuwan", "Chamara", "Dilshan", "Thilini", "Amal", "Ruwan", "Suresh",
    "Priyantha", "Mohamed", "Fathima", "Nimal", "Sunil", "Chathura", "Gayani",
    "Mahesh", "Roshan", "Isuru", "Lakshan", "Sanduni", "Kavindi", "Manjula",
    "Kumar", "Ravi", "Ayesha", "Zainab", "Pradeep", "Dinesh", "Shanika", "Udaya",
    "Sampath", "Chaminda", "Nirosha", "Thisara", "Lahiru", "Dasun", "Kavindu",
    "Sachini", "Ishara", "Malith", "Tharindu", "Nipuni", "Hasitha", "Buddhika"
]

last_names = [
    "Perera", "Silva", "Fernando", "De Silva", "Bandara", "Ekanayake", "Jayasinghe",
    "Gunaratne", "Riaz", "Kumar", "Dissanayake", "Herath", "Karunaratne", "Gamage",
    "Peiris", "Weerasinghe", "Wickramasinghe", "Hettiarachchi", "Mendis", "Cassim",
    "Raghavan", "Seneviratne", "Rajapaksa", "Liyanage", "Abeysekara", "Rathnayake",
    "Samaraweera", "Jayawardena", "Amarasekara", "Munasinghe", "Gunasekara"
]

employment_types = ["Government", "Private Sector", "Business Owner", "Self-Employed", "Senior Mgmt"]
durations = [12, 18, 24, 36, 48, 60, 72, 84]

# Interest rates by loan type (annual %)
def get_interest_rate():
    """Return realistic Sri Lankan interest rate"""
    return random.choice([12, 13, 14, 15, 16, 17, 18])

# --- HELPER FUNCTIONS ---
def calculate_emi(principal, annual_rate, months):
    """Calculate Equated Monthly Installment (EMI)"""
    if months == 0 or annual_rate == 0:
        return principal / max(months, 1)
    monthly_rate = annual_rate / 12 / 100
    emi = principal * monthly_rate * ((1 + monthly_rate) ** months) / (((1 + monthly_rate) ** months) - 1)
    return emi

def calculate_approval_probability(monthly_income, existing_debts, emi, credit_score, 
                                    collateral_value, loan_amount, emp_type):
    """
    Calculate approval probability based on Sri Lanka banking practices.
    
    KEY RULE: After EMI (disposable income) is the MOST important factor.
    
    Sri Lanka Lending Rules:
    - After EMI >= 40,000: High confidence approval (70-95%)
    - After EMI 25,000-40,000: Moderate approval (50-75%)
    - After EMI 15,000-25,000: Lower approval (35-55%)
    - After EMI 10,000-15,000: Risky (20-40%)
    - After EMI < 10,000: Very risky (5-20%)
    - Total debts >= Income: Rejected (0%)
    """
    
    # Calculate After EMI (Disposable Income)
    after_emi = monthly_income - existing_debts - emi
    total_monthly_debt = existing_debts + emi
    
    # CRITICAL RULE: Total debt >= income = REJECT
    if total_monthly_debt >= monthly_income:
        return 0
    
    # CRITICAL RULE: After EMI < 5000 = REJECT (can't survive)
    if after_emi < 5000:
        return 0
    
    # Base probability from After EMI (PRIMARY FACTOR - 50 points max)
    if after_emi >= 100000:
        prob = 85
    elif after_emi >= 75000:
        prob = 80
    elif after_emi >= 50000:
        prob = 75
    elif after_emi >= 40000:
        prob = 70  # Comfortable zone
    elif after_emi >= 30000:
        prob = 60
    elif after_emi >= 25000:
        prob = 52
    elif after_emi >= 20000:
        prob = 45
    elif after_emi >= 15000:
        prob = 38
    elif after_emi >= 10000:
        prob = 28
    elif after_emi >= 7500:
        prob = 18
    else:
        prob = 10
    
    # Credit Score Modifier (-15 to +15)
    if credit_score >= 800:
        prob += 15
    elif credit_score >= 750:
        prob += 12
    elif credit_score >= 700:
        prob += 8
    elif credit_score >= 650:
        prob += 4
    elif credit_score >= 600:
        prob += 0
    elif credit_score >= 550:
        prob -= 5
    elif credit_score >= 500:
        prob -= 10
    else:
        prob -= 15
    
    # Collateral Modifier (-5 to +10)
    collateral_ratio = collateral_value / loan_amount if loan_amount > 0 else 0
    if collateral_ratio >= 1.5:
        prob += 10
    elif collateral_ratio >= 1.2:
        prob += 8
    elif collateral_ratio >= 1.0:
        prob += 6
    elif collateral_ratio >= 0.7:
        prob += 3
    elif collateral_ratio >= 0.3:
        prob += 0
    elif collateral_ratio > 0:
        prob -= 2
    else:
        prob -= 5  # No collateral
    
    # Employment Type Modifier (-8 to +8)
    emp_modifiers = {
        "Government": 8,       # Most trusted in SL
        "Senior Mgmt": 6,      # High earners, stable
        "Private Sector": 2,   # Common, moderate
        "Business Owner": -2,  # Variable income
        "Self-Employed": -8    # Highest risk
    }
    prob += emp_modifiers.get(emp_type, 0)
    
    # DTI Ratio Modifier (-10 to +5)
    dti_ratio = total_monthly_debt / monthly_income if monthly_income > 0 else 1
    if dti_ratio < 0.4:
        prob += 5
    elif dti_ratio < 0.5:
        prob += 2
    elif dti_ratio < 0.6:
        prob += 0
    elif dti_ratio < 0.7:
        prob -= 3
    elif dti_ratio < 0.8:
        prob -= 7
    else:
        prob -= 10
    
    # Clamp between 0 and 95
    return max(0, min(95, prob))

# --- GENERATION LOGIC ---
data = []

for i in range(1, num_rows + 1):
    # 1. ID & Name
    c_id = f"CUST-{i:05d}"
    name = f"{random.choice(first_names)} {random.choice(last_names)}"

    # 2. Monthly Income (LKR) - Sri Lankan realistic distribution
    income_bracket = np.random.choice(['low', 'mid', 'high'], p=[0.20, 0.55, 0.25])
    
    if income_bracket == 'low':
        monthly_income = random.randint(30000, 70000)
    elif income_bracket == 'mid':
        monthly_income = random.randint(70000, 250000)
    else:
        monthly_income = random.randint(250000, 800000)
    
    monthly_income = int(round(monthly_income / 1000) * 1000)

    # 3. Employment Type
    if income_bracket == 'high':
        emp_type = np.random.choice(employment_types, p=[0.15, 0.35, 0.25, 0.10, 0.15])
    elif income_bracket == 'mid':
        emp_type = np.random.choice(employment_types, p=[0.30, 0.40, 0.10, 0.15, 0.05])
    else:
        emp_type = np.random.choice(employment_types, p=[0.35, 0.40, 0.05, 0.18, 0.02])

    # 4. Loan Amount (LKR) - Varied multipliers of income
    # In Sri Lanka, people commonly take loans 10-30x their monthly income
    loan_multiplier = random.choice([5, 8, 10, 12, 15, 18, 20, 22, 25, 30, 35])
    loan_amount = int(monthly_income * loan_multiplier)
    loan_amount = int(round(loan_amount / 50000) * 50000)
    loan_amount = max(100000, min(loan_amount, 15000000))

    # 5. Duration based on loan amount
    if loan_amount < 300000:
        duration = random.choice([12, 18, 24, 36])
    elif loan_amount < 1000000:
        duration = random.choice([24, 36, 48])
    elif loan_amount < 3000000:
        duration = random.choice([36, 48, 60])
    elif loan_amount < 7000000:
        duration = random.choice([48, 60, 72])
    else:
        duration = random.choice([60, 72, 84])

    # 6. Interest Rate
    interest_rate = get_interest_rate()

    # 7. Collateral Value
    has_collateral = random.random()
    
    if loan_amount > 5000000:
        if has_collateral < 0.85:
            collateral_value = int(loan_amount * random.uniform(0.9, 1.6))
        else:
            collateral_value = 0
    elif loan_amount > 2000000:
        if has_collateral < 0.70:
            collateral_value = int(loan_amount * random.uniform(0.6, 1.4))
        else:
            collateral_value = 0
    elif loan_amount > 500000:
        if has_collateral < 0.50:
            collateral_value = int(loan_amount * random.uniform(0.4, 1.2))
        else:
            collateral_value = 0
    else:
        if has_collateral < 0.25:
            collateral_value = int(loan_amount * random.uniform(0.3, 1.0))
        else:
            collateral_value = 0
    
    collateral_value = int(round(collateral_value / 10000) * 10000)

    # 8. Existing Debts
    if emp_type == "Government":
        debt_load = random.uniform(0, 0.30)
    elif emp_type == "Senior Mgmt":
        debt_load = random.uniform(0, 0.35)
    elif emp_type == "Private Sector":
        debt_load = random.uniform(0, 0.45)
    else:
        debt_load = random.uniform(0, 0.55)
    
    existing_debts = int(monthly_income * debt_load)
    existing_debts = int(round(existing_debts / 500) * 500)

    # 9. Credit Score (CRIB Style: 300 to 900)
    base_score = random.randint(500, 780)
    
    # Adjust based on debt load
    if debt_load > 0.4:
        base_score -= random.randint(30, 80)
    elif debt_load < 0.15:
        base_score += random.randint(20, 50)
    
    # Employment bonus
    if emp_type == "Government":
        base_score += random.randint(40, 80)
    elif emp_type == "Senior Mgmt":
        base_score += random.randint(30, 60)
    elif emp_type == "Private Sector":
        base_score += random.randint(10, 30)
    elif emp_type == "Self-Employed":
        base_score -= random.randint(20, 50)
    
    # Income bonus
    if monthly_income > 300000:
        base_score += random.randint(20, 50)
    elif monthly_income > 150000:
        base_score += random.randint(10, 30)
    elif monthly_income < 50000:
        base_score -= random.randint(20, 40)
    
    credit_score = max(300, min(900, base_score))

    # 10. Calculate EMI
    emi = calculate_emi(loan_amount, interest_rate, duration)
    emi = round(emi, 0)

    # 11. Calculate Key Ratios
    after_emi = monthly_income - existing_debts - emi
    total_monthly_debt = existing_debts + emi
    debt_to_income = round(total_monthly_debt / monthly_income, 4) if monthly_income > 0 else 0
    loan_to_income = round(loan_amount / monthly_income, 2) if monthly_income > 0 else 0
    collateral_to_loan = round(collateral_value / loan_amount, 2) if loan_amount > 0 else 0

    # 12. Calculate Approval Probability
    approval_prob = calculate_approval_probability(
        monthly_income, existing_debts, emi, credit_score,
        collateral_value, loan_amount, emp_type
    )

    # 13. Determine Approval (with some randomness)
    # Add some noise to make the model learn probability, not just binary
    if approval_prob >= 75:
        approved = 1 if random.random() < 0.95 else 0
    elif approval_prob >= 60:
        approved = 1 if random.random() < 0.85 else 0
    elif approval_prob >= 50:
        approved = 1 if random.random() < 0.70 else 0
    elif approval_prob >= 40:
        approved = 1 if random.random() < 0.50 else 0
    elif approval_prob >= 30:
        approved = 1 if random.random() < 0.35 else 0
    elif approval_prob >= 20:
        approved = 1 if random.random() < 0.20 else 0
    elif approval_prob >= 10:
        approved = 1 if random.random() < 0.10 else 0
    else:
        approved = 0

    # 14. Calculate Risk Score (inverse of approval probability)
    risk_score = 100 - approval_prob

    # Add row to list
    data.append([
        c_id, name, monthly_income, loan_amount, collateral_value, duration,
        interest_rate, existing_debts, credit_score, emp_type, 
        int(emi), int(after_emi), debt_to_income, loan_to_income, 
        collateral_to_loan, approval_prob, risk_score, approved
    ])

# --- CREATE DATAFRAME & SAVE ---
columns = [
    "customer_id", "customer_name", "monthly_income", "loan_amount",
    "collateral_value", "duration", "interest_rate", "existing_debts", 
    "credit_score", "employment_type", "monthly_emi", "after_emi",
    "debt_to_income_ratio", "loan_to_income_ratio", "collateral_to_loan_ratio",
    "approval_probability", "risk_score", "approved"
]

df = pd.DataFrame(data, columns=columns)
df = df.sample(frac=1).reset_index(drop=True)
df.to_csv('data/synthetic_data.csv', index=False)

# Display statistics
print(f"\n{'='*80}")
print("SMARTLOAN AI - SYNTHETIC DATA GENERATION REPORT (SRI LANKA RULES)")
print(f"{'='*80}")
print(f"\n✓ Generated {num_rows} synthetic loan records\n")

print(f"{'-'*80}")
print("FINANCIAL RANGES (All amounts in LKR):")
print(f"{'-'*80}")
print(f"{'Monthly Income:':<25} LKR {df['monthly_income'].min():>12,} - {df['monthly_income'].max():>12,}")
print(f"{'Loan Amount:':<25} LKR {df['loan_amount'].min():>12,} - {df['loan_amount'].max():>12,}")
print(f"{'Monthly EMI:':<25} LKR {df['monthly_emi'].min():>12,} - {df['monthly_emi'].max():>12,}")
print(f"{'After EMI:':<25} LKR {df['after_emi'].min():>12,} - {df['after_emi'].max():>12,}")
print(f"{'Credit Score:':<25} {df['credit_score'].min():>3} - {df['credit_score'].max():>3}")

print(f"\n{'-'*80}")
print("APPROVAL STATISTICS:")
print(f"{'-'*80}")
approved_count = (df['approved']==1).sum()
rejected_count = (df['approved']==0).sum()
approval_rate = df['approved'].mean() * 100

print(f"{'Overall Approval Rate:':<25} {approval_rate:>6.1f}%")
print(f"{'  - Approved:':<25} {approved_count:>5} records")
print(f"{'  - Rejected:':<25} {rejected_count:>5} records")

# Approval by After EMI ranges (KEY METRIC)
print(f"\n{'Approval Rate by After EMI (KEY FACTOR):'}")
ranges = [
    (100000, float('inf'), "≥ 100,000 (Excellent)"),
    (50000, 100000, "50K-100K (Very Good)"),
    (40000, 50000, "40K-50K (Comfortable)"),
    (25000, 40000, "25K-40K (Moderate)"),
    (15000, 25000, "15K-25K (Tight)"),
    (10000, 15000, "10K-15K (Risky)"),
    (0, 10000, "< 10K (Very Risky)"),
    (float('-inf'), 0, "Negative (Rejected)")
]

for low, high, label in ranges:
    subset = df[(df['after_emi'] >= low) & (df['after_emi'] < high)]
    if len(subset) > 0:
        rate = subset['approved'].mean() * 100
        avg_prob = subset['approval_probability'].mean()
        print(f"  - {label:<25}: {rate:>5.1f}% approved (avg prob: {avg_prob:.0f}%) [{len(subset):>4} records]")

# Approval rate by employment type
print(f"\n{'Approval Rate by Employment Type:'}")
for emp in employment_types:
    emp_df = df[df['employment_type'] == emp]
    emp_approval = emp_df['approved'].mean() * 100 if len(emp_df) > 0 else 0
    avg_prob = emp_df['approval_probability'].mean() if len(emp_df) > 0 else 0
    print(f"  - {emp:<20}: {emp_approval:>5.1f}% (avg prob: {avg_prob:.0f}%) [{len(emp_df):>4} records]")

# Test case similar to user's scenario
print(f"\n{'-'*80}")
print("TEST CASE VALIDATION (Similar to user scenario):")
print(f"{'-'*80}")
# Income: 150000, Loan: 3300000, Duration: 36, Credit: 700, Debts: 0, Collateral: 0
test_emi = calculate_emi(3300000, 14, 36)
test_after_emi = 150000 - 0 - test_emi
test_prob = calculate_approval_probability(150000, 0, test_emi, 700, 0, 3300000, "Private Sector")
print(f"Income: 150,000 | Loan: 3,300,000 | Duration: 36m | Credit: 700 | Debts: 0")
print(f"EMI: LKR {test_emi:,.0f} | After EMI: LKR {test_after_emi:,.0f}")
print(f"Approval Probability: {test_prob}%")
print(f"Expected: ~60% (After EMI of 37K is moderate but manageable with good credit)")

print(f"\n✓ Saved to data/synthetic_data.csv")
print(f"{'='*80}\n")
