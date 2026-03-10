import React, { useState, useEffect } from 'react';
import { 
  Bell, Mail, Phone, Settings, Save, TestTube,
  Check, X, Clock, RefreshCw, Send, FileText,
  AlertTriangle, CheckCircle, ChevronDown, ChevronUp
} from 'lucide-react';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

const NotificationSettings = () => {
  const { isDark, colors } = useTheme();
  const [settings, setSettings] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('settings');
  const [notification, setNotification] = useState(null);
  const [editingKey, setEditingKey] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [testPhone, setTestPhone] = useState('');
  const [expandedTemplates, setExpandedTemplates] = useState({});

  useEffect(() => {
    fetchSettings();
    fetchHistory();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await api.get('/notifications/settings');
      setSettings(response.data);
    } catch (error) {
      console.error('Error fetching settings:', error);
      showNotification('error', 'Failed to fetch settings');
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await api.get('/notifications/history');
      setHistory(response.data);
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const startEditing = (setting) => {
    setEditingKey(setting.settingKey);
    setEditValue(setting.settingValue);
  };

  const cancelEditing = () => {
    setEditingKey(null);
    setEditValue('');
  };

  const handleSave = async (settingKey) => {
    try {
      await api.put(`/notifications/settings/${settingKey}`, {
        settingValue: editValue
      });
      showNotification('success', 'Setting updated successfully');
      setEditingKey(null);
      fetchSettings();
    } catch (error) {
      showNotification('error', 'Failed to update setting');
    }
  };

  const testEmailConfig = async () => {
    if (!testEmail) {
      showNotification('error', 'Please enter a test email address');
      return;
    }
    try {
      await api.post('/notifications/test-email', { email: testEmail });
      showNotification('success', 'Test email sent successfully!');
    } catch (error) {
      showNotification('error', error.response?.data?.message || 'Failed to send test email');
    }
  };

  const testSMSConfig = async () => {
    if (!testPhone) {
      showNotification('error', 'Please enter a test phone number');
      return;
    }
    try {
      await api.post('/notifications/test-sms', { phone: testPhone });
      showNotification('success', 'Test SMS sent successfully!');
    } catch (error) {
      showNotification('error', error.response?.data?.message || 'Failed to send test SMS');
    }
  };

  const checkOverduePayments = async () => {
    try {
      const response = await api.post('/notifications/check-overdue');
      showNotification('success', `Found ${response.data.overdueCount} overdue payments`);
    } catch (error) {
      showNotification('error', 'Failed to check overdue payments');
    }
  };

  const toggleTemplate = (key) => {
    setExpandedTemplates(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const getSettingIcon = (key) => {
    if (key.includes('email')) return Mail;
    if (key.includes('sms')) return Phone;
    if (key.includes('template')) return FileText;
    return Settings;
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      sent: { bg: 'rgba(34, 197, 94, 0.2)', color: '#22c55e', icon: CheckCircle },
      pending: { bg: 'rgba(251, 191, 36, 0.2)', color: '#fbbf24', icon: Clock },
      failed: { bg: 'rgba(239, 68, 68, 0.2)', color: '#f87171', icon: X }
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '4px 10px',
        borderRadius: '6px',
        fontSize: '11px',
        fontWeight: '600',
        background: config.bg,
        color: config.color,
        textTransform: 'capitalize'
      }}>
        <Icon size={12} />
        {status}
      </span>
    );
  };

  // Categorize settings
  const settingCategories = {
    toggles: settings.filter(s => s.settingKey.includes('enabled')),
    templates: settings.filter(s => s.settingKey.includes('template')),
    other: settings.filter(s => !s.settingKey.includes('enabled') && !s.settingKey.includes('template'))
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      {/* Notification Toast */}
      {notification && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          padding: '12px 20px',
          background: notification.type === 'success' 
            ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
            : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
          borderRadius: '10px',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          zIndex: 1000,
          animation: 'slideIn 0.3s ease'
        }}>
          {notification.type === 'success' ? <Check size={18} /> : <X size={18} />}
          {notification.message}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{
          width: '48px',
          height: '48px',
          background: '#4361ee',
          borderRadius: '6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Settings size={24} color={isDark ? '#ffffff' : '#000000'} />
        </div>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '700', color: colors.text, marginBottom: '4px' }}>
            Notification Settings
          </h1>
          <p style={{ color: colors.textMuted, fontSize: '13px' }}>
            Configure email and SMS notification settings
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '24px',
        background: isDark ? '#0f172a' : '#f8fafc',
        padding: '6px',
        borderRadius: '6px',
        width: 'fit-content'
      }}>
        {[
          { id: 'settings', label: 'Settings', icon: Settings },
          { id: 'templates', label: 'Templates', icon: FileText },
          { id: 'test', label: 'Test', icon: TestTube },
          { id: 'history', label: 'History', icon: Clock }
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '10px 20px',
                background: activeTab === tab.id ? 'rgba(139, 92, 246, 0.3)' : 'transparent',
                border: 'none',
                borderRadius: '8px',
                color: activeTab === tab.id ? colors.text : colors.textMuted,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: '600',
                transition: '0.2s'
              }}
            >
              <Icon size={18} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div style={{ display: 'grid', gap: '24px' }}>
          {/* Enable/Disable Toggles */}
          <div style={{
            background: isDark ? '#0f172a' : '#f8fafc',
            
            border: `1px solid ${colors.border}`,
            borderRadius: '10px',
            padding: '24px'
          }}>
            <h3 style={{ color: colors.text, fontSize: '18px', fontWeight: '600', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Settings size={22} color={isDark ? '#ffffff' : '#000000'} />
              Notification Channels
            </h3>
            <div style={{ display: 'grid', gap: '16px' }}>
              {settingCategories.toggles.map(setting => (
                <div 
                  key={setting.settingKey}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '16px 20px',
                    background: isDark ? '#0f172a' : '#f8fafc',
                    borderRadius: '6px',
                    border: `1px solid ${isDark ? '#0f172a' : '#f8fafc'}`
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    {setting.settingKey.includes('email') ? (
                      <Mail size={22} color={isDark ? '#ffffff' : '#000000'} />
                    ) : (
                      <Phone size={22} color={isDark ? '#ffffff' : '#000000'} />
                    )}
                    <div>
                      <p style={{ color: colors.text, fontWeight: '600', marginBottom: '4px' }}>
                        {setting.settingKey.includes('email') ? 'Email Notifications' : 'SMS Notifications'}
                      </p>
                      <p style={{ color: colors.textMuted, fontSize: '13px' }}>
                        {setting.description}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        await api.put(`/notifications/settings/${setting.settingKey}`, {
                          settingValue: setting.settingValue === 'true' ? 'false' : 'true'
                        });
                        fetchSettings();
                        showNotification('success', 'Setting updated');
                      } catch (error) {
                        showNotification('error', 'Failed to update');
                      }
                    }}
                    style={{
                      width: '56px',
                      height: '30px',
                      borderRadius: '15px',
                      border: 'none',
                      cursor: 'pointer',
                      background: setting.settingValue === 'true' 
                        ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                        : 'rgba(255,255,255,0.2)',
                      position: 'relative',
                      transition: '0.3s'
                    }}
                  >
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '6px',
                      background: 'white',
                      position: 'absolute',
                      top: '3px',
                      left: setting.settingValue === 'true' ? '29px' : '3px',
                      transition: '0.3s'
                    }} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Info Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
            <div style={{
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              borderRadius: '8px',
              padding: '20px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <Phone size={24} color={isDark ? '#ffffff' : '#000000'} />
                <h4 style={{ color: colors.text, fontWeight: '600' }}>SMS Configuration</h4>
              </div>
              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.6' }}>
                SMS notifications use Twilio. Configure your Twilio credentials in environment variables:
                <code style={{ display: 'block', marginTop: '12px', padding: '12px', background: isDark ? 'rgba(0,0,0,0.3)' : '#f1f5f9', borderRadius: '8px', fontSize: '12px', color: colors.text }}>
                  TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
                </code>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div style={{
          background: isDark ? '#0f172a' : '#f8fafc',
          
          border: `1px solid ${colors.border}`,
          borderRadius: '10px',
          padding: '24px'
        }}>
          <h3 style={{ color: colors.text, fontSize: '18px', fontWeight: '600', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileText size={22} color={isDark ? '#ffffff' : '#000000'} />
            Message Templates
          </h3>
          <p style={{ color: colors.textMuted, fontSize: '14px', marginBottom: '20px' }}>
            Available variables: {'{customerName}'}, {'{loanId}'}, {'{amount}'}, {'{dueDate}'}, {'{daysOverdue}'}
          </p>
          <div style={{ display: 'grid', gap: '16px' }}>
            {settingCategories.templates.map(setting => (
              <div 
                key={setting.settingKey}
                style={{
                  background: isDark ? '#0f172a' : '#f8fafc',
                  borderRadius: '6px',
                  border: `1px solid ${isDark ? '#0f172a' : '#f8fafc'}`,
                  overflow: 'hidden'
                }}
              >
                <button
                  onClick={() => toggleTemplate(setting.settingKey)}
                  style={{
                    width: '100%',
                    padding: '16px 20px',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <FileText size={20} color={isDark ? '#ffffff' : '#000000'} />
                    <span style={{ color: colors.text, fontWeight: '600' }}>
                      {setting.settingKey.replace(/_/g, ' ').replace('template', '').trim()}
                    </span>
                  </div>
                  {expandedTemplates[setting.settingKey] ? (
                    <ChevronUp color={isDark ? '#ffffff' : '#000000'} size={20} />
                  ) : (
                    <ChevronDown color={isDark ? '#ffffff' : '#000000'} size={20} />
                  )}
                </button>
                {expandedTemplates[setting.settingKey] && (
                  <div style={{ padding: '0 20px 20px' }}>
                    <p style={{ color: colors.textMuted, fontSize: '12px', marginBottom: '10px' }}>
                      {setting.description}
                    </p>
                    {editingKey === setting.settingKey ? (
                      <div>
                        <textarea
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          style={{
                            width: '100%',
                            minHeight: '100px',
                            padding: '12px',
                            background: isDark ? '#334155' : '#f1f5f9',
                            border: `1px solid ${colors.border}`,
                            borderRadius: '8px',
                            color: colors.text,
                            resize: 'vertical',
                            fontFamily: 'monospace',
                            fontSize: '13px'
                          }}
                        />
                        <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                          <button
                            onClick={() => handleSave(setting.settingKey)}
                            style={{
                              padding: '8px 16px',
                              background: '#10b981',
                              border: 'none',
                              borderRadius: '6px',
                              color: 'white',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontWeight: '600'
                            }}
                          >
                            <Save size={14} />
                            Save
                          </button>
                          <button
                            onClick={cancelEditing}
                            style={{
                              padding: '8px 16px',
                              background: isDark ? '#334155' : '#f1f5f9',
                              border: `1px solid ${colors.border}`,
                              borderRadius: '6px',
                              color: colors.text,
                              cursor: 'pointer'
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div style={{
                          padding: '12px',
                          background: isDark ? 'rgba(0,0,0,0.3)' : '#f1f5f9',
                          borderRadius: '8px',
                          marginBottom: '12px'
                        }}>
                          <pre style={{ 
                            color: colors.textSecondary, 
                            fontSize: '13px', 
                            whiteSpace: 'pre-wrap',
                            margin: 0,
                            fontFamily: 'monospace'
                          }}>
                            {setting.settingValue}
                          </pre>
                        </div>
                        <button
                          onClick={() => startEditing(setting)}
                          style={{
                            padding: '8px 16px',
                            background: 'rgba(139, 92, 246, 0.2)',
                            border: '1px solid rgba(139, 92, 246, 0.3)',
                            borderRadius: '6px',
                            color: '#a78bfa',
                            cursor: 'pointer',
                            fontWeight: '600'
                          }}
                        >
                          Edit Template
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Test Tab */}
      {activeTab === 'test' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' }}>
          {/* Test Email */}
          <div style={{
            background: isDark ? '#0f172a' : '#f8fafc',
            
            border: `1px solid ${colors.border}`,
            borderRadius: '10px',
            padding: '24px'
          }}>
            <h3 style={{ color: colors.text, fontSize: '18px', fontWeight: '600', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Mail size={22} color={isDark ? '#ffffff' : '#000000'} />
              Test Email
            </h3>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ color: colors.textSecondary, fontSize: '13px', marginBottom: '8px', display: 'block' }}>
                Email Address
              </label>
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="test@example.com"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: isDark ? '#334155' : '#f1f5f9',
                  border: `1px solid ${colors.border}`,
                  borderRadius: '10px',
                  color: colors.text,
                  fontSize: '14px'
                }}
              />
            </div>
            <button
              onClick={testEmailConfig}
              style={{
                width: '100%',
                padding: '12px',
                background: '#4361ee',
                border: 'none',
                borderRadius: '10px',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontWeight: '600'
              }}
            >
              <Send size={18} />
              Send Test Email
            </button>
          </div>

          {/* Test SMS */}
          <div style={{
            background: isDark ? '#0f172a' : '#f8fafc',
            
            border: `1px solid ${colors.border}`,
            borderRadius: '10px',
            padding: '24px'
          }}>
            <h3 style={{ color: colors.text, fontSize: '18px', fontWeight: '600', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Phone size={22} color={isDark ? '#ffffff' : '#000000'} />
              Test SMS
            </h3>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ color: colors.textSecondary, fontSize: '13px', marginBottom: '8px', display: 'block' }}>
                Phone Number
              </label>
              <input
                type="tel"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="+1234567890"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: isDark ? '#334155' : '#f1f5f9',
                  border: `1px solid ${colors.border}`,
                  borderRadius: '10px',
                  color: colors.text,
                  fontSize: '14px'
                }}
              />
            </div>
            <button
              onClick={testSMSConfig}
              style={{
                width: '100%',
                padding: '12px',
                background: '#10b981',
                border: 'none',
                borderRadius: '10px',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontWeight: '600'
              }}
            >
              <Send size={18} />
              Send Test SMS
            </button>
          </div>

          {/* Check Overdue */}
          <div style={{
            gridColumn: 'span 2',
            background: isDark ? '#0f172a' : '#f8fafc',
            
            border: `1px solid ${colors.border}`,
            borderRadius: '10px',
            padding: '24px'
          }}>
            <h3 style={{ color: colors.text, fontSize: '18px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertTriangle size={22} color={isDark ? '#ffffff' : '#000000'} />
              Manual Overdue Check
            </h3>
            <p style={{ color: colors.textMuted, marginBottom: '20px', fontSize: '14px' }}>
              Manually trigger a check for overdue payments and update their status. Automated checks run daily at 9:00 AM.
            </p>
            <button
              onClick={checkOverduePayments}
              style={{
                padding: '12px 24px',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                border: 'none',
                borderRadius: '10px',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: '600'
              }}
            >
              <RefreshCw size={18} />
              Check Overdue Payments
            </button>
          </div>
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div style={{
          background: isDark ? '#0f172a' : '#f8fafc',
          
          border: `1px solid ${colors.border}`,
          borderRadius: '10px',
          overflow: 'hidden'
        }}>
          <div style={{ padding: '20px', borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ color: colors.text, fontSize: '18px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Clock size={22} color={isDark ? '#ffffff' : '#000000'} />
              Notification History
            </h3>
            <button
              onClick={fetchHistory}
              style={{
                padding: '8px 16px',
                background: isDark ? '#334155' : '#f1f5f9',
                border: 'none',
                borderRadius: '8px',
                color: colors.text,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
              <RefreshCw size={40} color={isDark ? '#ffffff' : '#000000'} style={{ animation: 'spin 1s linear infinite' }} />
            </div>
          ) : history.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', color: colors.textMuted }}>
              <Bell size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
              <p>No notification history</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: isDark ? '#0f172a' : '#f8fafc' }}>
                  <th style={{ padding: '14px 16px', textAlign: 'left', color: colors.textSecondary, fontWeight: '600', fontSize: '12px' }}>
                    TYPE
                  </th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', color: colors.textSecondary, fontWeight: '600', fontSize: '12px' }}>
                    RECIPIENT
                  </th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', color: colors.textSecondary, fontWeight: '600', fontSize: '12px' }}>
                    SUBJECT
                  </th>
                  <th style={{ padding: '14px 16px', textAlign: 'center', color: colors.textSecondary, fontWeight: '600', fontSize: '12px' }}>
                    STATUS
                  </th>
                  <th style={{ padding: '14px 16px', textAlign: 'right', color: colors.textSecondary, fontWeight: '600', fontSize: '12px' }}>
                    DATE
                  </th>
                </tr>
              </thead>
              <tbody>
                {history.map((notification, index) => (
                  <tr 
                    key={notification.id}
                    style={{ 
                      borderTop: `1px solid ${isDark ? '#0f172a' : '#f8fafc'}`,
                      background: index % 2 === 0 ? 'transparent' : (isDark ? '#0f172a' : '#f8fafc')
                    }}
                  >
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '600',
                        background: notification.type === 'email' ? 'rgba(96, 165, 250, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                        color: notification.type === 'email' ? '#60a5fa' : '#10b981',
                        textTransform: 'uppercase'
                      }}>
                        {notification.type === 'email' ? <Mail size={12} /> : <Phone size={12} />}
                        {notification.type}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: colors.textSecondary }}>
                      {notification.recipient}
                    </td>
                    <td style={{ padding: '12px 16px', color: colors.text, maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {notification.subject}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      {getStatusBadge(notification.status)}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: colors.textMuted, fontSize: '13px' }}>
                      {formatDate(notification.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        input:focus, textarea:focus {
          outline: none;
          border-color: #8b5cf6 !important;
        }
        input::placeholder, textarea::placeholder {
          color: ${colors.textMuted};
        }
      `}</style>
    </div>
  );
};

export default NotificationSettings;
