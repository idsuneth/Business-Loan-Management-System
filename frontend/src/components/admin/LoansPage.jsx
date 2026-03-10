import React, { useState, useEffect } from 'react';
import {
  CreditCard, Search, Eye, Clock, CheckCircle, XCircle,
  AlertTriangle, RefreshCw, X, TrendingUp, FileText, Calendar
} from 'lucide-react';
import api from '../../services/api';
import LoanDetailsModal from './LoanDetailsModal';
import { useTheme } from '../../context/ThemeContext';

const STATUS_CONFIG = {
  pending:   { bg: 'rgba(245,158,11,0.1)',  color: '#d97706', label: 'Pending' },
  approved:  { bg: 'rgba(67,97,238,0.1)',   color: '#4361ee', label: 'Approved' },
  active:    { bg: 'rgba(16,185,129,0.1)',  color: '#059669', label: 'Active' },
  disbursed: { bg: 'rgba(16,185,129,0.1)',  color: '#059669', label: 'Disbursed' },
  completed: { bg: 'rgba(34,197,94,0.1)',   color: '#16a34a', label: 'Completed' },
  rejected:  { bg: 'rgba(239,68,68,0.1)',   color: '#dc2626', label: 'Rejected' },
  defaulted: { bg: 'rgba(239,68,68,0.1)',   color: '#dc2626', label: 'Defaulted' },
  overdue:   { bg: 'rgba(249,115,22,0.1)',  color: '#ea580c', label: 'Overdue' },
};

const LoansPage = ({ initialFilter }) => {
  const { isDark, colors } = useTheme();
  const [loans, setLoans] = useState([]);
  const [loanTypes, setLoanTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const [filters, setFilters] = useState({
    status: initialFilter?.status || 'all',
    loanType: 'all',
    search: '',
    startDate: '',
    endDate: '',
  });

  const [openDropdown, setOpenDropdown] = useState(null);

  useEffect(() => {
    const handler = (e) => {
      if (!e.target.closest('.custom-select-wrap')) setOpenDropdown(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const CustomSelect = ({ id, value, onSelect, options, placeholder }) => {
    const isOpen = openDropdown === id;
    const bg       = isDark ? '#1e293b' : '#f8fafc';
    const border   = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
    const dropBg   = isDark ? '#1e293b' : '#ffffff';
    const hoverBg  = isDark ? 'rgba(67,97,238,0.15)' : 'rgba(67,97,238,0.08)';
    const selected = options.find(o => String(o.value) === String(value));
    return (
      <div className="custom-select-wrap" style={{ position: 'relative', minWidth: 140 }}>
        <button
          type="button"
          onClick={() => setOpenDropdown(isOpen ? null : id)}
          style={{
            width: '100%', padding: '8px 32px 8px 11px',
            background: bg, border: `1px solid ${border}`,
            borderRadius: 8, color: selected ? colors.text : (isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.35)'),
            fontSize: 13, cursor: 'pointer', textAlign: 'left', outline: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6,
          }}
        >
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {selected ? selected.label : placeholder}
          </span>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0, opacity: 0.5, transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
            <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {isOpen && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
            background: dropBg, border: `1px solid ${border}`,
            borderRadius: 8, zIndex: 9999, boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
            maxHeight: 220, overflowY: 'auto',
          }}>
            {options.map(opt => (
              <div
                key={opt.value}
                onClick={() => { onSelect(opt.value); setOpenDropdown(null); }}
                style={{
                  padding: '8px 12px', cursor: 'pointer', fontSize: 13,
                  color: String(opt.value) === String(value) ? '#4361ee' : colors.text,
                  background: String(opt.value) === String(value) ? hoverBg : 'transparent',
                  fontWeight: String(opt.value) === String(value) ? 600 : 400,
                }}
                onMouseEnter={e => e.currentTarget.style.background = hoverBg}
                onMouseLeave={e => e.currentTarget.style.background = String(opt.value) === String(value) ? hoverBg : 'transparent'}
              >
                {opt.label}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  useEffect(() => {
    if (initialFilter?.status) {
      setFilters(prev => ({ ...prev, status: initialFilter.status }));
    }
  }, [initialFilter]);

  useEffect(() => {
    fetchLoans();
    fetchLoanTypes();
  }, [filters.status]);

  useEffect(() => {
    if (showDetailsModal) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [showDetailsModal]);

  const fetchLoans = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.status !== 'all') params.append('status', filters.status);
      if (filters.loanType !== 'all') params.append('loanType', filters.loanType);
      if (filters.search) params.append('search', filters.search);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      const response = await api.get(`/loans?${params.toString()}`);
      setLoans(response.data);
    } catch (err) {
      console.error('Error fetching loans:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLoanTypes = async () => {
    try {
      const response = await api.get('/loan-types');
      setLoanTypes(response.data);
    } catch (err) {
      console.error('Error fetching loan types:', err);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => fetchLoans();

  const clearFilters = () => {
    setFilters({ status: 'all', loanType: 'all', search: '', startDate: '', endDate: '' });
    setTimeout(fetchLoans, 100);
  };

  const openLoanDetails = async (loan) => {
    try {
      const response = await api.get(`/loans/${loan.id}`);
      setSelectedLoan(response.data);
      setShowDetailsModal(true);
    } catch (err) {
      console.error('Error fetching loan details:', err);
    }
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-LK', {
      style: 'currency', currency: 'LKR',
      minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(amount || 0).replace('LKR', 'Rs.');

  const formatDate = (date) => {
    if (!date) return '\u2014';
    return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const stats = {
    total:     loans.length,
    pending:   loans.filter(l => l.status === 'pending').length,
    active:    loans.filter(l => ['active', 'approved', 'disbursed'].includes(l.status)).length,
    completed: loans.filter(l => l.status === 'completed').length,
    overdue:   loans.filter(l => l.overdueAmount > 0).length,
  };

  const hasActiveFilters = filters.status !== 'all' || filters.loanType !== 'all' ||
    filters.search || filters.startDate || filters.endDate;

  const card = {
    background: isDark ? '#0f172a' : '#ffffff',
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'}`,
    borderRadius: '8px',
  };

  const inputStyle = {
    padding: '8px 11px',
    background: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc',
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
    borderRadius: '8px',
    color: colors.text,
    fontSize: '13px',
    outline: 'none',
  };

  const muted = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.38)';

  return (
    <div style={{ padding: '24px 28px', animation: 'fadeIn 0.3s ease' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, background: '#4361ee', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(67,97,238,0.3)' }}>
            <CreditCard size={20} color="#ffffff" />
          </div>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: colors.text, margin: 0 }}>All Loans</h1>
            <p style={{ fontSize: '13px', color: muted, margin: '3px 0 0' }}>
              {loading ? 'Loading...' : `${loans.length} loan${loans.length !== 1 ? 's' : ''} found`}
            </p>
          </div>
        </div>
        <button
          onClick={fetchLoans}
          style={{
            padding: '8px 14px',
            background: 'transparent',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'}`,
            borderRadius: '8px',
            color: colors.text,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '13px',
          }}
          onMouseEnter={e => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* Stats Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '18px' }}>
        {[
          { label: 'Total',     value: stats.total,     accent: '#4361ee', Icon: CreditCard },
          { label: 'Pending',   value: stats.pending,   accent: '#f59e0b', Icon: Clock },
          { label: 'Active',    value: stats.active,    accent: '#10b981', Icon: TrendingUp },
          { label: 'Completed', value: stats.completed, accent: '#22c55e', Icon: CheckCircle },
          { label: 'Overdue',   value: stats.overdue,   accent: '#ef4444', Icon: AlertTriangle },
        ].map(({ label, value, accent, Icon }) => (
          <div key={label} style={{ ...card, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '34px', height: '34px', borderRadius: '8px',
              background: accent + '18',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Icon size={16} color={accent} />
            </div>
            <div>
              <p style={{ fontSize: '20px', fontWeight: '700', color: colors.text, margin: 0, lineHeight: 1 }}>{value}</p>
              <p style={{ fontSize: '11px', color: muted, margin: '3px 0 0' }}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div style={{ ...card, padding: '12px 14px', marginBottom: '14px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
          <Search size={13} color={muted} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder="Search by customer name..."
            value={filters.search}
            onChange={e => handleFilterChange('search', e.target.value)}
            onKeyPress={e => e.key === 'Enter' && applyFilters()}
            style={{ ...inputStyle, width: '100%', paddingLeft: '30px', boxSizing: 'border-box' }}
          />
        </div>

        {/* Status */}
        <CustomSelect
          id="status"
          value={filters.status}
          onSelect={v => { handleFilterChange('status', v); setTimeout(fetchLoans, 100); }}
          placeholder="All Status"
          options={[
            { value: 'all',       label: 'All Status' },
            { value: 'pending',   label: 'Pending' },
            { value: 'approved',  label: 'Approved' },
            { value: 'active',    label: 'Active' },
            { value: 'overdue',   label: 'Overdue' },
            { value: 'completed', label: 'Completed' },
            { value: 'rejected',  label: 'Rejected' },
            { value: 'defaulted', label: 'Defaulted' },
          ]}
        />

        {/* Loan Type */}
        <CustomSelect
          id="loanType"
          value={filters.loanType}
          onSelect={v => { handleFilterChange('loanType', v); setTimeout(fetchLoans, 100); }}
          placeholder="All Types"
          options={[
            { value: 'all', label: 'All Types' },
            ...loanTypes.map(lt => ({ value: lt.id, label: lt.name }))
          ]}
        />

        {/* Date range */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Calendar size={13} color={muted} />
          <input
            type="date"
            value={filters.startDate}
            onChange={e => handleFilterChange('startDate', e.target.value)}
            style={{ ...inputStyle }}
          />
          <span style={{ color: muted, fontSize: '12px' }}>to</span>
          <input
            type="date"
            value={filters.endDate}
            onChange={e => handleFilterChange('endDate', e.target.value)}
            style={{ ...inputStyle }}
          />
          <button
            onClick={applyFilters}
            style={{ padding: '8px 14px', background: '#4361ee', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap' }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            Apply
          </button>
        </div>

        {/* Clear */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            style={{
              padding: '8px 11px', background: 'transparent',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
              borderRadius: '8px', color: '#ef4444', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.06)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <X size={13} /> Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div style={{ ...card, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '64px', gap: '12px' }}>
            <RefreshCw size={17} color="#4361ee" style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ color: muted, fontSize: '14px' }}>Loading loans...</span>
          </div>
        ) : loans.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 20px' }}>
            <FileText size={36} color={isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'} style={{ marginBottom: '12px' }} />
            <p style={{ color: muted, fontSize: '14px', margin: 0 }}>No loans found</p>
            {hasActiveFilters && (
              <button onClick={clearFilters} style={{ marginTop: '12px', padding: '7px 16px', background: 'transparent', border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`, borderRadius: '8px', color: '#4361ee', cursor: 'pointer', fontSize: '13px' }}>
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)'}` }}>
                {[
                  { label: 'Customer',  align: 'left' },
                  { label: 'Loan Type', align: 'left' },
                  { label: 'Amount',    align: 'right' },
                  { label: 'Term',      align: 'center' },
                  { label: 'Status',    align: 'center' },
                  { label: 'Next Due',  align: 'center' },
                  { label: '',          align: 'center' },
                ].map((h, i) => (
                  <th key={i} style={{
                    padding: '11px 16px',
                    textAlign: h.align,
                    fontSize: '10.5px',
                    fontWeight: '600',
                    color: muted,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                  }}>
                    {h.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loans.map(loan => {
                const initials = (loan.customerName || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
                const effectiveStatus = (loan.status === 'active' && loan.overdueAmount > 0) ? 'overdue' : loan.status;
                const sc = STATUS_CONFIG[effectiveStatus] || STATUS_CONFIG.pending;
                return (
                  <tr
                    key={loan.id}
                    style={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'}`, transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.025)' : 'rgba(67,97,238,0.028)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    {/* Customer */}
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '32px', height: '32px', borderRadius: '8px',
                          background: 'rgba(67,97,238,0.12)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '11.5px', fontWeight: '700', color: '#4361ee', flexShrink: 0,
                        }}>
                          {initials}
                        </div>
                        <div>
                          <p style={{ margin: 0, fontSize: '13.5px', fontWeight: '600', color: colors.text }}>{loan.customerName}</p>
                          <p style={{ margin: 0, fontSize: '11px', color: muted }}>#{loan.id}</p>
                        </div>
                      </div>
                    </td>

                    {/* Loan Type */}
                    <td style={{ padding: '12px 16px' }}>
                      <p style={{ margin: 0, fontSize: '13.5px', color: colors.text }}>{loan.loanTypeName || loan.purpose}</p>
                      <p style={{ margin: 0, fontSize: '11px', color: muted }}>{loan.interestRate}% interest</p>
                    </td>

                    {/* Amount */}
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <p style={{ margin: 0, fontSize: '13.5px', fontWeight: '600', color: colors.text }}>{formatCurrency(loan.amount)}</p>
                      <p style={{ margin: 0, fontSize: '11px', color: muted }}>Total: {formatCurrency(loan.totalAmount || loan.amount)}</p>
                    </td>

                    {/* Term */}
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <span style={{ fontSize: '13.5px', color: colors.text }}>{loan.term} mo</span>
                    </td>

                    {/* Status */}
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '3px 10px',
                        borderRadius: '20px',
                        fontSize: '11.5px',
                        fontWeight: '600',
                        background: sc.bg,
                        color: sc.color,
                        textTransform: 'capitalize',
                      }}>
                        {sc.label}
                      </span>
                    </td>

                    {/* Next Due */}
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      {loan.nextDueDate ? (
                        <div>
                          <p style={{ margin: 0, fontSize: '13px', color: colors.text }}>{formatDate(loan.nextDueDate)}</p>
                          <p style={{ margin: 0, fontSize: '11px', color: '#f59e0b' }}>{formatCurrency(loan.nextDueAmount)}</p>
                        </div>
                      ) : (
                        <span style={{ color: muted, fontSize: '14px' }}>&mdash;</span>
                      )}
                    </td>

                    {/* Action */}
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <button
                        onClick={() => openLoanDetails(loan)}
                        style={{
                          padding: '5px 12px',
                          background: 'transparent',
                          border: `1px solid ${isDark ? 'rgba(67,97,238,0.4)' : 'rgba(67,97,238,0.3)'}`,
                          borderRadius: '6px',
                          color: '#4361ee',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          fontSize: '12.5px',
                          fontWeight: '500',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(67,97,238,0.08)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <Eye size={13} />
                        View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer count */}
      {!loading && loans.length > 0 && (
        <p style={{ fontSize: '12px', color: muted, textAlign: 'right', margin: '10px 0 0' }}>
          {loans.length} loan{loans.length !== 1 ? 's' : ''}
        </p>
      )}

      {/* Modal */}
      {showDetailsModal && selectedLoan && (
        <LoanDetailsModal
          loan={selectedLoan}
          onClose={() => { setShowDetailsModal(false); setSelectedLoan(null); }}
          onPaymentMade={() => fetchLoans()}
        />
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default LoansPage;
