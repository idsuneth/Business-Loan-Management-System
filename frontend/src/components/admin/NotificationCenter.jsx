import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Bell, Mail, Send, FileText, Clock, RefreshCw, Search,
  AlertTriangle, CheckCircle, XCircle, ChevronDown, ChevronUp,
  User, CreditCard, Calendar, Filter, Eye, Edit2, Trash2,
  AlertOctagon, TrendingDown, UserPlus, DollarSign, Shield,
  Copy, ExternalLink, Info, X, Check
} from 'lucide-react';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

const NotificationCenter = () => {
  const { isDark, colors } = useTheme();
  const [activeTab, setActiveTab] = useState('alerts');
  const [alerts, setAlerts] = useState([]);
  const [emailHistory, setEmailHistory] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [manualEmailModal, setManualEmailModal] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Default email templates
  const defaultTemplates = [
    {
      id: 'loan_approved',
      name: 'Loan Approved',
      type: 'approval',
      subject: 'Your Loan Application Has Been Approved - SmartLoan',
      body: `Dear {customerName},

Congratulations! We are pleased to inform you that your loan application has been approved.

Loan Details:
- Loan ID: {loanId}
- Amount: Rs. {amount}
- Interest Rate: {interestRate}%
- Term: {term} months
- Monthly Payment: Rs. {monthlyPayment}

Your first payment is due on {firstDueDate}. Please ensure timely payments to maintain a good credit score.

If you have any questions, please contact our support team.

Best regards,
SmartLoan Team`,
      variables: ['customerName', 'loanId', 'amount', 'interestRate', 'term', 'monthlyPayment', 'firstDueDate']
    },
    {
      id: 'loan_rejected',
      name: 'Loan Rejected',
      type: 'rejection',
      subject: 'Loan Application Update - SmartLoan',
      body: `Dear {customerName},

Thank you for your loan application with SmartLoan.

After careful review, we regret to inform you that we are unable to approve your loan application at this time.

Reason: {rejectionReason}

You may reapply after addressing the above concerns. We recommend:
- Improving your credit score
- Reducing existing debts
- Providing additional collateral

If you have any questions, please contact our support team.

Best regards,
SmartLoan Team`,
      variables: ['customerName', 'rejectionReason']
    },
    {
      id: 'payment_reminder',
      name: 'Payment Reminder',
      type: 'reminder',
      subject: 'Payment Reminder - Due in {daysUntilDue} Days',
      body: `Dear {customerName},

This is a friendly reminder that your loan payment is due soon.

Payment Details:
- Loan ID: {loanId}
- Amount Due: Rs. {amountDue}
- Due Date: {dueDate}

Please ensure your payment is made on time to avoid late fees.

Payment Methods:
- Bank Transfer
- Online Payment Portal
- Visit our branch

Thank you for banking with SmartLoan.

Best regards,
SmartLoan Team`,
      variables: ['customerName', 'loanId', 'amountDue', 'dueDate', 'daysUntilDue']
    },
    {
      id: 'payment_overdue',
      name: 'Payment Overdue',
      type: 'overdue',
      subject: 'URGENT: Payment Overdue - Loan #{loanId}',
      body: `Dear {customerName},

IMPORTANT: Your loan payment is overdue.

Overdue Details:
- Loan ID: {loanId}
- Original Amount: Rs. {originalAmount}
- Days Overdue: {daysOverdue}
- Late Interest: Rs. {lateInterest}
- Total Due Now: Rs. {totalDue}

Please make your payment immediately to avoid:
- Additional late fees
- Negative impact on your credit score
- Potential legal action

Contact us immediately if you are facing financial difficulties. We may be able to help with a payment plan.

Urgent Contact: support@smartloan.lk

Best regards,
SmartLoan Collections Team`,
      variables: ['customerName', 'loanId', 'originalAmount', 'daysOverdue', 'lateInterest', 'totalDue']
    },
    {
      id: 'registration_confirm',
      name: 'Registration Confirmation',
      type: 'registration',
      subject: 'Welcome to SmartLoan - Registration Confirmed',
      body: `Dear {customerName},

Welcome to SmartLoan! Your account has been successfully created.

Your Account Details:
- Customer ID: {customerId}
- Email: {email}
- Registered On: {registrationDate}

You can now:
- Apply for personal, business, and home loans
- Track your loan applications
- Make payments online
- View your loan history

Get started by logging into your account at our portal.

If you didn't create this account, please contact us immediately.

Best regards,
SmartLoan Team`,
      variables: ['customerName', 'customerId', 'email', 'registrationDate']
    },
    {
      id: 'payment_received',
      name: 'Payment Received',
      type: 'payment',
      subject: 'Payment Received - Thank You!',
      body: `Dear {customerName},

We have received your payment. Thank you!

Payment Details:
- Loan ID: {loanId}
- Amount Paid: Rs. {amountPaid}
- Payment Date: {paymentDate}
- Payment Method: {paymentMethod}
- Remaining Balance: Rs. {remainingBalance}

Next payment due: {nextDueDate}

Thank you for your prompt payment.

Best regards,
SmartLoan Team`,
      variables: ['customerName', 'loanId', 'amountPaid', 'paymentDate', 'paymentMethod', 'remainingBalance', 'nextDueDate']
    }
  ];

  useEffect(() => {
    fetchData();
    setTemplates(defaultTemplates);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch alerts (pending applications, overdue, due soon, risk warnings)
      const [loansRes, overdueRes, customersRes, upcomingRes] = await Promise.all([
        api.get('/loans?status=pending'),
        api.get('/repayments/overdue'),
        api.get('/customers'),
        api.get('/repayments/upcoming?days=2') // Payments due in next 2 days
      ]);

      const pendingLoans = loansRes.data || [];
      const overduePayments = overdueRes.data || [];
      const customers = customersRes.data || [];
      const upcomingPayments = upcomingRes.data || [];

      // Build alerts
      const alertsList = [];

      // Payments due in 2 days - Add first as reminder
      upcomingPayments.forEach(rep => {
        const dueDate = new Date(rep.dueDate);
        const today = new Date();
        const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

        if (daysUntilDue > 0 && daysUntilDue <= 2) {
          alertsList.push({
            id: `reminder-${rep.id}`,
            type: 'payment_reminder',
            priority: daysUntilDue === 1 ? 'high' : 'medium',
            title: `Payment Due in ${daysUntilDue} Day${daysUntilDue > 1 ? 's' : ''}`,
            message: `${rep.loan?.customer?.fullName || 'Customer'} - Rs. ${Math.round(rep.amount || 0).toLocaleString()} due on ${dueDate.toLocaleDateString()}`,
            amount: rep.amount,
            customerId: rep.loan?.customerId,
            customerName: rep.loan?.customer?.fullName,
            customerEmail: rep.loan?.customer?.email,
            loanId: rep.loanId,
            dueDate: rep.dueDate,
            daysUntilDue,
            entityId: rep.id,
            entityType: 'repayment',
            createdAt: new Date().toISOString(),
            actionRequired: true
          });
        }
      });

      // New loan applications
      pendingLoans.forEach(loan => {
        alertsList.push({
          id: `loan-${loan.id}`,
          type: 'new_application',
          priority: loan.amount > 500000 ? 'high' : 'medium',
          title: 'New Loan Application',
          message: `New ${loan.loanType?.name || loan.purpose} application from ${loan.customer?.fullName || 'Unknown'}`,
          amount: loan.amount,
          customerId: loan.customerId,
          customerName: loan.customer?.fullName,
          customerEmail: loan.customer?.email,
          entityId: loan.id,
          entityType: 'loan',
          createdAt: loan.createdAt,
          actionRequired: true
        });
      });

      // Overdue payments - group by customer
      const overdueByCustomer = {};
      overduePayments.forEach(rep => {
        const custId = rep.loan?.customerId;
        if (!overdueByCustomer[custId]) {
          overdueByCustomer[custId] = {
            customer: rep.loan?.customer,
            count: 0,
            totalOverdue: 0,
            loans: new Set()
          };
        }
        overdueByCustomer[custId].count++;
        overdueByCustomer[custId].totalOverdue += (rep.amount || 0) + (rep.lateInterest || 0);
        overdueByCustomer[custId].loans.add(rep.loan?.id);
      });

      Object.entries(overdueByCustomer).forEach(([custId, data]) => {
        const priority = data.count >= 3 ? 'critical' : data.count >= 2 ? 'high' : 'medium';
        alertsList.push({
          id: `overdue-${custId}`,
          type: 'payment_overdue',
          priority,
          title: data.count >= 2 ? 'Multiple Missed Payments' : 'Payment Overdue',
          message: `${data.customer?.fullName || 'Customer'} has ${data.count} overdue payment(s) totaling Rs. ${Math.round(data.totalOverdue).toLocaleString()}`,
          amount: data.totalOverdue,
          customerId: custId,
          customerName: data.customer?.fullName,
          customerEmail: data.customer?.email,
          missedCount: data.count,
          entityType: 'customer',
          createdAt: new Date().toISOString(),
          actionRequired: true
        });
      });

      // Low credit score warnings
      customers.filter(c => c.creditScore && c.creditScore < 550).forEach(customer => {
        alertsList.push({
          id: `credit-${customer.id}`,
          type: 'credit_warning',
          priority: customer.creditScore < 450 ? 'high' : 'medium',
          title: 'Low Credit Score Alert',
          message: `${customer.fullName} has a credit score of ${customer.creditScore}`,
          customerId: customer.id,
          customerName: customer.fullName,
          customerEmail: customer.email,
          creditScore: customer.creditScore,
          entityType: 'customer',
          createdAt: new Date().toISOString(),
          actionRequired: false
        });
      });

      // Sort by priority and date
      alertsList.sort((a, b) => {
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        return new Date(b.createdAt) - new Date(a.createdAt);
      });

      setAlerts(alertsList);

      // Fetch email history
      try {
        const historyRes = await api.get('/notifications/history');
        setEmailHistory(historyRes.data || []);
      } catch (e) {
        // Generate mock history if endpoint not available
        setEmailHistory([]);
      }

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get appropriate template content based on alert type
  const getTemplateForAlert = (alert) => {
    let template = null;
    let variables = {};

    if (alert.type === 'payment_overdue') {
      template = templates.find(t => t.id === 'payment_overdue');
      variables = {
        customerName: alert.customerName || 'Valued Customer',
        loanId: alert.entityId || 'N/A',
        originalAmount: Math.round(alert.amount || 0).toLocaleString(),
        daysOverdue: alert.daysOverdue || 'Multiple',
        lateInterest: Math.round((alert.amount || 0) * 0.05).toLocaleString(),
        totalDue: Math.round((alert.amount || 0) * 1.05).toLocaleString()
      };
    } else if (alert.type === 'new_application') {
      template = templates.find(t => t.id === 'loan_approved');
      variables = {
        customerName: alert.customerName || 'Valued Customer',
        loanId: alert.entityId || 'N/A',
        amount: Math.round(alert.amount || 0).toLocaleString(),
        interestRate: '12',
        term: '12',
        monthlyPayment: Math.round((alert.amount || 0) / 12).toLocaleString(),
        firstDueDate: new Date(Date.now() + 30*24*60*60*1000).toLocaleDateString()
      };
    } else if (alert.type === 'credit_warning') {
      template = templates.find(t => t.id === 'payment_reminder');
      variables = {
        customerName: alert.customerName || 'Valued Customer',
        loanId: 'N/A',
        amountDue: '0',
        dueDate: new Date().toLocaleDateString(),
        daysUntilDue: '0'
      };
    }

    if (!template) {
      return { subject: '', body: '' };
    }

    let subject = template.subject;
    let body = template.body;

    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{${key}}`, 'g');
      subject = subject.replace(regex, value);
      body = body.replace(regex, value);
    });

    return { subject, body };
  };

  const showToast = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const sendEmail = async (templateId, recipient, variables) => {
    try {
      const template = templates.find(t => t.id === templateId);
      if (!template) throw new Error('Template not found');

      let subject = template.subject;
      let body = template.body;

      // Replace variables
      Object.entries(variables).forEach(([key, value]) => {
        const regex = new RegExp(`{${key}}`, 'g');
        subject = subject.replace(regex, value);
        body = body.replace(regex, value);
      });

      await api.post('/notifications/send-email', {
        to: recipient,
        subject,
        body,
        templateId
      });

      showToast('success', 'Email sent successfully!');
      fetchData(); // Refresh history
    } catch (error) {
      console.error('Send email error:', error);
      showToast('error', error.response?.data?.message || 'Failed to send email');
    }
  };

  const sendManualEmail = async () => {
    if (!manualEmailModal) return;

    const { to, subject, body } = manualEmailModal;
    if (!to || !subject || !body) {
      showToast('error', 'Please fill all fields');
      return;
    }

    try {
      await api.post('/notifications/send-email', { to, subject, body });
      showToast('success', 'Email sent successfully!');
      setManualEmailModal(null);
      fetchData();
    } catch (error) {
      showToast('error', 'Failed to send email');
    }
  };

  const getAlertIcon = (type) => {
    const iconColor = isDark ? '#ffffff' : '#000000';
    switch (type) {
      case 'new_application': return <FileText size={20} color={iconColor} />;
      case 'payment_overdue': return <AlertOctagon size={20} color={iconColor} />;
      case 'credit_warning': return <TrendingDown size={20} color={iconColor} />;
      default: return <Bell size={20} color={iconColor} />;
    }
  };

  const getPriorityBadge = (priority) => {
    const config = {
      critical: { bg: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', label: 'Critical' },
      high: { bg: 'rgba(249, 115, 22, 0.2)', color: '#fb923c', label: 'High' },
      medium: { bg: 'rgba(251, 191, 36, 0.2)', color: '#fbbf24', label: 'Medium' },
      low: { bg: 'rgba(34, 197, 94, 0.2)', color: '#22c55e', label: 'Low' }
    };
    const c = config[priority] || config.medium;
    return (
      <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: c.bg, color: c.color }}>
        {c.label}
      </span>
    );
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const filteredAlerts = alerts.filter(alert => {
    if (filterStatus !== 'all' && alert.type !== filterStatus) return false;
    if (searchTerm && !alert.message.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !alert.customerName?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const tabs = [
    { id: 'alerts', label: 'Alerts & Tasks', icon: Bell, count: alerts.filter(a => a.actionRequired).length },
    { id: 'templates', label: 'Email Templates', icon: FileText },
    { id: 'history', label: 'Sent Emails', icon: Clock },
    { id: 'compose', label: 'Compose', icon: Edit2 }
  ];

  const alertIconBg = (type) => {
    switch (type) {
      case 'new_application': return '#3b82f618';
      case 'payment_overdue': return '#ef444418';
      case 'payment_reminder': return '#f59e0b18';
      case 'credit_warning': return '#f9731618';
      default: return isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
    }
  };

  const card = { background: isDark ? '#0f172a' : '#ffffff', border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'}`, borderRadius: '8px' };
  const muted = isDark ? 'rgba(255,255,255,0.38)' : 'rgba(0,0,0,0.4)';
  const divider = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const inputBase = { padding: '8px 11px', background: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc', border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`, borderRadius: '8px', color: colors.text, fontSize: '13px', outline: 'none' };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease', padding: '24px 28px' }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      {/* Toast Notification */}
      {notification && (
        <div style={{
          position: 'fixed', top: 20, right: 20, padding: '10px 18px', zIndex: 9999,
          background: notification.type === 'success' ? '#10b981' : '#ef4444',
          borderRadius: 8, color: '#fff', display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 13, fontWeight: 600, animation: 'slideUp 0.25s ease',
          boxShadow: '0 4px 16px rgba(0,0,0,0.18)'
        }}>
          {notification.type === 'success' ? <Check size={15} /> : <X size={15} />}
          {notification.message}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{
          width: 42, height: 42, borderRadius: 10, background: '#4361ee',
          boxShadow: '0 4px 12px rgba(67,97,238,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
        }}>
          <Bell size={20} color="#fff" />
        </div>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: colors.text, margin: 0 }}>
            Notification Center
          </h1>
          <p style={{ fontSize: 13, color: muted, margin: '4px 0 0 0' }}>
            Manage alerts, email templates, and communication history
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        <div style={{ ...card, padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: '#ef444418', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <AlertOctagon size={17} color="#ef4444" />
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: colors.text, lineHeight: 1.1 }}>
                {alerts.filter(a => a.priority === 'critical').length}
              </div>
              <div style={{ fontSize: 11, color: muted, marginTop: 2 }}>Critical Alerts</div>
            </div>
          </div>
        </div>
        <div style={{ ...card, padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: '#f59e0b18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Clock size={17} color="#f59e0b" />
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: colors.text, lineHeight: 1.1 }}>
                {alerts.filter(a => a.actionRequired).length}
              </div>
              <div style={{ fontSize: 11, color: muted, marginTop: 2 }}>Pending Actions</div>
            </div>
          </div>
        </div>
        <div style={{ ...card, padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: '#3b82f618', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <FileText size={17} color="#3b82f6" />
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: colors.text, lineHeight: 1.1 }}>
                {alerts.filter(a => a.type === 'new_application').length}
              </div>
              <div style={{ fontSize: 11, color: muted, marginTop: 2 }}>New Applications</div>
            </div>
          </div>
        </div>
        <div style={{ ...card, padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: '#10b98118', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Mail size={17} color="#10b981" />
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: colors.text, lineHeight: 1.1 }}>
                {emailHistory.filter(e => new Date(e.createdAt).toDateString() === new Date().toDateString()).length}
              </div>
              <div style={{ fontSize: 11, color: muted, marginTop: 2 }}>Emails Sent Today</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${divider}`, marginBottom: 24 }}>
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '11px 20px', background: 'transparent', border: 'none',
                borderBottom: isActive ? '2px solid #4361ee' : '2px solid transparent',
                color: isActive ? '#4361ee' : muted,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7,
                fontWeight: 600, fontSize: 13, marginBottom: -1
              }}
            >
              <Icon size={15} />
              {tab.label}
              {tab.count > 0 && (
                <span style={{ background: '#ef4444', color: '#fff', padding: '1px 7px', borderRadius: 10, fontSize: 10, fontWeight: 700, lineHeight: '16px' }}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Alerts Tab */}
      {activeTab === 'alerts' && (
        <div>
          {/* Filters */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 18 }}>
            <div style={{ ...card, flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px' }}>
              <Search size={15} color={muted} style={{ flexShrink: 0 }} />
              <input
                type="text"
                placeholder="Search alerts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ flex: 1, padding: '9px 0', background: 'transparent', border: 'none', color: colors.text, fontSize: 13, outline: 'none' }}
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{ ...inputBase, cursor: 'pointer', paddingRight: 28 }}
            >
              <option value="all">All Types</option>
              <option value="new_application">New Applications</option>
              <option value="payment_overdue">Overdue Payments</option>
              <option value="payment_reminder">Payment Reminders</option>
              <option value="credit_warning">Credit Warnings</option>
            </select>
            <button
              onClick={fetchData}
              style={{ padding: '8px 14px', background: 'transparent', border: `1px solid ${divider}`, borderRadius: 8, color: colors.text, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600 }}
              onMouseEnter={(e) => { e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <RefreshCw size={14} />
              Refresh
            </button>
          </div>

          {/* Alerts List */}
          <div style={{ ...card, overflow: 'hidden' }}>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
                <RefreshCw size={32} color={muted} style={{ animation: 'spin 1s linear infinite' }} />
              </div>
            ) : filteredAlerts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 60, color: muted }}>
                <Bell size={36} style={{ marginBottom: 12, opacity: 0.4 }} />
                <p style={{ margin: 0, fontSize: 13 }}>No alerts found</p>
              </div>
            ) : (
              <div style={{ maxHeight: 600, overflowY: 'auto' }}>
                {filteredAlerts.map((alert, index) => (
                  <div
                    key={alert.id}
                    style={{
                      padding: '16px 20px',
                      borderBottom: index < filteredAlerts.length - 1 ? `1px solid ${divider}` : 'none',
                      display: 'flex', alignItems: 'flex-start', gap: 14
                    }}
                  >
                    <div style={{
                      width: 38, height: 38, borderRadius: 8,
                      background: alertIconBg(alert.type),
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                    }}>
                      {getAlertIcon(alert.type)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, flexWrap: 'wrap' }}>
                        <span style={{ color: colors.text, fontWeight: 600, fontSize: 14 }}>{alert.title}</span>
                        {getPriorityBadge(alert.priority)}
                        {alert.actionRequired && (
                          <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: 'rgba(67,97,238,0.15)', color: '#4361ee' }}>
                            Action Required
                          </span>
                        )}
                      </div>
                      <p style={{ color: muted, fontSize: 13, margin: '0 0 8px 0', lineHeight: 1.4 }}>{alert.message}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <span style={{ color: muted, fontSize: 11 }}>{formatDate(alert.createdAt)}</span>
                        {alert.customerEmail && (
                          <button
                            onClick={() => {
                              const { subject, body } = getTemplateForAlert(alert);
                              setManualEmailModal({
                                to: alert.customerEmail,
                                subject,
                                body,
                                customerName: alert.customerName,
                                alertType: alert.type
                              });
                            }}
                            style={{
                              padding: '4px 10px', background: 'transparent',
                              border: `1px solid ${divider}`, borderRadius: 6,
                              color: '#10b981', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
                              fontSize: 11, fontWeight: 600
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(16,185,129,0.08)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                          >
                            <Mail size={12} />
                            Send Email
                          </button>
                        )}
                      </div>
                    </div>
                    {alert.amount && (
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <p style={{ color: alert.type === 'payment_overdue' ? '#ef4444' : '#3b82f6', fontSize: 16, fontWeight: 700, margin: 0 }}>
                          Rs. {Math.round(alert.amount).toLocaleString()}
                        </p>
                        {alert.missedCount && (
                          <p style={{ color: muted, fontSize: 11, margin: '3px 0 0 0' }}>
                            {alert.missedCount} missed payments
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div style={{ display: 'grid', gridTemplateColumns: selectedTemplate ? '1fr 1.5fr' : '1fr', gap: 20 }}>
          {/* Template List */}
          <div style={{ ...card, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
              <div style={{ width: 30, height: 30, borderRadius: 7, background: '#4361ee18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileText size={15} color="#4361ee" />
              </div>
              <span style={{ color: colors.text, fontSize: 15, fontWeight: 700 }}>Email Templates</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {templates.map(template => {
                const isSelected = selectedTemplate?.id === template.id;
                return (
                  <div
                    key={template.id}
                    onClick={() => setSelectedTemplate(template)}
                    style={{
                      padding: '13px 14px',
                      background: isSelected ? (isDark ? 'rgba(67,97,238,0.12)' : 'rgba(67,97,238,0.06)') : 'transparent',
                      border: `1px solid ${isSelected ? 'rgba(67,97,238,0.3)' : divider}`,
                      borderRadius: 8, cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'; }}
                    onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ color: colors.text, fontWeight: 600, fontSize: 13 }}>{template.name}</span>
                      <span style={{
                        padding: '3px 9px', borderRadius: 20, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em',
                        background: template.type === 'overdue' ? 'rgba(239,68,68,0.15)' : template.type === 'approval' ? 'rgba(16,185,129,0.15)' : 'rgba(59,130,246,0.15)',
                        color: template.type === 'overdue' ? '#ef4444' : template.type === 'approval' ? '#10b981' : '#3b82f6'
                      }}>
                        {template.type}
                      </span>
                    </div>
                    <p style={{ color: muted, fontSize: 11, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {template.subject}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Template Preview */}
          {selectedTemplate && (
            <div style={{ ...card, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 7, background: '#3b82f618', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Eye size={15} color="#3b82f6" />
                  </div>
                  <span style={{ color: colors.text, fontSize: 15, fontWeight: 700 }}>Template Preview</span>
                </div>
                <button
                  onClick={() => setSelectedTemplate(null)}
                  style={{ width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: `1px solid ${divider}`, borderRadius: 6, color: muted, cursor: 'pointer' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <X size={14} />
                </button>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ color: muted, fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 6, display: 'block' }}>Subject</label>
                <div style={{ ...inputBase, padding: '10px 12px', background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc' }}>
                  {selectedTemplate.subject}
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ color: muted, fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 6, display: 'block' }}>Body</label>
                <div style={{
                  ...inputBase, padding: '14px 12px',
                  background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc',
                  whiteSpace: 'pre-wrap', lineHeight: 1.6, maxHeight: 380, overflowY: 'auto'
                }}>
                  {selectedTemplate.body}
                </div>
              </div>

              <div style={{ marginBottom: 18 }}>
                <label style={{ color: muted, fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>Available Variables</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {selectedTemplate.variables.map(v => (
                    <span key={v} style={{
                      padding: '4px 10px', borderRadius: 6,
                      background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                      border: `1px solid ${divider}`,
                      color: colors.text, fontSize: 11, fontFamily: 'monospace'
                    }}>
                      {'{' + v + '}'}
                    </span>
                  ))}
                </div>
              </div>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(selectedTemplate.body);
                  showToast('success', 'Template copied to clipboard');
                }}
                style={{
                  padding: '9px 16px', background: '#4361ee', border: 'none', borderRadius: 8,
                  color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7,
                  fontWeight: 600, fontSize: 13
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.88'; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
              >
                <Copy size={14} />
                Copy Template
              </button>
            </div>
          )}
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div style={{ ...card, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: `1px solid ${divider}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 30, height: 30, borderRadius: 7, background: '#4361ee18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Clock size={15} color="#4361ee" />
              </div>
              <span style={{ color: colors.text, fontSize: 15, fontWeight: 700 }}>Sent Emails History</span>
            </div>
            <button
              onClick={fetchData}
              style={{ padding: '6px 12px', background: 'transparent', border: `1px solid ${divider}`, borderRadius: 6, color: colors.text, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600 }}
              onMouseEnter={(e) => { e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <RefreshCw size={13} />
              Refresh
            </button>
          </div>
          {emailHistory.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: muted }}>
              <Mail size={36} style={{ marginBottom: 12, opacity: 0.4 }} />
              <p style={{ margin: 0, fontSize: 13 }}>No emails sent yet</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ padding: '10px 16px', textAlign: 'left', color: muted, fontWeight: 600, fontSize: '10.5px', letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: `1px solid ${divider}` }}>Recipient</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left', color: muted, fontWeight: 600, fontSize: '10.5px', letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: `1px solid ${divider}` }}>Subject</th>
                  <th style={{ padding: '10px 16px', textAlign: 'center', color: muted, fontWeight: 600, fontSize: '10.5px', letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: `1px solid ${divider}` }}>Status</th>
                  <th style={{ padding: '10px 16px', textAlign: 'right', color: muted, fontWeight: 600, fontSize: '10.5px', letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: `1px solid ${divider}` }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {emailHistory.map((email, index) => (
                  <tr key={email.id} style={{ borderBottom: index < emailHistory.length - 1 ? `1px solid ${divider}` : 'none' }}>
                    <td style={{ padding: '10px 16px', color: colors.text, fontSize: 13 }}>{email.recipient}</td>
                    <td style={{ padding: '10px 16px', color: colors.text, fontSize: 13, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email.subject}</td>
                    <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                      <span style={{
                        padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                        background: email.status === 'sent' ? 'rgba(34,197,94,0.15)' : email.status === 'failed' ? 'rgba(239,68,68,0.15)' : 'rgba(251,191,36,0.15)',
                        color: email.status === 'sent' ? '#22c55e' : email.status === 'failed' ? '#ef4444' : '#fbbf24',
                        display: 'inline-flex', alignItems: 'center', gap: 4
                      }}>
                        {email.status === 'sent' ? <CheckCircle size={11} /> : email.status === 'failed' ? <XCircle size={11} /> : <Clock size={11} />}
                        {email.status}
                      </span>
                    </td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', color: muted, fontSize: 12 }}>{formatDate(email.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Compose Tab */}
      {activeTab === 'compose' && (
        <div style={{ ...card, padding: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <div style={{ width: 30, height: 30, borderRadius: 7, background: '#4361ee18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Edit2 size={15} color="#4361ee" />
            </div>
            <span style={{ color: colors.text, fontSize: 15, fontWeight: 700 }}>Compose New Email</span>
          </div>

          <div style={{ display: 'grid', gap: 16 }}>
            <div>
              <label style={{ color: muted, fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 6, display: 'block' }}>Recipient Email *</label>
              <input
                type="email"
                placeholder="customer@email.com"
                value={manualEmailModal?.to || ''}
                onChange={(e) => setManualEmailModal(prev => ({ ...prev, to: e.target.value }))}
                style={{ ...inputBase, width: '100%', boxSizing: 'border-box', padding: '10px 12px' }}
              />
            </div>
            <div>
              <label style={{ color: muted, fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 6, display: 'block' }}>Subject *</label>
              <input
                type="text"
                placeholder="Email subject..."
                value={manualEmailModal?.subject || ''}
                onChange={(e) => setManualEmailModal(prev => ({ ...prev, subject: e.target.value }))}
                style={{ ...inputBase, width: '100%', boxSizing: 'border-box', padding: '10px 12px' }}
              />
            </div>
            <div>
              <label style={{ color: muted, fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 6, display: 'block' }}>Message *</label>
              <textarea
                placeholder="Type your message here..."
                value={manualEmailModal?.body || ''}
                onChange={(e) => setManualEmailModal(prev => ({ ...prev, body: e.target.value }))}
                rows={10}
                style={{ ...inputBase, width: '100%', boxSizing: 'border-box', padding: '10px 12px', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }}
              />
            </div>

            {/* Quick Templates */}
            <div>
              <label style={{ color: muted, fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>Quick Insert Template</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {templates.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setManualEmailModal(prev => ({ ...prev, subject: t.subject, body: t.body }))}
                    style={{ padding: '5px 12px', background: 'transparent', border: `1px solid ${divider}`, borderRadius: 6, color: colors.text, cursor: 'pointer', fontSize: 11, fontWeight: 600 }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)'; e.currentTarget.style.borderColor = '#4361ee'; e.currentTarget.style.color = '#4361ee'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = divider; e.currentTarget.style.color = colors.text; }}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={sendManualEmail}
              disabled={!manualEmailModal?.to || !manualEmailModal?.subject || !manualEmailModal?.body}
              style={{
                padding: '10px 20px',
                background: (!manualEmailModal?.to || !manualEmailModal?.subject || !manualEmailModal?.body) ? (isDark ? 'rgba(67,97,238,0.25)' : 'rgba(67,97,238,0.35)') : '#4361ee',
                border: 'none', borderRadius: 8, color: '#fff',
                cursor: (!manualEmailModal?.to || !manualEmailModal?.subject || !manualEmailModal?.body) ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontWeight: 600, fontSize: 13,
                opacity: (!manualEmailModal?.to || !manualEmailModal?.subject || !manualEmailModal?.body) ? 0.6 : 1
              }}
            >
              <Send size={15} />
              Send Email
            </button>
          </div>
        </div>
      )}

      {/* Manual Email Modal */}
      {manualEmailModal && activeTab !== 'compose' && createPortal(
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.52)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9000
          }}
          onClick={() => setManualEmailModal(null)}
        >
          <div
            style={{
              width: '95%', maxWidth: 560,
              background: isDark ? '#0c1120' : '#ffffff',
              border: `1px solid ${divider}`, borderRadius: 10,
              padding: 24, animation: 'slideUp 0.2s ease'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: '#4361ee18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Mail size={16} color="#4361ee" />
                </div>
                <span style={{ color: colors.text, fontSize: 16, fontWeight: 700 }}>
                  Send Email to {manualEmailModal.customerName || 'Customer'}
                </span>
              </div>
              <button
                onClick={() => setManualEmailModal(null)}
                style={{ width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: `1px solid ${divider}`, borderRadius: 6, color: muted, cursor: 'pointer' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <X size={14} />
              </button>
            </div>

            <div style={{ display: 'grid', gap: 14 }}>
              <div>
                <label style={{ color: muted, fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 5, display: 'block' }}>To</label>
                <input
                  type="email"
                  value={manualEmailModal.to}
                  onChange={(e) => setManualEmailModal(p => ({ ...p, to: e.target.value }))}
                  style={{ ...inputBase, width: '100%', boxSizing: 'border-box', padding: '10px 12px' }}
                />
              </div>
              <div>
                <label style={{ color: muted, fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 5, display: 'block' }}>Subject</label>
                <input
                  type="text"
                  value={manualEmailModal.subject}
                  onChange={(e) => setManualEmailModal(p => ({ ...p, subject: e.target.value }))}
                  placeholder="Email subject..."
                  style={{ ...inputBase, width: '100%', boxSizing: 'border-box', padding: '10px 12px' }}
                />
              </div>
              <div>
                <label style={{ color: muted, fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 5, display: 'block' }}>Message</label>
                <textarea
                  value={manualEmailModal.body}
                  onChange={(e) => setManualEmailModal(p => ({ ...p, body: e.target.value }))}
                  rows={8}
                  placeholder="Type your message..."
                  style={{ ...inputBase, width: '100%', boxSizing: 'border-box', padding: '10px 12px', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }}
                />
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {templates.slice(0, 4).map(t => (
                  <button
                    key={t.id}
                    onClick={() => setManualEmailModal(p => ({ ...p, subject: t.subject, body: t.body }))}
                    style={{ padding: '4px 10px', background: 'transparent', border: `1px solid ${divider}`, borderRadius: 6, color: muted, cursor: 'pointer', fontSize: 11, fontWeight: 600 }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)'; e.currentTarget.style.color = colors.text; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = muted; }}
                  >
                    Use: {t.name}
                  </button>
                ))}
              </div>
              <button
                onClick={sendManualEmail}
                style={{
                  padding: '10px', background: '#4361ee', border: 'none', borderRadius: 8,
                  color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: 8, fontWeight: 600, fontSize: 13
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.88'; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
              >
                <Send size={15} />
                Send Email
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default NotificationCenter;
