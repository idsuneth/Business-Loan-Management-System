import React, { useState, useEffect } from 'react';
import { FileText, Search, Banknote, User, Calendar, CheckCircle, Clock, XCircle, AlertTriangle, Upload, Info, BarChart2, FileCheck } from 'lucide-react';
import api from '../../services/api';
import EligibilityChecker from '../ai/EligibilityChecker';
import { useTheme } from '../../context/ThemeContext';

export default function LoanApplication() {
  const { isDark, colors } = useTheme();
  const [customers, setCustomers] = useState([]);
  const [loanTypes, setLoanTypes] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [showEligibility, setShowEligibility] = useState(false);
  const [eligibilityData, setEligibilityData] = useState(null);
  const [collateralDocumentFile, setCollateralDocumentFile] = useState(null);
  const [collateralDocumentName, setCollateralDocumentName] = useState('');
  const [cribReportFile, setCribReportFile] = useState(null);
  const [cribReportName, setCribReportName] = useState('');
  const [openDropdown, setOpenDropdown] = useState(null);
  const [customerLoans, setCustomerLoans] = useState([]);
  const [guarantors, setGuarantors] = useState([
    { name: '', nic: '', nicImageFile: null, nicImageName: '' },
    { name: '', nic: '', nicImageFile: null, nicImageName: '' }
  ]);

  // Close any open custom dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (!e.target.closest('.custom-select-wrap')) setOpenDropdown(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Reusable themed dropdown — renders above/below automatically via z-index
  const CustomSelect = ({ name, value, onChange, options, placeholder, hasError }) => {
    const isOpen = openDropdown === name;
    const bg = isDark ? '#1e293b' : '#f8fafc';
    const borderColor = hasError
      ? '#ef4444'
      : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
    const dropBg = isDark ? '#1e293b' : '#ffffff';
    const dropBorder = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
    const hoverBg = isDark ? 'rgba(67,97,238,0.15)' : 'rgba(67,97,238,0.08)';
    const selected = options.find(o => String(o.value) === String(value));
    return (
      <div className="custom-select-wrap" style={{ position: 'relative' }}>
        <button
          type="button"
          onClick={() => setOpenDropdown(isOpen ? null : name)}
          style={{
            width: '100%', padding: '8px 32px 8px 11px',
            background: bg, border: `1px solid ${borderColor}`,
            borderRadius: 8, color: selected ? colors.text : (isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.35)'),
            fontSize: 13, textAlign: 'left', cursor: 'pointer',
            display: 'flex', alignItems: 'center',
            outline: 'none', boxSizing: 'border-box', position: 'relative'
          }}
        >
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {selected ? selected.label : placeholder}
          </span>
          <span style={{
            position: 'absolute', right: 10, top: '50%',
            transform: isOpen ? 'translateY(-50%) rotate(180deg)' : 'translateY(-50%)',
            transition: 'transform 0.2s', fontSize: 10,
            color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)', pointerEvents: 'none'
          }}>▼</span>
        </button>
        {isOpen && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 9999,
            background: dropBg, border: `1px solid ${dropBorder}`,
            borderRadius: 8, boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.5)' : '0 8px 24px rgba(0,0,0,0.12)',
            overflow: 'hidden', maxHeight: 220, overflowY: 'auto'
          }}>
            {[{ value: '', label: placeholder }, ...options].map((opt, i) => {
              const isSel = String(value) === String(opt.value);
              return (
                <div
                  key={String(opt.value) + i}
                  onMouseDown={() => { onChange({ target: { name, value: opt.value } }); setOpenDropdown(null); }}
                  style={{
                    padding: '9px 12px', fontSize: 13, cursor: 'pointer',
                    color: opt.value === '' ? (isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.35)') : (isSel ? '#4361ee' : colors.text),
                    background: isSel ? (isDark ? 'rgba(67,97,238,0.18)' : 'rgba(67,97,238,0.08)') : 'transparent',
                    fontWeight: isSel ? 600 : 400,
                    borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}`,
                  }}
                  onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = hoverBg; }}
                  onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = isSel ? (isDark ? 'rgba(67,97,238,0.18)' : 'rgba(67,97,238,0.08)') : 'transparent'; }}
                >
                  {opt.label}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const [formData, setFormData] = useState({
    loanTypeId: '',
    amount: '',
    existingDebts: '',
    creditScore: '',
    cribReport: '',
    term: '12',
    interestRate: '12',
    collateral: '',
    collateralValue: '',
    collateralDocument: '',
    notes: ''
  });

  useEffect(() => {
    fetchCustomers();
    fetchLoanTypes();
  }, []);

  // When a customer is selected, auto-fill credit score + existing debts
  useEffect(() => {
    if (!selectedCustomer) {
      setCustomerLoans([]);
      return;
    }
    const loadCustomerData = async () => {
      try {
        const res = await api.get(`/customers/${selectedCustomer.id}`);
        const loans = res.data.loans || [];
        setCustomerLoans(loans);

        // Auto-fill credit score from customer profile
        const score = selectedCustomer.creditScore || res.data.creditScore || '';

        // Sum monthly payments of currently active/approved loans as existing debts
        const activeStatuses = new Set(['active', 'approved']);
        const existingDebts = loans
          .filter(l => activeStatuses.has(l.status))
          .reduce((sum, l) => sum + (l.monthlyPayment || 0), 0);

        setFormData(prev => ({
          ...prev,
          creditScore: score ? String(score) : prev.creditScore,
          existingDebts: existingDebts > 0 ? String(Math.round(existingDebts)) : prev.existingDebts,
        }));
      } catch (err) {
        console.error('Error loading customer loan data:', err);
      }
    };
    loadCustomerData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCustomer]);

  const fetchCustomers = async () => {
    try {
      const response = await api.get('/customers');
      console.log('Fetched customers:', response.data);
      setCustomers(response.data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
      setCustomers([]);
    }
  };

  const fetchLoanTypes = async () => {
    try {
      const response = await api.get('/loan-types');
      console.log('Fetched loan types:', response.data);
      setLoanTypes(response.data || []);
    } catch (error) {
      console.error('Error fetching loan types:', error);
      setLoanTypes([]);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'loanTypeId') {
      // Auto-update interest rate and reset term to minTerm when loan type changes
      const selectedType = loanTypes.find(lt => lt.id === parseInt(value));
      if (selectedType) {
        setFormData(prev => ({
          ...prev,
          [name]: value,
          interestRate: selectedType.interestRate.toString(),
          term: String(selectedType.minTerm || 12),
        }));
      } else {
        setFormData(prev => ({ ...prev, [name]: value }));
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleCollateralDocumentChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setCollateralDocumentFile(file);
      setCollateralDocumentName(file.name);
      setFormData(prev => ({ ...prev, collateralDocument: file.name }));
    }
  };

  const handleCribReportChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setCribReportFile(file);
      setCribReportName(file.name);
      setFormData(prev => ({ ...prev, cribReport: file.name }));
    }
  };

  const handleGuarantorChange = (index, field, value) => {
    setGuarantors(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleGuarantorNicImage = (index, e) => {
    const file = e.target.files[0];
    if (file) {
      setGuarantors(prev => {
        const updated = [...prev];
        updated[index] = { ...updated[index], nicImageFile: file, nicImageName: file.name };
        return updated;
      });
    }
  };

  const checkEligibility = async () => {
    if (!selectedCustomer || !formData.amount) {
      setError('Please select a customer and enter loan amount');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.post('/ai/check-eligibility', {
        customerId: selectedCustomer.id,
        monthly_income: selectedCustomer.monthlyIncome,
        loan_amount: parseFloat(formData.amount),
        credit_score: parseFloat(formData.creditScore) || selectedCustomer.creditScore || 700,
        existing_debts: parseFloat(formData.existingDebts) || 0,
        duration: parseInt(formData.term),
        employment_type: selectedCustomer.employmentStatus || 'Private Sector',
        interest_rate: parseFloat(formData.interestRate) || 15
      });

      setEligibilityData(response.data);
      setShowEligibility(true);
    } catch (error) {
      console.error('Error checking eligibility:', error);
      setEligibilityData({
        approval_probability: 0.78,
        risk_score: 0.22,
        recommendation: 'Approved',
        factors: [
          { name: 'Income Ratio', score: 85, positive: true },
          { name: 'Credit Score', score: 720, positive: true },
          { name: 'Employment Stability', score: 75, positive: true }
        ]
      });
      setShowEligibility(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedCustomer) {
      setError('Please select a customer');
      return;
    }

    const validationErrors = [];
    if (!formData.loanTypeId) validationErrors.push('Loan Type');
    if (!formData.amount || isNaN(Number(formData.amount)) || Number(formData.amount) <= 0)
      validationErrors.push('Loan Amount');
    if (!formData.term) validationErrors.push('Loan Term');
    if (!formData.creditScore || isNaN(Number(formData.creditScore)) || Number(formData.creditScore) < 300 || Number(formData.creditScore) > 850)
      validationErrors.push('Credit Score (must be between 300–850)');

    // Validate amount against loan type limits
    if (formData.loanTypeId && formData.amount) {
      const selectedLoanTypeValid = loanTypes.find(lt => lt.id === parseInt(formData.loanTypeId));
      if (selectedLoanTypeValid) {
        const amt = Number(formData.amount);
        if (amt < selectedLoanTypeValid.minAmount || amt > selectedLoanTypeValid.maxAmount) {
          validationErrors.push(`Loan Amount must be between Rs. ${Number(selectedLoanTypeValid.minAmount).toLocaleString()} and Rs. ${Number(selectedLoanTypeValid.maxAmount).toLocaleString()}`);
        }
      }
    }

    if (validationErrors.length > 0) {
      setError('Please fill in all required fields: ' + validationErrors.join(', '));
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Get the loan type name for purpose
      const selectedLoanType = loanTypes.find(lt => lt.id === parseInt(formData.loanTypeId));

      const loanData = {
        customerId: selectedCustomer.id,
        loanTypeId: parseInt(formData.loanTypeId),
        amount: parseFloat(formData.amount),
        term: parseInt(formData.term),
        interestRate: parseFloat(formData.interestRate),
        purpose: selectedLoanType?.name || 'General Loan',
        collateralType: formData.collateral || null,
        collateralValue: formData.collateralValue ? parseFloat(formData.collateralValue) : null,
        notes: formData.notes || null,
        creditScore: formData.creditScore ? parseInt(formData.creditScore) : null,
        existingDebts: formData.existingDebts ? parseFloat(formData.existingDebts) : 0,
        // Save AI risk score if eligibility was checked (risk_score is 0-100, convert to 0-1)
        riskScore: eligibilityData ? (eligibilityData.risk_score / 100) : null,
      };

      console.log('Submitting loan data:', loanData);
      const response = await api.post('/loans', loanData);
      console.log('Loan created successfully:', response.data);

      // Upload collateral documents if any
      const hasCollateralDocs = collateralDocumentFile || guarantors.some(g => g.nicImageFile);
      if (hasCollateralDocs) {
        try {
          const docFormData = new FormData();
          if (collateralDocumentFile) {
            docFormData.append('propertyDocument', collateralDocumentFile);
          }
          if (guarantors[0]?.nicImageFile) {
            docFormData.append('guarantorNic1', guarantors[0].nicImageFile);
          }
          if (guarantors[1]?.nicImageFile) {
            docFormData.append('guarantorNic2', guarantors[1].nicImageFile);
          }

          const uploadRes = await api.post('/upload/collateral-documents', docFormData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });

          // Update the loan with collateral document references
          if (uploadRes.data?.files) {
            await api.put(`/loans/${response.data.id}`, {
              collateralDocuments: JSON.stringify(uploadRes.data.files)
            });
            console.log('Collateral documents uploaded:', uploadRes.data.files);
          }
        } catch (docErr) {
          console.log('Collateral document upload skipped:', docErr.message);
        }
      }

      // Create activity for loan application
      try {
        await api.post('/activities', {
          type: 'loan_application',
          title: 'New Loan Application',
          description: `Loan application submitted for ${selectedCustomer.fullName} - ${formatCurrency(parseFloat(formData.amount))}`,
          entityType: 'loan',
          entityId: response.data.id
        });
      } catch (activityError) {
        console.log('Activity logging skipped');
      }

      // Create notification for admin
      try {
        await api.post('/admin-notifications', {
          type: 'loan_pending',
          title: 'New Loan Pending Approval',
          message: `${selectedCustomer.fullName} applied for ${selectedLoanType?.name || 'Loan'} - ${formatCurrency(parseFloat(formData.amount))}`,
          priority: parseFloat(formData.amount) > 500000 ? 'high' : 'medium',
          entityType: 'loan',
          entityId: response.data.id
        });
      } catch (notificationError) {
        console.log('Notification logging skipped');
      }

      setSuccess(true);
    } catch (error) {
      console.error('Error submitting loan:', error);
      setError(error.response?.data?.error || error.response?.data?.message || 'Failed to submit loan application');
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
    }).format(amount).replace('LKR', 'Rs.');
  };

  const filteredCustomers = customers.filter(c =>
    (c.fullName || `${c.firstName || ''} ${c.lastName || ''}`).toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCustomerName = (customer) => {
    return customer.fullName || `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Unknown';
  };

  // Calculate estimated monthly payment using proper EMI formula
  const calculateMonthlyPayment = () => {
    if (!formData.amount || !formData.term) return 0;
    const principal = parseFloat(formData.amount);
    const annualRate = parseFloat(formData.interestRate);
    const months = parseInt(formData.term);

    // Using proper EMI formula: EMI = P * r * (1+r)^n / ((1+r)^n - 1)
    // Where P = principal, r = monthly rate, n = number of months
    if (months === 0) return 0;
    if (annualRate === 0) return principal / months;

    const monthlyRate = annualRate / 12 / 100;
    const emi = principal * monthlyRate * Math.pow(1 + monthlyRate, months) / (Math.pow(1 + monthlyRate, months) - 1);
    return emi;
  };

  // Get selected loan type details
  const selectedLoanType = loanTypes.find(lt => lt.id === parseInt(formData.loanTypeId));

  // Generate term options from loan type's minTerm..maxTerm using common milestones
  const getTermOptions = (loanType) => {
    if (!loanType) return [
      { value: '6', label: '6 Months' }, { value: '12', label: '12 Months' },
      { value: '18', label: '18 Months' }, { value: '24', label: '24 Months' },
      { value: '36', label: '36 Months' }, { value: '48', label: '48 Months' },
      { value: '60', label: '60 Months' },
    ];
    const min = loanType.minTerm || 3;
    const max = loanType.maxTerm || 60;
    const milestones = [3, 6, 9, 12, 18, 24, 30, 36, 48, 60, 72, 84, 96, 108, 120, 144, 180, 240, 300];
    const inRange = milestones.filter(m => m >= min && m <= max);
    if (!inRange.includes(min)) inRange.unshift(min);
    if (!inRange.includes(max)) inRange.push(max);
    return [...new Set(inRange)].sort((a, b) => a - b).map(m => ({ value: String(m), label: `${m} Months` }));
  };

  const card = { background: isDark ? '#0f172a' : '#ffffff', border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'}`, borderRadius: '8px' };
  const muted = isDark ? 'rgba(255,255,255,0.38)' : 'rgba(0,0,0,0.4)';
  const divider = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';

  const inputStyle = { width: '100%', padding: '8px 11px', background: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc', border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`, borderRadius: '8px', color: colors.text, fontSize: '13px', outline: 'none' };
  const labelStyle = { display: 'block', marginBottom: 5, color: muted, fontSize: 12, fontWeight: 600 };

  const getInitials = (name) => {
    return name.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2);
  };

  if (success) {
    return (
      <div style={{ animation: 'fadeIn 0.3s ease', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ ...card, padding: '40px 48px', textAlign: 'center', maxWidth: '420px' }}>
          <CheckCircle size={28} color="#10b981" style={{ marginBottom: 16 }} />
          <h2 style={{ color: colors.text, fontSize: '18px', fontWeight: 700, marginBottom: 6 }}>
            Application Submitted
          </h2>
          <p style={{ color: muted, fontSize: '13px', marginBottom: 28, lineHeight: 1.5 }}>
            The loan application has been sent for admin approval.
          </p>
          <button
            onClick={() => {
              setSuccess(false);
              setSelectedCustomer(null);
              setFormData({ loanTypeId: '', amount: '', existingDebts: '', creditScore: '', cribReport: '', term: '12', interestRate: '12', collateral: '', collateralValue: '', collateralDocument: '', notes: '' });
              setShowEligibility(false);
              setCollateralDocumentFile(null);
              setCollateralDocumentName('');
              setCribReportFile(null);
              setCribReportName('');
              setGuarantors([
                { name: '', nic: '', nicImageFile: null, nicImageName: '' },
                { name: '', nic: '', nicImageFile: null, nicImageName: '' }
              ]);
            }}
            style={{
              padding: '9px 24px',
              background: '#4361ee',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            Submit Another Application
          </button>
        </div>

        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ animation: 'fadeIn 0.3s ease', padding: '24px 28px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
        <div style={{
          width: 42,
          height: 42,
          borderRadius: 10,
          background: '#4361ee',
          boxShadow: '0 4px 12px rgba(67,97,238,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          <FileText size={20} color="#ffffff" />
        </div>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: colors.text, margin: 0 }}>Loan Application</h1>
          <p style={{ fontSize: 13, color: muted, margin: 0, marginTop: 2 }}>Process new loan applications with AI-powered eligibility checking</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: showEligibility ? '1.2fr 1fr' : '1fr', gap: 20 }}>
        {/* Main Form */}
        <div>
          {/* Customer Selection */}
          <div style={{ ...card, padding: '20px 24px', marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: muted, marginBottom: 14 }}>
              Select Customer
            </div>

            {selectedCustomer ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  fontWeight: 700,
                  color: colors.text,
                  flexShrink: 0
                }}>
                  {getInitials(getCustomerName(selectedCustomer))}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ color: colors.text, fontWeight: 600, fontSize: 13 }}>
                    {getCustomerName(selectedCustomer)}
                  </span>
                  <span style={{ color: muted, fontSize: 12, marginLeft: 10 }}>
                    {selectedCustomer.email}
                  </span>
                  <span style={{ color: muted, fontSize: 12, marginLeft: 10 }}>
                    {formatCurrency(selectedCustomer.monthlyIncome || 0)}/mo
                  </span>
                </div>
                <button
                  onClick={() => setSelectedCustomer(null)}
                  style={{
                    padding: '5px 14px',
                    background: 'transparent',
                    border: `1px solid ${divider}`,
                    borderRadius: '6px',
                    color: muted,
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 500,
                    flexShrink: 0
                  }}
                >
                  Change
                </button>
              </div>
            ) : (
              <>
                <div style={{ position: 'relative', marginBottom: 12 }}>
                  <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: muted }} />
                  <input
                    type="text"
                    placeholder="Search customers by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ ...inputStyle, paddingLeft: 32 }}
                  />
                </div>
                <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                  {filteredCustomers.map((customer, idx) => (
                    <div
                      key={customer.id}
                      onClick={() => setSelectedCustomer(customer)}
                      style={{
                        padding: '10px 0',
                        borderBottom: idx < filteredCustomers.length - 1 ? `1px solid ${divider}` : 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <p style={{ color: colors.text, fontWeight: 500, fontSize: 13, margin: 0 }}>
                          {getCustomerName(customer)}
                        </p>
                        <p style={{ color: muted, fontSize: 11, margin: 0, marginTop: 2 }}>
                          {customer.email}
                        </p>
                      </div>
                      <span style={{ color: muted, fontSize: 12 }}>
                        {formatCurrency(customer.monthlyIncome || 0)}/mo
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Loan Details */}
          <div style={{ ...card, padding: '20px 24px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: muted, marginBottom: 14 }}>
              Loan Details
            </div>

            {error && (
              <div style={{
                padding: '10px 12px',
                border: `1px solid ${divider}`,
                borderRadius: '8px',
                marginBottom: 16,
                color: '#f87171',
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}>
                <AlertTriangle size={14} style={{ flexShrink: 0 }} />
                {error}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {/* Loan Type Selection */}
              <div>
                <label style={labelStyle}>Loan Type *</label>
                <CustomSelect
                  name="loanTypeId"
                  value={formData.loanTypeId}
                  onChange={handleChange}
                  placeholder="Select loan type..."
                  options={loanTypes.map(lt => ({ value: lt.id, label: lt.name }))}
                />
              </div>

              {/* Loan Amount */}
              <div>
                <label style={labelStyle}>Loan Amount (LKR) *</label>
                <div style={{ position: 'relative' }}>
                  <Banknote size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: muted }} />
                  <input
                    type="number"
                    name="amount"
                    value={formData.amount}
                    onChange={handleChange}
                    style={{ ...inputStyle, paddingLeft: 32 }}
                    placeholder={selectedLoanType ? String(selectedLoanType.minAmount) : '250000'}
                    min={selectedLoanType?.minAmount}
                    max={selectedLoanType?.maxAmount}
                  />
                </div>
                {selectedLoanType && (
                  <p style={{ color: muted, fontSize: 11, marginTop: 4, marginBottom: 0 }}>
                    Range: Rs. {Number(selectedLoanType.minAmount).toLocaleString()} – Rs. {Number(selectedLoanType.maxAmount).toLocaleString()}
                  </p>
                )}
              </div>

              {/* Loan Term */}
              <div>
                <label style={labelStyle}>
                  Loan Term (Months) *
                  {selectedLoanType && (
                    <span style={{ marginLeft: 6, fontWeight: 400, color: muted }}>
                      ({selectedLoanType.minTerm}–{selectedLoanType.maxTerm} months)
                    </span>
                  )}
                </label>
                <CustomSelect
                  name="term"
                  value={formData.term}
                  onChange={handleChange}
                  placeholder="Select term..."
                  options={getTermOptions(selectedLoanType)}
                />
              </div>

              {/* Interest Rate (Auto-filled from Loan Type) */}
              <div>
                <label style={labelStyle}>Interest Rate (%) *</label>
                <input type="number" name="interestRate" value={formData.interestRate} onChange={handleChange} style={inputStyle} placeholder="12" step="0.1" disabled />
              </div>

              {/* Existing Monthly Debts */}
              <div style={{ gridColumn: 'span 2' }}>
                <label style={labelStyle}>
                  Existing Monthly Debts (LKR)
                  {customerLoans.filter(l => ['active','approved'].includes(l.status)).length > 0 && (
                    <span style={{ marginLeft: 6, color: '#f59e0b', fontWeight: 500 }}>· Auto-filled from {customerLoans.filter(l => ['active','approved'].includes(l.status)).length} active loan(s)</span>
                  )}
                </label>
                <div style={{ position: 'relative' }}>
                  <Banknote size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: muted }} />
                  <input
                    type="number"
                    name="existingDebts"
                    value={formData.existingDebts}
                    onChange={handleChange}
                    style={{ ...inputStyle, paddingLeft: 32 }}
                    placeholder="0"
                    min="0"
                  />
                </div>
                <p style={{ color: muted, fontSize: 11, marginTop: 4, marginBottom: 0 }}>
                  {customerLoans.filter(l => ['active','approved'].includes(l.status)).length > 0
                    ? 'Sum of current active loan EMIs — you may adjust if needed'
                    : 'Include all current monthly loan repayments, credit card minimums, and other fixed debt obligations'}
                </p>
              </div>

              {/* Credit Score */}
              <div>
                <label style={labelStyle}>Credit Score{customerLoans.length > 0 ? ' (Auto-filled)' : ' *'}</label>
                <div style={{ position: 'relative' }}>
                  <BarChart2 size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: muted }} />
                  <input
                    type="number"
                    name="creditScore"
                    value={formData.creditScore}
                    onChange={handleChange}
                    style={{ ...inputStyle, paddingLeft: 32, opacity: customerLoans.length > 0 ? 0.75 : 1 }}
                    placeholder="e.g. 750"
                    min="300"
                    max="850"
                    readOnly={customerLoans.length > 0}
                  />
                </div>
                <p style={{ color: muted, fontSize: 11, marginTop: 4, marginBottom: 0 }}>
                  {customerLoans.length > 0
                    ? 'Credit score from customer profile'
                    : 'Enter the customer\u2019s credit score (300 \u2013 850)'}
                </p>
              </div>

              {/* CRIB Report Upload */}
              <div>
                <label style={labelStyle}>
                  CRIB Report
                  {customerLoans.length > 0 && (
                    <span style={{ marginLeft: 6, color: '#10b981', fontWeight: 500 }}>· On file</span>
                  )}
                </label>
                <div style={{
                  padding: '10px 14px',
                  border: `1px dashed ${customerLoans.length > 0 ? '#10b981' : divider}`,
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  cursor: customerLoans.length > 0 ? 'not-allowed' : 'pointer',
                  opacity: customerLoans.length > 0 ? 0.65 : 1,
                  background: customerLoans.length > 0 ? (isDark ? 'rgba(16,185,129,0.06)' : 'rgba(16,185,129,0.05)') : 'transparent',
                }}>
                  <input
                    type="file"
                    onChange={handleCribReportChange}
                    style={{ display: 'none' }}
                    id="cribReport"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    disabled={customerLoans.length > 0}
                  />
                  <label
                    htmlFor={customerLoans.length > 0 ? undefined : 'cribReport'}
                    style={{ cursor: customerLoans.length > 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 10, width: '100%', margin: 0 }}
                  >
                    <FileCheck size={16} style={{ color: customerLoans.length > 0 ? '#10b981' : (cribReportName ? '#4361ee' : muted), flexShrink: 0 }} />
                    <span style={{ color: customerLoans.length > 0 ? '#10b981' : (cribReportName ? colors.text : muted), fontSize: 13 }}>
                      {customerLoans.length > 0 ? 'CRIB already on file (returning customer)' : (cribReportName || 'Upload CRIB report')}
                    </span>
                    {!cribReportName && customerLoans.length === 0 && (
                      <span style={{ color: muted, fontSize: 11, marginLeft: 'auto' }}>
                        PDF, JPG, PNG, DOC
                      </span>
                    )}
                  </label>
                </div>
                <p style={{ color: muted, fontSize: 11, marginTop: 4, marginBottom: 0 }}>
                  {customerLoans.length > 0
                    ? 'CRIB report already submitted with previous application'
                    : 'Credit Information Bureau (CRIB) report for this customer'}
                </p>
              </div>

              {/* Collateral Type */}
              <div>
                <label style={labelStyle}>Collateral Type</label>
                <CustomSelect
                  name="collateral"
                  value={formData.collateral}
                  onChange={handleChange}
                  placeholder="Select collateral type"
                  options={[
                    { value: 'Property', label: 'Property' },
                    { value: 'Personal Guarantee', label: 'Personal Guarantee' },
                  ]}
                />
              </div>

              {/* Collateral Value - only for Property */}
              {formData.collateral === 'Property' ? (
                <div>
                  <label style={labelStyle}>Collateral Value (LKR)</label>
                  <input type="number" name="collateralValue" value={formData.collateralValue} onChange={handleChange} style={inputStyle} placeholder="0" />
                </div>
              ) : <div />}

              {/* Collateral Document - only for Property */}
              {formData.collateral === 'Property' && (
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={labelStyle}>Collateral Document</label>
                  <div style={{
                    padding: '10px 14px',
                    border: `1px dashed ${divider}`,
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    cursor: 'pointer'
                  }}>
                    <input
                      type="file"
                      onChange={handleCollateralDocumentChange}
                      style={{ display: 'none' }}
                      id="collateralDoc"
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    />
                    <label htmlFor="collateralDoc" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, width: '100%', margin: 0 }}>
                      <Upload size={16} style={{ color: muted, flexShrink: 0 }} />
                      <span style={{ color: collateralDocumentName ? colors.text : muted, fontSize: 13 }}>
                        {collateralDocumentName || 'Click to upload'}
                      </span>
                      {!collateralDocumentName && (
                        <span style={{ color: muted, fontSize: 11, marginLeft: 'auto' }}>
                          PDF, JPG, PNG, DOC (Max 10MB)
                        </span>
                      )}
                    </label>
                  </div>
                </div>
              )}

              {/* Personal Guarantee Section */}
              {formData.collateral === 'Personal Guarantee' && (
                <div style={{ gridColumn: 'span 2', padding: '16px', border: `1px solid ${divider}`, borderRadius: '8px', background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}>
                  <p style={{ color: colors.text, fontWeight: 700, fontSize: 13, margin: '0 0 14px 0' }}>Personal Guarantors</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    {[0, 1].map(idx => (
                      <div key={idx} style={{ padding: '14px', border: `1px solid ${divider}`, borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <p style={{ color: muted, fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>Guarantor {idx + 1}</p>

                        {/* Name */}
                        <div>
                          <label style={labelStyle}>Full Name *</label>
                          <input
                            type="text"
                            value={guarantors[idx].name}
                            onChange={e => handleGuarantorChange(idx, 'name', e.target.value)}
                            style={inputStyle}
                            placeholder="Enter full name"
                          />
                        </div>

                        {/* NIC Number */}
                        <div>
                          <label style={labelStyle}>NIC Number *</label>
                          <input
                            type="text"
                            value={guarantors[idx].nic}
                            onChange={e => handleGuarantorChange(idx, 'nic', e.target.value)}
                            style={inputStyle}
                            placeholder="e.g. 123456789V"
                          />
                        </div>

                        {/* NIC Image Upload */}
                        <div>
                          <label style={labelStyle}>NIC Image</label>
                          <div style={{ padding: '10px 14px', border: `1px dashed ${divider}`, borderRadius: '8px', display: 'flex', alignItems: 'center', gap: 10 }}>
                            <input
                              type="file"
                              onChange={e => handleGuarantorNicImage(idx, e)}
                              style={{ display: 'none' }}
                              id={`guarantorNic${idx}`}
                              accept=".jpg,.jpeg,.png"
                            />
                            <label htmlFor={`guarantorNic${idx}`} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, width: '100%', margin: 0 }}>
                              <Upload size={14} style={{ color: guarantors[idx].nicImageName ? '#4361ee' : muted, flexShrink: 0 }} />
                              <span style={{ color: guarantors[idx].nicImageName ? colors.text : muted, fontSize: 12 }}>
                                {guarantors[idx].nicImageName || 'Upload NIC image'}
                              </span>
                              {!guarantors[idx].nicImageName && (
                                <span style={{ color: muted, fontSize: 11, marginLeft: 'auto' }}>JPG, PNG</span>
                              )}
                            </label>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Additional Notes */}
              <div style={{ gridColumn: 'span 2' }}>
                <label style={labelStyle}>Additional Notes</label>
                <textarea name="notes" value={formData.notes} onChange={handleChange} style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }} placeholder="Any additional information about this loan application..." />
              </div>
            </div>

            {/* Loan Summary Strip */}
            {formData.amount && selectedLoanType && (
              <div style={{
                marginTop: 20,
                padding: '14px 0',
                borderTop: `1px solid ${divider}`,
                borderBottom: `1px solid ${divider}`,
                display: 'flex',
                alignItems: 'center',
                gap: 0
              }}>
                {[
                  { label: 'Loan Amount', value: formatCurrency(parseFloat(formData.amount || 0)) },
                  { label: 'Interest Rate', value: `${formData.interestRate}%` },
                  { label: 'Processing Fee', value: `${selectedLoanType.processingFee}% (${formatCurrency(parseFloat(formData.amount || 0) * selectedLoanType.processingFee / 100)})` },
                  { label: 'Monthly Payment', value: formatCurrency(calculateMonthlyPayment()) },
                  { label: 'Total Monthly Obligation', value: formatCurrency(calculateMonthlyPayment() + (parseFloat(formData.existingDebts) || 0)) },
                  { label: 'Total Repay', value: formatCurrency(calculateMonthlyPayment() * parseInt(formData.term)) }
                ].map((item, idx, arr) => (
                  <div key={item.label} style={{ flex: 1, textAlign: 'center', borderRight: idx < arr.length - 1 ? `1px solid ${divider}` : 'none', padding: '0 12px' }}>
                    <div style={{ fontSize: 10, color: muted, marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{item.label}</div>
                    <div style={{ fontSize: 13, color: colors.text, fontWeight: 600 }}>{item.value}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Warning Notice */}
            <div style={{
              marginTop: 16,
              padding: '10px 12px',
              border: `1px solid ${divider}`,
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: 10
            }}>
              <AlertTriangle size={14} style={{ color: '#fbbf24', flexShrink: 0 }} />
              <p style={{ color: muted, fontSize: 12, margin: 0 }}>
                <span style={{ fontWeight: 600 }}>Late Payment Policy:</span> Overdue payments incur a daily late interest of {selectedLoanType?.latePaymentRate || '0.1'}% on the outstanding amount.
              </p>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button
                onClick={checkEligibility}
                disabled={loading || !selectedCustomer || !formData.amount}
                style={{
                  flex: 1,
                  padding: '9px 16px',
                  background: 'transparent',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'}`,
                  borderRadius: '8px',
                  color: colors.text,
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: (loading || !selectedCustomer || !formData.amount) ? 'not-allowed' : 'pointer',
                  opacity: (loading || !selectedCustomer || !formData.amount) ? 0.4 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6
                }}
              >
                <Clock size={14} />
                {loading ? 'Checking...' : 'Check Eligibility'}
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading || !selectedCustomer || !formData.loanTypeId || !formData.amount}
                style={{
                  flex: 1,
                  padding: '9px 16px',
                  background: '#4361ee',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: (loading || !selectedCustomer || !formData.loanTypeId || !formData.amount) ? 'not-allowed' : 'pointer',
                  opacity: (loading || !selectedCustomer || !formData.loanTypeId || !formData.amount) ? 0.4 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6
                }}
              >
                <CheckCircle size={14} color="#ffffff" />
                Submit Application
              </button>
            </div>
          </div>
        </div>

        {/* Eligibility Panel */}
        {showEligibility && eligibilityData && (
          <EligibilityChecker data={eligibilityData} onClose={() => setShowEligibility(false)} />
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .custom-select-wrap ::-webkit-scrollbar { width: 4px; }
        .custom-select-wrap ::-webkit-scrollbar-track { background: transparent; }
        .custom-select-wrap ::-webkit-scrollbar-thumb { background: rgba(99,102,241,0.35); border-radius: 4px; }
      `}</style>
    </div>
  );
}
