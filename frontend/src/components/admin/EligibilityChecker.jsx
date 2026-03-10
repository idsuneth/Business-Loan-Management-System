import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Calculator, AlertTriangle, CheckCircle, XCircle, TrendingUp,
  DollarSign, Shield, Briefcase, CreditCard, PiggyBank, Target,
  ChevronRight, Info, BarChart3, Wallet, AlertCircle,
  RefreshCw, Percent, Cpu, Sparkles, ArrowRight, Clock
} from 'lucide-react';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

export default function EligibilityChecker() {
  const { isDark, colors } = useTheme();
  const [formData, setFormData] = useState({
    monthlyIncome: '',
    loanAmount: '',
    duration: '',
    creditScore: '',
    existingDebts: '',
    employmentType: 'Private Sector',
    interestRate: ''
  });

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [aiStatus, setAiStatus] = useState({ connected: null, message: '' });

  const durations = [12, 18, 24, 36, 48, 60, 72, 84];

  useEffect(() => {
    const checkAIHealth = async () => {
      try {
        const response = await api.get('/ai/health');
        setAiStatus({
          connected: !response.data.fallback_mode,
          message: response.data.status
        });
      } catch (error) {
        setAiStatus({ connected: false, message: 'AI Service Offline - Using Fallback' });
      }
    };
    checkAIHealth();
  }, []);

  const calculateEMI = useCallback((principal, annualRate, months) => {
    if (months === 0 || principal === 0) return 0;
    if (annualRate === 0) return principal / months;
    const monthlyRate = annualRate / 12 / 100;
    const emi = principal * monthlyRate * Math.pow(1 + monthlyRate, months) / (Math.pow(1 + monthlyRate, months) - 1);
    return emi;
  }, []);

  const calculateMaxLoanAmount = useCallback((monthlyIncome, existingDebts, creditScore, duration, interestRate) => {
    const monthlyRate = interestRate / 12 / 100;
    // Use 40% of income as the max affordable EMI
    const maxEMI = monthlyIncome * 0.4 - existingDebts;

    if (maxEMI <= 0) return 0;

    const factor = (Math.pow(1 + monthlyRate, duration) - 1) / (monthlyRate * Math.pow(1 + monthlyRate, duration));
    let maxLoan = maxEMI * factor;

    if (creditScore < 500) maxLoan *= 0.5;
    else if (creditScore < 600) maxLoan *= 0.7;
    else if (creditScore < 700) maxLoan *= 0.85;
    else if (creditScore >= 800) maxLoan *= 1.1;

    maxLoan = Math.min(maxLoan, monthlyIncome * 30);

    return Math.max(0, Math.floor(maxLoan / 10000) * 10000);
  }, []);

  const generateRecommendations = useCallback((data, emi, aiResponse, maxEligible, afterEMI) => {
    const recommendations = [];
    const { monthlyIncome, loanAmount, existingDebts, creditScore, employmentType } = data;

    const totalDebt = existingDebts + emi;
    const dtiRatio = totalDebt / monthlyIncome;
    const isEligible = aiResponse.eligible;

    if (totalDebt >= monthlyIncome) {
      recommendations.push({
        type: 'critical',
        title: 'Total Debts Exceed Income',
        message: `Your monthly obligations (LKR ${Math.round(totalDebt).toLocaleString()}) exceed or equal your income (LKR ${Math.round(monthlyIncome).toLocaleString()}). This loan cannot be approved.`,
        action: `Reduce loan amount or pay off existing debts. Maximum eligible: LKR ${maxEligible.toLocaleString()}`
      });
    }

    if (afterEMI < 10000 && totalDebt < monthlyIncome) {
      recommendations.push({
        type: 'critical',
        title: 'Insufficient Disposable Income',
        message: `After paying all debts, you would only have LKR ${Math.round(afterEMI).toLocaleString()} remaining. Minimum required is LKR 10,000.`,
        action: `Reduce loan amount to ensure at least LKR 10,000 remains after EMI. Consider LKR ${maxEligible.toLocaleString()} instead.`
      });
    } else if (afterEMI >= 10000 && afterEMI < 25000) {
      recommendations.push({
        type: 'warning',
        title: 'Tight Disposable Income',
        message: `After EMI, only LKR ${Math.round(afterEMI).toLocaleString()} remains. This is risky for unexpected expenses.`,
        action: 'Consider a smaller loan amount or longer duration to increase monthly buffer.'
      });
    } else if (afterEMI >= 40000) {
      recommendations.push({
        type: 'success',
        title: 'Comfortable After-EMI Balance',
        message: `You will have LKR ${Math.round(afterEMI).toLocaleString()} remaining after paying all debts.`,
        action: 'Excellent! This shows strong repayment capacity and improves approval chances significantly.'
      });
    }

    if (dtiRatio > 0.7 && totalDebt < monthlyIncome) {
      recommendations.push({
        type: 'warning',
        title: 'High Debt-to-Income Ratio',
        message: `Your total monthly obligations use ${(dtiRatio * 100).toFixed(1)}% of your income.`,
        action: 'Banks prefer DTI below 60%. Pay off existing debts or reduce loan amount.'
      });
    }

    if (creditScore < 500) {
      recommendations.push({
        type: 'critical',
        title: 'Poor Credit Score',
        message: `A CRIB score of ${creditScore} is considered high risk.`,
        action: 'Work on improving your credit score. Pay bills on time, settle overdue accounts, reduce credit card balances.'
      });
    } else if (creditScore < 600) {
      recommendations.push({
        type: 'warning',
        title: 'Below Average Credit Score',
        message: `A score of ${creditScore} may limit your loan options.`,
        action: 'Provide additional collateral or a guarantor to strengthen your application.'
      });
    } else if (creditScore >= 750) {
      recommendations.push({
        type: 'success',
        title: 'Excellent Credit Score',
        message: `A score of ${creditScore} puts you in the top tier of borrowers.`,
        action: 'You may qualify for preferential interest rates.'
      });
    }

    if (employmentType === 'Self-Employed') {
      recommendations.push({
        type: 'info',
        title: 'Self-Employment Consideration',
        message: 'Self-employed applicants face additional scrutiny due to variable income.',
        action: 'Prepare 2+ years of audited accounts, tax returns, and bank statements.'
      });
    } else if (employmentType === 'Government') {
      recommendations.push({
        type: 'success',
        title: 'Government Employment Advantage',
        message: 'Government employees are viewed as lower risk due to stable income.',
        action: 'Ask about special government employee loan schemes with preferential rates.'
      });
    }

    if (aiResponse.recommendations && aiResponse.recommendations.length > 0) {
      aiResponse.recommendations.forEach(rec => {
        const isDuplicate = recommendations.some(r => r.message.toLowerCase().includes(rec.toLowerCase().slice(0, 20)));
        if (!isDuplicate) {
          recommendations.push({
            type: 'info',
            title: 'AI Recommendation',
            message: rec,
            action: 'Consider this suggestion from our AI model analysis.'
          });
        }
      });
    }

    if (!isEligible && maxEligible > 0 && loanAmount > maxEligible) {
      recommendations.push({
        type: 'info',
        title: 'Alternative Loan Amount',
        message: `Based on your profile, you may be eligible for up to LKR ${maxEligible.toLocaleString()} at 60% approval probability.`,
        action: `Consider applying for LKR ${maxEligible.toLocaleString()} instead.`
      });
    }

    return recommendations;
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const resetForm = () => {
    setFormData({
      monthlyIncome: '',
      loanAmount: '',
      duration: '',
      creditScore: '',
      existingDebts: '',
      employmentType: 'Private Sector',
      interestRate: ''
    });
    setResult(null);
  };

  const callAIEligibilityCheck = useCallback(async (data) => {
    try {
      const response = await api.post('/ai/check-eligibility', {
        monthly_income: data.monthlyIncome,
        loan_amount: data.loanAmount,
        credit_score: data.creditScore,
        existing_debts: data.existingDebts,
        duration: data.duration,
        employment_type: data.employmentType,
        interest_rate: data.interestRate
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('AI API Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }, []);

  const processEligibilityResult = useCallback((data, aiResponse) => {
    const emi = calculateEMI(data.loanAmount, data.interestRate, data.duration);
    const afterEMI = data.monthlyIncome - data.existingDebts - emi;
    const totalDebt = data.existingDebts + emi;

    let approvalProbability = aiResponse.approval_probability || aiResponse.approval_score || 0;
    let riskScore = aiResponse.risk_score || (100 - approvalProbability);

    const isEligible = aiResponse.eligible || approvalProbability >= 50;

    const maxEligible = calculateMaxLoanAmount(
      data.monthlyIncome,
      data.existingDebts,
      data.creditScore,
      data.duration,
      data.interestRate
    );

    const recommendations = generateRecommendations(data, emi, aiResponse, maxEligible, afterEMI);

    const dtiRatio = data.monthlyIncome > 0 ? (totalDebt / data.monthlyIncome) * 100 : 0;
    const loanToIncome = data.monthlyIncome > 0 ? data.loanAmount / data.monthlyIncome : 0;

    const totalRepayment = emi * data.duration;
    const totalInterest = totalRepayment - data.loanAmount;

    let riskLevel = 'High';
    if (riskScore < 30) riskLevel = 'Low';
    else if (riskScore < 60) riskLevel = 'Medium';

    return {
      isEligible,
      approvalProbability: Math.round(approvalProbability),
      riskScore: Math.round(riskScore),
      riskLevel,
      emi: Math.round(emi),
      maxEligibleAmount: maxEligible,
      totalRepayment: Math.round(totalRepayment),
      totalInterest: Math.round(totalInterest),
      dtiRatio: dtiRatio.toFixed(1),
      loanToIncome: loanToIncome.toFixed(1),
      afterEMI: Math.round(afterEMI),
      recommendations,
      inputData: data,
      aiFactors: aiResponse.factors || [],
      aiRiskCategory: aiResponse.risk_category || riskLevel
    };
  }, [calculateEMI, calculateMaxLoanAmount, generateRecommendations]);

  const checkEligibility = async () => {
    setLoading(true);
    setResult(null);

    try {
      const data = {
        monthlyIncome: parseFloat(formData.monthlyIncome) || 0,
        loanAmount: parseFloat(formData.loanAmount) || 0,
        duration: parseInt(formData.duration) || 36,
        creditScore: parseInt(formData.creditScore) || 0,
        existingDebts: parseFloat(formData.existingDebts) || 0,
        employmentType: formData.employmentType,
        interestRate: parseFloat(formData.interestRate) || 15
      };

      if (data.monthlyIncome === 0 || data.loanAmount === 0) return;

      const aiResult = await callAIEligibilityCheck(data);

      if (aiResult.success) {
        const processedResult = processEligibilityResult(data, aiResult.data);
        setResult(processedResult);
      } else {
        const emi = calculateEMI(data.loanAmount, data.interestRate, data.duration);
        const afterEMI = data.monthlyIncome - data.existingDebts - emi;
        const totalDebt = data.existingDebts + emi;

        let score = 50;
        if (afterEMI >= 40000) score += 20;
        else if (afterEMI >= 25000) score += 10;
        else if (afterEMI < 10000) score -= 30;

        if (data.creditScore >= 750) score += 15;
        else if (data.creditScore >= 650) score += 5;
        else if (data.creditScore < 500) score -= 15;

        if (totalDebt >= data.monthlyIncome) score = 0;

        score = Math.max(0, Math.min(100, score));

        const fallbackAI = {
          eligible: score >= 50 && afterEMI >= 10000,
          approval_probability: score,
          risk_score: 100 - score,
          risk_category: score >= 60 ? 'Low' : score >= 40 ? 'Medium' : 'High',
          recommendations: ['AI service unavailable - using local calculation'],
          factors: []
        };

        const processedResult = processEligibilityResult(data, fallbackAI);
        setResult({
          ...processedResult,
          usingFallback: true
        });
      }
    } catch (error) {
      console.error('Error checking eligibility:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (score) => {
    if (score >= 60) return '#10b981';
    if (score >= 40) return '#f59e0b';
    return '#ef4444';
  };

  const getRecommendationIcon = (type) => {
    if (type === 'critical') return <XCircle size={16} color="#ef4444" />;
    if (type === 'warning') return <AlertTriangle size={16} color="#f59e0b" />;
    if (type === 'success') return <CheckCircle size={16} color="#10b981" />;
    return <Info size={16} color={colors.textSecondary} />;
  };

  const inputStyle = {
    width: '100%',
    padding: '12px 14px',
    background: isDark ? '#0f172a' : '#ffffff',
    border: `1px solid ${colors.border}`,
    borderRadius: '8px',
    color: colors.text,
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s'
  };

  const labelStyle = {
    display: 'block',
    color: colors.textSecondary,
    fontSize: '13px',
    fontWeight: '500',
    marginBottom: '6px'
  };

  const cardStyle = {
    background: isDark ? '#0f172a' : '#ffffff',
    borderRadius: '10px',
    padding: '24px',
    border: `1px solid ${colors.border}`
  };

  return (
    <div style={{
      animation: 'fadeIn 0.3s ease',
      padding: '24px 28px'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '28px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            background: '#4361ee',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Calculator size={22} color="#ffffff" />
          </div>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: colors.text, marginBottom: '2px' }}>
              Eligibility Checker
            </h1>
            <p style={{ color: colors.textMuted, fontSize: '13px' }}>
              AI-powered loan eligibility analysis
            </p>
          </div>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 14px',
          background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
          border: `1px solid ${colors.border}`,
          borderRadius: '8px'
        }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: aiStatus.connected ? '#10b981' : '#f59e0b'
          }} />
          <span style={{ color: colors.textSecondary, fontSize: '13px', fontWeight: '500' }}>
            {aiStatus.connected === null ? 'Checking...' : aiStatus.connected ? 'AI Active' : 'Fallback Mode'}
          </span>
        </div>
      </div>

      {/* Main Layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: result ? '380px 1fr' : '1fr',
        gap: '24px'
      }}>
        {/* Form Section */}
        <div style={cardStyle}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '24px'
          }}>
            <h2 style={{ color: colors.text, fontSize: '16px', fontWeight: '600' }}>Financial Details</h2>
            {result && (
              <button
                onClick={resetForm}
                style={{
                  padding: '6px 12px',
                  background: 'transparent',
                  border: `1px solid ${colors.border}`,
                  borderRadius: '6px',
                  color: colors.textSecondary,
                  fontSize: '12px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <RefreshCw size={12} />
                Reset
              </button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Row 1: Income & Credit Score */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Monthly Income (LKR) *</label>
                <input
                  type="number"
                  name="monthlyIncome"
                  value={formData.monthlyIncome}
                  onChange={handleInputChange}
                  placeholder="e.g., 150000"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Credit Score (300-900) *</label>
                <input
                  type="number"
                  name="creditScore"
                  value={formData.creditScore}
                  onChange={handleInputChange}
                  placeholder="e.g., 680"
                  min="300"
                  max="900"
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Row 2: Loan Amount & Duration */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Loan Amount (LKR) *</label>
                <input
                  type="number"
                  name="loanAmount"
                  value={formData.loanAmount}
                  onChange={handleInputChange}
                  placeholder="e.g., 2000000"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Duration (Months) *</label>
                <select
                  name="duration"
                  value={formData.duration}
                  onChange={handleInputChange}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                >
                  <option value="">Select duration</option>
                  {durations.map(d => (
                    <option key={d} value={d}>{d} months ({(d / 12).toFixed(1)} yrs)</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 3: Interest Rate & Existing Debts */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Interest Rate (% p.a.) *</label>
                <input
                  type="number"
                  name="interestRate"
                  value={formData.interestRate}
                  onChange={handleInputChange}
                  placeholder="e.g., 15"
                  min="1"
                  max="40"
                  step="0.5"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Existing Monthly Debts (LKR) *</label>
                <input
                  type="number"
                  name="existingDebts"
                  value={formData.existingDebts}
                  onChange={handleInputChange}
                  placeholder="0 if none"
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Check Button */}
            <button
              onClick={checkEligibility}
              disabled={loading || !formData.monthlyIncome || !formData.loanAmount || !formData.creditScore || !formData.duration || !formData.interestRate}
              style={{
                width: '100%',
                padding: '14px',
                background: loading || !formData.monthlyIncome || !formData.loanAmount || !formData.creditScore || !formData.duration || !formData.interestRate
                  ? (isDark ? '#334155' : '#e2e8f0')
                  : '#4361ee',
                border: 'none',
                borderRadius: '8px',
                color: loading || !formData.monthlyIncome || !formData.loanAmount || !formData.creditScore || !formData.duration || !formData.interestRate
                  ? colors.textMuted : 'white',
                fontSize: '14px',
                fontWeight: '600',
                cursor: loading || !formData.monthlyIncome || !formData.loanAmount || !formData.creditScore || !formData.duration || !formData.interestRate ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginTop: '4px',
                transition: 'opacity 0.2s'
              }}
            >
              {loading ? (
                <>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid white',
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  {result ? 'Recalculate' : 'Check Eligibility'}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Results Panel */}
        {result && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Result Header */}
            <div style={{
              ...cardStyle,
              border: `1px solid ${result.isEligible ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: result.isEligible ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {result.isEligible ? (
                    <CheckCircle size={28} color="#10b981" />
                  ) : (
                    <XCircle size={28} color="#ef4444" />
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <h2 style={{ color: colors.text, fontSize: '20px', fontWeight: '700', marginBottom: '2px' }}>
                    {result.isEligible ? 'Likely Eligible' : 'Not Eligible'}
                  </h2>
                  <p style={{ color: colors.textMuted, fontSize: '13px' }}>
                    {result.usingFallback ? 'Based on local calculation' : 'Based on AI model prediction'}
                  </p>
                </div>

                {/* Approval Score */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    border: `3px solid ${getStatusColor(result.approvalProbability)}`,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <span style={{ color: getStatusColor(result.approvalProbability), fontSize: '22px', fontWeight: '700' }}>
                      {result.approvalProbability}%
                    </span>
                  </div>
                  <span style={{ color: colors.textMuted, fontSize: '11px', marginTop: '4px', display: 'block' }}>Approval</span>
                </div>
              </div>
            </div>

            {/* Key Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              {[
                { label: 'Monthly EMI', value: `LKR ${result.emi.toLocaleString()}` },
                { label: 'After EMI Balance', value: `LKR ${result.afterEMI.toLocaleString()}`, color: result.afterEMI < 10000 ? '#ef4444' : result.afterEMI < 25000 ? '#f59e0b' : undefined },
                { label: 'Risk Level', value: result.riskLevel, color: result.riskLevel === 'Low' ? '#10b981' : result.riskLevel === 'Medium' ? '#f59e0b' : '#ef4444' }
              ].map((metric, idx) => (
                <div key={idx} style={{
                  ...cardStyle,
                  padding: '16px',
                  textAlign: 'center'
                }}>
                  <p style={{ color: colors.textMuted, fontSize: '12px', marginBottom: '6px' }}>{metric.label}</p>
                  <p style={{ color: metric.color || colors.text, fontSize: '16px', fontWeight: '700' }}>
                    {metric.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Financial Analysis */}
            <div style={cardStyle}>
              <h3 style={{ color: colors.text, fontSize: '15px', fontWeight: '600', marginBottom: '16px' }}>
                Financial Analysis
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                {[
                  { label: 'Debt-to-Income', value: `${result.dtiRatio}%`, max: 100, current: parseFloat(result.dtiRatio), warn: 60, danger: 100 },
                  { label: 'Loan-to-Income', value: `${result.loanToIncome}x`, max: 30, current: parseFloat(result.loanToIncome), warn: 10, danger: 20 },
                  { label: 'After EMI Health', value: result.afterEMI >= 40000 ? 'Safe' : result.afterEMI >= 10000 ? 'Risky' : 'Low', max: 100, current: Math.min(100, Math.max(0, result.afterEMI / 500)), good: true }
                ].map((item, idx) => {
                  const barColor = item.good
                    ? (item.current > 50 ? '#10b981' : item.current > 0 ? '#f59e0b' : '#ef4444')
                    : (item.current >= (item.danger || 100) ? '#ef4444' : item.current > (item.warn || 60) ? '#f59e0b' : '#10b981');
                  return (
                    <div key={idx}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ color: colors.textMuted, fontSize: '12px' }}>{item.label}</span>
                        <span style={{ color: barColor, fontWeight: '600', fontSize: '13px' }}>{item.value}</span>
                      </div>
                      <div style={{ height: '6px', background: isDark ? '#1e293b' : '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          width: `${Math.min(100, (item.current / item.max) * 100)}%`,
                          background: barColor,
                          borderRadius: '3px',
                          transition: 'width 0.5s ease'
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Cost Summary */}
              <div style={{
                marginTop: '20px',
                padding: '16px',
                background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc',
                borderRadius: '8px',
                display: 'flex',
                justifyContent: 'space-around'
              }}>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ color: colors.textMuted, fontSize: '12px', marginBottom: '4px' }}>Total Repayment</p>
                  <p style={{ color: colors.text, fontSize: '16px', fontWeight: '700' }}>LKR {result.totalRepayment.toLocaleString()}</p>
                </div>
                <div style={{ width: '1px', background: colors.border }} />
                <div style={{ textAlign: 'center' }}>
                  <p style={{ color: colors.textMuted, fontSize: '12px', marginBottom: '4px' }}>Total Interest</p>
                  <p style={{ color: colors.text, fontSize: '16px', fontWeight: '700' }}>LKR {result.totalInterest.toLocaleString()}</p>
                </div>
                <div style={{ width: '1px', background: colors.border }} />
                <div style={{ textAlign: 'center' }}>
                  <p style={{ color: colors.textMuted, fontSize: '12px', marginBottom: '4px' }}>Interest Rate</p>
                  <p style={{ color: colors.text, fontSize: '16px', fontWeight: '700' }}>{formData.interestRate || 15}% p.a.</p>
                </div>
              </div>
            </div>

            {/* Recommendations */}
            {result.recommendations.length > 0 && (
              <div style={cardStyle}>
                <h3 style={{ color: colors.text, fontSize: '15px', fontWeight: '600', marginBottom: '16px' }}>
                  Recommendations ({result.recommendations.length})
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {result.recommendations.map((rec, idx) => (
                    <div key={idx} style={{
                      padding: '14px 16px',
                      background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc',
                      border: `1px solid ${colors.border}`,
                      borderRadius: '8px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                        <div style={{ marginTop: '1px', flexShrink: 0 }}>
                          {getRecommendationIcon(rec.type)}
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ color: colors.text, fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>{rec.title}</p>
                          <p style={{ color: colors.textMuted, fontSize: '12px', lineHeight: '1.5', marginBottom: '6px' }}>{rec.message}</p>
                          <p style={{ color: colors.textSecondary, fontSize: '12px', lineHeight: '1.4' }}>
                            <ChevronRight size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                            {rec.action}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        input:focus, select:focus {
          border-color: #4361ee !important;
          box-shadow: 0 0 0 3px rgba(67, 97, 238, 0.1);
        }
        input::placeholder {
          color: ${colors.textMuted};
        }
        input::-webkit-outer-spin-button,
        input::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        select option {
          background: ${isDark ? '#1f2937' : '#ffffff'};
          color: ${colors.text};
        }
      `}</style>
    </div>
  );
}
