import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import Sidebar from '../components/common/Sidebar';
import OfficerDashboard from '../components/officer/Dashboard';
import CustomerList from '../components/admin/CustomerList';
import CustomerRegistration from '../components/officer/CustomerRegistration';
import LoanApplication from '../components/officer/LoanApplication';
import Repayments from '../components/officer/Repayments';
import NotificationCenter from '../components/admin/NotificationCenter';
import LoansPage from '../components/admin/LoansPage';
import EligibilityChecker from '../components/admin/EligibilityChecker';

export default function OfficerPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [initialFilter, setInitialFilter] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const contentRef = useRef(null);
  const navigate = useNavigate();
  const { isDark, colors } = useTheme();

  useEffect(() => {
    const role = localStorage.getItem('userRole');
    if (role !== 'officer' && role !== 'admin') {
      // Redirect to login if not authorized
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

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <OfficerDashboard onNavigate={(target) => {
          if (target.tab) setActiveTab(target.tab);
          if (target.initialFilter) setInitialFilter(target.initialFilter);
        }} />;
      case 'all-loans':
        return <LoansPage initialFilter={initialFilter} />;
      case 'eligibility':
        return <EligibilityChecker />;
      case 'all-customers':
        return <CustomerList onAddNew={() => setActiveTab('customers')} />;
      case 'customers':
        return <CustomerRegistration />;
      case 'loans':
        return <LoanApplication />;
      case 'repayments':
        return <Repayments />;
      case 'notifications':
        return <NotificationCenter />;
      default:
        return <OfficerDashboard />;
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
        role="officer"
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
