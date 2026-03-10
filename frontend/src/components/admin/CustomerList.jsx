import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Users, Search, Plus, Eye, Edit2, Trash2, RefreshCw,
  Mail, Phone, MapPin, Briefcase, Download, FileText,
  UserPlus, X, Shield, Building, Calendar, CreditCard
} from 'lucide-react';
import api from '../../services/api';
import jsPDF from 'jspdf';
import { useTheme } from '../../context/ThemeContext';

const STATUS_STYLE = {
  active:   { bg: 'rgba(16,185,129,0.1)',  color: '#059669' },
  inactive: { bg: 'rgba(239,68,68,0.1)',   color: '#dc2626' },
};

export default function CustomerList({ onAddNew }) {
  const { isDark, colors } = useTheme();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [viewingDocument, setViewingDocument] = useState(null);
  const [customerLoans, setCustomerLoans] = useState([]);
  const [loadingLoans, setLoadingLoans] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [editLoading, setEditLoading] = useState(false);
  const [detailTab, setDetailTab] = useState('documents');

  const fetchCustomers = async () => {
    setLoading(true); setError('');
    try {
      const res = await api.get('/customers');
      setCustomers(res.data);
    } catch (err) {
      console.error('Error fetching customers:', err);
      setError('Failed to load customers. Please try again.');
    } finally { setLoading(false); }
  };

  const fetchCustomerLoans = async (customerId) => {
    setLoadingLoans(true);
    try {
      const res = await api.get(`/loans?customerId=${customerId}`);
      setCustomerLoans(res.data || []);
    } catch (err) {
      console.error('Error fetching customer loans:', err);
      setCustomerLoans([]);
    } finally { setLoadingLoans(false); }
  };

  useEffect(() => { fetchCustomers(); }, []);

  useEffect(() => {
    if (selectedCustomer) { fetchCustomerLoans(selectedCustomer.id); setDetailTab('documents'); }
    else setCustomerLoans([]);
  }, [selectedCustomer]);

  useEffect(() => {
    const open = selectedCustomer || viewingDocument || editingCustomer;
    if (open) { document.body.style.overflow = 'hidden'; document.documentElement.style.overflow = 'hidden'; }
    else { document.body.style.overflow = ''; document.documentElement.style.overflow = ''; }
    return () => { document.body.style.overflow = ''; document.documentElement.style.overflow = ''; };
  }, [selectedCustomer, viewingDocument, editingCustomer]);

  const filteredCustomers = customers.filter(c =>
    c.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.nic?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.customerId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone?.includes(searchTerm)
  );

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this customer?')) return;
    try { await api.delete(`/customers/${id}`); setCustomers(customers.filter(c => c.id !== id)); }
    catch (err) { console.error('Error deleting customer:', err); alert('Failed to delete customer'); }
  };

  const handleEditClick = (customer) => {
    setEditingCustomer(customer);
    setEditFormData({
      fullName: customer.fullName || '', email: customer.email || '',
      phone: customer.phone || '', gender: customer.gender || '',
      age: customer.age || '', address: customer.address || '',
      city: customer.city || '', employer: customer.employer || '',
      monthlyIncome: customer.monthlyIncome || '', occupation: customer.occupation || '',
    });
  };

  const handleEditSubmit = async () => {
    if (!editingCustomer) return;
    setEditLoading(true);
    try {
      const res = await api.put(`/customers/${editingCustomer.id}`, editFormData);
      setCustomers(customers.map(c => c.id === editingCustomer.id ? res.data : c));
      setEditingCustomer(null);
      alert('Customer updated successfully');
    } catch (err) { console.error('Error updating customer:', err); alert('Failed to update customer'); }
    finally { setEditLoading(false); }
  };

  const exportCustomerPDF = () => {
    if (!selectedCustomer) return;
    const doc = new jsPDF();
    const pw = doc.internal.pageSize.getWidth();
    doc.setFillColor(67, 97, 238);
    doc.rect(0, 0, pw, 38, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20); doc.setFont('helvetica', 'bold');
    doc.text('SmartLoan BLMS', 18, 22);
    doc.setFontSize(11); doc.setFont('helvetica', 'normal');
    doc.text('Customer Report', 18, 32);
    doc.setFontSize(9); doc.setTextColor(180, 180, 180);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, pw - 18, 32, { align: 'right' });
    let y = 52;
    doc.setTextColor(30, 30, 30); doc.setFontSize(13); doc.setFont('helvetica', 'bold');
    doc.text('Customer Information', 18, y); y += 5;
    doc.setDrawColor(220, 220, 220); doc.setLineWidth(0.4); doc.line(18, y, pw - 18, y); y += 8;
    doc.setFontSize(11); doc.setFont('helvetica', 'normal');
    [
      ['Customer ID', selectedCustomer.customerId || `CUS-${selectedCustomer.id}`],
      ['Full Name', selectedCustomer.fullName], ['NIC', selectedCustomer.nic],
      ['Email', selectedCustomer.email], ['Phone', selectedCustomer.phone || 'N/A'],
      ['Address', selectedCustomer.address || 'N/A'], ['City', selectedCustomer.city || 'N/A'],
      ['Employer', selectedCustomer.employer || selectedCustomer.occupation || 'N/A'],
      ['Monthly Income', `Rs. ${(selectedCustomer.monthlyIncome || 0).toLocaleString()}`],
      ['Status', selectedCustomer.status || 'active'],
      ['Registered', new Date(selectedCustomer.createdAt).toLocaleDateString()],
    ].forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold'); doc.text(`${label}:`, 18, y);
      doc.setFont('helvetica', 'normal'); doc.text(String(value), 62, y); y += 8;
    });
    y += 8;
    doc.setFontSize(13); doc.setFont('helvetica', 'bold');
    doc.text('Loan Summary', 18, y); y += 5;
    doc.line(18, y, pw - 18, y); y += 8;
    if (customerLoans.length === 0) {
      doc.setFontSize(11); doc.setFont('helvetica', 'normal'); doc.text('No loans found.', 18, y);
    } else {
      doc.setFontSize(11); doc.setFont('helvetica', 'normal');
      doc.text(`Total Loans: ${customerLoans.length}`, 18, y); y += 7;
      doc.text(`Total Amount: Rs. ${customerLoans.reduce((s, l) => s + (l.amount || 0), 0).toLocaleString()}`, 18, y); y += 12;
      doc.setFillColor(240, 240, 240); doc.rect(18, y, pw - 36, 8, 'F');
      doc.setFontSize(9); doc.setFont('helvetica', 'bold');
      doc.text('Loan ID', 20, y + 5.5); doc.text('Amount', 55, y + 5.5);
      doc.text('Term', 90, y + 5.5); doc.text('Status', 115, y + 5.5);
      doc.text('Date', 145, y + 5.5); y += 10;
      doc.setFont('helvetica', 'normal');
      customerLoans.forEach((l, i) => {
        if (y > 270) { doc.addPage(); y = 20; }
        if (i % 2 === 0) { doc.setFillColor(250, 250, 250); doc.rect(18, y - 3, pw - 36, 8, 'F'); }
        doc.text(`LN-${l.id}`, 20, y + 2);
        doc.text(`Rs. ${(l.amount || 0).toLocaleString()}`, 55, y + 2);
        doc.text(`${l.term} mo`, 90, y + 2);
        doc.text(l.status || '', 115, y + 2);
        doc.text(new Date(l.createdAt).toLocaleDateString(), 145, y + 2);
        y += 8;
      });
    }
    const pages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i); doc.setFontSize(8); doc.setTextColor(180, 180, 180);
      doc.text(`SmartLoan BLMS  ·  Page ${i} of ${pages}`, pw / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
    }
    doc.save(`customer-${selectedCustomer.customerId || selectedCustomer.id}-report.pdf`);
  };

  const fmtDate = (d) => {
    if (!d) return '\u2014';
    return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };
  const fmtCurrency = (a) => {
    if (!a) return '\u2014';
    return new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(a).replace('LKR', 'Rs.');
  };

  const parseDocs = (c) => {
    try { if (!c.kycDocuments) return {}; return typeof c.kycDocuments === 'string' ? JSON.parse(c.kycDocuments) : c.kycDocuments; }
    catch { return {}; }
  };

  const card = { background: isDark ? '#0f172a' : '#ffffff', border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'}`, borderRadius: '8px' };
  const muted = isDark ? 'rgba(255,255,255,0.38)' : 'rgba(0,0,0,0.4)';
  const divider = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const inputBase = { padding: '8px 11px', background: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc', border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`, borderRadius: '8px', color: colors.text, fontSize: '13px', outline: 'none' };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: 10 }}>
      <div style={{ width: 20, height: 20, border: '2.5px solid rgba(67,97,238,0.2)', borderTopColor: '#4361ee', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <span style={{ color: muted, fontSize: 14 }}>Loading customers...</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const newThisWeek = customers.filter(c => { const d = Math.ceil((Date.now() - new Date(c.createdAt)) / 86400000); return d <= 7; }).length;

  return (
    <div style={{ padding: '24px 28px', animation: 'fadeIn 0.3s ease' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, background: '#4361ee', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(67,97,238,0.3)' }}>
            <Users size={20} color="#ffffff" />
          </div>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: colors.text, margin: 0 }}>All Customers</h1>
            <p style={{ fontSize: 13, color: muted, margin: '3px 0 0' }}>{customers.length} registered customer{customers.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={fetchCustomers} style={{ padding: '8px 14px', background: 'transparent', border: `1px solid ${divider}`, borderRadius: 8, color: colors.text, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
            onMouseEnter={e => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <RefreshCw size={14} /> Refresh
          </button>
          {onAddNew && (
            <button onClick={onAddNew} style={{ padding: '8px 16px', background: '#4361ee', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600 }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              <Plus size={14} /> New Customer
            </button>
          )}
        </div>
      </div>

      {error && (
        <div style={{ padding: 12, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, marginBottom: 16, color: '#ef4444', fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 18 }}>
        {[
          { label: 'Total',     value: customers.length,                                           accent: '#4361ee', Icon: Users },
          { label: 'Active',    value: customers.filter(c => c.status === 'active').length,        accent: '#10b981', Icon: UserPlus },
          { label: 'With Loans', value: customers.filter(c => c.loans && c.loans.length > 0).length, accent: '#8b5cf6', Icon: Briefcase },
          { label: 'New This Week', value: newThisWeek,                                            accent: '#f59e0b', Icon: UserPlus },
        ].map(({ label, value, accent, Icon }) => (
          <div key={label} style={{ ...card, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: accent + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={16} color={accent} />
            </div>
            <div>
              <p style={{ fontSize: 20, fontWeight: 700, color: colors.text, margin: 0, lineHeight: 1 }}>{value}</p>
              <p style={{ fontSize: 11, color: muted, margin: '3px 0 0' }}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ ...card, padding: '10px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
        <Search size={14} color={muted} />
        <input
          type="text" placeholder="Search by name, email, NIC, or phone..."
          value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
          style={{ flex: 1, background: 'transparent', border: 'none', color: colors.text, fontSize: 13, outline: 'none' }}
        />
        <span style={{ fontSize: 12, color: muted, flexShrink: 0 }}>{filteredCustomers.length} result{filteredCustomers.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      <div style={{ ...card, overflow: 'hidden' }}>
        {filteredCustomers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 20px' }}>
            <Users size={36} color={isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'} style={{ marginBottom: 12 }} />
            <p style={{ color: muted, fontSize: 14, margin: 0 }}>{searchTerm ? 'No customers found matching your search' : 'No customers registered yet'}</p>
            {onAddNew && !searchTerm && (
              <button onClick={onAddNew} style={{ marginTop: 14, padding: '7px 18px', background: 'transparent', border: `1px solid rgba(67,97,238,0.3)`, borderRadius: 8, color: '#4361ee', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
                Register First Customer
              </button>
            )}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${divider}` }}>
                {[
                  { label: 'Customer', align: 'left' },
                  { label: 'Contact', align: 'left' },
                  { label: 'Employment', align: 'left' },
                  { label: 'Income', align: 'right' },
                  { label: 'Status', align: 'center' },
                  { label: 'Registered', align: 'center' },
                  { label: '', align: 'center' },
                ].map((h, i) => (
                  <th key={i} style={{ padding: '11px 16px', textAlign: h.align, fontSize: 10.5, fontWeight: 600, color: muted, letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                    {h.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map(customer => {
                const initials = (customer.fullName || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
                const ss = STATUS_STYLE[customer.status] || STATUS_STYLE.active;
                return (
                  <tr
                    key={customer.id}
                    style={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'}`, transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.025)' : 'rgba(67,97,238,0.028)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    {/* Customer */}
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(67,97,238,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11.5, fontWeight: 700, color: '#4361ee', flexShrink: 0 }}>
                          {initials}
                        </div>
                        <div>
                          <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600, color: colors.text }}>{customer.fullName}</p>
                          <p style={{ margin: 0, fontSize: 11, color: muted }}>NIC: {customer.nic}</p>
                        </div>
                      </div>
                    </td>
                    {/* Contact */}
                    <td style={{ padding: '12px 16px' }}>
                      <p style={{ margin: 0, fontSize: 13, color: colors.text }}>{customer.email}</p>
                      {customer.phone && <p style={{ margin: '2px 0 0', fontSize: 11, color: muted }}>{customer.phone}</p>}
                    </td>
                    {/* Employment */}
                    <td style={{ padding: '12px 16px' }}>
                      <p style={{ margin: 0, fontSize: 13, color: colors.text }}>{customer.employer || customer.occupation || '\u2014'}</p>
                      {customer.city && <p style={{ margin: '2px 0 0', fontSize: 11, color: muted }}>{customer.city}</p>}
                    </td>
                    {/* Income */}
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600, color: '#10b981' }}>{fmtCurrency(customer.monthlyIncome)}</p>
                      <p style={{ margin: 0, fontSize: 11, color: muted }}>per month</p>
                    </td>
                    {/* Status */}
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <span style={{ display: 'inline-block', padding: '2px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: ss.bg, color: ss.color, textTransform: 'capitalize' }}>
                        {customer.status || 'active'}
                      </span>
                    </td>
                    {/* Registered */}
                    <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13, color: colors.text }}>
                      {fmtDate(customer.createdAt)}
                    </td>
                    {/* Actions */}
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: 4 }}>
                        {[
                          { title: 'View', icon: Eye, color: '#4361ee', onClick: () => setSelectedCustomer(customer) },
                          { title: 'Edit', icon: Edit2, color: '#8b5cf6', onClick: () => handleEditClick(customer) },
                          { title: 'Delete', icon: Trash2, color: '#ef4444', onClick: () => handleDelete(customer.id) },
                        ].map(({ title, icon: Icon, color, onClick }) => (
                          <button
                            key={title} onClick={onClick} title={title}
                            style={{ width: 30, height: 30, border: `1px solid ${color}30`, borderRadius: 6, background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            onMouseEnter={e => e.currentTarget.style.background = `${color}12`}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            <Icon size={13} color={color} />
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {!loading && filteredCustomers.length > 0 && (
        <p style={{ fontSize: 12, color: muted, textAlign: 'right', margin: '10px 0 0' }}>
          {filteredCustomers.length} customer{filteredCustomers.length !== 1 ? 's' : ''}
        </p>
      )}

      {/* ─── Customer Detail Modal ─── */}
      {selectedCustomer && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.52)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2200, padding: 20, animation: 'fadeIn 0.2s ease' }} onClick={() => setSelectedCustomer(null)}>
          <div style={{ width: '100%', maxWidth: 1000, maxHeight: '92vh', background: isDark ? '#0c1120' : '#ffffff', border: `1px solid ${divider}`, borderRadius: 10, display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: 'slideUp 0.25s ease', boxShadow: isDark ? '0 24px 64px rgba(0,0,0,0.6)' : '0 24px 64px rgba(0,0,0,0.12)' }} onClick={e => e.stopPropagation()}>

            {/* ── Header ── */}
            <div style={{ padding: '18px 24px', borderBottom: `1px solid ${divider}`, display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
              <div style={{ width: 42, height: 42, borderRadius: 9, background: 'rgba(67,97,238,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#4361ee', flexShrink: 0, letterSpacing: '0.02em' }}>
                {(selectedCustomer.fullName || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 17, fontWeight: 700, color: colors.text }}>{selectedCustomer.fullName}</span>
                  <span style={{ display: 'inline-block', padding: '2px 9px', borderRadius: 20, fontSize: 11.5, fontWeight: 600, background: 'rgba(16,185,129,0.1)', color: '#059669', textTransform: 'capitalize' }}>
                    {selectedCustomer.status || 'active'}
                  </span>
                </div>
                <p style={{ margin: '2px 0 0', fontSize: 12.5, color: muted }}>
                  {selectedCustomer.customerId || `CUS-${selectedCustomer.id}`}&nbsp;&nbsp;·&nbsp;&nbsp;NIC: {selectedCustomer.nic}
                </p>
              </div>
              <button onClick={exportCustomerPDF} style={{ padding: '7px 12px', background: 'transparent', border: `1px solid ${divider}`, borderRadius: 7, color: colors.text, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 500, flexShrink: 0, transition: 'all 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <Download size={13} /> Export
              </button>
              <button onClick={() => setSelectedCustomer(null)} style={{ width: 32, height: 32, borderRadius: 7, background: 'transparent', border: `1px solid ${divider}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <X size={15} color={muted} />
              </button>
            </div>

            {/* ── Two-column info (Personal + Financial) ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: `1px solid ${divider}`, flexShrink: 0 }}>
              {/* Personal */}
              <div style={{ padding: '16px 24px', borderRight: `1px solid ${divider}` }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: muted, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 12px' }}>Personal Information</p>
                {[
                  { Icon: Mail, label: 'Email', value: selectedCustomer.email },
                  { Icon: Phone, label: 'Phone', value: selectedCustomer.phone },
                  { Icon: MapPin, label: 'Address', value: [selectedCustomer.address, selectedCustomer.city].filter(Boolean).join(', ') },
                  { Icon: Users, label: 'Gender', value: selectedCustomer.gender ? selectedCustomer.gender.charAt(0).toUpperCase() + selectedCustomer.gender.slice(1) : null },
                  { Icon: Calendar, label: 'Age', value: selectedCustomer.age ? `${selectedCustomer.age} years` : null },
                  { Icon: Calendar, label: 'Date of Birth', value: selectedCustomer.dateOfBirth ? fmtDate(selectedCustomer.dateOfBirth) : null },
                ].map(({ Icon, label, value }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 9 }}>
                    <Icon size={13} color={muted} style={{ marginTop: 2, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: muted, width: 90, flexShrink: 0 }}>{label}</span>
                    <span style={{ fontSize: 13, color: colors.text, fontWeight: 500 }}>{value || '\u2014'}</span>
                  </div>
                ))}
              </div>

              {/* Financial */}
              <div style={{ padding: '16px 24px' }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: muted, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 12px' }}>Financial Information</p>
                {[
                  { Icon: Building, label: 'Employer', value: selectedCustomer.employer },
                  { Icon: Briefcase, label: 'Occupation', value: selectedCustomer.occupation },
                  { Icon: CreditCard, label: 'Monthly Income', value: fmtCurrency(selectedCustomer.monthlyIncome), strong: true },
                  { Icon: Shield, label: 'Credit Score', value: selectedCustomer.creditScore || '\u2014', strong: true },
                  { Icon: Calendar, label: 'Registered', value: fmtDate(selectedCustomer.createdAt) },
                  { Icon: Calendar, label: 'Last Updated', value: fmtDate(selectedCustomer.updatedAt) },
                ].map(({ Icon, label, value, strong }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 9 }}>
                    <Icon size={13} color={muted} style={{ marginTop: 2, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: muted, width: 112, flexShrink: 0 }}>{label}</span>
                    <span style={{ fontSize: 13, color: colors.text, fontWeight: strong ? 700 : 500 }}>{value || '\u2014'}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Summary strip ── */}
            <div style={{ display: 'flex', padding: '14px 24px', borderBottom: `1px solid ${divider}`, flexShrink: 0 }}>
              {[
                { label: 'Monthly Income', value: fmtCurrency(selectedCustomer.monthlyIncome), color: '#4361ee' },
                { label: 'Credit Score', value: selectedCustomer.creditScore || '\u2014', color: '#f59e0b' },
                { label: 'Total Loans', value: customerLoans.length, color: colors.text },
                { label: 'Active Loans', value: customerLoans.filter(l => l.status === 'active').length, color: colors.text, bold: true },
              ].map(({ label, value, color, bold }, i, arr) => (
                <div key={label} style={{ flex: 1, paddingRight: i < arr.length - 1 ? 18 : 0, borderRight: i < arr.length - 1 ? `1px solid ${divider}` : 'none', paddingLeft: i > 0 ? 18 : 0 }}>
                  <p style={{ margin: '0 0 2px', fontSize: 11, color: muted }}>{label}</p>
                  <p style={{ margin: 0, fontSize: 15, fontWeight: bold ? 700 : 600, color }}>{value}</p>
                </div>
              ))}
            </div>

            {/* ── Tabs ── */}
            <div style={{ display: 'flex', borderBottom: `1px solid ${divider}`, padding: '0 24px', flexShrink: 0 }}>
              {[
                { key: 'documents', label: 'Documents' },
                { key: 'loans', label: `Loans (${customerLoans.length})` },
              ].map(tab => (
                <button key={tab.key} onClick={() => setDetailTab(tab.key)}
                  style={{ padding: '11px 0', marginRight: 24, background: 'transparent', border: 'none', borderBottom: `2px solid ${detailTab === tab.key ? '#4361ee' : 'transparent'}`, color: detailTab === tab.key ? '#4361ee' : muted, fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'color 0.15s' }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ── Tab Content ── */}
            <div style={{ flex: 1, overflowY: 'auto' }}>

              {/* ─── DOCUMENTS TAB ─── */}
              {detailTab === 'documents' && (
                <div>
                  {/* KYC Documents as table */}
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${divider}`, background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}>
                        {['Document', 'Status', 'Action'].map((h, i) => (
                          <th key={i} style={{ padding: '10px 24px', textAlign: i === 2 ? 'center' : 'left', fontSize: 10.5, fontWeight: 600, color: muted, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {['idDocument', 'proofOfIncome', 'proofOfAddress'].map(docKey => {
                        const docs = parseDocs(selectedCustomer)?.documents || {};
                        const labelMap = { idDocument: 'Government ID', proofOfIncome: 'Proof of Income', proofOfAddress: 'Proof of Address' };
                        const fileName = docs[docKey];
                        return (
                          <tr key={docKey} style={{ borderBottom: `1px solid ${divider}`, transition: 'background 0.12s' }}
                            onMouseEnter={e => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.025)' : 'rgba(67,97,238,0.025)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            <td style={{ padding: '10px 24px', fontSize: 13, fontWeight: 500, color: colors.text }}>{labelMap[docKey]}</td>
                            <td style={{ padding: '10px 24px' }}>
                              <span style={{ display: 'inline-block', padding: '2px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: fileName ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)', color: fileName ? '#059669' : '#d97706', textTransform: 'capitalize' }}>
                                {fileName ? 'Uploaded' : 'Missing'}
                              </span>
                            </td>
                            <td style={{ padding: '10px 24px', textAlign: 'center' }}>
                              {fileName ? (
                                <button onClick={() => setViewingDocument({ name: labelMap[docKey], file: fileName })}
                                  style={{ padding: '4px 10px', background: 'transparent', border: `1px solid ${divider}`, borderRadius: 6, color: colors.text, cursor: 'pointer', fontSize: 12, fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                  onMouseEnter={e => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}
                                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                >
                                  <Eye size={12} /> View
                                </button>
                              ) : (
                                <span style={{ fontSize: 12, color: muted }}>{'\u2014'}</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      {/* Collateral documents inline */}
                      {customerLoans.filter(l => l.collateralType).map(loan => {
                        let collDocs = {};
                        try { collDocs = loan.collateralDocuments ? JSON.parse(loan.collateralDocuments) : {}; } catch {}

                        const guarantors = [];
                        if (loan.collateralType === 'Personal Guarantee' && loan.notes) {
                          loan.notes.split('\n').forEach(line => {
                            const match = line.match(/Guarantor \d+:\s*(.+?)\s*\(NIC:\s*(.+?)\)/);
                            if (match) guarantors.push({ name: match[1], nic: match[2] });
                          });
                        }

                        const rows = [];
                        if (loan.collateralType === 'Property') {
                          rows.push({ label: `Property Document (LN-${loan.id})`, file: collDocs.propertyDocument });
                        }
                        if (loan.collateralType === 'Personal Guarantee') {
                          guarantors.forEach((g, gi) => {
                            rows.push({ label: `Guarantor ${gi + 1} NIC — ${g.name} (LN-${loan.id})`, file: collDocs[`guarantorNic${gi + 1}`] });
                          });
                        }
                        return rows.map((row, ri) => (
                          <tr key={`coll-${loan.id}-${ri}`} style={{ borderBottom: `1px solid ${divider}`, transition: 'background 0.12s' }}
                            onMouseEnter={e => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.025)' : 'rgba(67,97,238,0.025)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            <td style={{ padding: '10px 24px', fontSize: 13, fontWeight: 500, color: colors.text }}>{row.label}</td>
                            <td style={{ padding: '10px 24px' }}>
                              <span style={{ display: 'inline-block', padding: '2px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: row.file ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)', color: row.file ? '#059669' : '#d97706' }}>
                                {row.file ? 'Uploaded' : 'Missing'}
                              </span>
                            </td>
                            <td style={{ padding: '10px 24px', textAlign: 'center' }}>
                              {row.file ? (
                                <button onClick={() => setViewingDocument({ name: row.label, file: row.file })}
                                  style={{ padding: '4px 10px', background: 'transparent', border: `1px solid ${divider}`, borderRadius: 6, color: colors.text, cursor: 'pointer', fontSize: 12, fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                  onMouseEnter={e => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}
                                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                >
                                  <Eye size={12} /> View
                                </button>
                              ) : (
                                <span style={{ fontSize: 12, color: muted }}>{'\u2014'}</span>
                              )}
                            </td>
                          </tr>
                        ));
                      })}
                    </tbody>
                  </table>
                  {customerLoans.filter(l => l.collateralType).length === 0 && (
                    <div style={{ padding: '10px 24px 16px', borderTop: `1px solid ${divider}` }}>
                      <p style={{ color: muted, fontSize: 12, margin: 0 }}>No collateral documents attached to any loans</p>
                    </div>
                  )}
                </div>
              )}

              {/* ─── LOANS TAB ─── */}
              {detailTab === 'loans' && (
                loadingLoans ? (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 48, gap: 10 }}>
                    <div style={{ width: 18, height: 18, border: '2px solid rgba(67,97,238,0.2)', borderTopColor: '#4361ee', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    <span style={{ color: muted, fontSize: 14 }}>Loading loans…</span>
                  </div>
                ) : customerLoans.length === 0 ? (
                  <div style={{ padding: 48, textAlign: 'center', color: muted, fontSize: 14 }}>No loans found for this customer</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${divider}`, background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}>
                        {['Loan ID', 'Type', 'Amount', 'Term', 'Rate', 'EMI', 'Progress', 'Status'].map((h, i) => (
                          <th key={i} style={{ padding: '10px 14px', textAlign: [2, 5].includes(i) ? 'right' : 'center', fontSize: 10.5, fontWeight: 600, color: muted, letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {customerLoans.map(loan => {
                        const statusStyles = {
                          active: { bg: 'rgba(16,185,129,0.1)', color: '#059669' }, approved: { bg: 'rgba(67,97,238,0.1)', color: '#4361ee' },
                          pending: { bg: 'rgba(245,158,11,0.1)', color: '#d97706' }, completed: { bg: 'rgba(34,197,94,0.1)', color: '#16a34a' },
                          overdue: { bg: 'rgba(249,115,22,0.1)', color: '#ea580c' }, rejected: { bg: 'rgba(239,68,68,0.1)', color: '#dc2626' },
                          defaulted: { bg: 'rgba(239,68,68,0.1)', color: '#dc2626' },
                        };
                        const ls = statusStyles[loan.status] || statusStyles.pending;
                        const paidCount = loan.repayments?.filter(r => r.status === 'paid').length || 0;
                        const totalCount = loan.repayments?.length || loan.term || 1;
                        const progress = Math.round((paidCount / totalCount) * 100);
                        return (
                          <tr key={loan.id} style={{ borderBottom: `1px solid ${divider}`, transition: 'background 0.12s' }}
                            onMouseEnter={e => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.025)' : 'rgba(67,97,238,0.025)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            <td style={{ padding: '10px 14px', textAlign: 'center', fontSize: 13, fontWeight: 600, color: colors.text }}>LN-{loan.id}</td>
                            <td style={{ padding: '10px 14px', textAlign: 'center', fontSize: 13, color: colors.text }}>{loan.loanType?.name || loan.purpose || 'Loan'}</td>
                            <td style={{ padding: '10px 14px', textAlign: 'right', fontSize: 13, fontWeight: 600, color: '#4361ee' }}>Rs. {(loan.amount || 0).toLocaleString()}</td>
                            <td style={{ padding: '10px 14px', textAlign: 'center', fontSize: 13, color: colors.text }}>{loan.term} mo</td>
                            <td style={{ padding: '10px 14px', textAlign: 'center', fontSize: 13, color: colors.text }}>{loan.interestRate}%</td>
                            <td style={{ padding: '10px 14px', textAlign: 'right', fontSize: 13, color: '#f59e0b' }}>Rs. {(loan.monthlyPayment || 0).toLocaleString()}</td>
                            <td style={{ padding: '10px 14px', textAlign: 'center', minWidth: 90 }}>
                              {['active', 'completed'].includes(loan.status) ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                                  <div style={{ width: 50, height: 4, borderRadius: 2, background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)', overflow: 'hidden' }}>
                                    <div style={{ height: '100%', borderRadius: 2, background: '#10b981', width: `${progress}%` }} />
                                  </div>
                                  <span style={{ fontSize: 11, fontWeight: 600, color: muted }}>{progress}%</span>
                                </div>
                              ) : (
                                <span style={{ color: muted, fontSize: 12 }}>{'\u2014'}</span>
                              )}
                            </td>
                            <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                              <span style={{ display: 'inline-block', padding: '2px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: ls.bg, color: ls.color, textTransform: 'capitalize' }}>{loan.status}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )
              )}
            </div>
          </div>
        </div>, document.body
      )}

      {/* ─── Document Viewer ─── */}
      {viewingDocument && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: 24 }} onClick={() => setViewingDocument(null)}>
          <div style={{ background: isDark ? '#0c1120' : '#ffffff', borderRadius: 10, padding: 20, width: '95vw', height: '95vh', maxWidth: 1400, border: `1px solid ${divider}`, display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexShrink: 0 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: colors.text }}>{viewingDocument.name}</span>
              <button onClick={() => setViewingDocument(null)} style={{ width: 32, height: 32, borderRadius: 7, background: 'transparent', border: `1px solid ${divider}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onMouseEnter={e => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <X size={15} color={muted} />
              </button>
            </div>
            <div style={{ flex: 1, background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc', borderRadius: 8, border: `1px solid ${divider}`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {viewingDocument.file.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i) ? (
                <img src={`http://localhost:5000/uploads/${viewingDocument.file}`} alt={viewingDocument.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                  onError={e => { e.target.parentElement.innerHTML = '<p style="color:rgba(255,255,255,0.4);font-size:14px">Failed to load image</p>'; }}
                />
              ) : viewingDocument.file.match(/\.pdf$/i) ? (
                <iframe src={`http://localhost:5000/uploads/${viewingDocument.file}`} style={{ width: '100%', height: '100%', border: 'none', background: 'white' }} title={viewingDocument.name} />
              ) : (
                <div style={{ textAlign: 'center', color: muted }}>
                  <FileText size={48} />
                  <p style={{ marginTop: 10, fontSize: 14 }}>Preview not available</p>
                </div>
              )}
            </div>
          </div>
        </div>, document.body
      )}

      {/* ─── Edit Customer Modal ─── */}
      {editingCustomer && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.52)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2200, padding: 20 }} onClick={() => setEditingCustomer(null)}>
          <div style={{ background: isDark ? '#0c1120' : '#ffffff', borderRadius: 10, maxWidth: 680, width: '100%', border: `1px solid ${divider}`, boxShadow: isDark ? '0 24px 64px rgba(0,0,0,0.6)' : '0 24px 64px rgba(0,0,0,0.12)', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div style={{ padding: '18px 24px', borderBottom: `1px solid ${divider}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div>
                <h2 style={{ fontSize: 17, fontWeight: 700, color: colors.text, margin: 0 }}>Edit Customer</h2>
                <p style={{ fontSize: 12.5, color: muted, margin: '2px 0 0' }}>{editingCustomer.fullName}</p>
              </div>
              <button onClick={() => setEditingCustomer(null)} style={{ width: 32, height: 32, borderRadius: 7, background: 'transparent', border: `1px solid ${divider}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onMouseEnter={e => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <X size={15} color={muted} />
              </button>
            </div>

            {/* Form */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {[
                  { key: 'fullName', label: 'Full Name', type: 'text', span: false },
                  { key: 'email',    label: 'Email',     type: 'email', span: false },
                  { key: 'phone',    label: 'Phone',     type: 'tel',   span: false },
                  { key: 'gender',   label: 'Gender',    type: 'select', options: [['', 'Select...'], ['male', 'Male'], ['female', 'Female'], ['other', 'Other']], span: false },
                  { key: 'age',      label: 'Age',       type: 'number', span: false },
                  { key: 'city',     label: 'City',      type: 'text', span: false },
                  { key: 'address',  label: 'Address',   type: 'text', span: true },
                  { key: 'employer', label: 'Employer',  type: 'text', span: false },
                  { key: 'occupation', label: 'Occupation', type: 'text', span: false },
                  { key: 'monthlyIncome', label: 'Monthly Income', type: 'number', span: false },
                ].map(field => (
                  <div key={field.key} style={{ gridColumn: field.span ? 'span 2' : undefined }}>
                    <label style={{ display: 'block', marginBottom: 5, color: muted, fontSize: 12, fontWeight: 600 }}>{field.label}</label>
                    {field.type === 'select' ? (
                      <select value={editFormData[field.key]} onChange={e => setEditFormData({ ...editFormData, [field.key]: e.target.value })} style={{ ...inputBase, width: '100%', cursor: 'pointer', boxSizing: 'border-box' }}>
                        {field.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    ) : (
                      <input type={field.type} value={editFormData[field.key]} onChange={e => setEditFormData({ ...editFormData, [field.key]: e.target.value })} placeholder={field.label} style={{ ...inputBase, width: '100%', boxSizing: 'border-box' }} />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: '14px 24px', borderTop: `1px solid ${divider}`, display: 'flex', justifyContent: 'flex-end', gap: 8, flexShrink: 0 }}>
              <button onClick={() => setEditingCustomer(null)} style={{ padding: '8px 16px', background: 'transparent', border: `1px solid ${divider}`, borderRadius: 8, color: colors.text, fontSize: 13, cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >Cancel</button>
              <button onClick={handleEditSubmit} disabled={editLoading} style={{ padding: '8px 18px', background: '#4361ee', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: editLoading ? 'wait' : 'pointer', opacity: editLoading ? 0.7 : 1 }}
                onMouseEnter={e => { if (!editLoading) e.currentTarget.style.opacity = '0.88'; }}
                onMouseLeave={e => e.currentTarget.style.opacity = editLoading ? '0.7' : '1'}
              >{editLoading ? 'Saving...' : 'Save Changes'}</button>
            </div>
          </div>
        </div>, document.body
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
