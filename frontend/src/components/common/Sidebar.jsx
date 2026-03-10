import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import {
  LayoutDashboard, CreditCard, ShieldCheck, CheckCircle, Users,
  UserPlus, FileText, ArrowLeftRight, Percent, Bell, BarChart3,
  LogOut, Building2, Sun, Moon, ChevronLeft, ChevronRight
} from 'lucide-react';

const ICONS = {
  dashboard: LayoutDashboard,
  loans: CreditCard,
  eligibility: ShieldCheck,
  approvals: CheckCircle,
  customers: Users,
  newCustomer: UserPlus,
  loanApplication: FileText,
  repayments: ArrowLeftRight,
  interest: Percent,
  notifications: Bell,
  reports: BarChart3,
  logout: LogOut,
  logo: Building2,
};

const adminSections = [
  {
    label: 'Overview',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
      { id: 'reports', label: 'Reports', icon: 'reports' },
      { id: 'notifications', label: 'Notifications', icon: 'notifications' },
    ]
  },
  {
    label: 'Loans',
    items: [
      { id: 'all-loans', label: 'All Loans', icon: 'loans' },
      { id: 'eligibility', label: 'Eligibility Check', icon: 'eligibility' },
      { id: 'approvals', label: 'Approvals', icon: 'approvals' },
      { id: 'repayments', label: 'Repayments', icon: 'repayments' },
    ]
  },
  {
    label: 'Management',
    items: [
      { id: 'all-customers', label: 'All Customers', icon: 'customers' },
      { id: 'interest-rates', label: 'Interest Rates', icon: 'interest' },
    ]
  }
];

const officerSections = [
  {
    label: 'Overview',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
      { id: 'notifications', label: 'Notifications', icon: 'notifications' },
    ]
  },
  {
    label: 'Loans',
    items: [
      { id: 'all-loans', label: 'All Loans', icon: 'loans' },
      { id: 'eligibility', label: 'Eligibility Check', icon: 'eligibility' },
      { id: 'loans', label: 'Loan Application', icon: 'loanApplication' },
      { id: 'repayments', label: 'Repayments', icon: 'repayments' },
    ]
  },
  {
    label: 'Customers',
    items: [
      { id: 'all-customers', label: 'All Customers', icon: 'customers' },
      { id: 'customers', label: 'New Customer', icon: 'newCustomer' },
    ]
  }
];

export default function Sidebar({ role, activeTab, onTabChange, onLogout, onCollapseChange }) {
  const userName = localStorage.getItem('userName') || (role === 'admin' ? 'Admin User' : 'Loan Officer');
  const { toggleTheme, isDark, colors } = useTheme();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleToggleCollapse = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    if (onCollapseChange) onCollapseChange(next);
  };

  const sections = role === 'admin' ? adminSections : officerSections;

  const bg = isDark ? '#0f172a' : '#ffffff';
  const border = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)';
  const sectionLabelColor = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.35)';
  const itemHoverBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(67,97,238,0.06)';
  const activeBg = isDark ? 'rgba(67,97,238,0.18)' : 'rgba(67,97,238,0.1)';
  const activeText = '#4361ee';
  const inactiveText = isDark ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.55)';
  const initials = userName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <aside style={{
      width: isCollapsed ? '68px' : '240px',
      height: '100vh',
      background: bg,
      borderRight: `1px solid ${border}`,
      display: 'flex',
      flexDirection: 'column',
      position: 'fixed',
      left: 0,
      top: 0,
      zIndex: 100,
      transition: 'width 0.25s ease',
      overflow: 'hidden'
    }}>

      {/* Logo Row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: isCollapsed ? 'center' : 'space-between',
        padding: isCollapsed ? '20px 0' : '20px 16px 20px 18px',
        borderBottom: `1px solid ${border}`,
        flexShrink: 0
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          <div style={{
            width: '34px',
            height: '34px',
            background: '#4361ee',
            borderRadius: '9px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 4px 12px rgba(67,97,238,0.35)'
          }}>
            <Building2 size={18} color="#ffffff" />
          </div>
          {!isCollapsed && (
            <div style={{ overflow: 'hidden' }}>
              <p style={{ fontSize: '15px', fontWeight: '700', color: colors.text, margin: 0, whiteSpace: 'nowrap' }}>
                SmartLoan
              </p>
              <p style={{ fontSize: '11px', color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)', margin: 0, letterSpacing: '0.04em' }}>
                BLMS
              </p>
            </div>
          )}
        </div>

        {/* Controls */}
        {!isCollapsed && (
          <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
            <button
              onClick={toggleTheme}
              title={isDark ? 'Light mode' : 'Dark mode'}
              style={iconBtnStyle(isDark)}
            >
              {isDark ? <Sun size={14} color={inactiveText} /> : <Moon size={14} color={inactiveText} />}
            </button>
            <button
              onClick={handleToggleCollapse}
              title="Collapse"
              style={iconBtnStyle(isDark)}
            >
              <ChevronLeft size={14} color={inactiveText} />
            </button>
          </div>
        )}

        {isCollapsed && (
          <div />
        )}
      </div>

      {/* Collapsed: theme + expand stacked */}
      {isCollapsed && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '10px 0', borderBottom: `1px solid ${border}`, flexShrink: 0 }}>
          <button onClick={toggleTheme} title={isDark ? 'Light mode' : 'Dark mode'} style={iconBtnStyle(isDark)}>
            {isDark ? <Sun size={14} color={inactiveText} /> : <Moon size={14} color={inactiveText} />}
          </button>
          <button onClick={handleToggleCollapse} title="Expand" style={iconBtnStyle(isDark)}>
            <ChevronRight size={14} color={inactiveText} />
          </button>
        </div>
      )}

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: isCollapsed ? '12px 8px' : '12px 10px', scrollbarWidth: 'none' }}>
        {sections.map((section, si) => (
          <div key={si} style={{ marginBottom: '6px' }}>
            {/* Section Label */}
            {!isCollapsed && (
              <p style={{
                fontSize: '10px',
                fontWeight: '600',
                color: sectionLabelColor,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                padding: '8px 8px 4px',
                margin: 0
              }}>
                {section.label}
              </p>
            )}

            {/* Items */}
            {section.items.map(item => {
              const IconComp = ICONS[item.icon];
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  title={isCollapsed ? item.label : ''}
                  style={{
                    width: '100%',
                    padding: isCollapsed ? '10px 0' : '9px 10px',
                    marginBottom: '2px',
                    background: active ? activeBg : 'transparent',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: isCollapsed ? 'center' : 'flex-start',
                    gap: '10px',
                    transition: 'background 0.15s',
                    position: 'relative',
                    textAlign: 'left'
                  }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = itemHoverBg; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                >
                  {/* Active left bar */}
                  {active && !isCollapsed && (
                    <span style={{
                      position: 'absolute',
                      left: 0,
                      top: '6px',
                      bottom: '6px',
                      width: '3px',
                      borderRadius: '0 3px 3px 0',
                      background: '#4361ee'
                    }} />
                  )}

                  {IconComp && (
                    <IconComp
                      size={17}
                      color={active ? activeText : inactiveText}
                      strokeWidth={active ? 2.2 : 1.8}
                    />
                  )}

                  {!isCollapsed && (
                    <span style={{
                      fontSize: '13.5px',
                      fontWeight: active ? '600' : '450',
                      color: active ? activeText : inactiveText,
                      whiteSpace: 'nowrap'
                    }}>
                      {item.label}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Section divider */}
            {si < sections.length - 1 && !isCollapsed && (
              <div style={{ height: '1px', background: border, margin: '8px 8px 4px' }} />
            )}
          </div>
        ))}
      </nav>

      {/* Bottom: User + Logout */}
      <div style={{
        padding: isCollapsed ? '10px 8px' : '12px 10px',
        borderTop: `1px solid ${border}`,
        flexShrink: 0
      }}>
        {/* Logout */}
        <button
          onClick={onLogout}
          title={isCollapsed ? 'Logout' : ''}
          style={{
            width: '100%',
            padding: isCollapsed ? '9px 0' : '9px 10px',
            marginBottom: isCollapsed ? '0' : '10px',
            background: 'transparent',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: isCollapsed ? 'center' : 'flex-start',
            gap: '10px',
            transition: 'background 0.15s'
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <LogOut size={17} color="#ef4444" strokeWidth={1.8} />
          {!isCollapsed && (
            <span style={{ fontSize: '13.5px', fontWeight: '500', color: '#ef4444' }}>
              Logout
            </span>
          )}
        </button>

        {/* User Card */}
        {!isCollapsed && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 10px',
            background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(67,97,238,0.05)',
            borderRadius: '10px',
            border: `1px solid ${border}`
          }}>
            <div style={{
              width: '34px',
              height: '34px',
              background: '#4361ee',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '13px',
              fontWeight: '700',
              color: 'white',
              flexShrink: 0,
              letterSpacing: '0.02em'
            }}>
              {initials}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <p style={{
                fontSize: '13px',
                fontWeight: '600',
                color: colors.text,
                margin: 0,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {userName}
              </p>
              <p style={{
                fontSize: '11px',
                color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.4)',
                margin: 0
              }}>
                {role === 'admin' ? 'Administrator' : 'Loan Officer'}
              </p>
            </div>
          </div>
        )}

        {/* Collapsed: avatar only */}
        {isCollapsed && (
          <div style={{
            width: '34px',
            height: '34px',
            background: '#4361ee',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: '700',
            color: 'white',
            margin: '8px auto 0',
            letterSpacing: '0.02em'
          }}>
            {initials}
          </div>
        )}
      </div>

      <style>{`
        aside nav::-webkit-scrollbar { display: none; }
        @media (max-width: 1024px) { aside { display: none; } }
      `}</style>
    </aside>
  );
}

function iconBtnStyle(isDark) {
  return {
    width: '28px',
    height: '28px',
    background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)',
    border: 'none',
    borderRadius: '7px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'background 0.15s',
    flexShrink: 0
  };
}
