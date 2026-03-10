import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { DollarSign, Calendar, Search, CheckCircle, Clock, AlertTriangle, Plus, User, X, History, CreditCard, TrendingUp, Wallet, ArrowLeftRight } from 'lucide-react';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

export default function Repayments() {
  const { isDark, colors } = useTheme();
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentType, setPaymentType] = useState('monthly');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentHistory, setPaymentHistory] = useState(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchApprovedLoans();
  }, []);

  // Disable body scroll when any modal is open
  useEffect(() => {
    const modalOpen = showPaymentModal || showHistoryModal;

    if (modalOpen) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      document.body.classList.add('modal-open');
      document.documentElement.classList.add('modal-open');
    } else {
      document.body.style.overflow = 'auto';
      document.documentElement.style.overflow = '';
      document.body.classList.remove('modal-open');
      document.documentElement.classList.remove('modal-open');
    }

    return () => {
      document.body.style.overflow = 'auto';
      document.documentElement.style.overflow = '';
      document.body.classList.remove('modal-open');
      document.documentElement.classList.remove('modal-open');
    };
  }, [showPaymentModal, showHistoryModal]);

  const fetchApprovedLoans = async () => {
    try {
      setLoading(true);
      // Fetch both approved and active loans for repayment management
      const [approvedRes, activeRes] = await Promise.all([
        api.get('/loans?status=approved'),
        api.get('/loans?status=active')
      ]);

      const allLoans = [...(approvedRes.data || []), ...(activeRes.data || [])];
      console.log('Fetched loans for repayments:', allLoans);

      const loanData = allLoans.map(loan => {
        const loanAmount = loan.loanAmount || loan.amount || 0;
        const totalAmount = loan.totalAmount || loanAmount;
        const monthlyPayment = loan.monthlyPayment || (totalAmount / (loan.duration || loan.term || 12));
        const totalPaid = loan.totalPaid || loan.paidAmount || 0;
        const remainingAmount = loan.remainingAmount || (totalAmount - totalPaid);

        return {
          id: loan.id,
          loanId: loan.loanId || `LN-${String(loan.id).padStart(3, '0')}`,
          customerId: loan.customerId,
          customerName: loan.customerName || loan.customer?.fullName || 'Unknown',
          loanAmount: loanAmount,
          totalAmount: totalAmount,
          interestRate: loan.interestRate,
          monthlyPayment,
          totalPaid,
          remainingAmount,
          duration: loan.duration || loan.term,
          purpose: loan.purpose || loan.loanTypeName || loan.loanType?.name,
          approvedAt: loan.approvedAt,
          nextDueDate: loan.nextDueDate || null,
          overdueAmount: loan.overdueAmount || 0,
          nextDueLateInterest: loan.nextDueLateInterest || 0,
          totalLateInterest: loan.totalLateInterest || 0,
          nextDueAmount: loan.nextDueAmount || 0,
          status: remainingAmount <= 0 ? 'completed' : 'active'
        };
      }).filter(loan => loan.status === 'active' && loan.remainingAmount > 0);

      setLoans(loanData);
    } catch (error) {
      console.error('Error fetching loans:', error);
      setError('Unable to load loans right now. Please retry.');
      setLoans([]);
    } finally {
      setLoading(false);
    }
  };

  // Format currency as LKR
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0).replace('LKR', 'Rs.');
  };

  const fetchPaymentHistory = async (loanId) => {
    try {
      const response = await api.get(`/repayments/summary/${loanId}`);
      setPaymentHistory(response.data);
    } catch (error) {
      console.error('Error fetching payment history:', error);
      setPaymentHistory(null);
    }
  };

  const handleRecordPayment = async () => {
    if (!selectedLoan || !paymentAmount) return;

    try {
      setProcessing(true);
      const response = await api.post('/repayments', {
        loanId: selectedLoan.id,
        amount: parseFloat(paymentAmount),
        paymentType,
        notes: paymentNotes
      });

      console.log('Payment recorded:', response.data);

      if (response.data.isFullyPaid) {
        setLoans(loans.filter(l => l.id !== selectedLoan.id));
      } else {
        setLoans(loans.map(l =>
          l.id === selectedLoan.id
            ? { ...l, totalPaid: response.data.totalPaid, remainingAmount: response.data.remainingAmount }
            : l
        ));
      }

      setShowPaymentModal(false);
      setSelectedLoan(null);
      setPaymentAmount('');
      setPaymentNotes('');
      setPaymentType('monthly');
    } catch (error) {
      console.error('Error recording payment:', error);
      alert(error.response?.data?.error || 'Failed to record payment');
    } finally {
      setProcessing(false);
    }
  };

  const handlePayFullAmount = async () => {
    if (!selectedLoan) return;

    try {
      setProcessing(true);
      const response = await api.post(`/repayments/pay-full/${selectedLoan.id}`, {
        notes: 'Full payment - Customer completed loan'
      });

      console.log('Full payment recorded:', response.data);
      setLoans(loans.filter(l => l.id !== selectedLoan.id));
      setShowPaymentModal(false);
      setSelectedLoan(null);
      setPaymentAmount('');
      alert('Loan fully paid and completed!');
    } catch (error) {
      console.error('Error processing full payment:', error);
      alert(error.response?.data?.error || 'Failed to process full payment');
    } finally {
      setProcessing(false);
    }
  };

  const openHistoryModal = async (loan) => {
    setSelectedLoan(loan);
    await fetchPaymentHistory(loan.id);
    setShowHistoryModal(true);
  };

  const openPaymentModal = (loan) => {
    setSelectedLoan(loan);
    const amountDueNow = (loan.nextDueAmount || loan.monthlyPayment) + (loan.totalLateInterest || 0);
    setPaymentAmount(amountDueNow.toFixed(0));
    setPaymentType('monthly');
    setShowPaymentModal(true);
  };

  const getMonthName = (month) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[month - 1] || '';
  };

  const filteredLoans = loans.filter(l =>
    l.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.loanId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.customerId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    totalLoans: filteredLoans.length,
    totalRemaining: filteredLoans.reduce((sum, l) => sum + l.remainingAmount, 0),
    totalCollected: filteredLoans.reduce((sum, l) => sum + l.totalPaid, 0),
    totalLoanAmount: filteredLoans.reduce((sum, l) => sum + l.loanAmount, 0)
  };

  const card = { background: isDark ? '#0f172a' : '#ffffff', border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'}`, borderRadius: '8px' };
  const muted = isDark ? 'rgba(255,255,255,0.38)' : 'rgba(0,0,0,0.4)';
  const divider = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';

  return (
    <div style={{ animation: 'fadeIn 0.3s ease', padding: '24px 28px' }}>

      {/* Header */}
      <div style={{ marginBottom: 28, display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          width: 42, height: 42, borderRadius: 10,
          background: '#4361ee',
          boxShadow: '0 4px 12px rgba(67,97,238,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <ArrowLeftRight size={20} color="#ffffff" />
        </div>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: colors.text, margin: 0 }}>Repayment Management</h1>
          <p style={{ fontSize: 13, color: muted, margin: '2px 0 0 0' }}>Track and manage loan repayments and collections</p>
        </div>
      </div>

      {error && (
        <div style={{
          padding: '12px 14px', marginBottom: 16, borderRadius: 6,
          border: '1px solid rgba(239,68,68,0.25)',
          background: 'rgba(239,68,68,0.06)',
          color: '#ef4444', fontSize: 13
        }}>
          {error}
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 22 }}>
        <div style={{ ...card, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 8,
            background: 'rgba(67,97,238,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            <CreditCard size={16} color="#4361ee" />
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: colors.text, lineHeight: 1 }}>{stats.totalLoans}</div>
            <div style={{ fontSize: 11, color: muted, marginTop: 2 }}>Active Loans</div>
          </div>
        </div>

        <div style={{ ...card, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 8,
            background: 'rgba(16,185,129,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            <TrendingUp size={16} color="#10b981" />
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: colors.text, lineHeight: 1 }}>{formatCurrency(stats.totalLoanAmount)}</div>
            <div style={{ fontSize: 11, color: muted, marginTop: 2 }}>Total Loan Amount</div>
          </div>
        </div>

        <div style={{ ...card, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 8,
            background: 'rgba(139,92,246,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            <CheckCircle size={16} color="#8b5cf6" />
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: colors.text, lineHeight: 1 }}>{formatCurrency(stats.totalCollected)}</div>
            <div style={{ fontSize: 11, color: muted, marginTop: 2 }}>Total Collected</div>
          </div>
        </div>

        <div style={{ ...card, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 8,
            background: 'rgba(245,158,11,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            <Wallet size={16} color="#f59e0b" />
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: colors.text, lineHeight: 1 }}>{formatCurrency(stats.totalRemaining)}</div>
            <div style={{ fontSize: 11, color: muted, marginTop: 2 }}>Remaining to Collect</div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div style={{ ...card, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <Search size={16} color={muted} style={{ flexShrink: 0 }} />
        <input
          type="text"
          placeholder="Search by customer name, loan ID, or customer ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            flex: 1, background: 'transparent', border: 'none',
            color: colors.text, fontSize: 13, outline: 'none'
          }}
        />
        <span style={{ fontSize: 11, color: muted, flexShrink: 0 }}>{filteredLoans.length} results</span>
      </div>

      {/* Table */}
      <div style={{ ...card, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${divider}` }}>
              {['Customer', 'Loan ID', 'Loan Amount', 'Monthly', 'Due Date', 'Progress', 'Remaining', 'Actions'].map((h, i) => (
                <th key={h} style={{
                  padding: '12px 16px',
                  textAlign: i === 7 ? 'center' : 'left',
                  fontSize: 10.5, fontWeight: 600, color: muted,
                  letterSpacing: '0.06em', textTransform: 'uppercase'
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" style={{ padding: 48, textAlign: 'center', color: muted, fontSize: 13 }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 16, height: 16,
                      border: `2px solid ${divider}`,
                      borderTopColor: '#4361ee',
                      borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite'
                    }} />
                    Loading...
                  </div>
                </td>
              </tr>
            ) : filteredLoans.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ padding: 48, textAlign: 'center', color: muted, fontSize: 13 }}>
                  No approved loans pending repayment. Approved loans will appear here.
                </td>
              </tr>
            ) : (
              filteredLoans.map((loan) => {
                const progress = loan.loanAmount > 0 ? (loan.totalPaid / loan.loanAmount) * 100 : 0;
                const initials = (loan.customerName || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

                return (
                  <tr
                    key={loan.id}
                    style={{ borderBottom: `1px solid ${divider}`, transition: 'background 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: 8,
                          background: 'rgba(67,97,238,0.12)', color: '#4361ee',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, fontWeight: 700, flexShrink: 0
                        }}>
                          {initials}
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 500, color: colors.text, lineHeight: 1.2 }}>{loan.customerName}</div>
                          <div style={{ fontSize: 11, color: muted }}>{loan.customerId}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#818cf8', fontWeight: 500, fontSize: 13 }}>{loan.loanId}</td>
                    <td style={{ padding: '12px 16px', color: colors.text, fontWeight: 600, fontSize: 13 }}>{formatCurrency(loan.loanAmount)}</td>
                    <td style={{ padding: '12px 16px', color: muted, fontSize: 13 }}>{formatCurrency(loan.monthlyPayment)}</td>
                    {/* Due Date */}
                    <td style={{ padding: '12px 16px' }}>
                      {loan.nextDueDate ? (() => {
                        const due = new Date(loan.nextDueDate);
                        const today = new Date(); today.setHours(0,0,0,0);
                        due.setHours(0,0,0,0);
                        const diffDays = Math.round((due - today) / 86400000);
                        const isOverdue = loan.overdueAmount > 0 || diffDays < 0;
                        const isToday   = diffDays === 0;
                        const label = due.toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
                        const color = isOverdue || isToday ? '#ef4444' : diffDays <= 7 ? '#f59e0b' : muted;
                        const tag   = isOverdue ? 'Overdue' : isToday ? 'Today' : diffDays <= 7 ? `In ${diffDays}d` : null;
                        return (
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 600, color }}>{label}</div>
                            {tag && <div style={{ fontSize: 10, color, fontWeight: 600, marginTop: 2 }}>{tag}</div>}
                          </div>
                        );
                      })() : <span style={{ color: muted, fontSize: 12 }}>—</span>}
                    </td>
                    <td style={{ padding: '12px 16px', minWidth: 140 }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 11, color: muted }}>{formatCurrency(loan.totalPaid)} paid</span>
                          <span style={{ fontSize: 11, color: muted, fontWeight: 600 }}>{progress.toFixed(0)}%</span>
                        </div>
                        <div style={{ height: 5, background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{
                            width: `${Math.min(progress, 100)}%`,
                            height: '100%',
                            background: '#4361ee',
                            borderRadius: 3,
                            transition: 'width 0.3s'
                          }} />
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ color: loan.remainingAmount > 0 ? '#f59e0b' : '#10b981', fontWeight: 600, fontSize: 13 }}>
                        {formatCurrency(loan.remainingAmount)}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                        <button
                          onClick={() => openHistoryModal(loan)}
                          title="View Payment History"
                          style={{
                            padding: '6px 10px', background: 'transparent',
                            border: `1px solid ${divider}`, borderRadius: 6,
                            color: '#818cf8', cursor: 'pointer',
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            fontSize: 12, fontWeight: 500
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.1)'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = divider; }}
                        >
                          <History size={13} />
                        </button>
                        <button
                          onClick={() => openPaymentModal(loan)}
                          style={{
                            padding: '6px 12px', background: 'transparent',
                            border: `1px solid ${divider}`, borderRadius: 6,
                            color: '#10b981', cursor: 'pointer',
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            fontSize: 12, fontWeight: 500
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.1)'; e.currentTarget.style.borderColor = 'rgba(16,185,129,0.3)'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = divider; }}
                        >
                          <Plus size={13} />
                          Pay
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedLoan && createPortal(
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.52)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 2100, padding: 24, animation: 'fadeIn 0.2s ease'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowPaymentModal(false);
              setSelectedLoan(null);
            }
          }}
        >
          <div style={{
            background: isDark ? '#0c1120' : '#ffffff',
            border: `1px solid ${divider}`,
            borderRadius: 10,
            width: 780, maxWidth: '95vw', maxHeight: '90vh',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
            boxShadow: isDark ? '0 24px 64px rgba(0,0,0,0.6)' : '0 24px 64px rgba(0,0,0,0.12)',
            animation: 'slideUp 0.25s ease'
          }}>
            {/* Header */}
            <div style={{ padding: '18px 24px', borderBottom: `1px solid ${divider}`, display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
              <div style={{ width: 42, height: 42, borderRadius: 9, background: 'rgba(67,97,238,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#4361ee', flexShrink: 0, letterSpacing: '0.02em' }}>
                {(selectedLoan.customerName || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 17, fontWeight: 700, color: colors.text }}>{selectedLoan.customerName}</span>
                  <span style={{ display: 'inline-block', padding: '2px 9px', borderRadius: 20, fontSize: 11.5, fontWeight: 600, background: 'rgba(16,185,129,0.1)', color: '#059669' }}>Record Payment</span>
                </div>
                <p style={{ margin: '2px 0 0', fontSize: 12.5, color: muted }}>
                  {selectedLoan.loanId}&nbsp;&nbsp;·&nbsp;&nbsp;{selectedLoan.purpose || 'Loan'}
                </p>
              </div>
              <button
                onClick={() => { setShowPaymentModal(false); setSelectedLoan(null); }}
                style={{ width: 32, height: 32, borderRadius: 7, background: 'transparent', border: `1px solid ${divider}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                onMouseEnter={e => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <X size={15} color={muted} />
              </button>
            </div>

            {/* Two-column: Loan Info + Form */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: `1px solid ${divider}`, flexShrink: 0 }}>
              {/* Loan Details */}
              <div style={{ padding: '16px 24px', borderRight: `1px solid ${divider}` }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: muted, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 12px' }}>Loan Details</p>
                {[
                  { label: 'Loan Amount',      value: formatCurrency(selectedLoan.loanAmount), strong: true },
                  { label: 'Interest Rate',    value: `${selectedLoan.interestRate || 'N/A'}%` },
                  { label: 'Loan Term',        value: `${selectedLoan.duration} months` },
                  { label: 'Monthly Payment',  value: formatCurrency(selectedLoan.monthlyPayment), strong: true },
                  ...(selectedLoan.totalLateInterest > 0 ? [{
                    label: 'Late Fees',
                    value: formatCurrency(selectedLoan.totalLateInterest),
                    strong: true, warn: true
                  }] : []),
                  { label: 'Total Paid',  value: formatCurrency(selectedLoan.totalPaid) },
                  { label: 'Remaining',   value: formatCurrency(selectedLoan.remainingAmount + selectedLoan.totalLateInterest) },
                ].map(({ label, value, strong, warn }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 9 }}>
                    <span style={{ fontSize: 12, color: muted, width: 112, flexShrink: 0 }}>{label}</span>
                    <span style={{ fontSize: 13, color: warn ? '#ef4444' : colors.text, fontWeight: strong ? 700 : 500 }}>{value}</span>
                  </div>
                ))}
              </div>

              {/* Payment Form */}
              <div style={{ padding: '16px 24px' }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: muted, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 12px' }}>Payment</p>

                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 12, color: muted, marginBottom: 6, fontWeight: 500 }}>Payment Type</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => { setPaymentType('monthly'); const due = (selectedLoan.nextDueAmount || selectedLoan.monthlyPayment) + (selectedLoan.totalLateInterest || 0); setPaymentAmount(due.toFixed(0)); }}
                      style={{
                        flex: 1, padding: '9px 0',
                        background: paymentType === 'monthly' ? 'rgba(67,97,238,0.1)' : 'transparent',
                        border: `1px solid ${paymentType === 'monthly' ? 'rgba(67,97,238,0.4)' : divider}`,
                        borderRadius: 6,
                        color: paymentType === 'monthly' ? '#4361ee' : muted,
                        cursor: 'pointer', fontWeight: 500, fontSize: 12
                      }}
                    >
                      Monthly
                    </button>
                    <button
                      onClick={() => setPaymentType('partial')}
                      style={{
                        flex: 1, padding: '9px 0',
                        background: paymentType === 'partial' ? 'rgba(67,97,238,0.1)' : 'transparent',
                        border: `1px solid ${paymentType === 'partial' ? 'rgba(67,97,238,0.4)' : divider}`,
                        borderRadius: 6,
                        color: paymentType === 'partial' ? '#4361ee' : muted,
                        cursor: 'pointer', fontWeight: 500, fontSize: 12
                      }}
                    >
                      Custom
                    </button>
                  </div>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 12, color: muted, marginBottom: 6, fontWeight: 500 }}>Amount (LKR)</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: muted, fontSize: 13 }}>Rs.</span>
                    <input
                      type="number"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      max={selectedLoan.remainingAmount}
                      style={{
                        width: '100%', padding: '10px 12px 10px 38px',
                        background: 'transparent',
                        border: `1px solid ${divider}`,
                        borderRadius: 6, color: colors.text, fontSize: 14, outline: 'none', boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  <p style={{ fontSize: 11, color: muted, margin: '4px 0 0 0' }}>
                    Monthly due: {formatCurrency((selectedLoan.nextDueAmount || selectedLoan.monthlyPayment) + (selectedLoan.totalLateInterest || 0))}
                    {selectedLoan.totalLateInterest > 0 && (
                      <span style={{ color: '#ef4444', marginLeft: 4 }}>
                        (incl. {formatCurrency(selectedLoan.totalLateInterest)} total late fees)
                      </span>
                    )}
                    {' | '}Max: {formatCurrency(selectedLoan.remainingAmount + selectedLoan.totalLateInterest)}
                  </p>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 12, color: muted, marginBottom: 6, fontWeight: 500 }}>Notes (optional)</label>
                  <input
                    type="text"
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    placeholder="Add payment notes..."
                    style={{
                      width: '100%', padding: '10px 12px',
                      background: 'transparent',
                      border: `1px solid ${divider}`,
                      borderRadius: 6, color: colors.text, fontSize: 13, outline: 'none', boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Progress strip */}
            <div style={{ padding: '14px 24px', borderBottom: `1px solid ${divider}`, flexShrink: 0 }}>
              <div style={{ display: 'flex', marginBottom: 10 }}>
                {[
                  { label: 'Loan Amount', value: formatCurrency(selectedLoan.loanAmount), color: '#4361ee' },
                  { label: 'Total Paid',  value: formatCurrency(selectedLoan.totalPaid),   color: '#10b981' },
                  { label: 'Late Fees',   value: formatCurrency(selectedLoan.totalLateInterest), color: '#ef4444', hidden: !selectedLoan.totalLateInterest },
                  { label: 'Remaining',   value: formatCurrency(selectedLoan.remainingAmount + selectedLoan.totalLateInterest), color: '#f59e0b' },
                  { label: 'Progress',    value: `${((selectedLoan.totalPaid / (selectedLoan.totalAmount || selectedLoan.loanAmount)) * 100).toFixed(1)}%`, color: colors.text, bold: true },
                ].filter(r => !r.hidden).map(({ label, value, color, bold }, i, arr) => (
                  <div key={label} style={{ flex: 1, paddingRight: i < arr.length - 1 ? 18 : 0, borderRight: i < arr.length - 1 ? `1px solid ${divider}` : 'none', paddingLeft: i > 0 ? 18 : 0 }}>
                    <p style={{ margin: '0 0 2px', fontSize: 11, color: muted }}>{label}</p>
                    <p style={{ margin: 0, fontSize: 15, fontWeight: bold ? 700 : 600, color }}>{value}</p>
                  </div>
                ))}
              </div>
              <div style={{ height: 5, borderRadius: 3, background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min((selectedLoan.totalPaid / (selectedLoan.totalAmount || selectedLoan.loanAmount)) * 100, 100)}%`, background: '#10b981', borderRadius: 3, transition: 'width 0.4s ease' }} />
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ padding: '14px 24px', display: 'flex', gap: 10, flexShrink: 0 }}>
              <button
                onClick={handleRecordPayment}
                disabled={processing || !paymentAmount}
                style={{
                  flex: 1, padding: '11px 0',
                  background: '#10b981', border: 'none', borderRadius: 6,
                  color: '#ffffff', fontWeight: 600, fontSize: 13,
                  cursor: processing ? 'not-allowed' : 'pointer',
                  opacity: processing || !paymentAmount ? 0.6 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                }}
                onMouseEnter={e => { if (!processing && paymentAmount) e.currentTarget.style.opacity = '0.85'; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = processing || !paymentAmount ? '0.6' : '1'; }}
              >
                <CheckCircle size={15} />
                {processing ? 'Processing...' : 'Record Payment'}
              </button>
              <button
                onClick={handlePayFullAmount}
                disabled={processing}
                style={{
                  flex: 1, padding: '11px 0',
                  background: '#4361ee', border: 'none', borderRadius: 6,
                  color: '#ffffff', fontWeight: 600, fontSize: 13,
                  cursor: processing ? 'not-allowed' : 'pointer',
                  opacity: processing ? 0.6 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                }}
                onMouseEnter={e => { if (!processing) e.currentTarget.style.opacity = '0.85'; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = processing ? '0.6' : '1'; }}
              >
                <Wallet size={15} />
                Pay Full ({formatCurrency(selectedLoan.remainingAmount + (selectedLoan.totalLateInterest || 0))})
              </button>
              <button
                onClick={() => { setShowPaymentModal(false); setSelectedLoan(null); }}
                style={{
                  padding: '11px 20px',
                  background: 'transparent', border: `1px solid ${divider}`,
                  borderRadius: 6, color: muted, cursor: 'pointer', fontSize: 13
                }}
                onMouseEnter={e => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>, document.body
      )}

      {/* Payment History Modal */}
      {showHistoryModal && selectedLoan && createPortal(
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.52)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 2100, padding: 24, animation: 'fadeIn 0.2s ease'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowHistoryModal(false);
              setSelectedLoan(null);
              setPaymentHistory(null);
            }
          }}
        >
          <div style={{
            background: isDark ? '#0c1120' : '#ffffff',
            border: `1px solid ${divider}`,
            borderRadius: 10,
            width: 700, maxWidth: '95vw', maxHeight: '90vh',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
            boxShadow: isDark ? '0 24px 64px rgba(0,0,0,0.6)' : '0 24px 64px rgba(0,0,0,0.12)',
            animation: 'slideUp 0.25s ease'
          }}>
            {/* Header */}
            <div style={{ padding: '18px 24px', borderBottom: `1px solid ${divider}`, display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
              <div style={{ width: 42, height: 42, borderRadius: 9, background: 'rgba(67,97,238,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#4361ee', flexShrink: 0, letterSpacing: '0.02em' }}>
                {(selectedLoan.customerName || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 17, fontWeight: 700, color: colors.text }}>{selectedLoan.customerName}</span>
                  <span style={{
                    display: 'inline-block', padding: '2px 9px', borderRadius: 20, fontSize: 11.5, fontWeight: 600,
                    background: paymentHistory?.isFullyPaid ? 'rgba(16,185,129,0.1)' : 'rgba(99,102,241,0.1)',
                    color: paymentHistory?.isFullyPaid ? '#059669' : '#818cf8'
                  }}>
                    {paymentHistory?.isFullyPaid ? 'Completed' : 'Active'}
                  </span>
                </div>
                <p style={{ margin: '2px 0 0', fontSize: 12.5, color: muted }}>
                  {selectedLoan.loanId}&nbsp;&nbsp;·&nbsp;&nbsp;{selectedLoan.purpose || 'Loan'}&nbsp;&nbsp;·&nbsp;&nbsp;Payment History
                </p>
              </div>
              <button
                onClick={() => { setShowHistoryModal(false); setSelectedLoan(null); setPaymentHistory(null); }}
                style={{ width: 32, height: 32, borderRadius: 7, background: 'transparent', border: `1px solid ${divider}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                onMouseEnter={e => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <X size={15} color={muted} />
              </button>
            </div>

            {paymentHistory ? (
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {/* Summary Strip */}
                <div style={{ padding: '14px 24px', borderBottom: `1px solid ${divider}`, display: 'flex' }}>
                  {[
                    { label: 'Loan Amount', value: formatCurrency(selectedLoan.loanAmount), color: '#4361ee' },
                    { label: 'Total Paid', value: formatCurrency(paymentHistory.totalPaid || 0), color: '#10b981' },
                    { label: 'Remaining', value: formatCurrency(paymentHistory.remainingAmount || 0), color: '#f59e0b' },
                    { label: 'Status', value: paymentHistory.isFullyPaid ? 'Completed' : 'Active', color: paymentHistory.isFullyPaid ? '#10b981' : '#818cf8' },
                  ].map(({ label, value, color }, i, arr) => (
                    <div key={label} style={{ flex: 1, paddingRight: i < arr.length - 1 ? 18 : 0, borderRight: i < arr.length - 1 ? `1px solid ${divider}` : 'none', paddingLeft: i > 0 ? 18 : 0 }}>
                      <p style={{ margin: '0 0 2px', fontSize: 11, color: muted }}>{label}</p>
                      <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color }}>{value}</p>
                    </div>
                  ))}
                </div>

                {/* Progress bar */}
                <div style={{ padding: '12px 24px', borderBottom: `1px solid ${divider}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 11, color: muted }}>Paid {formatCurrency(paymentHistory.totalPaid || 0)}</span>
                    <span style={{ fontSize: 11, color: muted, fontWeight: 600 }}>
                      {((paymentHistory.totalPaid / (selectedLoan.totalAmount || selectedLoan.loanAmount)) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div style={{ height: 5, borderRadius: 3, background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min((paymentHistory.totalPaid / (selectedLoan.totalAmount || selectedLoan.loanAmount)) * 100, 100)}%`, background: '#10b981', borderRadius: 3, transition: 'width 0.4s ease' }} />
                  </div>
                </div>

                {/* Monthly Payments Table */}
                {paymentHistory.monthlyPayments?.length > 0 && (
                  <div style={{ padding: '16px 24px', borderBottom: `1px solid ${divider}` }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: muted, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 12px' }}>Monthly Payments</p>
                    <div style={{ border: `1px solid ${divider}`, borderRadius: 7, overflow: 'hidden' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ borderBottom: `1px solid ${divider}` }}>
                            {['Month', 'Year', 'Payments', 'Total'].map((h, i) => (
                              <th key={h} style={{
                                padding: '9px 14px',
                                textAlign: i >= 2 ? 'right' : 'left',
                                fontSize: 10.5, fontWeight: 600, color: muted,
                                letterSpacing: '0.06em', textTransform: 'uppercase'
                              }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {paymentHistory.monthlyPayments.map((month, idx) => (
                            <tr
                              key={idx}
                              style={{ borderBottom: idx < paymentHistory.monthlyPayments.length - 1 ? `1px solid ${divider}` : 'none', transition: 'background 0.15s' }}
                              onMouseEnter={e => { e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)'; }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                            >
                              <td style={{ padding: '9px 14px', color: colors.text, fontSize: 13 }}>{month.monthName || getMonthName(month.month)}</td>
                              <td style={{ padding: '9px 14px', color: muted, fontSize: 13 }}>{month.year}</td>
                              <td style={{ padding: '9px 14px', color: muted, fontSize: 13, textAlign: 'right' }}>{month.count}</td>
                              <td style={{ padding: '9px 14px', color: '#10b981', fontSize: 13, fontWeight: 600, textAlign: 'right' }}>{formatCurrency(month.total)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Recent Payments Table */}
                {paymentHistory.recentPayments?.length > 0 && (
                  <div style={{ padding: '16px 24px' }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: muted, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 12px' }}>Recent Payments</p>
                    <div style={{ border: `1px solid ${divider}`, borderRadius: 7, overflow: 'hidden' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ borderBottom: `1px solid ${divider}` }}>
                            {['Payment ID', 'Date', 'Type', 'Amount'].map((h, i) => (
                              <th key={h} style={{
                                padding: '9px 14px',
                                textAlign: i === 3 ? 'right' : 'left',
                                fontSize: 10.5, fontWeight: 600, color: muted,
                                letterSpacing: '0.06em', textTransform: 'uppercase'
                              }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {paymentHistory.recentPayments.map((payment, idx) => (
                            <tr
                              key={idx}
                              style={{ borderBottom: idx < paymentHistory.recentPayments.length - 1 ? `1px solid ${divider}` : 'none', transition: 'background 0.15s' }}
                              onMouseEnter={e => { e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)'; }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                            >
                              <td style={{ padding: '9px 14px', color: '#818cf8', fontSize: 12, fontWeight: 500 }}>{payment.paymentId}</td>
                              <td style={{ padding: '9px 14px', color: muted, fontSize: 12 }}>
                                {payment.paidDate ? new Date(payment.paidDate).toLocaleDateString() : '-'}
                              </td>
                              <td style={{ padding: '9px 14px' }}>
                                <span style={{
                                  padding: '2px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600, textTransform: 'capitalize',
                                  background: payment.paymentType === 'full' ? 'rgba(16,185,129,0.1)' : 'rgba(99,102,241,0.1)',
                                  color: payment.paymentType === 'full' ? '#10b981' : '#818cf8'
                                }}>
                                  {payment.paymentType}
                                </span>
                              </td>
                              <td style={{ padding: '9px 14px', color: '#10b981', fontSize: 13, fontWeight: 600, textAlign: 'right' }}>
                                {formatCurrency(payment.amount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {(!paymentHistory.recentPayments || paymentHistory.recentPayments.length === 0) && (
                  <div style={{ textAlign: 'center', padding: 36, color: muted, fontSize: 13 }}>
                    No payments recorded yet for this loan.
                  </div>
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: 48, color: muted, fontSize: 13 }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 16, height: 16,
                    border: `2px solid ${divider}`,
                    borderTopColor: '#4361ee',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite'
                  }} />
                  Loading payment history...
                </div>
              </div>
            )}
          </div>
        </div>, document.body
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(12px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
