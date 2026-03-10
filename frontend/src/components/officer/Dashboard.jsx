import React, { useState, useEffect } from 'react';
import { Users, FileText, Banknote, TrendingUp, Clock, CheckCircle, AlertTriangle, XCircle, AlertOctagon, UserCheck, CreditCard, AlertCircle, LayoutDashboard } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

export default function OfficerDashboard({ onNavigate }) {
  const { isDark, colors } = useTheme();
  const [stats, setStats] = useState({
    totalPrincipalReleased: 0,
    activePrincipal: 0,
    pendingLoans: 0,
    dueTodayLoans: 0,
    activeLoans: 0,
    fullyPaidLoans: 0,
    overdueLoans: 0,
    defaultedLoans: 0,
    requestedLoans: 0,
    totalBorrowers: 0,
    activeBorrowers: 0
  });

  const [loading, setLoading] = useState(true);

  const [weeklyData, setWeeklyData] = useState([
    { day: 'Mon', applications: 0, approvals: 0 },
    { day: 'Tue', applications: 0, approvals: 0 },
    { day: 'Wed', applications: 0, approvals: 0 },
    { day: 'Thu', applications: 0, approvals: 0 },
    { day: 'Fri', applications: 0, approvals: 0 },
  ]);

  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);

      // Fetch customers
      const customersRes = await api.get('/customers');
      const customers = customersRes.data;

      // Fetch loans
      let loans = [];
      try {
        const loansRes = await api.get('/loans');
        loans = loansRes.data;
      } catch (e) {
        console.log('No loans yet');
      }

      // Fetch repayments
      let repayments = [];
      try {
        const repaymentsRes = await api.get('/repayments');
        repayments = repaymentsRes.data;
      } catch (e) {
        console.log('No repayments yet');
      }

      // Calculate loan statistics
      const pendingLoans   = loans.filter(l => l.status === 'pending');
      const activeStatuses = ['active', 'approved', 'disbursed'];
      const activeLoansArr = loans.filter(l => activeStatuses.includes(l.status));
      const completedLoans = loans.filter(l => l.status === 'completed');

      // Calculate financial metrics — all disbursed loans (active + completed)
      const releasedLoans = loans.filter(l => [...activeStatuses, 'completed'].includes(l.status));
      const totalPrincipalReleased = releasedLoans.reduce((sum, l) => sum + (l.amount || 0), 0);

      // Active principal — subtract only principal portions already paid
      const totalPrincipalPaid = repayments
        .filter(r => r.status === 'paid')
        .reduce((sum, r) => sum + (r.principalAmount || 0), 0);
      const activePrincipal = Math.max(0, totalPrincipalReleased - totalPrincipalPaid);

      // Unique borrowers
      const uniqueBorrowerIds = [...new Set(loans.map(l => l.customerId))];
      const activeBorrowerIds = [...new Set(activeLoansArr.map(l => l.customerId))];

      // Due today — unique loans with a pending repayment due today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dueTodayLoanIds = [...new Set(
        repayments.filter(r => {
          if (r.status === 'paid') return false;
          const d = new Date(r.dueDate);
          d.setHours(0, 0, 0, 0);
          return d >= today && d < tomorrow;
        }).map(r => r.loanId)
      )];
      const dueTodayLoans = dueTodayLoanIds.length;

      // Overdue — unique loans that have at least one overdue repayment record
      const overdueLoanIds = [...new Set(
        repayments.filter(r => r.status === 'overdue').map(r => r.loanId)
      )];
      const overdueLoans = overdueLoanIds.length;

      setStats({
        totalPrincipalReleased,
        activePrincipal,
        pendingLoans: pendingLoans.length,
        dueTodayLoans,
        activeLoans: activeLoansArr.length,
        fullyPaidLoans: completedLoans.length,
        overdueLoans,
        defaultedLoans: loans.filter(l => l.status === 'defaulted').length,
        requestedLoans: pendingLoans.length,
        totalBorrowers: uniqueBorrowerIds.length,
        activeBorrowers: activeBorrowerIds.length
      });

      // Recent activity — sorted by date descending
      const activities = [];
      const sortedCustomers = [...customers].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      const sortedLoans    = [...loans].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      sortedCustomers.slice(0, 3).forEach((customer) => {
        activities.push({
          id: `customer-${customer.id}`,
          type: 'customer',
          date: new Date(customer.createdAt),
          action: 'Customer registered',
          name: customer.fullName,
          time: formatTimeAgo(customer.createdAt),
          icon: Users
        });
      });

      sortedLoans.slice(0, 4).forEach((loan) => {
        const actionMap = { approved: 'Loan approved', pending: 'Loan pending', active: 'Loan active', completed: 'Loan completed', rejected: 'Loan rejected' };
        activities.push({
          id: `loan-${loan.id}`,
          type: 'loan',
          date: new Date(loan.createdAt),
          action: actionMap[loan.status] || 'Loan submitted',
          name: `Loan #${loan.id}`,
          time: formatTimeAgo(loan.createdAt),
          icon: loan.status === 'approved' || loan.status === 'active' ? CheckCircle : FileText
        });
      });

      activities.sort((a, b) => b.date - a.date);
      setRecentActivity(activities.slice(0, 6));
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (dateString) => {
    if (!dateString) return 'Just now';
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
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

  const metricCards = [
    {
      title: 'Total Principal Released',
      value: formatCurrency(stats.totalPrincipalReleased),
      count: null,
      icon: Banknote,
      gradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
      link: 'View Loans'
    },
    {
      title: 'Active Principal',
      value: formatCurrency(stats.activePrincipal),
      count: null,
      icon: CreditCard,
      gradient: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
      link: 'View Loans'
    },
    {
      title: 'Pending Loans',
      value: stats.pendingLoans,
      count: null,
      icon: Clock,
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
      link: 'View Loans'
    },
    {
      title: 'Due Today Loans',
      value: stats.dueTodayLoans,
      count: null,
      icon: AlertTriangle,
      gradient: 'linear-gradient(135deg, #ea580c 0%, #dc2626 100%)',
      link: 'View Loans'
    },
    {
      title: 'Active Loans',
      value: stats.activeLoans,
      count: null,
      icon: FileText,
      gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      link: 'View Loans'
    },
    {
      title: 'Fully Paid Loans',
      value: stats.fullyPaidLoans,
      count: null,
      icon: CheckCircle,
      gradient: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
      link: 'View Loans'
    },
    {
      title: 'Overdue Loans',
      value: stats.overdueLoans,
      count: null,
      icon: AlertOctagon,
      gradient: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
      link: 'View Loans'
    },
    {
      title: 'Requested Loans',
      value: stats.requestedLoans,
      count: null,
      icon: AlertCircle,
      gradient: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
      link: 'View Loans'
    },

  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: '3px solid rgba(99, 102, 241, 0.2)',
          borderTopColor: '#6366f1',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ animation: 'fadeIn 0.3s ease', padding: '24px 28px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{
          width: '48px',
          height: '48px',
          background: '#4361ee',
          borderRadius: '6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <LayoutDashboard size={24} color={colors.text} />
        </div>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '700', color: colors.text, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            Dashboard
            <span style={{
              fontSize: '11px',
              fontWeight: '600',
              padding: '4px 10px',
              background: '#10b981',
              borderRadius: '10px',
              color: 'white'
            }}>
              Live
            </span>
          </h1>
          <p style={{ color: colors.textMuted, fontSize: '13px' }}>
            Comprehensive loan portfolio and borrower statistics
          </p>
        </div>
      </div>

      {/* Metrics Grid - 4 columns for consistent layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
        {metricCards.map((metric, idx) => {
          const Icon = metric.icon;
          const isMonetary = metric.title.includes('Principal') || metric.title.includes('Released');
          const isPending = metric.title === 'Pending Loans';
          return (
            <div
              key={idx}
              style={{
                background: isDark ? '#1e293b' : '#ffffff',

                border: isPending ? 'none' : `1px solid ${colors.border}`,
                borderRadius: '8px',
                padding: '20px',
                transition: 'all 0.3s',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.05)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = isDark ? '#334155' : 'rgba(255,255,255,1)';
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = isDark ? '0 8px 20px rgba(0,0,0,0.4)' : '0 8px 20px rgba(0,0,0,0.12)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = isDark ? '#1e293b' : '#ffffff';

                e.currentTarget.style.boxShadow = isDark ? '0 2px 12px rgba(0,0,0,0.3)' : '0 2px 12px rgba(0,0,0,0.08)';
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div style={{
                  width: '52px',
                  height: '52px',
                  background: metric.gradient,
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                  <Icon size={24} color="white" />
                </div>
              </div>
              <p style={{ fontSize: isMonetary ? '22px' : '28px', fontWeight: '700', color: colors.text, marginBottom: '6px' }}>
                {metric.value}
              </p>
              <p style={{ fontSize: '12px', color: colors.textMuted, marginBottom: '10px' }}>
                {metric.title}
              </p>
              <button
                onClick={() => {
                  if (!onNavigate) return;
                  // Due Today goes to repayments tab
                  if (metric.title === 'Due Today Loans') {
                    onNavigate({ tab: 'repayments' });
                    return;
                  }
                  // Map metric titles to loan status filters
                  const statusMap = {
                    'Pending Loans':   'pending',
                    'Active Loans':    'active',
                    'Fully Paid Loans':'completed',
                    'Overdue Loans':   'overdue',
                    'Requested Loans': 'pending'
                  };
                  const status = statusMap[metric.title] || 'all';
                  onNavigate({ tab: 'all-loans', initialFilter: { status } });
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  fontSize: '12px',
                  color: '#60a5fa',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {metric.link}
              </button>
            </div>
          );
        })}
      </div>

      {/* Activity Feed */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
        {/* Recent Activity */}
        <div style={{
          background: isDark ? '#0f172a' : '#f8fafc',

          border: `1px solid ${colors.border}`,
          borderRadius: '10px',
          padding: '28px'
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', color: colors.text, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <TrendingUp size={20} color={colors.text} />
            Recent Activity
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {recentActivity.length > 0 ? recentActivity.map((activity) => {
              const Icon = activity.icon;
              return (
                <div
                  key={activity.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    padding: '12px',
                    background: isDark ? '#0f172a' : '#f8fafc',
                    borderRadius: '6px',
                    transition: 'all 0.2s',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = isDark ? '#0f172a' : '#f8fafc'}
                  onMouseLeave={(e) => e.currentTarget.style.background = isDark ? '#0f172a' : '#f8fafc'}
                >
                  <div style={{
                    width: '40px',
                    height: '40px',
                    background: isDark ? '#334155' : 'rgba(0,0,0,0.1)',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <Icon size={18} color="white" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: colors.text, fontSize: '14px', fontWeight: '500' }}>{activity.action}</p>
                    <p style={{ color: colors.textMuted, fontSize: '12px' }}>{activity.name}</p>
                  </div>
                  <span style={{ color: colors.textMuted, fontSize: '11px', whiteSpace: 'nowrap' }}>
                    {activity.time}
                  </span>
                </div>
              );
            }) : (
              <p style={{ color: colors.textMuted, textAlign: 'center', padding: '40px' }}>
                No recent activity
              </p>
            )}
          </div>
        </div>

      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 1400px) {
          div[style*="grid-template-columns: repeat(3"] { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 900px) {
          div[style*="grid-template-columns: repeat(3"] { grid-template-columns: 1fr !important; }
          div[style*="grid-template-columns: 1fr 1fr"] { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
