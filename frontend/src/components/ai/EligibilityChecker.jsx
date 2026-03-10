import React from 'react';
import { X, CheckCircle, AlertTriangle, XCircle, TrendingUp, Shield, DollarSign, Clock } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export default function EligibilityChecker({ data, onClose }) {
  const { isDark, colors } = useTheme();
  if (!data) return null;

  // Handle both percentage (0-100) and decimal (0-1) formats from API
  const rawApprovalProb = data.approval_probability || data.approval_score || 0;
  const approvalProbability = rawApprovalProb > 1 ? rawApprovalProb / 100 : rawApprovalProb;
  const approvalScore = Math.round(approvalProbability * 100);
  
  const rawRiskScore = data.risk_score || (100 - approvalScore);
  const riskScore = rawRiskScore > 1 ? rawRiskScore / 100 : rawRiskScore;
  
  const recommendation = data.risk_category || (approvalProbability >= 0.7 ? 'Low' : approvalProbability >= 0.5 ? 'Medium' : 'High');
  const recommendations = data.recommendations || [];
  
  const getRecommendationStyle = () => {
    if (approvalProbability >= 0.7) {
      return { color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', icon: CheckCircle, label: 'Likely Approved' };
    } else if (approvalProbability >= 0.5) {
      return { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', icon: AlertTriangle, label: 'Review Required' };
    } else {
      return { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)', icon: XCircle, label: 'High Risk' };
    }
  };

  const style = getRecommendationStyle();
  const Icon = style.icon;


  const defaultFactors = data.factors || [
    { name: 'Debt-to-Income Ratio', impact: 'positive', value: 'Strong' },
    { name: 'Credit Score', impact: 'positive', value: 'Good' },
    { name: 'Loan-to-Income Ratio', impact: 'positive', value: 'Manageable' },
    { name: 'Employment Stability', impact: 'positive', value: 'Stable' }
  ];
  return (
    <div style={{
      background: isDark ? '#0f172a' : '#f8fafc',
      
      border: `1px solid ${colors.border}`,
      borderRadius: '10px',
      padding: '28px',
      animation: 'slideIn 0.3s ease',
      height: 'fit-content',
      position: 'sticky',
      top: '24px'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ color: colors.text, fontSize: '18px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Shield size={20} color={isDark ? '#ffffff' : '#000000'} />
          AI Risk Assessment
        </h2>
        <button
          onClick={onClose}
          style={{
            width: '32px',
            height: '32px',
            background: isDark ? '#334155' : '#f1f5f9',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <X size={16} color={isDark ? '#ffffff' : '#000000'} />
        </button>
      </div>

      {/* Main Result */}
      <div style={{
        padding: '28px',
        background: style.bg,
        border: `2px solid ${style.color}40`,
        borderRadius: '8px',
        textAlign: 'center',
        marginBottom: '24px'
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          background: `${style.color}30`,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px'
        }}>
          <Icon size={32} color={isDark ? '#ffffff' : '#000000'} />
        </div>
        <p style={{ color: style.color, fontWeight: '700', fontSize: '22px', marginBottom: '8px' }}>
          {style.label}
        </p>
        <p style={{ color: colors.textMuted, fontSize: '14px' }}>
          Based on AI analysis of applicant data
        </p>
      </div>

      {/* Probability Gauges */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        <div style={{
          padding: '20px',
          background: isDark ? '#0f172a' : '#f8fafc',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <p style={{ color: colors.textMuted, fontSize: '12px', marginBottom: '8px' }}>
            Approval Probability
          </p>
          <div style={{ position: 'relative', width: '80px', height: '80px', margin: '0 auto' }}>
            <svg viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)' }}>
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke={isDark ? '#334155' : 'rgba(0,0,0,0.1)'}
                strokeWidth="3"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke={style.color}
                strokeWidth="3"
                strokeDasharray={`${approvalProbability * 100}, 100`}
                strokeLinecap="round"
              />
            </svg>
            <span style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              color: colors.text,
              fontWeight: '700',
              fontSize: '18px'
            }}>
              {(approvalProbability * 100).toFixed(0)}%
            </span>
          </div>
        </div>

        <div style={{
          padding: '20px',
          background: isDark ? '#0f172a' : '#f8fafc',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <p style={{ color: colors.textMuted, fontSize: '12px', marginBottom: '8px' }}>
            Risk Score
          </p>
          <div style={{ position: 'relative', width: '80px', height: '80px', margin: '0 auto' }}>
            <svg viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)' }}>
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke={isDark ? '#334155' : 'rgba(0,0,0,0.1)'}
                strokeWidth="3"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke={riskScore > 0.5 ? '#ef4444' : riskScore > 0.3 ? '#f59e0b' : '#10b981'}
                strokeWidth="3"
                strokeDasharray={`${riskScore * 100}, 100`}
                strokeLinecap="round"
              />
            </svg>
            <span style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              color: colors.text,
              fontWeight: '700',
              fontSize: '18px'
            }}>
              {(riskScore * 100).toFixed(0)}%
            </span>
          </div>
        </div>
      </div>

      {/* Risk Factors */}
      <div>
        <h3 style={{ color: colors.text, fontSize: '15px', fontWeight: '600', marginBottom: '16px' }}>
          Assessment Factors
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {defaultFactors.map((factor, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                background: isDark ? '#0f172a' : '#f8fafc',
                borderRadius: '10px',
                border: `1px solid ${isDark ? '#0f172a' : '#f8fafc'}`
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {factor.impact === 'positive' ? (
                  <CheckCircle size={16} color={isDark ? '#ffffff' : '#000000'} />
                ) : (
                  <AlertTriangle size={16} color={isDark ? '#ffffff' : '#000000'} />
                )}
                <span style={{ color: colors.textSecondary, fontSize: '13px' }}>
                  {factor.name}
                </span>
              </div>
              <span style={{
                color: factor.impact === 'positive' ? '#10b981' : '#f59e0b',
                fontWeight: '600',
                fontSize: '13px'
              }}>
                {typeof factor.value === 'number' ? (factor.value > 100 ? factor.value : `${factor.value}%`) : factor.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* AI Recommendations */}
      {recommendations.length > 0 && (
        <div style={{ marginTop: '24px' }}>
          <h3 style={{ color: colors.text, fontSize: '15px', fontWeight: '600', marginBottom: '16px' }}>
            Recommendations
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {recommendations.map((rec, idx) => (
              <div key={idx} style={{ padding: '12px 16px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '10px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                <p style={{ color: colors.textSecondary, fontSize: '13px', lineHeight: '1.5', margin: 0 }}>• {rec}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Disclaimer */}
      <div style={{
        marginTop: '24px',
        padding: '16px',
        background: 'rgba(99, 102, 241, 0.1)',
        borderRadius: '6px',
        border: '1px solid rgba(99, 102, 241, 0.2)'
      }}>
        <p style={{ color: colors.textMuted, fontSize: '12px', lineHeight: '1.5' }}>
          <strong style={{ color: '#818cf8' }}>AI Powered:</strong> Random Forest model trained on 1000+ Sri Lankan loan records (92.5% accuracy). Final approval subject to admin review.
        </p>
      </div>

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
