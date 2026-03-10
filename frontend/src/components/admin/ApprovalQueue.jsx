import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, XCircle, Eye, Search, Clock, DollarSign, AlertTriangle, X, Banknote, User, CalendarDays, FileText, ShieldAlert, MessageSquare } from 'lucide-react';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

export default function ApprovalQueue() {
  const { isDark, colors } = useTheme();
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Rejection reason state
  const [rejectTarget, setRejectTarget] = useState(null); // { id, name }
  const [rejectReason, setRejectReason] = useState('');
  const [rejectLoading, setRejectLoading] = useState(false);

  useEffect(() => { fetchLoans(); }, []);

  useEffect(() => {
    const open = showModal || !!rejectTarget;
    document.body.style.overflow = open ? 'hidden' : 'auto';
    document.documentElement.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = 'auto';
      document.documentElement.style.overflow = '';
    };
  }, [showModal, rejectTarget]);

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 0, maximumFractionDigits: 0 })
      .format(amount || 0).replace('LKR', 'Rs.');

  const fetchLoans = async () => {
    try {
      const response = await api.get('/loans?status=pending');
      setLoans(response.data || []);
    } catch (error) {
      console.error('Error fetching loans:', error);
      setLoans([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (loanId) => {
    try {
      await api.put(`/loans/${loanId}/approve`, { approvedBy: 'Admin' });
      setLoans(prev => prev.filter(l => l.id !== loanId));
      setShowModal(false);
      setSelectedLoan(null);
    } catch (error) {
      console.error('Error approving loan:', error);
      fetchLoans();
      setShowModal(false);
      setSelectedLoan(null);
    }
  };

  // Opens the rejection reason dialog
  const openRejectDialog = (loan) => {
    setRejectTarget({ id: loan.id, name: loan.customerName, loanId: loan.loanId || `LN-${loan.id}` });
    setRejectReason('');
    // Close details modal if open
    setShowModal(false);
    setSelectedLoan(null);
  };

  const confirmReject = async () => {
    if (!rejectTarget) return;
    setRejectLoading(true);
    try {
      await api.put(`/loans/${rejectTarget.id}`, { status: 'rejected', rejectionReason: rejectReason.trim() || null });
      setLoans(prev => prev.filter(l => l.id !== rejectTarget.id));
      setRejectTarget(null);
      setRejectReason('');
    } catch (error) {
      console.error('Error rejecting loan:', error);
      fetchLoans();
      setRejectTarget(null);
      setRejectReason('');
    } finally {
      setRejectLoading(false);
    }
  };

  const getRiskBadge = (score) => {
    if (score == null) return { label: 'Not Assessed', color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)', bg: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)' };
    if (score < 0.3) return { label: 'Low Risk', color: '#10b981', bg: 'rgba(16,185,129,0.15)' };
    if (score < 0.5) return { label: 'Medium Risk', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' };
    return { label: 'High Risk', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' };
  };

  const filteredLoans = loans.filter(l =>
    l.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.purpose?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  };

  const card     = { background: isDark ? '#0f172a' : '#ffffff', border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'}`, borderRadius: '8px' };
  const muted    = isDark ? 'rgba(255,255,255,0.38)' : 'rgba(0,0,0,0.4)';
  const divider  = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const inputBg  = isDark ? '#1e293b' : '#f8fafc';
  const hoverBtn = (e, bg) => { e.currentTarget.style.background = bg; };
  const unhoverBtn = (e) => { e.currentTarget.style.background = 'transparent'; };

  // ---- Modal detail row helper ----
  const DetailRow = ({ label, value, accent, sub, topBorder }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '11px 0', borderBottom: `1px solid ${divider}`, borderTop: topBorder ? `1px solid ${divider}` : 'none' }}>
      <span style={{ fontSize: 12, color: muted, flexShrink: 0, marginRight: 16 }}>{label}</span>
      <div style={{ textAlign: 'right' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: accent ? '#4361ee' : value === 'â€”' ? muted : colors.text }}>{value || 'â€”'}</span>
        {sub && <p style={{ fontSize: 11, color: muted, margin: '1px 0 0' }}>{sub}</p>}
      </div>
    </div>
  );

  return (
    <div style={{ animation: 'fadeIn 0.3s ease', padding: '24px 28px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
        <div style={{ width: 42, height: 42, borderRadius: 10, background: '#4361ee', boxShadow: '0 4px 12px rgba(67,97,238,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <CheckCircle size={20} color="#fff" />
        </div>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: colors.text, margin: 0, lineHeight: 1.2 }}>Loan Approval Queue</h1>
          <p style={{ fontSize: 13, color: muted, margin: '3px 0 0' }}>Review and approve pending loan applications</p>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 22 }}>
        {[
          { label: 'Pending Review', value: filteredLoans.length, accent: '#f59e0b', Icon: Clock },
          { label: 'Total Value',    value: formatCurrency(filteredLoans.reduce((s,l) => s + l.amount, 0)), accent: '#3b82f6', Icon: DollarSign },
          { label: 'High Risk',      value: filteredLoans.filter(l => l.riskScore >= 0.5).length, accent: '#ef4444', Icon: AlertTriangle },
        ].map(({ label, value, accent, Icon }) => (
          <div key={label} style={{ ...card, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: accent + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={17} color={accent} />
            </div>
            <div>
              <p style={{ fontSize: 20, fontWeight: 700, color: colors.text, margin: 0, lineHeight: 1.2 }}>{value}</p>
              <p style={{ fontSize: 11, color: muted, margin: 0 }}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ ...card, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <Search size={16} color={muted} style={{ flexShrink: 0 }} />
        <input type="text" placeholder="Search by customer name or purpose..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: colors.text, fontSize: 13, padding: 0 }} />
      </div>

      {/* Table */}
      <div style={{ ...card, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${divider}` }}>
              {['Loan ID','Customer','Amount','Term','Purpose','Risk','Actions'].map((h, i) => (
                <th key={h} style={{ padding: '12px 16px', textAlign: i === 6 ? 'center' : 'left', fontSize: 10.5, fontWeight: 600, color: muted, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" style={{ padding: 52, textAlign: 'center', color: muted, fontSize: 13 }}>Loading...</td></tr>
            ) : filteredLoans.length === 0 ? (
              <tr><td colSpan="7" style={{ padding: 52, textAlign: 'center', color: muted, fontSize: 13 }}>No pending applications found</td></tr>
            ) : filteredLoans.map(loan => {
              const risk = getRiskBadge(loan.riskScore);
              return (
                <tr key={loan.id} style={{ borderBottom: `1px solid ${divider}` }}
                  onMouseEnter={e => { e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                  <td style={{ padding: '12px 16px', color: '#4361ee', fontWeight: 600, fontSize: 12.5 }}>{loan.loanId || `LN-${loan.id}`}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(67,97,238,0.12)', color: '#4361ee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                        {getInitials(loan.customerName)}
                      </div>
                      <div>
                        <p style={{ color: colors.text, fontWeight: 500, fontSize: 13, margin: 0 }}>{loan.customerName}</p>
                        <p style={{ color: muted, fontSize: 11, margin: 0 }}>{loan.customerId}</p>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', color: colors.text, fontWeight: 600, fontSize: 13 }}>{formatCurrency(loan.amount)}</td>
                  <td style={{ padding: '12px 16px', color: muted, fontSize: 13 }}>{loan.term} months</td>
                  <td style={{ padding: '12px 16px', color: muted, fontSize: 13 }}>{loan.purpose}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ padding: '4px 10px', background: risk.bg, color: risk.color, borderRadius: 20, fontSize: 11, fontWeight: 600, display: 'inline-block' }}>{risk.label}</span>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                      <button onClick={() => { setSelectedLoan(loan); setShowModal(true); }} title="View Details"
                        onMouseEnter={e => hoverBtn(e,'rgba(59,130,246,0.1)')} onMouseLeave={unhoverBtn}
                        style={{ width: 32, height: 32, background: 'transparent', border: `1px solid ${divider}`, borderRadius: 7, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Eye size={14} color="#3b82f6" />
                      </button>
                      <button onClick={() => handleApprove(loan.id)} title="Approve"
                        onMouseEnter={e => hoverBtn(e,'rgba(16,185,129,0.1)')} onMouseLeave={unhoverBtn}
                        style={{ width: 32, height: 32, background: 'transparent', border: `1px solid ${divider}`, borderRadius: 7, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CheckCircle size={14} color="#10b981" />
                      </button>
                      <button onClick={() => openRejectDialog(loan)} title="Reject"
                        onMouseEnter={e => hoverBtn(e,'rgba(239,68,68,0.1)')} onMouseLeave={unhoverBtn}
                        style={{ width: 32, height: 32, background: 'transparent', border: `1px solid ${divider}`, borderRadius: 7, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <XCircle size={14} color="#ef4444" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* â”€â”€ Details Modal â”€â”€ */}
      {showModal && selectedLoan && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.52)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2100, padding: 24 }}
          onClick={e => { if (e.target === e.currentTarget) { setShowModal(false); setSelectedLoan(null); } }}>
          <div style={{ background: isDark ? '#0c1120' : '#ffffff', border: `1px solid ${divider}`, borderRadius: 10, width: 520, maxWidth: '92vw', maxHeight: '88vh', overflowY: 'auto' }}>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: `1px solid ${divider}` }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: colors.text, margin: 0 }}>Loan Application Details</h2>
              <button onClick={() => { setShowModal(false); setSelectedLoan(null); }}
                onMouseEnter={e => { e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                style={{ width: 30, height: 30, borderRadius: 7, background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={16} color={muted} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '6px 22px 22px' }}>

              {/* Section: Loan */}
              <p style={{ fontSize: 10, fontWeight: 700, color: muted, letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 14, marginBottom: 0 }}>Loan Information</p>
              <DetailRow label="Loan ID"       value={selectedLoan.loanId || `LN-${selectedLoan.id}`} accent topBorder />
              <DetailRow label="Purpose"       value={selectedLoan.purpose} />
              <DetailRow label="Loan Amount"   value={formatCurrency(selectedLoan.amount)} />
              <DetailRow label="Term"          value={`${selectedLoan.term} months`} />
              <DetailRow label="Interest Rate" value={selectedLoan.interestRate ? `${selectedLoan.interestRate}% p.a.` : null} />
              <DetailRow label="Monthly Payment" value={selectedLoan.monthlyPayment ? formatCurrency(selectedLoan.monthlyPayment) : null} />
              <DetailRow label="Submitted"     value={selectedLoan.submittedAt || (selectedLoan.createdAt ? new Date(selectedLoan.createdAt).toLocaleDateString('en-GB') : null)} />

              {/* Section: Risk & Credit */}
              <p style={{ fontSize: 10, fontWeight: 700, color: muted, letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 18, marginBottom: 0 }}>Risk & Credit</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0', borderBottom: `1px solid ${divider}`, borderTop: `1px solid ${divider}` }}>
                <span style={{ fontSize: 12, color: muted }}>Risk Assessment</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {selectedLoan.riskScore != null ? (
                    <>
                      <span style={{ fontSize: 13, fontWeight: 600, color: colors.text }}>{(selectedLoan.riskScore * 100).toFixed(0)}%</span>
                      <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: getRiskBadge(selectedLoan.riskScore).bg, color: getRiskBadge(selectedLoan.riskScore).color }}>
                        {getRiskBadge(selectedLoan.riskScore).label}
                      </span>
                    </>
                  ) : (
                    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)', color: muted }}>Not Assessed</span>
                  )}
                </div>
              </div>

              {/* Section: Collateral */}
              {(selectedLoan.collateralType || selectedLoan.collateralValue) && (
                <>
                  <p style={{ fontSize: 10, fontWeight: 700, color: muted, letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 18, marginBottom: 0 }}>Collateral</p>
                  <DetailRow label="Type"  value={selectedLoan.collateralType} topBorder />
                  <DetailRow label="Value" value={selectedLoan.collateralValue ? formatCurrency(selectedLoan.collateralValue) : null} />
                </>
              )}

              {/* Notes */}
              {selectedLoan.notes && (
                <>
                  <p style={{ fontSize: 10, fontWeight: 700, color: muted, letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 18, marginBottom: 0 }}>Notes</p>
                  <div style={{ padding: '11px 12px', background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', borderRadius: 6, marginTop: 6, fontSize: 13, color: colors.text, lineHeight: 1.6 }}>
                    {selectedLoan.notes}
                  </div>
                </>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button onClick={() => handleApprove(selectedLoan.id)}
                  onMouseEnter={e => { e.currentTarget.style.background = '#059669'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#10b981'; }}
                  style={{ flex: 1, padding: '11px 0', background: '#10b981', border: 'none', borderRadius: 7, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                  <CheckCircle size={15} /> Approve
                </button>
                <button onClick={() => openRejectDialog(selectedLoan)}
                  onMouseEnter={e => { e.currentTarget.style.background = '#dc2626'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#ef4444'; }}
                  style={{ flex: 1, padding: '11px 0', background: '#ef4444', border: 'none', borderRadius: 7, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                  <XCircle size={15} /> Reject
                </button>
              </div>
              <button onClick={() => { setShowModal(false); setSelectedLoan(null); }}
                onMouseEnter={e => { e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                style={{ width: '100%', marginTop: 8, padding: '10px 0', background: 'transparent', border: `1px solid ${divider}`, borderRadius: 7, color: muted, fontSize: 13, cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>, document.body
      )}

      {/* â”€â”€ Rejection Reason Modal â”€â”€ */}
      {rejectTarget && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2200, padding: 24 }}
          onClick={e => { if (e.target === e.currentTarget && !rejectLoading) { setRejectTarget(null); setRejectReason(''); } }}>
          <div style={{ background: isDark ? '#0c1120' : '#ffffff', border: `1px solid rgba(239,68,68,0.3)`, borderRadius: 10, width: 440, maxWidth: '92vw' }}>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: `1px solid ${divider}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(239,68,68,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <XCircle size={17} color="#ef4444" />
                </div>
                <div>
                  <h2 style={{ fontSize: 15, fontWeight: 700, color: colors.text, margin: 0 }}>Reject Loan Application</h2>
                  <p style={{ fontSize: 11, color: muted, margin: 0 }}>{rejectTarget.loanId} â€” {rejectTarget.name}</p>
                </div>
              </div>
              <button onClick={() => { if (!rejectLoading) { setRejectTarget(null); setRejectReason(''); } }}
                onMouseEnter={e => { e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                style={{ width: 28, height: 28, borderRadius: 6, background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={15} color={muted} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '18px 22px 22px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: 7, marginBottom: 18 }}>
                <AlertTriangle size={14} color="#ef4444" style={{ flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontSize: 12, color: isDark ? '#fca5a5' : '#b91c1c', margin: 0, lineHeight: 1.5 }}>
                  This action will permanently reject the loan application. The customer will be notified.
                </p>
              </div>

              <label style={{ fontSize: 12, fontWeight: 600, color: muted, display: 'block', marginBottom: 6 }}>
                <MessageSquare size={12} style={{ verticalAlign: 'middle', marginRight: 5 }} />
                Reason for Rejection <span style={{ fontWeight: 400 }}>(recommended)</span>
              </label>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="Enter the reason for rejection (e.g. insufficient income, high debt-to-income ratio, incomplete documents...)"
                rows={4}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  padding: '10px 12px',
                  background: inputBg,
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                  borderRadius: 8, color: colors.text, fontSize: 13,
                  resize: 'vertical', outline: 'none', lineHeight: 1.6,
                  fontFamily: 'inherit'
                }}
              />
              <p style={{ fontSize: 11, color: muted, marginTop: 4 }}>This reason will be saved in the loan record.</p>

              <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
                <button onClick={() => { setRejectTarget(null); setRejectReason(''); }} disabled={rejectLoading}
                  onMouseEnter={e => { e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                  style={{ flex: 1, padding: '10px 0', background: 'transparent', border: `1px solid ${divider}`, borderRadius: 7, color: muted, fontSize: 13, cursor: 'pointer' }}>
                  Cancel
                </button>
                <button onClick={confirmReject} disabled={rejectLoading}
                  onMouseEnter={e => { if (!rejectLoading) e.currentTarget.style.background = '#b91c1c'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#dc2626'; }}
                  style={{ flex: 2, padding: '10px 0', background: '#dc2626', border: 'none', borderRadius: 7, color: '#fff', fontSize: 13, fontWeight: 600, cursor: rejectLoading ? 'not-allowed' : 'pointer', opacity: rejectLoading ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                  <XCircle size={15} />
                  {rejectLoading ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </div>
            </div>
          </div>
        </div>, document.body
      )}

      <style>{`@keyframes fadeIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </div>
  );
}
