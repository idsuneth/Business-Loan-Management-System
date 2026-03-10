import React, { useState } from 'react';
import { 
  Calculator, AlertTriangle, CheckCircle, XCircle, TrendingUp, 
  DollarSign, Shield, Briefcase, CreditCard, PiggyBank, Target,
  ChevronRight, Info, Award, BarChart3, Wallet, Building2, AlertCircle,
  ArrowLeft, RefreshCw
} from 'lucide-react';
import Header from '../components/common/Header';
import Sidebar from '../components/common/Sidebar';
import { useTheme } from '../context/ThemeContext';

export default function EligibilityPage() {
  const { isDark, colors } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [formData, setFormData] = useState({
    monthlyIncome: '',
    loanAmount: '',
    duration: 36,
    creditScore: '',
    existingDebts: '',
    collateralValue: '',
    employmentType: 'Private Sector'
  });
  
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const employmentTypes = [
    'Government',
    'Private Sector',
    'Business Owner',
    'Self-Employed',
    'Senior Mgmt'
  ];

  const durations = [12, 18, 24, 36, 48, 60, 72, 84];

  // Calculate EMI
  const calculateEMI = (principal, annualRate, months) => {
    if (months === 0 || annualRate === 0) return principal / Math.max(months, 1);
    const monthlyRate = annualRate / 12 / 100;
    const emi = principal * monthlyRate * Math.pow(1 + monthlyRate, months) / (Math.pow(1 + monthlyRate, months) - 1);
    return emi;
  };

  // Calculate maximum eligible loan amount
  const calculateMaxLoanAmount = (monthlyIncome, existingDebts, collateralValue, creditScore, duration) => {
    const annualRate = 15;
    const monthlyRate = annualRate / 12 / 100;
    
    // Available income for EMI (50% of income - debts)
    const availableForEMI = (monthlyIncome * 0.5) - existingDebts;
    
    if (availableForEMI <= 0) return 0;
    
    // Calculate max loan from EMI affordability
    const factor = (Math.pow(1 + monthlyRate, duration) - 1) / (monthlyRate * Math.pow(1 + monthlyRate, duration));
    let maxFromIncome = availableForEMI * factor;
    
    // Adjust based on credit score
    if (creditScore < 500) maxFromIncome *= 0.5;
    else if (creditScore < 600) maxFromIncome *= 0.7;
    else if (creditScore < 700) maxFromIncome *= 0.85;
    else if (creditScore >= 800) maxFromIncome *= 1.1;
    
    // Collateral-based limit
    const maxFromCollateral = collateralValue * 0.8;
    
    // Take higher of the two, cap at 40x monthly income
    let maxLoan = Math.max(maxFromIncome, maxFromCollateral);
    maxLoan = Math.min(maxLoan, monthlyIncome * 40);
    
    return Math.max(0, Math.floor(maxLoan / 10000) * 10000);
  };

  // Calculate risk score
  const calculateRiskScore = (data, emi) => {
    let score = 50;
    
    const { monthlyIncome, loanAmount, collateralValue, existingDebts, creditScore, employmentType, duration } = data;
    
    // 1. Debt-to-Income Ratio
    const totalMonthlyDebt = existingDebts + emi;
    const dtiRatio = monthlyIncome > 0 ? totalMonthlyDebt / monthlyIncome : 1;
    
    if (dtiRatio < 0.3) score += 15;
    else if (dtiRatio < 0.4) score += 10;
    else if (dtiRatio < 0.5) score += 5;
    else if (dtiRatio < 0.6) score += 0;
    else if (dtiRatio < 0.7) score -= 10;
    else score -= 20;
    
    // 2. Collateral Coverage
    const collateralRatio = loanAmount > 0 ? collateralValue / loanAmount : 0;
    
    if (collateralRatio >= 1.5) score += 20;
    else if (collateralRatio >= 1.2) score += 15;
    else if (collateralRatio >= 1.0) score += 12;
    else if (collateralRatio >= 0.7) score += 5;
    else if (collateralRatio >= 0.3) score += 0;
    else if (collateralRatio > 0) score -= 5;
    else score -= 15;
    
    // 3. Credit Score
    if (creditScore >= 800) score += 20;
    else if (creditScore >= 700) score += 15;
    else if (creditScore >= 650) score += 10;
    else if (creditScore >= 600) score += 5;
    else if (creditScore >= 550) score += 0;
    else if (creditScore >= 500) score -= 5;
    else if (creditScore >= 450) score -= 10;
    else score -= 15;
    
    // 4. Employment Type
    const empScores = {
      'Government': 15,
      'Senior Mgmt': 12,
      'Private Sector': 5,
      'Business Owner': 0,
      'Self-Employed': -10
    };
    score += empScores[employmentType] || 0;
    
    // 5. Loan Amount vs Income
    const loanToIncome = monthlyIncome > 0 ? loanAmount / monthlyIncome : 100;
    
    if (loanToIncome < 10) score += 10;
    else if (loanToIncome < 15) score += 5;
    else if (loanToIncome < 20) score += 0;
    else if (loanToIncome < 30) score -= 5;
    else score -= 10;
    
    // 6. Duration
    if (duration <= 24) score += 5;
    else if (duration <= 48) score += 0;
    else score -= 5;
    
    // 7. Disposable Income
    const disposable = monthlyIncome - existingDebts - emi;
    if (disposable > 100000) score += 10;
    else if (disposable > 50000) score += 5;
    
    return Math.max(0, Math.min(100, score));
  };

  // Generate recommendations
  const generateRecommendations = (data, emi, riskScore, isEligible, maxEligible) => {
    const recommendations = [];
    const { monthlyIncome, loanAmount, collateralValue, existingDebts, creditScore, employmentType, duration } = data;
    
    const dtiRatio = (existingDebts + emi) / monthlyIncome;
    const collateralRatio = loanAmount > 0 ? collateralValue / loanAmount : 0;
    const loanToIncome = loanAmount / monthlyIncome;
    
    // EMI > Income - Critical
    if (emi >= monthlyIncome) {
      recommendations.push({
        type: 'critical',
        title: 'Monthly Payment Exceeds Income',
        message: `The monthly payment (LKR ${Math.round(emi).toLocaleString()}) is greater than or equal to your monthly income. This loan is not feasible.`,
        action: `Reduce loan amount to below LKR ${maxEligible.toLocaleString()} or extend the duration to reduce monthly payments.`
      });
    }
    
    // High DTI Ratio
    if (dtiRatio > 0.6) {
      recommendations.push({
        type: 'warning',
        title: 'High Debt-to-Income Ratio',
        message: `Your total monthly obligations (${(dtiRatio * 100).toFixed(1)}%) exceed 60% of income.`,
        action: 'Consider paying off existing debts first or reducing the loan amount to improve your debt-to-income ratio.'
      });
    } else if (dtiRatio > 0.4) {
      recommendations.push({
        type: 'info',
        title: 'Moderate Debt Level',
        message: `Your debt-to-income ratio is ${(dtiRatio * 100).toFixed(1)}%.`,
        action: 'This is manageable but reducing existing debts would strengthen your application.'
      });
    } else if (dtiRatio <= 0.4) {
      recommendations.push({
        type: 'success',
        title: 'Healthy Debt Level',
        message: `Your debt-to-income ratio is only ${(dtiRatio * 100).toFixed(1)}%.`,
        action: 'Excellent financial discipline! You have comfortable room for this loan.'
      });
    }
    
    // Credit Score
    if (creditScore < 500) {
      recommendations.push({
        type: 'critical',
        title: 'Poor Credit Score',
        message: `A CRIB score of ${creditScore} is considered high risk.`,
        action: 'Work on improving your credit score by paying bills on time, reducing credit card balances, and settling any overdue accounts.'
      });
    } else if (creditScore < 600) {
      recommendations.push({
        type: 'warning',
        title: 'Below Average Credit Score',
        message: `A score of ${creditScore} may limit your loan options.`,
        action: 'Consider providing additional collateral or a guarantor to strengthen your application. Focus on improving your credit score.'
      });
    } else if (creditScore >= 750) {
      recommendations.push({
        type: 'success',
        title: 'Excellent Credit Score',
        message: `A score of ${creditScore} puts you in the top tier of borrowers.`,
        action: 'You may qualify for preferential interest rates. Inquire about premium customer rates!'
      });
    } else if (creditScore >= 650) {
      recommendations.push({
        type: 'success',
        title: 'Good Credit Score',
        message: `A score of ${creditScore} is considered good.`,
        action: 'Your credit history works in your favor for loan approval.'
      });
    }
    
    // Collateral
    if (collateralRatio >= 1.0) {
      recommendations.push({
        type: 'success',
        title: 'Fully Secured Loan',
        message: `Your collateral covers ${(collateralRatio * 100).toFixed(0)}% of the loan amount.`,
        action: 'This significantly reduces risk and greatly improves your approval probability. You may also qualify for lower interest rates.'
      });
    } else if (collateralRatio > 0 && collateralRatio < 1.0) {
      recommendations.push({
        type: 'info',
        title: 'Partially Secured Loan',
        message: `Collateral covers only ${(collateralRatio * 100).toFixed(0)}% of the loan.`,
        action: 'Consider increasing collateral to 100%+ of loan value for better approval chances and potentially lower interest rates.'
      });
    }
    
    // Loan to Income
    if (loanToIncome > 25) {
      recommendations.push({
        type: 'warning',
        title: 'High Loan-to-Income Ratio',
        message: `You are requesting ${loanToIncome.toFixed(1)}x your monthly income.`,
        action: 'Consider a smaller loan amount or longer duration to make the loan more manageable. Banks typically prefer loans under 20x monthly income.'
      });
    }
    
    // Duration
    if (duration > 60) {
      recommendations.push({
        type: 'info',
        title: 'Long Loan Duration',
        message: `A ${duration}-month (${(duration/12).toFixed(1)} year) term means more total interest paid.`,
        action: 'If possible, choose a shorter term to save on total interest. However, longer terms reduce monthly EMI burden.'
      });
    } else if (duration <= 24) {
      recommendations.push({
        type: 'success',
        title: 'Short Loan Duration',
        message: `A ${duration}-month term means you will pay less interest overall.`,
        action: 'Short-term loans are viewed favorably by lenders and reduce total cost.'
      });
    }
    
    // Employment specific
    if (employmentType === 'Self-Employed') {
      recommendations.push({
        type: 'info',
        title: 'Self-Employment Consideration',
        message: 'Self-employed applicants face additional scrutiny due to variable income.',
        action: 'Prepare 2+ years of audited accounts, tax returns, business registration, and bank statements to support your application.'
      });
    } else if (employmentType === 'Government') {
      recommendations.push({
        type: 'success',
        title: 'Government Employment Advantage',
        message: 'Government employees are viewed as lower risk due to stable income.',
        action: 'You may qualify for special government employee loan schemes with preferential rates. Ask about these options!'
      });
    } else if (employmentType === 'Senior Mgmt') {
      recommendations.push({
        type: 'success',
        title: 'Senior Management Status',
        message: 'Senior management positions indicate stable, high income.',
        action: 'Your professional standing improves approval chances. Consider premium banking relationships for better rates.'
      });
    }
    
    // If not eligible but close
    if (!isEligible && loanAmount > maxEligible && maxEligible > 0) {
      recommendations.push({
        type: 'info',
        title: 'Alternative Loan Amount',
        message: `Based on your profile, you may be eligible for up to LKR ${maxEligible.toLocaleString()}.`,
        action: `Consider applying for LKR ${maxEligible.toLocaleString()} instead, or improve your profile factors before applying for the full amount.`
      });
    }
    
    return recommendations;
  };

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
      duration: 36,
      creditScore: '',
      existingDebts: '',
      collateralValue: '',
      employmentType: 'Private Sector'
    });
    setResult(null);
  };

  const checkEligibility = async () => {
    setLoading(true);
    setResult(null);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    try {
      const data = {
        monthlyIncome: parseFloat(formData.monthlyIncome) || 0,
        loanAmount: parseFloat(formData.loanAmount) || 0,
        duration: parseInt(formData.duration),
        creditScore: parseInt(formData.creditScore) || 0,
        existingDebts: parseFloat(formData.existingDebts) || 0,
        collateralValue: parseFloat(formData.collateralValue) || 0,
        employmentType: formData.employmentType
      };
      
      // Calculate EMI
      const emi = calculateEMI(data.loanAmount, 15, data.duration);
      
      // Calculate risk score
      const riskScore = calculateRiskScore(data, emi);
      
      // Calculate max eligible amount
      const maxEligible = calculateMaxLoanAmount(
        data.monthlyIncome, 
        data.existingDebts, 
        data.collateralValue, 
        data.creditScore, 
        data.duration
      );
      
      // Determine eligibility
      let isEligible = false;
      let approvalProbability = 0;
      
      // CRITICAL: EMI >= Monthly Income = 0% probability
      if (emi >= data.monthlyIncome) {
        isEligible = false;
        approvalProbability = 0;
      } else {
        // Calculate available income for EMI
        let availableForEMI;
        if (data.collateralValue >= data.loanAmount) {
          // Secured: use full income minus debts
          availableForEMI = data.monthlyIncome - data.existingDebts;
        } else {
          // Unsecured: use 70% of income minus debts
          availableForEMI = (data.monthlyIncome * 0.70) - data.existingDebts;
        }
        
        // Check affordability
        const canAfford = availableForEMI >= (emi * 1.1);
        
        if (canAfford && riskScore >= 45) {
          isEligible = true;
          approvalProbability = Math.min(95, riskScore + 10);
        } else if (canAfford && riskScore >= 35) {
          isEligible = data.collateralValue >= data.loanAmount || data.creditScore >= 600;
          approvalProbability = isEligible ? Math.min(75, riskScore + 5) : riskScore * 0.5;
        } else if (data.collateralValue >= data.loanAmount * 1.2) {
          isEligible = true;
          approvalProbability = Math.min(80, riskScore + 15);
        } else {
          isEligible = false;
          approvalProbability = Math.max(5, riskScore * 0.4);
        }
      }
      
      // Generate recommendations
      const recommendations = generateRecommendations(data, emi, riskScore, isEligible, maxEligible);
      
      // Calculate ratios
      const dtiRatio = data.monthlyIncome > 0 ? ((data.existingDebts + emi) / data.monthlyIncome) * 100 : 0;
      const collateralRatio = data.loanAmount > 0 ? (data.collateralValue / data.loanAmount) * 100 : 0;
      const loanToIncome = data.monthlyIncome > 0 ? data.loanAmount / data.monthlyIncome : 0;
      const disposableIncome = data.monthlyIncome - data.existingDebts - emi;
      
      // Total cost
      const totalRepayment = emi * data.duration;
      const totalInterest = totalRepayment - data.loanAmount;
      
      setResult({
        isEligible,
        approvalProbability: Math.round(approvalProbability),
        riskScore,
        riskLevel: riskScore >= 60 ? 'Low' : riskScore >= 40 ? 'Medium' : 'High',
        emi: Math.round(emi),
        maxEligibleAmount: maxEligible,
        totalRepayment: Math.round(totalRepayment),
        totalInterest: Math.round(totalInterest),
        dtiRatio: dtiRatio.toFixed(1),
        collateralRatio: collateralRatio.toFixed(1),
        loanToIncome: loanToIncome.toFixed(1),
        disposableIncome: Math.round(disposableIncome),
        recommendations,
        inputData: data
      });
      
    } catch (error) {
      console.error('Error checking eligibility:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (score) => {
    if (score >= 60) return '#10b981';
    if (score >= 40) return '#f59e0b';
    return '#ef4444';
  };

  const getRecommendationStyle = (type) => {
    const styles = {
      critical: { bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.3)', color: '#f87171', icon: '#ef4444' },
      warning: { bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.3)', color: '#fbbf24', icon: '#f59e0b' },
      info: { bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.3)', color: '#60a5fa', icon: '#3b82f6' },
      success: { bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.3)', color: '#34d399', icon: '#10b981' }
    };
    return styles[type] || styles.info;
  };

  const inputStyle = {
    width: '100%',
    padding: '14px 16px',
    background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
    border: `1px solid ${colors.border}`,
    borderRadius: '12px',
    color: colors.text,
    fontSize: '15px',
    outline: 'none',
    transition: 'all 0.2s'
  };

  const labelStyle = {
    display: 'block',
    color: colors.textSecondary,
    fontSize: '13px',
    fontWeight: '600',
    marginBottom: '8px'
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: isDark ? '#0a0a0f' : '#f5f5f5' }}>
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} userRole="admin" />
      
      <div style={{ flex: 1, marginLeft: sidebarOpen ? '280px' : '80px', transition: 'margin-left 0.3s ease' }}>
        <Header toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        
        <div style={{ padding: '24px', minHeight: 'calc(100vh - 72px)' }}>
          {/* Header */}
          <div style={{ marginBottom: '28px' }}>
            <h1 style={{ 
              fontSize: '28px', 
              fontWeight: '700', 
              color: colors.text,
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '8px'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                borderRadius: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Calculator size={24} color="white" />
              </div>
              Loan Eligibility Checker
            </h1>
            <p style={{ color: colors.textMuted, fontSize: '15px' }}>
              Check loan eligibility with detailed AI-powered analysis and personalized recommendations
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: result ? '400px 1fr' : '500px', gap: '24px', justifyContent: result ? 'start' : 'center' }}>
            {/* Input Form */}
            <div style={{
              background: isDark ? 'linear-gradient(135deg, rgba(17, 24, 39, 0.95) 0%, rgba(31, 41, 55, 0.95) 100%)' : 'linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(245,245,245,0.98) 100%)',
              borderRadius: '20px',
              padding: '24px',
              border: `1px solid ${colors.border}`,
              height: 'fit-content'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <h3 style={{ color: colors.text, fontSize: '18px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Wallet size={20} style={{ color: '#8b5cf6' }} />
                  Enter Financial Details
                </h3>
                {result && (
                  <button
                    onClick={resetForm}
                    style={{
                      padding: '8px 12px',
                      background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                      border: `1px solid ${colors.border}`,
                      borderRadius: '8px',
                      color: colors.text,
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <RefreshCw size={14} />
                    Reset
                  </button>
                )}
              </div>

              <div style={{ display: 'grid', gap: '14px' }}>
                {/* Monthly Income */}
                <div>
                  <label style={labelStyle}>
                    <DollarSign size={14} style={{ display: 'inline', marginRight: '6px' }} />
                    Monthly Income (LKR) *
                  </label>
                  <input
                    type="number"
                    name="monthlyIncome"
                    value={formData.monthlyIncome}
                    onChange={handleInputChange}
                    placeholder="e.g., 150000"
                    style={inputStyle}
                  />
                </div>

                {/* Loan Amount */}
                <div>
                  <label style={labelStyle}>
                    <Target size={14} style={{ display: 'inline', marginRight: '6px' }} />
                    Requested Loan Amount (LKR) *
                  </label>
                  <input
                    type="number"
                    name="loanAmount"
                    value={formData.loanAmount}
                    onChange={handleInputChange}
                    placeholder="e.g., 2000000"
                    style={inputStyle}
                  />
                </div>

                {/* Duration */}
                <div>
                  <label style={labelStyle}>
                    <BarChart3 size={14} style={{ display: 'inline', marginRight: '6px' }} />
                    Loan Duration
                  </label>
                  <select
                    name="duration"
                    value={formData.duration}
                    onChange={handleInputChange}
                    style={{ ...inputStyle, cursor: 'pointer' }}
                  >
                    {durations.map(d => (
                      <option key={d} value={d} style={{ background: isDark ? '#1f2937' : '#ffffff', color: colors.text }}>
                        {d} months ({(d / 12).toFixed(1)} years)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Credit Score */}
                <div>
                  <label style={labelStyle}>
                    <CreditCard size={14} style={{ display: 'inline', marginRight: '6px' }} />
                    Credit Score (CRIB: 300-900) *
                  </label>
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

                {/* Existing Debts */}
                <div>
                  <label style={labelStyle}>
                    <PiggyBank size={14} style={{ display: 'inline', marginRight: '6px' }} />
                    Existing Monthly Debts (LKR)
                  </label>
                  <input
                    type="number"
                    name="existingDebts"
                    value={formData.existingDebts}
                    onChange={handleInputChange}
                    placeholder="e.g., 25000 (0 if none)"
                    style={inputStyle}
                  />
                </div>

                {/* Collateral Value */}
                <div>
                  <label style={labelStyle}>
                    <Shield size={14} style={{ display: 'inline', marginRight: '6px' }} />
                    Collateral Value (LKR)
                  </label>
                  <input
                    type="number"
                    name="collateralValue"
                    value={formData.collateralValue}
                    onChange={handleInputChange}
                    placeholder="e.g., 2500000 (0 if none)"
                    style={inputStyle}
                  />
                </div>

                {/* Employment Type */}
                <div>
                  <label style={labelStyle}>
                    <Briefcase size={14} style={{ display: 'inline', marginRight: '6px' }} />
                    Employment Type
                  </label>
                  <select
                    name="employmentType"
                    value={formData.employmentType}
                    onChange={handleInputChange}
                    style={{ ...inputStyle, cursor: 'pointer' }}
                  >
                    {employmentTypes.map(type => (
                      <option key={type} value={type} style={{ background: isDark ? '#1f2937' : '#ffffff', color: colors.text }}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Check Button */}
                <button
                  onClick={checkEligibility}
                  disabled={loading || !formData.monthlyIncome || !formData.loanAmount || !formData.creditScore}
                  style={{
                    width: '100%',
                    padding: '16px',
                    background: loading || !formData.monthlyIncome || !formData.loanAmount || !formData.creditScore 
                      ? 'rgba(139, 92, 246, 0.4)' 
                      : 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                    border: 'none',
                    borderRadius: '12px',
                    color: 'white',
                    fontSize: '16px',
                    fontWeight: '700',
                    cursor: loading || !formData.monthlyIncome || !formData.loanAmount || !formData.creditScore ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    marginTop: '8px'
                  }}
                >
                  {loading ? (
                    <>
                      <div style={{ 
                        width: '20px', 
                        height: '20px', 
                        border: '2px solid white', 
                        borderTopColor: 'transparent', 
                        borderRadius: '50%', 
                        animation: 'spin 1s linear infinite' 
                      }} />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Calculator size={20} />
                      Check Eligibility
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Results Panel */}
            {result && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Main Result Card */}
                <div style={{
                  background: result.isEligible 
                    ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0.05) 100%)'
                    : 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(239, 68, 68, 0.05) 100%)',
                  borderRadius: '20px',
                  padding: '24px',
                  border: `1px solid ${result.isEligible ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '16px',
                        background: result.isEligible ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {result.isEligible ? (
                          <CheckCircle size={32} color="#10b981" />
                        ) : (
                          <XCircle size={32} color="#ef4444" />
                        )}
                      </div>
                      <div>
                        <h2 style={{ color: colors.text, fontSize: '24px', fontWeight: '700', marginBottom: '4px' }}>
                          {result.isEligible ? 'Likely Eligible' : 'Not Eligible'}
                        </h2>
                        <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
                          {result.isEligible 
                            ? 'Based on your financial profile, you are likely to be approved'
                            : 'Current profile does not meet approval criteria'}
                        </p>
                      </div>
                    </div>
                    
                    {/* Approval Probability */}
                    <div style={{ textAlign: 'center' }}>
                      <div style={{
                        width: '100px',
                        height: '100px',
                        borderRadius: '50%',
                        background: `conic-gradient(${getRiskColor(result.riskScore)} ${result.approvalProbability * 3.6}deg, ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} 0deg)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative'
                      }}>
                        <div style={{
                          width: '80px',
                          height: '80px',
                          borderRadius: '50%',
                          background: isDark ? '#111827' : '#f5f5f5',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <span style={{ color: colors.text, fontSize: '24px', fontWeight: '700' }}>{result.approvalProbability}%</span>
                          <span style={{ color: colors.textMuted, fontSize: '10px' }}>Probability</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Key Metrics */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                  {/* Monthly EMI */}
                  <div style={{
                    background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                    borderRadius: '16px',
                    padding: '16px',
                    border: `1px solid ${colors.border}`
                  }}>
                    <p style={{ color: colors.textMuted, fontSize: '12px', marginBottom: '6px' }}>Monthly EMI</p>
                    <p style={{ color: '#f59e0b', fontSize: '20px', fontWeight: '700' }}>
                      LKR {result.emi.toLocaleString()}
                    </p>
                  </div>

                  {/* Risk Score */}
                  <div style={{
                    background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                    borderRadius: '16px',
                    padding: '16px',
                    border: `1px solid ${colors.border}`
                  }}>
                    <p style={{ color: colors.textMuted, fontSize: '12px', marginBottom: '6px' }}>Risk Score</p>
                    <p style={{ color: getRiskColor(result.riskScore), fontSize: '20px', fontWeight: '700' }}>
                      {result.riskScore}/100
                    </p>
                    <p style={{ color: getRiskColor(result.riskScore), fontSize: '11px' }}>{result.riskLevel} Risk</p>
                  </div>

                  {/* Max Eligible */}
                  <div style={{
                    background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                    borderRadius: '16px',
                    padding: '16px',
                    border: `1px solid ${colors.border}`
                  }}>
                    <p style={{ color: colors.textMuted, fontSize: '12px', marginBottom: '6px' }}>Max Eligible</p>
                    <p style={{ color: '#10b981', fontSize: '20px', fontWeight: '700' }}>
                      LKR {result.maxEligibleAmount.toLocaleString()}
                    </p>
                  </div>

                  {/* Remaining After EMI */}
                  <div style={{
                    background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                    borderRadius: '16px',
                    padding: '16px',
                    border: `1px solid ${colors.border}`
                  }}>
                    <p style={{ color: colors.textMuted, fontSize: '12px', marginBottom: '6px' }}>After EMI</p>
                    <p style={{ 
                      color: result.disposableIncome > 0 ? '#10b981' : '#ef4444', 
                      fontSize: '20px', 
                      fontWeight: '700' 
                    }}>
                      LKR {result.disposableIncome.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Financial Analysis */}
                <div style={{
                  background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                  borderRadius: '20px',
                  padding: '20px',
                  border: `1px solid ${colors.border}`
                }}>
                  <h3 style={{ color: colors.text, fontSize: '16px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <BarChart3 size={18} style={{ color: '#8b5cf6' }} />
                    Financial Analysis
                  </h3>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                    {/* DTI Ratio */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ color: colors.textSecondary, fontSize: '13px' }}>Debt-to-Income</span>
                        <span style={{ 
                          color: parseFloat(result.dtiRatio) > 60 ? '#ef4444' : parseFloat(result.dtiRatio) > 40 ? '#f59e0b' : '#10b981', 
                          fontWeight: '600' 
                        }}>
                          {result.dtiRatio}%
                        </span>
                      </div>
                      <div style={{ height: '8px', background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ 
                          height: '100%', 
                          width: `${Math.min(100, parseFloat(result.dtiRatio))}%`,
                          background: parseFloat(result.dtiRatio) > 60 ? '#ef4444' : parseFloat(result.dtiRatio) > 40 ? '#f59e0b' : '#10b981',
                          borderRadius: '4px',
                          transition: 'width 0.5s ease'
                        }} />
                      </div>
                      <p style={{ color: colors.textMuted, fontSize: '11px', marginTop: '4px' }}>
                        Ideal: Below 40%
                      </p>
                    </div>

                    {/* Collateral Coverage */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ color: colors.textSecondary, fontSize: '13px' }}>Collateral Coverage</span>
                        <span style={{ 
                          color: parseFloat(result.collateralRatio) >= 100 ? '#10b981' : parseFloat(result.collateralRatio) > 0 ? '#f59e0b' : '#ef4444', 
                          fontWeight: '600' 
                        }}>
                          {result.collateralRatio}%
                        </span>
                      </div>
                      <div style={{ height: '8px', background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ 
                          height: '100%', 
                          width: `${Math.min(100, parseFloat(result.collateralRatio))}%`,
                          background: parseFloat(result.collateralRatio) >= 100 ? '#10b981' : parseFloat(result.collateralRatio) > 0 ? '#f59e0b' : '#ef4444',
                          borderRadius: '4px',
                          transition: 'width 0.5s ease'
                        }} />
                      </div>
                      <p style={{ color: colors.textMuted, fontSize: '11px', marginTop: '4px' }}>
                        Ideal: 100%+
                      </p>
                    </div>

                    {/* Loan to Income */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ color: colors.textSecondary, fontSize: '13px' }}>Loan-to-Income</span>
                        <span style={{ 
                          color: parseFloat(result.loanToIncome) > 20 ? '#ef4444' : parseFloat(result.loanToIncome) > 10 ? '#f59e0b' : '#10b981', 
                          fontWeight: '600' 
                        }}>
                          {result.loanToIncome}x
                        </span>
                      </div>
                      <div style={{ height: '8px', background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ 
                          height: '100%', 
                          width: `${Math.min(100, parseFloat(result.loanToIncome) * 3)}%`,
                          background: parseFloat(result.loanToIncome) > 20 ? '#ef4444' : parseFloat(result.loanToIncome) > 10 ? '#f59e0b' : '#10b981',
                          borderRadius: '4px',
                          transition: 'width 0.5s ease'
                        }} />
                      </div>
                      <p style={{ color: colors.textMuted, fontSize: '11px', marginTop: '4px' }}>
                        Ideal: Below 15x
                      </p>
                    </div>
                  </div>

                  {/* Total Cost Summary */}
                  <div style={{ 
                    marginTop: '20px', 
                    padding: '16px', 
                    background: 'rgba(139, 92, 246, 0.1)', 
                    borderRadius: '12px',
                    border: '1px solid rgba(139, 92, 246, 0.2)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <p style={{ color: colors.textSecondary, fontSize: '13px' }}>Total Repayment ({formData.duration} months)</p>
                        <p style={{ color: colors.text, fontSize: '20px', fontWeight: '700' }}>
                          LKR {result.totalRepayment.toLocaleString()}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ color: colors.textSecondary, fontSize: '13px' }}>Total Interest</p>
                        <p style={{ color: '#f59e0b', fontSize: '20px', fontWeight: '700' }}>
                          LKR {result.totalInterest.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recommendations */}
                <div style={{
                  background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                  borderRadius: '20px',
                  padding: '20px',
                  border: `1px solid ${colors.border}`
                }}>
                  <h3 style={{ color: colors.text, fontSize: '16px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertCircle size={18} style={{ color: '#f59e0b' }} />
                    Recommendations & Insights ({result.recommendations.length})
                  </h3>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '400px', overflowY: 'auto' }}>
                    {result.recommendations.map((rec, idx) => {
                      const style = getRecommendationStyle(rec.type);
                      return (
                        <div key={idx} style={{
                          padding: '16px',
                          background: style.bg,
                          border: `1px solid ${style.border}`,
                          borderRadius: '12px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                            <div style={{ 
                              width: '32px', 
                              height: '32px', 
                              borderRadius: '8px', 
                              background: 'rgba(0,0,0,0.2)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}>
                              {rec.type === 'critical' && <XCircle size={18} color={style.icon} />}
                              {rec.type === 'warning' && <AlertTriangle size={18} color={style.icon} />}
                              {rec.type === 'info' && <Info size={18} color={style.icon} />}
                              {rec.type === 'success' && <CheckCircle size={18} color={style.icon} />}
                            </div>
                            <div style={{ flex: 1 }}>
                              <h4 style={{ color: style.color, fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>
                                {rec.title}
                              </h4>
                              <p style={{ color: colors.textSecondary, fontSize: '13px', marginBottom: '8px', lineHeight: '1.5' }}>
                                {rec.message}
                              </p>
                              <div style={{ 
                                padding: '10px 12px', 
                                background: 'rgba(0,0,0,0.2)', 
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '8px'
                              }}>
                                <ChevronRight size={14} color={style.color} style={{ marginTop: '2px', flexShrink: 0 }} />
                                <span style={{ color: style.color, fontSize: '12px', fontWeight: '500', lineHeight: '1.4' }}>
                                  {rec.action}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* AI Disclaimer */}
                <div style={{
                  padding: '16px',
                  background: 'rgba(99, 102, 241, 0.1)',
                  borderRadius: '12px',
                  border: '1px solid rgba(99, 102, 241, 0.2)'
                }}>
                  <p style={{ color: colors.textSecondary, fontSize: '12px', lineHeight: '1.5' }}>
                    <strong style={{ color: '#818cf8' }}>AI Powered Analysis:</strong> Results are based on statistical models trained on Sri Lankan loan data. Final approval decisions are subject to official bank review, verification of documents, and additional criteria.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        input:focus, select:focus {
          border-color: #8b5cf6 !important;
          box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.2);
        }
        input::placeholder {
          color: ${colors.textMuted};
        }
        input::-webkit-outer-spin-button,
        input::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
      `}</style>
    </div>
  );
}
