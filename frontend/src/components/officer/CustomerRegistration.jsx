import React, { useState, useRef, useEffect } from 'react';
import { User, Briefcase, FileText, Upload, CheckCircle, AlertCircle, ChevronRight, ChevronLeft, Save, UserPlus } from 'lucide-react';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

export default function CustomerRegistration() {
  const { isDark, colors } = useTheme();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [nicChecking, setNicChecking] = useState(false);
  const [error, setError] = useState('');

  const SL_PROVINCES = [
    'Western Province',
    'Central Province',
    'Southern Province',
    'Northern Province',
    'Eastern Province',
    'North Western Province',
    'North Central Province',
    'Uva Province',
    'Sabaragamuwa Province',
  ];

  const [formData, setFormData] = useState({
    // Personal Information
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    age: '',
    nationalId: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',

    // Employment Details
    employmentStatus: '',
    employer: '',
    jobTitle: '',
    monthlyIncome: '',
    yearsEmployed: '',
    workPhone: '',

    // Documents
    idDocument: null,
    proofOfIncome: null,
    proofOfAddress: null,
  });

  const [errors, setErrors] = useState({});
  const [openDropdown, setOpenDropdown] = useState(null); // tracks which dropdown is open

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (!e.target.closest('.custom-select-wrap')) setOpenDropdown(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Custom themed select component
  const CustomSelect = ({ name, value, onChange, options, placeholder, hasError }) => {
    const isOpen = openDropdown === name;
    const bg = isDark ? '#1e293b' : '#f8fafc';
    const border = hasError ? '#ef4444' : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)');
    const dropBg = isDark ? '#1e293b' : '#ffffff';
    const dropBorder = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
    const hoverBg = isDark ? 'rgba(67,97,238,0.15)' : 'rgba(67,97,238,0.08)';
    const selected = options.find(o => o.value === value);
    return (
      <div className="custom-select-wrap" style={{ position: 'relative' }}>
        <button
          type="button"
          onClick={() => setOpenDropdown(isOpen ? null : name)}
          style={{
            width: '100%', padding: '8px 32px 8px 11px',
            background: bg, border: `1px solid ${border}`,
            borderRadius: 8, color: selected ? colors.text : (isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.35)'),
            fontSize: 13, textAlign: 'left', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            outline: 'none', boxSizing: 'border-box'
          }}
        >
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {selected ? selected.label : placeholder}
          </span>
          <span style={{
            position: 'absolute', right: 10, top: '50%', transform: isOpen ? 'translateY(-50%) rotate(180deg)' : 'translateY(-50%)',
            transition: 'transform 0.2s', fontSize: 10, color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)', pointerEvents: 'none'
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
              const isSelected = value === opt.value;
              return (
                <div
                  key={opt.value + i}
                  onMouseDown={() => { onChange({ target: { name, value: opt.value } }); setOpenDropdown(null); }}
                  style={{
                    padding: '9px 12px', fontSize: 13, cursor: 'pointer',
                    color: opt.value === '' ? (isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.35)') : (isSelected ? '#4361ee' : colors.text),
                    background: isSelected ? (isDark ? 'rgba(67,97,238,0.18)' : 'rgba(67,97,238,0.08)') : 'transparent',
                    fontWeight: isSelected ? 600 : 400,
                    borderBottom: i < options.length ? `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}` : 'none',
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = hoverBg; }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = isSelected ? (isDark ? 'rgba(67,97,238,0.18)' : 'rgba(67,97,238,0.08)') : 'transparent'; }}
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

  // Calculate age from date string (YYYY-MM-DD)
  const calculateAge = (dob) => {
    if (!dob) return '';
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age > 0 ? age : '';
  };

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (files) {
      setFormData(prev => ({ ...prev, [name]: files[0] }));
    } else {
      // If dateOfBirth changes, autofill age
      if (name === 'dateOfBirth') {
        setFormData(prev => ({ ...prev, dateOfBirth: value, age: calculateAge(value) }));
      } else if (name === 'nationalId') {
        // Real-time NIC validation
        let nicError = '';
        if (value.length > 0 && !/^[0-9VXvx]*$/.test(value)) {
          nicError = 'NIC can only contain digits and the letters V or X';
        } else if (value.length > 10 && /[VXvx]/.test(value)) {
          nicError = 'Old NIC format: 9 digits + V or X only (e.g. 991234567V)';
        } else if (value.length > 12) {
          nicError = 'NIC cannot exceed 12 characters';
        } else if (value.length === 10 && !/^\d{9}[VXvx]$/.test(value)) {
          nicError = 'Old NIC: must be exactly 9 digits followed by V or X';
        } else if (value.length === 12 && !/^\d{12}$/.test(value)) {
          nicError = 'New NIC: must be exactly 12 digits';
        }
        setErrors(prev => ({ ...prev, nationalId: nicError }));
        setFormData(prev => ({ ...prev, nationalId: value }));

        // Check for duplicate NIC once the format is valid and complete
        const isComplete = /^\d{9}[VXvx]$/.test(value) || /^\d{12}$/.test(value);
        if (isComplete && !nicError) {
          setNicChecking(true);
          api.get('/customers/check-duplicate', { params: { nic: value } })
            .then(res => {
              if (res.data.exists) {
                setErrors(prev => ({ ...prev, nationalId: 'A customer with this NIC is already registered' }));
              }
            })
            .catch(() => {}) // silently ignore network errors during real-time check
            .finally(() => setNicChecking(false));
        }
        return;
      } else {
        setFormData(prev => ({ ...prev, [name]: value }));
      }
    }
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateStep = (stepNum) => {
    const newErrors = {};

    if (stepNum === 1) {
      if (!formData.firstName) newErrors.firstName = 'First name is required';
      if (!formData.lastName) newErrors.lastName = 'Last name is required';
      if (!formData.email) newErrors.email = 'Email is required';
      else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Invalid email format';
      if (!formData.phone) newErrors.phone = 'Phone number is required';
      else if (!/^(\+94|0)(7[0-9]{8}|[1-9][0-9]{7,8})$/.test(formData.phone.replace(/\s/g, '')))
        newErrors.phone = 'Enter a valid Sri Lankan mobile number (e.g. 0771234567 or +94771234567)';
      if (!formData.dateOfBirth) newErrors.dateOfBirth = 'Date of birth is required';
      if (!formData.gender) newErrors.gender = 'Gender is required';
      if (!formData.nationalId) newErrors.nationalId = 'National ID is required';
      else if (!/^\d{9}[VXvx]$/.test(formData.nationalId) && !/^\d{12}$/.test(formData.nationalId))
        newErrors.nationalId = 'Invalid NIC. Use old format (9 digits + V/X) or new format (12 digits)';
      if (!formData.address) newErrors.address = 'Street address is required';
      if (!formData.city) newErrors.city = 'City is required';
    } else if (stepNum === 2) {
      if (!formData.employmentStatus) newErrors.employmentStatus = 'Employment status is required';
      if (formData.employmentStatus === 'employed' || formData.employmentStatus === 'self-employed' || formData.employmentStatus === 'business-owner') {
        if (!formData.employer) newErrors.employer = 'Employer / Business name is required';
        if (!formData.monthlyIncome) newErrors.monthlyIncome = 'Monthly income is required';
        else if (isNaN(Number(formData.monthlyIncome)) || Number(formData.monthlyIncome) <= 0)
          newErrors.monthlyIncome = 'Enter a valid monthly income';
      }
    }

    setErrors(prev => ({ ...prev, ...newErrors }));
    // Also factor in any pre-existing errors (e.g. duplicate NIC set by real-time check)
    const mergedErrors = { ...errors, ...newErrors };
    return Object.keys(newErrors).length === 0 && !mergedErrors.nationalId;
  };

  const nextStep = () => {
    if (validateStep(step)) {
      setStep(step + 1);
    }
  };

  const prevStep = () => {
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep(step)) return;

    setLoading(true);
    setError('');

    try {
      // First, upload documents if any
      let uploadedFiles = {};

      if (formData.idDocument || formData.proofOfIncome || formData.proofOfAddress) {
        const formDataUpload = new FormData();

        if (formData.idDocument) {
          formDataUpload.append('idDocument', formData.idDocument);
        }
        if (formData.proofOfIncome) {
          formDataUpload.append('proofOfIncome', formData.proofOfIncome);
        }
        if (formData.proofOfAddress) {
          formDataUpload.append('proofOfAddress', formData.proofOfAddress);
        }

        try {
          const uploadResponse = await api.post('/upload/documents', formDataUpload, {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          });
          uploadedFiles = uploadResponse.data.files || {};
          console.log('Files uploaded:', uploadedFiles);
        } catch (uploadErr) {
          console.error('File upload error:', uploadErr);
          // Continue with registration even if upload fails
        }
      }

      // Map form fields to Prisma Customer model
      const customerData = {
        fullName: `${formData.firstName} ${formData.lastName}`,
        nic: formData.nationalId,
        email: formData.email,
        phone: formData.phone,
        gender: formData.gender || null,
        age: formData.age || null,
        address: formData.address || null,
        city: formData.city || null,
        state: formData.state || null,
        zipCode: formData.zipCode || null,
        occupation: formData.jobTitle || formData.employmentStatus || null,
        employer: formData.employer || null,
        monthlyIncome: formData.monthlyIncome ? parseFloat(formData.monthlyIncome) : null,
        dateOfBirth: formData.dateOfBirth || null,
        kycDocuments: JSON.stringify({
          employmentStatus: formData.employmentStatus,
          yearsEmployed: formData.yearsEmployed,
          workPhone: formData.workPhone,
          documents: {
            idDocument: uploadedFiles.idDocument || null,
            proofOfIncome: uploadedFiles.proofOfIncome || null,
            proofOfAddress: uploadedFiles.proofOfAddress || null
          }
        })
      };

      const response = await api.post('/customers', customerData);
      console.log('Customer registered:', response.data);
      setSuccess(true);
    } catch (err) {
      console.error('Error registering customer:', err);
      setError(err.response?.data?.message || 'Failed to register customer. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const card = { background: isDark ? '#0f172a' : '#ffffff', border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'}`, borderRadius: '8px' };
  const muted = isDark ? 'rgba(255,255,255,0.38)' : 'rgba(0,0,0,0.4)';
  const divider = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const inputStyle = { width: '100%', padding: '8px 11px', background: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc', border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`, borderRadius: '8px', color: colors.text, fontSize: '13px', outline: 'none', boxSizing: 'border-box' };
  const labelStyle = { display: 'block', marginBottom: 5, color: muted, fontSize: 12, fontWeight: 600 };
  const errorStyle = { color: '#ef4444', fontSize: 11, marginTop: 3 };

  if (success) {
    return (
      <div style={{ animation: 'fadeIn 0.3s ease', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ ...card, padding: '40px', textAlign: 'center', maxWidth: '420px', width: '100%' }}>
          <div style={{
            width: '52px',
            height: '52px',
            background: '#10b981',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px'
          }}>
            <CheckCircle size={24} color="#fff" />
          </div>
          <h2 style={{ color: colors.text, fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
            Registration Successful
          </h2>
          <p style={{ color: muted, fontSize: 13, marginBottom: 28, lineHeight: 1.5 }}>
            Customer has been successfully registered in the system.
          </p>
          <button
            onClick={() => { setSuccess(false); setStep(1); setFormData({
              firstName: '', lastName: '', email: '', phone: '', dateOfBirth: '', gender: '', age: '', nationalId: '',
              address: '', city: '', state: '', zipCode: '', employmentStatus: '', employer: '',
              jobTitle: '', monthlyIncome: '', yearsEmployed: '', workPhone: '',
              idDocument: null, proofOfIncome: null, proofOfAddress: null
            }); }}
            style={{
              padding: '9px 24px',
              background: '#4361ee',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer'
            }}
          >
            Register Another Customer
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

  const steps = [
    { num: 1, label: 'Personal Info' },
    { num: 2, label: 'Employment' },
    { num: 3, label: 'Documents' }
  ];

  return (
    <div style={{ animation: 'fadeIn 0.3s ease', padding: '24px 28px' }}>
      {/* Header */}
      <div style={{ marginBottom: 28, display: 'flex', alignItems: 'center', gap: 14 }}>
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
          <UserPlus size={20} color="#fff" />
        </div>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: colors.text, margin: 0 }}>
            Customer Registration
          </h1>
          <p style={{ color: muted, fontSize: 13, margin: 0, marginTop: 2 }}>
            Complete KYC verification for new customer onboarding
          </p>
        </div>
      </div>

      {/* Progress Steps */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 28 }}>
        {steps.map((s, idx) => {
          const isActive = step === s.num;
          const isComplete = step > s.num;
          return (
            <React.Fragment key={s.num}>
              <div
                style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: isComplete ? 'pointer' : 'default' }}
                onClick={() => isComplete && setStep(s.num)}
              >
                <div style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: isComplete ? '#10b981' : isActive ? '#4361ee' : (isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'),
                  color: isComplete || isActive ? '#fff' : muted,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  fontWeight: 700,
                  flexShrink: 0
                }}>
                  {isComplete ? <CheckCircle size={13} /> : s.num}
                </div>
                <span style={{ fontSize: 13, fontWeight: isActive ? 600 : 400, color: isActive || isComplete ? colors.text : muted, whiteSpace: 'nowrap' }}>
                  {s.label}
                </span>
              </div>
              {idx < 2 && (
                <div style={{ flex: 1, height: 2, background: step > s.num ? '#10b981' : divider, margin: '0 14px', borderRadius: 1 }} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Form Card */}
      <div style={{ ...card, padding: 24 }}>
        {error && (
          <div style={{
            padding: '10px 14px',
            background: 'rgba(239,68,68,0.06)',
            border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 8,
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 10
          }}>
            <AlertCircle size={16} color="#ef4444" style={{ flexShrink: 0 }} />
            <span style={{ color: '#ef4444', fontSize: 13 }}>{error}</span>
          </div>
        )}

        {/* Step 1: Personal Information */}
        {step === 1 && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            <h2 style={{ color: colors.text, fontSize: 16, fontWeight: 600, marginBottom: 20, marginTop: 0 }}>
              Personal Information
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={labelStyle}>First Name *</label>
                <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} style={{ ...inputStyle, ...(errors.firstName && { borderColor: '#ef4444' }) }} placeholder="Kasun" />
                {errors.firstName && <p style={errorStyle}>{errors.firstName}</p>}
              </div>
              <div>
                <label style={labelStyle}>Last Name *</label>
                <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} style={inputStyle} placeholder="Perera" />
                {errors.lastName && <p style={errorStyle}>{errors.lastName}</p>}
              </div>
              <div>
                <label style={labelStyle}>Email Address *</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} style={inputStyle} placeholder="kasun.perera@gmail.com" />
                {errors.email && <p style={errorStyle}>{errors.email}</p>}
              </div>
              <div>
                <label style={labelStyle}>Phone Number *</label>
                <input type="tel" name="phone" value={formData.phone} onChange={handleChange} style={{ ...inputStyle, ...(errors.phone && { borderColor: '#ef4444' }) }} placeholder="+94 77 123 4567" />
                {errors.phone && <p style={errorStyle}>{errors.phone}</p>}
              </div>
              <div>
                <label style={labelStyle}>Date of Birth *</label>
                <input type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} style={inputStyle} />
                {errors.dateOfBirth && <p style={errorStyle}>{errors.dateOfBirth}</p>}
              </div>
              <div>
                <label style={labelStyle}>Gender *</label>
                <CustomSelect
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  placeholder="Select gender..."
                  hasError={!!errors.gender}
                  options={[
                    { value: 'male', label: 'Male' },
                    { value: 'female', label: 'Female' },
                    { value: 'other', label: 'Other' },
                  ]}
                />
                {errors.gender && <p style={errorStyle}>{errors.gender}</p>}
              </div>
              <div>
                <label style={labelStyle}>Age</label>
                <input type="number" name="age" value={formData.age} onChange={handleChange} style={inputStyle} placeholder="25" />
              </div>
              <div>
                <label style={labelStyle}>National Identity Card (NIC) *</label>
                <input
                  type="text"
                  name="nationalId"
                  value={formData.nationalId}
                  onChange={handleChange}
                  maxLength={12}
                  style={{ ...inputStyle, ...(errors.nationalId && { borderColor: '#ef4444' }) }}
                  placeholder="200012345678 or 991234567V"
                />
                {errors.nationalId
                  ? <p style={errorStyle}>{errors.nationalId}</p>
                  : nicChecking
                    ? <p style={{ ...errorStyle, color: '#f59e0b', marginTop: 3 }}>Checking NIC...</p>
                    : <p style={{ ...errorStyle, color: muted, marginTop: 3 }}>
                        Old: 9 digits + V/X &nbsp;&bull;&nbsp; New: 12 digits &nbsp;({formData.nationalId.length}/12)
                      </p>
                }
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={labelStyle}>Street Address *</label>
                <input type="text" name="address" value={formData.address} onChange={handleChange} style={{ ...inputStyle, ...(errors.address && { borderColor: '#ef4444' }) }} placeholder="No. 45, Galle Road, Colombo 03" />
                {errors.address && <p style={errorStyle}>{errors.address}</p>}
              </div>
              <div>
                <label style={labelStyle}>City *</label>
                <input type="text" name="city" value={formData.city} onChange={handleChange} style={{ ...inputStyle, ...(errors.city && { borderColor: '#ef4444' }) }} placeholder="Colombo" />
                {errors.city && <p style={errorStyle}>{errors.city}</p>}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={labelStyle}>Province</label>
                  <CustomSelect
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    placeholder="Select province..."
                    options={SL_PROVINCES.map(p => ({ value: p, label: p }))}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Postal Code</label>
                  <input type="text" name="zipCode" value={formData.zipCode} onChange={handleChange} style={inputStyle} placeholder="00300" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Employment Details */}
        {step === 2 && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            <h2 style={{ color: colors.text, fontSize: 16, fontWeight: 600, marginBottom: 20, marginTop: 0 }}>
              Employment Details
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={labelStyle}>Employment Status *</label>
                <CustomSelect
                  name="employmentStatus"
                  value={formData.employmentStatus}
                  onChange={handleChange}
                  placeholder="Select status..."
                  hasError={!!errors.employmentStatus}
                  options={[
                    { value: 'employed', label: 'Employed' },
                    { value: 'self-employed', label: 'Self-Employed' },
                    { value: 'business-owner', label: 'Business Owner' },
                    { value: 'retired', label: 'Retired' },
                    { value: 'unemployed', label: 'Unemployed' },
                  ]}
                />
                {errors.employmentStatus && <p style={errorStyle}>{errors.employmentStatus}</p>}
              </div>
              <div>
                <label style={labelStyle}>Employer / Business Name {(formData.employmentStatus === 'employed' || formData.employmentStatus === 'self-employed' || formData.employmentStatus === 'business-owner') && '*'}</label>
                <input type="text" name="employer" value={formData.employer} onChange={handleChange} style={{ ...inputStyle, ...(errors.employer && { borderColor: '#ef4444' }) }} placeholder="Ceylon Petroleum Corporation" />
                {errors.employer && <p style={errorStyle}>{errors.employer}</p>}
              </div>
              <div>
                <label style={labelStyle}>Job Title / Position</label>
                <input type="text" name="jobTitle" value={formData.jobTitle} onChange={handleChange} style={inputStyle} placeholder="Senior Software Engineer" />
              </div>
              <div>
                <label style={labelStyle}>Monthly Income (LKR) {(formData.employmentStatus === 'employed' || formData.employmentStatus === 'self-employed' || formData.employmentStatus === 'business-owner') && '*'}</label>
                <input type="number" name="monthlyIncome" value={formData.monthlyIncome} onChange={handleChange} style={{ ...inputStyle, ...(errors.monthlyIncome && { borderColor: '#ef4444' }) }} placeholder="85000" />
                {errors.monthlyIncome && <p style={errorStyle}>{errors.monthlyIncome}</p>}
              </div>
              <div>
                <label style={labelStyle}>Years at Current Employment</label>
                <input type="number" name="yearsEmployed" value={formData.yearsEmployed} onChange={handleChange} style={inputStyle} placeholder="3" />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={labelStyle}>Work Phone</label>
                <input type="tel" name="workPhone" value={formData.workPhone} onChange={handleChange} style={inputStyle} placeholder="+94 11 234 5678" />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Documents */}
        {step === 3 && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            <h2 style={{ color: colors.text, fontSize: 16, fontWeight: 600, marginBottom: 4, marginTop: 0 }}>
              KYC Documents
            </h2>
            <p style={{ color: muted, fontSize: 12, marginBottom: 20, marginTop: 0 }}>
              Upload required documents for identity verification. Accepted formats: PDF, JPG, PNG (max 5MB)
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {[
                { name: 'idDocument', label: 'National Identity Card (NIC) / Passport', desc: 'Clear photo of your NIC (front & back) or valid passport' },
                { name: 'proofOfIncome', label: 'Proof of Income', desc: 'Recent salary slip, EPF/ETF statement, or last 3 months bank statements' },
                { name: 'proofOfAddress', label: 'Proof of Address', desc: 'Electricity / water / telephone bill or Grama Sevaka certificate (within last 3 months)' }
              ].map((doc, idx, arr) => (
                <div
                  key={doc.name}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    padding: '14px 0',
                    borderBottom: idx < arr.length - 1 ? `1px solid ${divider}` : 'none'
                  }}
                >
                  <input type="file" id={doc.name} name={doc.name} onChange={handleChange} accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }} />
                  <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: formData[doc.name] ? 'rgba(16,185,129,0.1)' : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <FileText size={16} color={formData[doc.name] ? '#10b981' : muted} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: colors.text, fontWeight: 500, fontSize: 13, margin: 0 }}>
                      {doc.label}
                    </p>
                    <p style={{ color: muted, fontSize: 11, margin: 0, marginTop: 2 }}>
                      {doc.desc}
                    </p>
                  </div>
                  {formData[doc.name] ? (
                    <span style={{ color: '#10b981', fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', flexShrink: 0 }}>
                      Uploaded &#10003;
                    </span>
                  ) : (
                    <button
                      onClick={() => document.getElementById(doc.name).click()}
                      style={{
                        padding: '5px 14px',
                        background: 'transparent',
                        border: `1px solid ${divider}`,
                        borderRadius: 6,
                        color: colors.text,
                        fontSize: 12,
                        fontWeight: 500,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        flexShrink: 0
                      }}
                    >
                      Upload
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 28, paddingTop: 20, borderTop: `1px solid ${divider}` }}>
          {step > 1 ? (
            <button
              onClick={prevStep}
              style={{
                padding: '9px 20px',
                background: 'transparent',
                border: `1px solid ${divider}`,
                borderRadius: 8,
                color: colors.text,
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <ChevronLeft size={15} />
              Previous
            </button>
          ) : <div />}

          {step < 3 ? (
            <button
              onClick={nextStep}
              disabled={nicChecking}
              style={{
                padding: '9px 20px',
                background: nicChecking ? '#6b7280' : '#4361ee',
                border: 'none',
                borderRadius: 8,
                color: '#fff',
                fontWeight: 600,
                fontSize: 13,
                cursor: nicChecking ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              {nicChecking ? 'Checking NIC...' : 'Next Step'}
              {!nicChecking && <ChevronRight size={15} />}
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{
                padding: '9px 24px',
                background: loading ? 'rgba(16,185,129,0.4)' : '#10b981',
                border: 'none',
                borderRadius: 8,
                color: '#fff',
                fontWeight: 600,
                fontSize: 13,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <Save size={15} />
              {loading ? 'Registering...' : 'Complete Registration'}
            </button>
          )}
        </div>
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
