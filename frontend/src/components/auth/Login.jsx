import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, ArrowRight, Shield, Briefcase, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { authAPI } from '../../services/api';
import { setAuthToken, setUser } from '../../services/auth';
import FloatingLines from '../backgrounds/FloatingLines';
import '../../styles/glassy.css';

export default function Login({ setIsAuthenticated, setUserRole }) {
  const [step, setStep] = useState('role'); // 'role' or 'credentials'
  const [selectedRole, setSelectedRole] = useState(null);
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const roles = [
    { 
      id: 'admin', 
      label: 'Administrator', 
      icon: Shield, 
      description: 'Full system access with approval rights',
      gradient: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
      color: '#06b6d4'
    },
    { 
      id: 'officer', 
      label: 'Loan Officer', 
      icon: Briefcase, 
      description: 'Process applications and manage customers',
      gradient: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
      color: '#8b5cf6'
    }
  ];

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    setStep('credentials');
    setCredentials({ email: '', password: '' });
    setError('');
  };

  const handleBack = () => {
    setStep('role');
    setSelectedRole(null);
    setCredentials({ email: '', password: '' });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!credentials.email || !credentials.password) {
      setError('Please enter both email and password');
      return;
    }

    setLoading(true);
    setError('');

    // Real API login
    try {
      const response = await authAPI.login(credentials);
      const actualRole = response.data.user.role;

      // Prevent admin accounts from logging in via the officer login page
      if (selectedRole === 'officer' && actualRole === 'admin') {
        setError('This account is an Administrator account. Please go back and select the Administrator login.');
        return;
      }

      // Prevent officer accounts from logging in via the admin login page
      if (selectedRole === 'admin' && actualRole === 'officer') {
        setError('This account is a Loan Officer account. Please go back and select the Loan Officer login.');
        return;
      }

      setAuthToken(response.data.token);
      setUser(response.data.user);
      localStorage.setItem('authToken', response.data.token);
      localStorage.setItem('userRole', actualRole);
      localStorage.setItem('userName', response.data.user.fullName);
      
      if (setIsAuthenticated) setIsAuthenticated(true);
      if (setUserRole) setUserRole(actualRole);
      
      navigate(actualRole === 'admin' ? '/admin' : '/officer');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const selectedRoleData = roles.find(r => r.id === selectedRole);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: '#0a0a0a'
    }}>
      {/* Left Side - FloatingLines Background */}
      <div style={{
        flex: 1,
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* FloatingLines WebGL Background */}
        <div style={{
          position: 'absolute',
          inset: 0,
          zIndex: 0
        }}>
          <FloatingLines 
            linesGradient={['#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef']}
            enabledWaves={['top', 'middle', 'bottom']}
            lineCount={[10, 15, 20]}
            lineDistance={[8, 6, 4]}
            bendRadius={5.0}
            bendStrength={-0.5}
            interactive={true}
            parallax={true}
            animationSpeed={0.8}
            mixBlendMode="normal"
          />
        </div>

        {/* Blue Gradient Overlay */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.85) 0%, rgba(59, 130, 246, 0.7) 50%, rgba(6, 182, 212, 0.8) 100%)',
          zIndex: 1
        }} />
        


        {/* Content */}
        <div style={{
          position: 'relative',
          zIndex: 3,
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            textAlign: 'center',
            padding: '40px',
            maxWidth: '500px'
          }}>
          {/* Logo */}
          <div style={{
            width: '100px',
            height: '100px',
            background: '#475569',
            
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 32px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <Shield size={48} color="white" />
          </div>
          
          <h1 style={{
            fontSize: '42px',
            fontWeight: '800',
            color: 'white',
            marginBottom: '16px',
            letterSpacing: '-1px'
          }}>
            SmartLoan
          </h1>
          <p style={{
            fontSize: '20px',
            color: 'rgba(255,255,255,0.9)',
            fontWeight: '500',
            marginBottom: '8px'
          }}>
            Business Loan Management System
          </p>
          <p style={{
            fontSize: '16px',
            color: 'rgba(255,255,255,0.6)',
            lineHeight: '1.6',
            maxWidth: '400px',
            margin: '0 auto'
          }}>
            Streamline your loan operations with AI-powered risk assessment and intelligent automation
          </p>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div style={{
        width: '500px',
        minWidth: '500px',
        background: '#0f0f0f',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px'
      }}>
        <div style={{
          width: '100%',
          maxWidth: '380px',
          animation: step === 'credentials' ? 'slideIn 0.3s ease' : 'fadeIn 0.3s ease'
        }}>
          {step === 'role' ? (
            // Step 1: Role Selection
            <>
              <div style={{ marginBottom: '40px' }}>
                <h2 style={{
                  fontSize: '28px',
                  fontWeight: '700',
                  color: 'white',
                  marginBottom: '8px'
                }}>
                  Welcome back
                </h2>
                <p style={{
                  fontSize: '15px',
                  color: 'rgba(255,255,255,0.5)'
                }}>
                  Select your role to continue
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {roles.map((role) => {
                  const Icon = role.icon;
                  return (
                    <button
                      key={role.id}
                      onClick={() => handleRoleSelect(role.id)}
                      style={{
                        width: '100%',
                        padding: '24px',
                        background: '#1e293b',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '20px',
                        transition: 'all 0.3s ease',
                        textAlign: 'left'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#334155';
                        e.currentTarget.style.borderColor = role.color;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#1e293b';
                        e.currentTarget.style.borderColor = '#334155';
                      }}
                    >
                      <div style={{
                        width: '56px',
                        height: '56px',
                        background: role.gradient,
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <Icon size={28} color="white" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{
                          fontSize: '17px',
                          fontWeight: '600',
                          color: 'white',
                          marginBottom: '4px'
                        }}>
                          {role.label}
                        </p>
                        <p style={{
                          fontSize: '13px',
                          color: 'rgba(255,255,255,0.5)'
                        }}>
                          {role.description}
                        </p>
                      </div>
                      <ArrowRight size={20} color="rgba(255,255,255,0.3)" />
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            // Step 2: Email & Password
            <>
              <button
                onClick={handleBack}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 0',
                  background: 'transparent',
                  border: 'none',
                  color: 'rgba(255,255,255,0.6)',
                  fontSize: '14px',
                  cursor: 'pointer',
                  marginBottom: '24px',
                  transition: 'color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'white'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}
              >
                <ArrowLeft size={18} />
                Back to role selection
              </button>

              <div style={{ marginBottom: '32px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  marginBottom: '24px'
                }}>
                  <div style={{
                    width: '52px',
                    height: '52px',
                    background: selectedRoleData?.gradient,
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {selectedRoleData && <selectedRoleData.icon size={26} color="white" />}
                  </div>
                  <div>
                    <h2 style={{
                      fontSize: '24px',
                      fontWeight: '700',
                      color: 'white',
                      marginBottom: '2px'
                    }}>
                      Sign in as {selectedRoleData?.label}
                    </h2>
                    <p style={{
                      fontSize: '14px',
                      color: 'rgba(255,255,255,0.5)'
                    }}>
                      Enter your credentials to continue
                    </p>
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div style={{
                  padding: '14px 16px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '6px',
                  color: '#f87171',
                  fontSize: '14px',
                  marginBottom: '24px',
                  animation: 'shake 0.5s ease'
                }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '10px',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: 'rgba(255,255,255,0.7)'
                  }}>
                    Email Address
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={18} style={{
                      position: 'absolute',
                      left: '16px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'rgba(255,255,255,0.4)'
                    }} />
                    <input
                      type="email"
                      value={credentials.email}
                      onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                      placeholder="you@example.com"
                      autoFocus
                      style={{
                        width: '100%',
                        padding: '16px 16px 16px 48px',
                        background: '#1e293b',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '6px',
                        color: 'white',
                        fontSize: '15px',
                        outline: 'none',
                        transition: 'all 0.2s'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = selectedRoleData?.color || '#6366f1';
                        e.target.style.background = '#334155';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#334155';
                        e.target.style.background = '#1e293b';
                      }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '28px' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '10px',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: 'rgba(255,255,255,0.7)'
                  }}>
                    Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={18} style={{
                      position: 'absolute',
                      left: '16px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'rgba(255,255,255,0.4)'
                    }} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={credentials.password}
                      onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                      placeholder="Enter your password"
                      style={{
                        width: '100%',
                        padding: '16px 48px 16px 48px',
                        background: '#1e293b',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '6px',
                        color: 'white',
                        fontSize: '15px',
                        outline: 'none',
                        transition: 'all 0.2s'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = selectedRoleData?.color || '#6366f1';
                        e.target.style.background = '#334155';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#334155';
                        e.target.style.background = '#1e293b';
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: '16px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px',
                        color: 'rgba(255,255,255,0.4)'
                      }}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '16px',
                    background: selectedRoleData?.gradient || 'linear-gradient(135deg, #6366f1 0%, #3b82f6 100%)',
                    border: 'none',
                    borderRadius: '6px',
                    color: 'white',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    opacity: loading ? 0.7 : 1,
                    transition: 'all 0.3s',
                    boxShadow: `0 4px 20px ${selectedRoleData?.color}40`
                  }}
                >
                  {loading ? (
                    <div style={{
                      width: '22px',
                      height: '22px',
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTopColor: 'white',
                      borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite'
                    }} />
                  ) : (
                    <>
                      Sign In
                      <ArrowRight size={20} />
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        input::placeholder {
          color: rgba(255,255,255,0.3);
        }
        @media (max-width: 900px) {
          .login-container > div:first-child {
            display: none;
          }
          .login-container > div:last-child {
            width: 100%;
            min-width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
