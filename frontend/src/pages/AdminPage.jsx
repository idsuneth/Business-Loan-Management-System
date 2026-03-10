import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import Sidebar from '../components/common/Sidebar';
import AdminDashboard from '../components/admin/Dashboard';
import ApprovalQueue from '../components/admin/ApprovalQueue';
import Reports from '../components/admin/Reports';
import CustomerList from '../components/admin/CustomerList';
import Repayments from '../components/officer/Repayments';
import LoansPage from '../components/admin/LoansPage';
import InterestRates from '../components/admin/InterestRates';
import NotificationCenter from '../components/admin/NotificationCenter';
import EligibilityChecker from '../components/admin/EligibilityChecker';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loanFilter, setLoanFilter] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const contentRef = useRef(null);
  const navigate = useNavigate();
  const { isDark, colors } = useTheme();

  useEffect(() => {
    const role = localStorage.getItem('userRole');
    if (role !== 'admin') {
      // Redirect to login if not admin
      // navigate('/login');
    }
  }, [navigate]);

  // Scroll animation observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-visible');
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    // Observe all animatable elements
    const elements = document.querySelectorAll('.scroll-animate');
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [activeTab]);

  // Tab change animation
  useEffect(() => {
    setIsAnimating(true);
    const timer = setTimeout(() => setIsAnimating(false), 300);
    
    // Scroll to top on tab change
    if (contentRef.current) {
      contentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
    
    return () => clearTimeout(timer);
  }, [activeTab]);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userRole');
    navigate('/login');
  };

  // Handle navigation from dashboard cards
  const handleDashboardNavigate = (tab, filter = null) => {
    setLoanFilter(filter);
    setActiveTab(tab === 'loans' ? 'all-loans' : tab);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <AdminDashboard onNavigate={handleDashboardNavigate} />;
      case 'all-loans':
        return <LoansPage initialFilter={loanFilter} />;
      case 'eligibility':
        return <EligibilityChecker />;
      case 'approvals':
        return <ApprovalQueue />;
      case 'all-customers':
        return <CustomerList />;
      case 'repayments':
        return <Repayments />;
      case 'interest-rates':
        return <InterestRates />;
      case 'notifications':
        return <NotificationCenter />;
      case 'reports':
        return <Reports />;
      default:
        return <AdminDashboard />;
    }
  };

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: isDark ? '#0f172a' : '#f1f5f9'
    }}>
      {/* Sidebar */}
      <Sidebar
        role="admin"
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLogout={handleLogout}
        onCollapseChange={setSidebarCollapsed}
      />

      {/* Main Content */}
      <main 
        ref={contentRef}
        className={`content-area ${isAnimating ? 'content-enter' : ''}`}
        style={{
          flex: 1,
          marginLeft: sidebarCollapsed ? '72px' : '240px',
          padding: 0,
          minHeight: '100vh',
          overflowY: 'auto',
          scrollBehavior: 'smooth',
          transition: 'margin-left 0.3s ease'
        }}
      >
        {renderContent()}
      </main>

      <style>{`
        /* Scroll animations */
        .scroll-animate {
          opacity: 0;
          transform: translateY(30px);
          transition: opacity 0.6s ease-out, transform 0.6s ease-out;
        }
        
        .scroll-animate.animate-visible {
          opacity: 1;
          transform: translateY(0);
        }
        
        /* Content enter animation */
        .content-enter {
          animation: contentSlideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        @keyframes contentSlideIn {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        @media (max-width: 1024px) {
          main { margin-left: 0 !important; }
        }
      `}</style>
    </div>
  );
}
