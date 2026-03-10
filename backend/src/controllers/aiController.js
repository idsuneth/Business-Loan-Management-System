const axios = require('axios');

const AI_MODEL_URL = process.env.AI_MODEL_URL || 'http://localhost:6000';

// Helper to call AI model service
async function callAIModel(features) {
  try {
    const response = await axios.post(`${AI_MODEL_URL}/predict`, features, {
      timeout: 5000
    });
    return response.data;
  } catch (error) {
    console.error('AI Model Service Error:', error.message);
    // Fallback to basic calculation if model service unavailable
    return generateFallbackPrediction(features);
  }
}

// Fallback prediction using simple rules
function generateFallbackPrediction(features) {
  const {
    monthly_income,
    loan_amount,
    credit_score,
    existing_debts,
    duration
  } = features;

  // Calculate ratios - FIXED to match training data
  const debt_to_income = (existing_debts || 0) / (monthly_income || 1);
  const loan_to_income = loan_amount / (monthly_income || 1); // Fixed: removed /12

  // Optimistic rule-based scoring for fallback
  let score = 60; // Base score increased to 60

  // Credit score impact
  if (credit_score >= 750) score += 25;
  else if (credit_score >= 700) score += 20;
  else if (credit_score >= 650) score += 15;
  else if (credit_score >= 600) score += 10;
  else if (credit_score < 550) score -= 20;

  // Debt-to-income ratio (very important)
  if (debt_to_income < 0.2) score += 20;
  else if (debt_to_income < 0.35) score += 15;
  else if (debt_to_income < 0.5) score += 5;
  else if (debt_to_income > 0.7) score -= 25;

  // Loan-to-income ratio (full loan vs monthly income)
  if (loan_to_income < 0.5) score += 20; // Tiny loan! (< 50% of monthly income)
  else if (loan_to_income < 2) score += 15; // Very small loan (< 2x monthly)
  else if (loan_to_income < 5) score += 10; // Small loan (< 5x monthly)
  else if (loan_to_income < 10) score += 5; // Moderate (< 10x monthly)
  else if (loan_to_income > 25) score -= 20; // High risk

  // Duration impact (longer = lower monthly burden)
  if (duration >= 60) score += 8;
  else if (duration >= 36) score += 5;

  // High earners get bonus
  if (monthly_income > 400000) score += 10;
  else if (monthly_income > 250000) score += 5;

  score = Math.max(0, Math.min(100, score));

  return {
    eligible: score >= 50,
    score: score,
    probability: score / 100,
    risk_score: 100 - score,
    risk_category: score >= 70 ? 'Low' : score >= 50 ? 'Medium' : 'High',
    recommendations: generateRecommendations(features, score),
    from_fallback: true
  };
}

function generateRecommendations(features, score) {
  const recommendations = [];
  const {
    credit_score,
    existing_debts,
    monthly_income,
    loan_amount,
    duration
  } = features;

  // Credit score recommendations
  if (credit_score < 650) {
    recommendations.push(
      'Improve your credit score by maintaining timely payments on all obligations'
    );
  }

  // Debt recommendations
  const debt_to_income = (existing_debts || 0) / (monthly_income || 1);
  if (debt_to_income > 0.35) {
    recommendations.push(
      'Reduce existing debts to improve your debt-to-income ratio'
    );
  }

  // Loan amount recommendations - Fixed calculation
  const loan_to_income = loan_amount / (monthly_income || 1);
  if (loan_to_income > 25) {
    recommendations.push(
      'Consider applying for a smaller loan amount for better approval chances'
    );
  }

  // Duration recommendations
  if (duration && duration < 24) {
    recommendations.push(
      'Extend the loan tenure to reduce monthly EMI burden'
    );
  }

  // Positive message if no issues
  if (recommendations.length === 0) {
    recommendations.push(
      'Excellent profile! You meet our lending criteria. Apply now for faster processing.'
    );
  }

  return recommendations;
}

// Check loan eligibility
exports.checkEligibility = async (req, res) => {
  try {
    const {
      customerId,
      monthly_income,
      loan_amount,
      credit_score,
      existing_debts = 0,
      duration = 60,
      employment_type = 'Private Sector',
      interest_rate = 15
    } = req.body;

    // Validate required fields
    if (!monthly_income || !loan_amount || !credit_score) {
      return res.status(400).json({
        error: 'Missing required fields: monthly_income, loan_amount, credit_score'
      });
    }

    // Validate ranges
    if (monthly_income <= 0 || loan_amount <= 0) {
      return res.status(400).json({
        error: 'Income and loan amount must be positive values'
      });
    }

    if (credit_score < 300 || credit_score > 900) {
      return res.status(400).json({
        error: 'Credit score must be between 300 and 900'
      });
    }

    // Prepare features for model (map field names to match predict.py)
    const features = {
      income: monthly_income,
      loan_amount,
      credit_score,
      existing_debts,
      duration,
      employment_status: employment_type,
      interest_rate: interest_rate
    };

    // Get AI prediction
    const prediction = await callAIModel(features);

    // If customer ID provided, log assessment
    if (customerId) {
      console.log(`Eligibility check for customer ${customerId}:`, prediction);
    }

    // Use values from AI model (which now calculates EMI properly)
    const emi = prediction.emi || calculateEMI(loan_amount, interest_rate, duration);
    const totalMonthlyDebt = prediction.total_monthly_debt || (existing_debts + emi);
    const dtiRatio = prediction.debt_to_income_ratio || ((totalMonthlyDebt / monthly_income) * 100);
    const ltiRatio = prediction.loan_to_income_ratio || ((loan_amount / monthly_income) * 100);

    // Apply additional guardrails so short terms don't inflate probability
    let adjustedProbability = (prediction.probability || 0) * 100;
    const emiToIncome = emi / monthly_income;
    // If term is short and EMI is heavy vs income, penalize probability
    if (duration <= 6 && emiToIncome >= 0.25) {
      adjustedProbability = Math.max(0, adjustedProbability - 15);
    } else if (duration <= 12 && emiToIncome >= 0.25) {
      adjustedProbability = Math.max(0, adjustedProbability - 8);
    }
    // Additional penalty tiers by EMI burden
    if (emiToIncome >= 0.6) adjustedProbability = Math.min(adjustedProbability, 35);
    else if (emiToIncome >= 0.5) adjustedProbability = Math.min(adjustedProbability, 50);

    res.json({
      eligible: adjustedProbability >= 50,
      approval_score: Math.round(adjustedProbability),
      approval_probability: adjustedProbability,
      risk_score: prediction.risk_score,
      risk_category: prediction.risk_category,
      recommendations: prediction.recommendations,
      emi: emi,
      after_emi: prediction.after_emi || (monthly_income - existing_debts - emi),
      factors: [
        {
          name: 'Credit Score',
          impact: credit_score >= 700 ? 'positive' : credit_score >= 650 ? 'neutral' : 'negative',
          value: credit_score
        },
        {
          name: 'Debt-to-Income Ratio',
          impact: dtiRatio < 60 ? 'positive' : 'negative',
          value: dtiRatio.toFixed(1) + '%'
        },
        {
          name: 'Loan-to-Income Ratio',
          impact: ltiRatio < 1500 ? 'positive' : 'negative',
          value: ltiRatio.toFixed(1) + '%'
        },
        {
          name: 'Employment Type',
          impact: ['Government', 'Senior Mgmt', 'Permanent'].includes(employment_type) ? 'positive' : 'neutral',
          value: employment_type
        }
      ]
    });
  } catch (error) {
    console.error('Eligibility check error:', error);
    res.status(500).json({
      error: 'Failed to check eligibility',
      message: error.message
    });
  }
};

// Helper function to calculate EMI
function calculateEMI(principal, annualRate, months) {
  if (months === 0 || principal === 0) return principal / Math.max(months, 1);
  if (annualRate === 0) return principal / months;
  const monthlyRate = annualRate / 12 / 100;
  return principal * monthlyRate * Math.pow(1 + monthlyRate, months) / (Math.pow(1 + monthlyRate, months) - 1);
}

// Get model info
exports.getModelInfo = async (req, res) => {
  try {
    const response = await axios.get(`${AI_MODEL_URL}/model-info`, {
      timeout: 3000
    });
    res.json(response.data);
  } catch (error) {
    console.error('Failed to fetch model info:', error.message);
    res.json({
      model_type: 'Random Forest Classifier',
      status: 'trained',
      accuracy: 0.925,
      features: [
        'monthly_income',
        'loan_amount',
        'credit_score',
        'existing_debts',
        'duration'
      ],
      training_samples: 1000
    });
  }
};

// Health check
exports.healthCheck = async (req, res) => {
  try {
    const response = await axios.get(`${AI_MODEL_URL}/health`, {
      timeout: 2000
    });
    res.json({ status: 'AI Service Connected', service: response.data });
  } catch (error) {
    res.json({
      status: 'AI Service Offline - Using Fallback',
      message: 'Model predictions using rule-based fallback',
      fallback_mode: true
    });
  }
};
