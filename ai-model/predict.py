import joblib
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app)

# Load model and scaler
print("Loading model and scaler...")
model = joblib.load('model/loan_model.pkl')
scaler = joblib.load('model/scaler.pkl')
print("[OK] Model and scaler loaded successfully")

# Default interest rate (can be overridden per request)
DEFAULT_INTEREST_RATE = 15.0

def calculate_emi(principal, annual_rate, months):
    """Calculate Equated Monthly Installment (EMI)"""
    if months == 0 or principal == 0:
        return principal / max(months, 1)
    if annual_rate == 0:
        return principal / months
    monthly_rate = annual_rate / 12 / 100
    emi = principal * monthly_rate * ((1 + monthly_rate) ** months) / (((1 + monthly_rate) ** months) - 1)
    return emi

def calculate_risk_score(probability):
    """Convert probability to risk score (0-100, inverse)"""
    return int((1 - probability) * 100)

def generate_recommendations(features, prediction, after_emi):
    """Generate AI recommendations based on weak factors"""
    recommendations = []
    
    loan_amount = features['loan_amount']
    monthly_income = features['income']
    credit_score = features['credit_score']
    debt_to_income = features.get('debt_to_income_ratio', 0)
    loan_to_income = features.get('loan_to_income_ratio', 0)
    
    # After EMI recommendations (most important in Sri Lanka)
    if after_emi < 10000:
        recommendations.append("Critical: After paying EMI, you would have insufficient funds for living expenses")
    elif after_emi < 25000:
        recommendations.append("Consider a smaller loan or longer term to increase your monthly buffer")
    
    if credit_score < 650:
        recommendations.append("Improve your credit score by paying bills on time and reducing outstanding debts")
    
    if debt_to_income > 0.6:
        recommendations.append("Your debt-to-income ratio is high. Consider paying off existing debts first")
    elif debt_to_income > 0.4:
        recommendations.append("Reduce your existing debts to improve debt-to-income ratio")
    
    if loan_to_income > 25:
        recommendations.append("Consider applying for a smaller loan amount")
    
    if features.get('duration', 60) < 24 and after_emi < 30000:
        recommendations.append("Extend the repayment period to reduce monthly burden")
    
    if not recommendations:
        recommendations.append("You're in great shape! You meet most of our lending criteria")
    
    return recommendations

@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.json
        
        # Extract and validate inputs
        income = float(data.get('income', 0))
        credit_score = float(data.get('credit_score', 600))
        employment_status = data.get('employment_status', 'Private Sector')
        loan_amount = float(data.get('loan_amount', 0))
        duration = float(data.get('duration', 60))
        existing_debts = float(data.get('existing_debts', 0))
        interest_rate = float(data.get('interest_rate', DEFAULT_INTEREST_RATE))
        
        if income <= 0 or loan_amount <= 0:
            return jsonify({'error': 'Invalid income or loan amount'}), 400
        
        if credit_score < 300 or credit_score > 900:
            return jsonify({'error': 'Credit score must be between 300-900'}), 400
        
        # Calculate EMI (critical for Sri Lanka lending)
        emi = calculate_emi(loan_amount, interest_rate, duration)
        
        # Calculate After EMI (disposable income)
        after_emi = income - existing_debts - emi
        
        # Total monthly debt (existing + new EMI)
        total_monthly_debt = existing_debts + emi
        
        # Calculate derived features - MUST MATCH TRAINING DATA FORMAT
        # DTI should include EMI as that's how training data was generated
        debt_to_income_ratio = total_monthly_debt / income if income > 0 else 1.0
        loan_to_income_ratio = loan_amount / income if income > 0 else 100.0
        
        # Prepare features array (matching train_model.py feature order)
        features_array = np.array([[
            loan_amount,
            duration,
            income,
            existing_debts,
            credit_score,
            debt_to_income_ratio,
            loan_to_income_ratio
        ]])
        
        # Scale features
        features_scaled = scaler.transform(features_array)
        
        # Make prediction
        prediction = model.predict(features_scaled)[0]
        probability = model.predict_proba(features_scaled)[0]
        
        # Calculate approval probability (probability of class 1)
        approval_probability = float(probability[1]) * 100
        
        # Apply Sri Lanka specific rules
        # RULE 1: Total debt >= income = 0% probability
        if total_monthly_debt >= income:
            approval_probability = 0
        # RULE 2: After EMI < 5000 = 0% (can't survive)
        elif after_emi < 5000:
            approval_probability = 0
        # RULE 3: After EMI < 10000 = severely limit
        elif after_emi < 10000:
            approval_probability = min(approval_probability, 15)
        
        risk_score = calculate_risk_score(approval_probability / 100)
        
        # Determine risk category
        if risk_score < 30:
            risk_category = 'Low'
        elif risk_score < 60:
            risk_category = 'Medium'
        else:
            risk_category = 'High'
        
        # Generate recommendations
        feature_dict = {
            'income': income,
            'credit_score': credit_score,
            'loan_amount': loan_amount,
            'duration': duration,
            'existing_debts': existing_debts,
            'debt_to_income_ratio': debt_to_income_ratio,
            'loan_to_income_ratio': loan_to_income_ratio
        }
        recommendations = generate_recommendations(feature_dict, prediction, after_emi)
        
        return jsonify({
            'eligible': bool(approval_probability >= 50),
            'score': int(approval_probability),
            'probability': float(approval_probability / 100),
            'risk_score': risk_score,
            'risk_category': risk_category,
            'recommendations': recommendations,
            'emi': round(emi),
            'after_emi': round(after_emi),
            'total_monthly_debt': round(total_monthly_debt),
            'debt_to_income_ratio': round(debt_to_income_ratio * 100, 1),
            'loan_to_income_ratio': round(loan_to_income_ratio * 100, 1)
        })
    
    except ValueError as e:
        return jsonify({'error': f'Invalid input: {str(e)}'}), 400
    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'OK', 'model': 'loaded'})

@app.route('/model-info', methods=['GET'])
def model_info():
    return jsonify({
        'model_type': 'Random Forest Classifier',
        'n_estimators': 100,
        'features': ['loan_amount', 'duration', 'monthly_income', 'existing_debts', 'credit_score', 'debt_to_income_ratio', 'loan_to_income_ratio'],
        'status': 'ready',
        'sri_lanka_rules': True
    })

if __name__ == '__main__':
    model_port = int(os.environ.get('MODEL_PORT', 6000))
    print("Starting SmartLoan AI Prediction Service...")
    print(f"[OK] API listening on http://localhost:{model_port}")
    print("[OK] Endpoints: /predict (POST), /health (GET), /model-info (GET)")
    print("[OK] Sri Lanka lending rules applied")
    app.run(host='0.0.0.0', port=model_port, debug=False)
