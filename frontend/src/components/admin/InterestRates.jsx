import React, { useState, useEffect } from 'react';
import {
  Percent, Save, AlertCircle, CheckCircle, Edit2, X
} from 'lucide-react';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

const InterestRates = () => {
  const { isDark, colors } = useTheme();
  const [loanTypes, setLoanTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [notification, setNotification] = useState(null);
  const [hoveredRow, setHoveredRow] = useState(null);

  useEffect(() => {
    fetchLoanTypes();
  }, []);

  const fetchLoanTypes = async () => {
    try {
      setLoading(true);
      const response = await api.get('/loan-types/all');
      setLoanTypes(response.data);
    } catch (error) {
      console.error('Error fetching loan types:', error);
      showNotification('error', 'Failed to fetch loan types');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const startEditing = (loanType) => {
    setEditingId(loanType.id);
    setEditData({
      interestRate: loanType.interestRate,
      latePaymentRate: loanType.latePaymentRate,
      processingFee: loanType.processingFee,
      minAmount: loanType.minAmount,
      maxAmount: loanType.maxAmount,
      minTerm: loanType.minTerm,
      maxTerm: loanType.maxTerm,
      isActive: loanType.isActive
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditData({});
  };

  const handleSave = async (id) => {
    try {
      setSaving(id);
      await api.put(`/loan-types/${id}`, editData);
      showNotification('success', 'Interest rates updated successfully');
      setEditingId(null);
      fetchLoanTypes();
    } catch (error) {
      console.error('Error updating loan type:', error);
      showNotification('error', 'Failed to update interest rates');
    } finally {
      setSaving(null);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const card = { background: isDark ? '#0f172a' : '#ffffff', border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'}`, borderRadius: '8px' };
  const muted = isDark ? 'rgba(255,255,255,0.38)' : 'rgba(0,0,0,0.4)';
  const divider = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';

  const inputStyle = {
    padding: '6px 10px',
    background: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc',
    border: `1px solid ${divider}`,
    borderRadius: 6,
    color: colors.text,
    fontSize: 13,
    textAlign: 'center',
    outline: 'none'
  };

  const thStyle = {
    fontSize: 10.5,
    fontWeight: 600,
    color: muted,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    padding: '11px 16px'
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <div style={{
          width: 20,
          height: 20,
          border: '2.5px solid rgba(67,97,238,0.2)',
          borderTopColor: '#4361ee',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ animation: 'fadeIn 0.3s ease', padding: '24px 28px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{
          width: 42,
          height: 42,
          background: '#4361ee',
          borderRadius: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(67,97,238,0.3)',
          flexShrink: 0
        }}>
          <Percent size={20} color="#ffffff" />
        </div>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: colors.text, margin: 0 }}>
            Interest Rate Management
          </h1>
          <p style={{ color: muted, fontSize: 13, margin: '2px 0 0 0' }}>
            Configure interest rates and fees for different loan types
          </p>
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <div style={{
          position: 'fixed',
          top: 20,
          right: 20,
          padding: '12px 20px',
          borderRadius: 8,
          background: notification.type === 'success' ? '#10b981' : '#ef4444',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          zIndex: 1000,
          fontSize: 13,
          fontWeight: 500
        }}>
          {notification.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {notification.message}
        </div>
      )}

      {/* Table */}
      <div style={{ ...card, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${divider}` }}>
              <th style={{ ...thStyle, textAlign: 'left' }}>Loan Type</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>Interest Rate</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>Late Payment</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>Processing Fee</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>Amount Range</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>Term Range</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>Status</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loanTypes.map((loanType, index) => (
              <tr
                key={loanType.id}
                onMouseEnter={() => setHoveredRow(loanType.id)}
                onMouseLeave={() => setHoveredRow(null)}
                style={{
                  borderBottom: index < loanTypes.length - 1 ? `1px solid ${divider}` : 'none',
                  background: hoveredRow === loanType.id
                    ? (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)')
                    : 'transparent',
                  transition: 'background 0.15s ease'
                }}
              >
                <td style={{ padding: '12px 16px' }}>
                  <div>
                    <p style={{ color: colors.text, fontWeight: 600, margin: 0, fontSize: 13 }}>{loanType.name}</p>
                    <p style={{ color: muted, fontSize: 11.5, margin: '2px 0 0 0' }}>{loanType.description}</p>
                  </div>
                </td>

                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                  {editingId === loanType.id ? (
                    <input
                      type="number"
                      step="0.1"
                      value={editData.interestRate}
                      onChange={(e) => setEditData({ ...editData, interestRate: parseFloat(e.target.value) })}
                      style={{ ...inputStyle, width: 72 }}
                    />
                  ) : (
                    <span style={{ color: colors.text, fontWeight: 600, fontSize: 13 }}>
                      {loanType.interestRate}%
                    </span>
                  )}
                </td>

                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                  {editingId === loanType.id ? (
                    <input
                      type="number"
                      step="0.01"
                      value={editData.latePaymentRate}
                      onChange={(e) => setEditData({ ...editData, latePaymentRate: parseFloat(e.target.value) })}
                      style={{ ...inputStyle, width: 72 }}
                    />
                  ) : (
                    <span style={{ color: colors.text, fontWeight: 600, fontSize: 13 }}>
                      {loanType.latePaymentRate}%
                    </span>
                  )}
                </td>

                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                  {editingId === loanType.id ? (
                    <input
                      type="number"
                      step="0.1"
                      value={editData.processingFee}
                      onChange={(e) => setEditData({ ...editData, processingFee: parseFloat(e.target.value) })}
                      style={{ ...inputStyle, width: 72 }}
                    />
                  ) : (
                    <span style={{ color: colors.text, fontWeight: 600, fontSize: 13 }}>
                      {loanType.processingFee}%
                    </span>
                  )}
                </td>

                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                  {editingId === loanType.id ? (
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', alignItems: 'center' }}>
                      <input
                        type="number"
                        value={editData.minAmount}
                        onChange={(e) => setEditData({ ...editData, minAmount: parseFloat(e.target.value) })}
                        style={{ ...inputStyle, width: 80, fontSize: 12 }}
                        placeholder="Min"
                      />
                      <span style={{ color: muted, fontSize: 11 }}>-</span>
                      <input
                        type="number"
                        value={editData.maxAmount}
                        onChange={(e) => setEditData({ ...editData, maxAmount: parseFloat(e.target.value) })}
                        style={{ ...inputStyle, width: 80, fontSize: 12 }}
                        placeholder="Max"
                      />
                    </div>
                  ) : (
                    <span style={{ color: muted, fontSize: 12.5 }}>
                      {formatCurrency(loanType.minAmount)} - {formatCurrency(loanType.maxAmount)}
                    </span>
                  )}
                </td>

                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                  {editingId === loanType.id ? (
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', alignItems: 'center' }}>
                      <input
                        type="number"
                        value={editData.minTerm}
                        onChange={(e) => setEditData({ ...editData, minTerm: parseInt(e.target.value) })}
                        style={{ ...inputStyle, width: 48 }}
                      />
                      <span style={{ color: muted, fontSize: 11 }}>-</span>
                      <input
                        type="number"
                        value={editData.maxTerm}
                        onChange={(e) => setEditData({ ...editData, maxTerm: parseInt(e.target.value) })}
                        style={{ ...inputStyle, width: 48 }}
                      />
                    </div>
                  ) : (
                    <span style={{ color: muted, fontSize: 12.5 }}>
                      {loanType.minTerm} - {loanType.maxTerm} months
                    </span>
                  )}
                </td>

                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                  {editingId === loanType.id ? (
                    <select
                      value={editData.isActive ? 'active' : 'inactive'}
                      onChange={(e) => setEditData({ ...editData, isActive: e.target.value === 'active' })}
                      style={{
                        padding: '6px 10px',
                        background: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc',
                        border: `1px solid ${divider}`,
                        borderRadius: 6,
                        color: colors.text,
                        fontSize: 12,
                        outline: 'none'
                      }}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  ) : (
                    <span style={{
                      display: 'inline-block',
                      padding: '4px 12px',
                      borderRadius: 20,
                      fontSize: 11,
                      fontWeight: 600,
                      background: loanType.isActive ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                      color: loanType.isActive ? '#059669' : '#dc2626'
                    }}>
                      {loanType.isActive ? 'Active' : 'Inactive'}
                    </span>
                  )}
                </td>

                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                  {editingId === loanType.id ? (
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                      <button
                        onClick={() => handleSave(loanType.id)}
                        disabled={saving === loanType.id}
                        style={{
                          padding: '5px 14px',
                          background: '#10b981',
                          border: 'none',
                          borderRadius: 6,
                          color: '#ffffff',
                          cursor: saving === loanType.id ? 'default' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5,
                          fontSize: 12,
                          fontWeight: 600,
                          opacity: saving === loanType.id ? 0.7 : 1
                        }}
                      >
                        {saving === loanType.id ? (
                          <div style={{
                            width: 12,
                            height: 12,
                            border: '2px solid rgba(255,255,255,0.3)',
                            borderTopColor: '#ffffff',
                            borderRadius: '50%',
                            animation: 'spin 0.8s linear infinite'
                          }} />
                        ) : (
                          <Save size={12} />
                        )}
                        Save
                      </button>
                      <button
                        onClick={cancelEditing}
                        style={{
                          padding: '5px 14px',
                          background: 'transparent',
                          border: `1px solid ${divider}`,
                          borderRadius: 6,
                          color: colors.text,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5,
                          fontSize: 12
                        }}
                      >
                        <X size={12} />
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => startEditing(loanType)}
                      style={{
                        padding: '5px 14px',
                        background: 'transparent',
                        border: '1px solid rgba(67,97,238,0.19)',
                        borderRadius: 6,
                        color: '#4361ee',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        fontSize: 12,
                        fontWeight: 500
                      }}
                    >
                      <Edit2 size={12} />
                      Edit
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
      `}</style>
    </div>
  );
};

export default InterestRates;
