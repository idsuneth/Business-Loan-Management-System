import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Phone, Mail, MapPin, TrendingUp
} from 'lucide-react';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

const STATUS_STYLE = {
  pending:   { bg: 'rgba(245,158,11,0.1)',  color: '#d97706' },
  approved:  { bg: 'rgba(67,97,238,0.1)',   color: '#4361ee' },
  active:    { bg: 'rgba(16,185,129,0.1)',  color: '#059669' },
  disbursed: { bg: 'rgba(16,185,129,0.1)',  color: '#059669' },
  completed: { bg: 'rgba(34,197,94,0.1)',   color: '#16a34a' },
  rejected:  { bg: 'rgba(239,68,68,0.1)',   color: '#dc2626' },
  defaulted: { bg: 'rgba(239,68,68,0.1)',   color: '#dc2626' },
  overdue:   { bg: 'rgba(249,115,22,0.1)',  color: '#ea580c' },
  paid:      { bg: 'rgba(34,197,94,0.1)',   color: '#16a34a' },
  partial:   { bg: 'rgba(249,115,22,0.1)',  color: '#ea580c' },
};

const LoanDetailsModal = ({ loan, onClose, onPaymentMade }) => {
  const { isDark, colors } = useTheme();
  const [repaymentData, setRepaymentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('schedule');

  useEffect(() => { fetchRepaymentDetails(); }, [loan.id]);

  const fetchRepaymentDetails = async () => {
    try {
      const response = await api.get(`/repayments/loan/${loan.id}`);
      setRepaymentData(response.data);
    } catch (err) {
      console.error('Error fetching repayment details:', err);
    } finally {
      setLoading(false);
    }
  };

  const fmt = (amount) =>
    new Intl.NumberFormat('en-LK', {
      style: 'currency', currency: 'LKR',
      minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(amount || 0).replace('LKR', 'Rs.');

  const fmtDate = (date) => {
    if (!date) return '\u2014';
    return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const breakdown = React.useMemo(() => {
    if (repaymentData?.summary) return repaymentData.summary;
    const reps = repaymentData?.repayments || [];
    const totalPrincipal = reps.reduce((s, r) => s + (r.principalAmount || 0), 0) || loan.amount || 0;
    const totalRegularInterest = reps.reduce((s, r) => s + (r.regularInterest || 0), 0);
    const totalLateInterest = reps.reduce((s, r) => s + (r.lateInterest || 0), 0);
    const totalPenalty = reps.reduce((s, r) => s + (r.penalty || 0), 0);
    const totalAmount = totalPrincipal + totalRegularInterest + totalLateInterest + totalPenalty || loan.totalAmount || loan.amount || 0;
    const paidAmount = reps.filter(r => r.status === 'paid')
      .reduce((s, r) => s + ((r.paidAmount ?? r.amount ?? 0) + (r.lateInterest || 0) + (r.penalty || 0)), 0);
    const remainingAmount = Math.max(0, totalAmount - paidAmount);
    return { totalPrincipal, totalRegularInterest, totalLateInterest, totalPenalty, totalAmount, paidAmount, remainingAmount };
  }, [repaymentData, loan]);

  const paidPct = breakdown.totalAmount > 0
    ? Math.min(100, Math.round((breakdown.paidAmount / breakdown.totalAmount) * 100))
    : 0;

  const ss = STATUS_STYLE[loan.status] || STATUS_STYLE.pending;
  const initials = (loan.customerName || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const muted = isDark ? 'rgba(255,255,255,0.38)' : 'rgba(0,0,0,0.4)';
  const divider = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';

  const StatusPill = ({ status }) => {
    const s = STATUS_STYLE[status] || STATUS_STYLE.pending;
    return (
      <span style={{ display: 'inline-block', padding: '2px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: s.bg, color: s.color, textTransform: 'capitalize' }}>
        {status}
      </span>
    );
  };

  return createPortal(
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.52)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2200, padding: 20, animation: 'fadeIn 0.2s ease' }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%', maxWidth: 1000, maxHeight: '92vh',
          background: isDark ? '#0c1120' : '#ffffff',
          border: `1px solid ${divider}`,
          borderRadius: 10,
          display: 'flex', flexDirection: 'column',
          animation: 'slideUp 0.25s ease',
          boxShadow: isDark ? '0 24px 64px rgba(0,0,0,0.6)' : '0 24px 64px rgba(0,0,0,0.12)',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >

        {/* ── Header ── */}
        <div style={{ padding: '18px 24px', borderBottom: `1px solid ${divider}`, display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
          <div style={{ width: 42, height: 42, borderRadius: 9, background: 'rgba(67,97,238,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#4361ee', flexShrink: 0, letterSpacing: '0.02em' }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 17, fontWeight: 700, color: colors.text }}>{loan.customerName}</span>
              <span style={{ display: 'inline-block', padding: '2px 9px', borderRadius: 20, fontSize: 11.5, fontWeight: 600, background: ss.bg, color: ss.color, textTransform: 'capitalize' }}>
                {loan.status}
              </span>
            </div>
            <p style={{ margin: '2px 0 0', fontSize: 12.5, color: muted }}>
              Loan #{loan.id}&nbsp;&nbsp;·&nbsp;&nbsp;{loan.loanTypeName || loan.purpose}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ width: 32, height: 32, borderRadius: 7, background: 'transparent', border: `1px solid ${divider}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
            onMouseEnter={e => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <X size={15} color={muted} />
          </button>
        </div>

        {/* ── Customer + Loan detail rows (no boxes, just columns) ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: `1px solid ${divider}`, flexShrink: 0 }}>

          {/* Customer */}
          <div style={{ padding: '16px 24px', borderRight: `1px solid ${divider}` }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: muted, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 12px' }}>Customer</p>
            {[
              { Icon: Phone,      label: 'Phone',        value: loan.customer?.phone },
              { Icon: Mail,       label: 'Email',        value: loan.customer?.email },
              { Icon: MapPin,     label: 'Address',      value: loan.customer?.address },
              { Icon: TrendingUp, label: 'Credit Score', value: loan.customer?.creditScore },
            ].map(({ Icon, label, value }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 9 }}>
                <Icon size={13} color={muted} style={{ marginTop: 2, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: muted, width: 82, flexShrink: 0 }}>{label}</span>
                <span style={{ fontSize: 13, color: colors.text, fontWeight: 500 }}>{value ?? '\u2014'}</span>
              </div>
            ))}
          </div>

          {/* Loan details */}
          <div style={{ padding: '16px 24px' }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: muted, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 12px' }}>Loan Details</p>
            {[
              { label: 'Principal',       value: fmt(loan.amount),                                  strong: true },
              { label: 'Interest Rate',   value: `${loan.interestRate}%` },
              { label: 'Term',            value: `${loan.term} months` },
              { label: 'Monthly Payment', value: fmt(loan.monthlyPayment),                          strong: true },
              { label: 'Start Date',      value: fmtDate(loan.startDate || loan.disbursedAt) },
              { label: 'Next Due',        value: loan.nextDueDate ? `${fmtDate(loan.nextDueDate)}  ·  ${fmt(loan.nextDueAmount)}` : '\u2014', accent: !!loan.nextDueDate },
            ].map(({ label, value, strong, accent }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 9 }}>
                <span style={{ fontSize: 12, color: muted, width: 112, flexShrink: 0 }}>{label}</span>
                <span style={{ fontSize: 13, color: accent ? '#f59e0b' : colors.text, fontWeight: strong ? 700 : 500 }}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Financial summary strip ── */}
        <div style={{ padding: '14px 24px', borderBottom: `1px solid ${divider}`, flexShrink: 0 }}>
          {/* 4 numbers inline */}
          <div style={{ display: 'flex', marginBottom: 10 }}>
            {[
              { label: 'Principal',      value: fmt(breakdown.totalPrincipal || loan.amount),                                   color: '#4361ee' },
              { label: 'Interest',       value: fmt(breakdown.totalRegularInterest),                                            color: '#f59e0b' },
              { label: 'Late + Penalty', value: fmt((breakdown.totalLateInterest || 0) + (breakdown.totalPenalty || 0)),        color: '#ef4444' },
              { label: 'Total',          value: fmt(breakdown.totalAmount || loan.totalAmount || loan.amount),                  color: colors.text, bold: true },
            ].map(({ label, value, color, bold }, i, arr) => (
              <div key={label} style={{ flex: 1, paddingRight: i < arr.length - 1 ? 18 : 0, borderRight: i < arr.length - 1 ? `1px solid ${divider}` : 'none', paddingLeft: i > 0 ? 18 : 0 }}>
                <p style={{ margin: '0 0 2px', fontSize: 11, color: muted }}>{label}</p>
                <p style={{ margin: 0, fontSize: 15, fontWeight: bold ? 700 : 600, color }}>{value}</p>
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <div style={{ height: 5, borderRadius: 3, background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)', overflow: 'hidden', marginBottom: 5 }}>
            <div style={{ height: '100%', width: `${paidPct}%`, background: '#10b981', borderRadius: 3, transition: 'width 0.4s ease' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11.5, color: '#10b981', fontWeight: 600 }}>
              Paid {fmt(breakdown.paidAmount)} ({paidPct}%)
            </span>
            <span style={{ fontSize: 11.5, color: breakdown.remainingAmount > 0 ? '#ef4444' : muted, fontWeight: 600 }}>
              {breakdown.remainingAmount > 0 ? `Remaining ${fmt(breakdown.remainingAmount)}` : 'Fully paid'}
            </span>
          </div>
        </div>

        {/* ── Rejection Reason ── */}
        {loan.status === 'rejected' && (
          <div style={{ padding: '14px 24px', borderBottom: `1px solid ${divider}`, flexShrink: 0 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#dc2626', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 8px' }}>Rejection Reason</p>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: 7 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <p style={{ fontSize: 13, color: loan.rejectionReason ? (isDark ? '#fca5a5' : '#b91c1c') : muted, margin: 0, lineHeight: 1.6, fontStyle: loan.rejectionReason ? 'normal' : 'italic' }}>
                {loan.rejectionReason || 'No reason provided'}
              </p>
            </div>
          </div>
        )}

        {/* ── Tabs ── */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${divider}`, padding: '0 24px', flexShrink: 0 }}>
          {[
            { id: 'schedule', label: 'Payment Schedule' },
            { id: 'history',  label: 'Payment History' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '11px 0', marginRight: 24,
                background: 'transparent', border: 'none',
                borderBottom: activeTab === tab.id ? '2px solid #4361ee' : '2px solid transparent',
                color: activeTab === tab.id ? '#4361ee' : muted,
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                transition: 'color 0.15s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Table content ── */}
        <div style={{ flex: 1, overflowY: 'auto' }}>

          {/* Payment Schedule */}
          {activeTab === 'schedule' && (
            loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 48, gap: 10 }}>
                <div style={{ width: 18, height: 18, border: '2px solid rgba(67,97,238,0.2)', borderTopColor: '#4361ee', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <span style={{ color: muted, fontSize: 14 }}>Loading schedule…</span>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${divider}`, background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}>
                    {['Mo.', 'Due Date', 'Principal', 'Interest', 'Late Int.', 'Total', 'Status'].map((h, i) => (
                      <th key={i} style={{ padding: '10px 14px', textAlign: i >= 2 && i <= 5 ? 'right' : 'center', fontSize: 10.5, fontWeight: 600, color: muted, letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {repaymentData?.repayments?.length > 0 ? repaymentData.repayments.map((p, idx) => (
                    <tr
                      key={p.id}
                      style={{ borderBottom: `1px solid ${divider}`, transition: 'background 0.12s' }}
                      onMouseEnter={e => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.025)' : 'rgba(67,97,238,0.025)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '10px 14px', textAlign: 'center', fontSize: 13, fontWeight: 600, color: colors.text }}>{p.monthNumber || idx + 1}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'center', fontSize: 13, color: colors.text }}>{fmtDate(p.dueDate)}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontSize: 13, color: '#4361ee' }}>{fmt(p.principalAmount)}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontSize: 13, color: '#f59e0b' }}>{fmt(p.regularInterest)}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontSize: 13, color: p.lateInterest > 0 ? '#ef4444' : muted }}>{p.lateInterest > 0 ? fmt(p.lateInterest) : '\u2014'}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontSize: 13, fontWeight: 600, color: colors.text }}>{fmt((p.amount || 0) + (p.lateInterest || 0))}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}><StatusPill status={p.status} /></td>
                    </tr>
                  )) : (
                    <tr><td colSpan={7} style={{ padding: 48, textAlign: 'center', color: muted, fontSize: 14 }}>No repayment schedule available</td></tr>
                  )}
                </tbody>
              </table>
            )
          )}

          {/* Payment History */}
          {activeTab === 'history' && (
            loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 48, gap: 10 }}>
                <div style={{ width: 18, height: 18, border: '2px solid rgba(67,97,238,0.2)', borderTopColor: '#4361ee', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <span style={{ color: muted, fontSize: 14 }}>Loading history…</span>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${divider}`, background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}>
                    {['Mo.', 'Due Date', 'Paid Date', 'Amount Paid', 'Days Late', 'Method', 'Status'].map((h, i) => (
                      <th key={i} style={{ padding: '10px 14px', textAlign: i === 3 ? 'right' : 'center', fontSize: 10.5, fontWeight: 600, color: muted, letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {repaymentData?.repayments?.filter(p => p.status === 'paid' || p.paidDate).length > 0 ? (
                    repaymentData.repayments.filter(p => p.status === 'paid' || p.paidDate).map((p, idx) => (
                      <tr
                        key={p.id}
                        style={{ borderBottom: `1px solid ${divider}`, transition: 'background 0.12s' }}
                        onMouseEnter={e => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.025)' : 'rgba(67,97,238,0.025)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={{ padding: '10px 14px', textAlign: 'center', fontSize: 13, fontWeight: 600, color: colors.text }}>{p.monthNumber || idx + 1}</td>
                        <td style={{ padding: '10px 14px', textAlign: 'center', fontSize: 13, color: colors.text }}>{fmtDate(p.dueDate)}</td>
                        <td style={{ padding: '10px 14px', textAlign: 'center', fontSize: 13, color: p.daysOverdue > 0 ? '#f59e0b' : '#10b981' }}>{fmtDate(p.paidDate)}</td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', fontSize: 13, fontWeight: 600, color: '#10b981' }}>{fmt(p.paidAmount || p.amount)}</td>
                        <td style={{ padding: '10px 14px', textAlign: 'center', fontSize: 13, color: p.daysOverdue > 0 ? '#ef4444' : '#10b981' }}>{p.daysOverdue > 0 ? `${p.daysOverdue}d` : 'On time'}</td>
                        <td style={{ padding: '10px 14px', textAlign: 'center', fontSize: 13, color: colors.text, textTransform: 'capitalize' }}>{p.paymentMethod || 'Cash'}</td>
                        <td style={{ padding: '10px 14px', textAlign: 'center' }}><StatusPill status={p.status} /></td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={7} style={{ padding: 48, textAlign: 'center', color: muted, fontSize: 14 }}>No payment history available</td></tr>
                  )}
                </tbody>
              </table>
            )
          )}
        </div>

      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>,
    document.body
  );
};

export default LoanDetailsModal;
