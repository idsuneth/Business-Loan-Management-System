import React, { useEffect, useState } from 'react';
import { Bell, AlertTriangle, CheckCircle, Clock, FileText, Mail } from 'lucide-react';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

export default function OfficerNotifications() {
  const { isDark, colors } = useTheme();
  const [summary, setSummary] = useState({ critical: 0, pending: 0, newApps: 0 });
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      let loans = [];
      let repayments = [];
      try { loans = (await api.get('/loans')).data; } catch {}
      try { repayments = (await api.get('/repayments')).data; } catch {}

      const today = new Date();
      const upcoming = new Date();
      upcoming.setDate(today.getDate() + 7);

      const pendingLoans = loans.filter(l => l.status === 'pending');
      const overdue = repayments.filter(r => r.dueDate && r.status !== 'paid' && new Date(r.dueDate) < today);
      const dueSoon = repayments.filter(r => r.dueDate && r.status !== 'paid' && new Date(r.dueDate) >= today && new Date(r.dueDate) <= upcoming);

      setSummary({
        critical: overdue.length,
        pending: pendingLoans.length + dueSoon.length,
        newApps: pendingLoans.length
      });

      const alertsList = [];
      overdue.slice(0, 10).forEach(r => {
        alertsList.push({
          type: 'critical',
          title: 'Payment Overdue',
          detail: `Repayment of LKR ${Math.round(r.amount || 0).toLocaleString()} was due on ${new Date(r.dueDate).toLocaleDateString()}`,
        });
      });
      dueSoon.slice(0, 10).forEach(r => {
        alertsList.push({
          type: 'warning',
          title: 'Payment Due Soon',
          detail: `Repayment of LKR ${Math.round(r.amount || 0).toLocaleString()} due by ${new Date(r.dueDate).toLocaleDateString()}`,
        });
      });
      pendingLoans.slice(0, 10).forEach(l => {
        alertsList.push({
          type: 'info',
          title: 'New Loan Application',
          detail: `Loan #${l.id} pending review for LKR ${Math.round(l.amount || 0).toLocaleString()}`,
        });
      });

      setAlerts(alertsList);
    } catch (e) {
      console.error('Failed to load notifications', e);
    } finally {
      setLoading(false);
    }
  };

  const badge = (count, label, color) => (
    <div style={{
      background: `${color}15`,
      border: `1px solid ${color}30`,
      borderRadius: '8px',
      padding: '16px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {label === 'Critical Alerts' && <AlertTriangle size={18} color={isDark ? '#ffffff' : '#000000'} />}
        {label === 'Pending Actions' && <Clock size={18} color={isDark ? '#ffffff' : '#000000'} />}
        {label === 'New Applications' && <FileText size={18} color={isDark ? '#ffffff' : '#000000'} />}
      </div>
      <div>
        <div style={{ color: colors.text, fontWeight: 700, fontSize: 16 }}>{label}</div>
        <div style={{ color, fontWeight: 700, fontSize: 18 }}>{count}</div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
        <div style={{ width: 40, height: 40, border: '3px solid rgba(99, 102, 241, 0.2)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 44, height: 44, background: '#4361ee', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Bell size={22} color={isDark ? '#ffffff' : '#000000'} />
        </div>
        <div>
          <h1 style={{ color: colors.text, fontSize: 24, fontWeight: 700, margin: 0 }}>Notifications</h1>
          <p style={{ color: colors.textMuted, margin: 0, fontSize: 13 }}>Alerts and pending actions for your loans</p>
        </div>
      </div>

      {/* Summary Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 16 }}>
        {badge(summary.critical, 'Critical Alerts', '#ef4444')}
        {badge(summary.pending, 'Pending Actions', '#f59e0b')}
        {badge(summary.newApps, 'New Applications', '#22c55e')}
      </div>

      {/* Alerts List */}
      <div style={{ background: isDark ? '#0f172a' : '#f8fafc', border: `1px solid ${colors.border}`, borderRadius: 16, padding: 18 }}>
        <h3 style={{ color: colors.text, fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Latest Alerts</h3>
        {alerts.length === 0 ? (
          <div style={{ textAlign: 'center', color: colors.textMuted, padding: 40 }}>
            <CheckCircle size={24} style={{ opacity: 0.7 }} />
            <p>No alerts right now</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {alerts.map((a, idx) => (
              <div key={idx} style={{ padding: 12, background: isDark ? '#0f172a' : '#f8fafc', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: a.type === 'critical' ? '#ef444420' : a.type === 'warning' ? '#f59e0b20' : '#3b82f620', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {a.type === 'critical' && <AlertTriangle size={16} color={isDark ? '#ffffff' : '#000000'} />}
                  {a.type === 'warning' && <Clock size={16} color={isDark ? '#ffffff' : '#000000'} />}
                  {a.type === 'info' && <FileText size={16} color={isDark ? '#ffffff' : '#000000'} />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: colors.text, fontSize: 13, fontWeight: 600 }}>{a.title}</div>
                  <div style={{ color: colors.textMuted, fontSize: 12 }}>{a.detail}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
