import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  Download, CheckCircle, BarChart3,
  FileText, Activity, RefreshCw, CreditCard, Clock
} from 'lucide-react';
import api from '../../services/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useTheme } from '../../context/ThemeContext';

// Number of calendar months to display for each range option
const RANGE_MONTHS = { '1month': 1, '3months': 3, '6months': 6, '1year': 12 };

/**
 * Returns the first day of the calendar month that begins the range.
 * "Last 3 months" on Mar 4 2026 → Jan 1 2026 → shows Jan, Feb, Mar (exactly 3).
 */
const getRangeStart = (range) => {
  const now = new Date();
  const n   = RANGE_MONTHS[range] ?? 6;
  // subtract (n-1) months so the chart shows exactly n months including current
  return new Date(now.getFullYear(), now.getMonth() - (n - 1), 1);
};

const RANGE_LABEL = {
  '1month':  'Last Month',
  '3months': 'Last 3 Months',
  '6months': 'Last 6 Months',
  '1year':   'Last Year',
};

// All statuses that mean the loan was actually disbursed / is live
const DISBURSED = new Set(['approved', 'active', 'completed', 'overdue']);

const fmt = (n) => `Rs. ${Number(n).toLocaleString()}`;

// ─────────────────────────────────────────────────────────────────────────────
export default function Reports() {
  const { isDark, colors } = useTheme();
  const [dateRange, setDateRange] = useState('6months');
  const [allLoans,  setAllLoans]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportOK,  setExportOK]  = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/loans');
      setAllLoans(res.data || []);
    } catch {
      setAllLoans([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { fetchData(); }, []);

  /* ── filter to selected window ─────────────────────────────────────────── */
  const loans = useMemo(() => {
    const from = getRangeStart(dateRange);
    return allLoans.filter(l => new Date(l.createdAt || l.submittedAt) >= from);
  }, [allLoans, dateRange]);

  /* ── summary counts ────────────────────────────────────────────────────── */
  const total      = loans.length;
  const nActive    = loans.filter(l => l.status === 'active').length;
  const nCompleted = loans.filter(l => l.status === 'completed').length;
  const nOverdue   = loans.filter(l => l.status === 'overdue').length;
  const nRejected  = loans.filter(l => l.status === 'rejected').length;
  const nPending   = loans.filter(l => l.status === 'pending').length;
  const nDisbursed = loans.filter(l => DISBURSED.has(l.status)).length;
  const totalAmt   = loans.filter(l => DISBURSED.has(l.status))
                         .reduce((s, l) => s + (l.amount || l.loanAmount || 0), 0);
  const approvalPct = total > 0 ? ((nDisbursed / total) * 100).toFixed(1) : '0.0';

  /* ── risk distribution ─────────────────────────────────────────────────── */
  const riskData = useMemo(() => {
    const low    = loans.filter(l => (l.riskScore ?? 0) <  0.3).length;
    const medium = loans.filter(l => (l.riskScore ?? 0) >= 0.3 && (l.riskScore ?? 0) < 0.5).length;
    const high   = loans.filter(l => (l.riskScore ?? 0) >= 0.5).length;
    return [
      { name: 'Low',    value: total ? Math.round((low    / total) * 100) : 0, count: low,    color: '#10b981' },
      { name: 'Medium', value: total ? Math.round((medium / total) * 100) : 0, count: medium, color: '#f59e0b' },
      { name: 'High',   value: total ? Math.round((high   / total) * 100) : 0, count: high,   color: '#ef4444' },
    ];
  }, [loans, total]);

  /* ── loan-type breakdown ───────────────────────────────────────────────── */
  const purposeData = useMemo(() => {
    const map = {};
    loans.forEach(l => {
      const k = l.loanType?.name
             || (typeof l.loanType === 'string' ? l.loanType : null)
             || l.purpose
             || 'Other';
      map[k] = (map[k] || 0) + 1;
    });
    return Object.entries(map)
      .map(([purpose, count]) => ({ purpose, count }))
      .sort((a, b) => b.count - a.count);
  }, [loans]);

  /* ── monthly chart data ────────────────────────────────────────────────── */
  /* Seed EXACTLY n months so "Last 3 Months" never shows 4 bars.            */
  const monthlyData = useMemo(() => {
    const n   = RANGE_MONTHS[dateRange] ?? 6;
    const now = new Date();

    // build the n slots
    const rows = Array.from({ length: n }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (n - 1) + i, 1);
      return {
        // for 1-year range add year suffix to avoid duplicate "Jan" etc.
        month:       n === 12
                       ? d.toLocaleString('default', { month: 'short' }) + ` '${String(d.getFullYear()).slice(2)}`
                       : d.toLocaleString('default', { month: 'short' }),
        year:        d.getFullYear(),
        monthIndex:  d.getMonth(),
        applications: 0,
        disbursed_n:  0,
        rejected:     0,
        pending:      0,
        disbursed:    0,
      };
    });

    loans.forEach(l => {
      const d   = new Date(l.createdAt || l.submittedAt);
      const row = rows.find(r => r.year === d.getFullYear() && r.monthIndex === d.getMonth());
      if (!row) return;
      row.applications++;
      if (DISBURSED.has(l.status)) {
        row.disbursed_n++;
        row.disbursed += (l.amount || l.loanAmount || 0);
      }
      if (l.status === 'rejected') row.rejected++;
      if (l.status === 'pending')  row.pending++;
    });

    return rows;
  }, [loans, dateRange]);

  /* ── PDF export ────────────────────────────────────────────────────────── */
  const exportToPDF = () => {
    setExporting(true);
    try {
      const doc    = new jsPDF();
      const pw     = doc.internal.pageSize.getWidth();
      const label  = RANGE_LABEL[dateRange] ?? 'Report';
      const today  = new Date();
      const from   = getRangeStart(dateRange);
      const period = `${from.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })} – ${today.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })}`;

      /* header */
      doc.setFillColor(67, 97, 238);
      doc.rect(0, 0, pw, 44, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20); doc.setFont('helvetica', 'bold');
      doc.text('SmartLoan BLMS', 18, 20);
      doc.setFontSize(12); doc.setFont('helvetica', 'normal');
      doc.text(`Loan Portfolio Report  ·  ${label}`, 18, 30);
      doc.setFontSize(9); doc.setTextColor(200, 210, 255);
      doc.text(`Period: ${period}`, 18, 39);
      doc.setFontSize(9); doc.setTextColor(180, 180, 180);
      doc.text(`Generated: ${today.toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })}`, pw - 18, 39, { align: 'right' });

      /* summary grid */
      doc.setTextColor(30, 30, 30); doc.setFontSize(13); doc.setFont('helvetica', 'bold');
      doc.text('Summary', 18, 58);
      doc.setDrawColor(220, 220, 220); doc.setLineWidth(0.4); doc.line(18, 62, pw - 18, 62);

      const summaryItems = [
        ['Total Applications', total.toString()],
        ['Active',             nActive.toString()],
        ['Completed',          nCompleted.toString()],
        ['Overdue',            nOverdue.toString()],
        ['Rejected',           nRejected.toString()],
        ['Pending',            nPending.toString()],
        ['Approval Rate',      `${approvalPct}%`],
        ['Total Disbursed',    fmt(totalAmt)],
      ];
      summaryItems.forEach(([lbl, val], i) => {
        const x = 18 + (i % 3) * 62, y = 70 + Math.floor(i / 3) * 20;
        doc.setFillColor(248, 249, 252); doc.roundedRect(x, y - 5, 58, 15, 2, 2, 'F');
        doc.setFontSize(7.5); doc.setTextColor(120, 120, 120); doc.setFont('helvetica', 'normal');
        doc.text(lbl, x + 4, y + 1);
        doc.setFontSize(11); doc.setTextColor(30, 30, 30); doc.setFont('helvetica', 'bold');
        doc.text(val, x + 4, y + 9);
      });

      const afterSummary = 70 + Math.ceil(summaryItems.length / 3) * 20 + 10;

      /* risk + loan-type side by side */
      doc.setTextColor(30, 30, 30); doc.setFontSize(12); doc.setFont('helvetica', 'bold');
      doc.text('Risk Distribution', 18, afterSummary);
      doc.line(18, afterSummary + 3, pw / 2 - 4, afterSummary + 3);
      riskData.forEach((r, i) => {
        const y = afterSummary + 13 + i * 10;
        const [rr, gg, bb] = r.color === '#10b981' ? [16,185,129] : r.color === '#f59e0b' ? [245,158,11] : [239,68,68];
        doc.setFillColor(rr, gg, bb); doc.roundedRect(18, y - 4, 6, 6, 1, 1, 'F');
        doc.setFontSize(9); doc.setTextColor(60, 60, 60); doc.setFont('helvetica', 'normal');
        doc.text(`${r.name} Risk: ${r.value}% (${r.count} loans)`, 28, y + 1);
      });

      doc.setTextColor(30, 30, 30); doc.setFontSize(12); doc.setFont('helvetica', 'bold');
      doc.text('By Loan Type (Top 5)', pw / 2 + 6, afterSummary);
      doc.line(pw / 2 + 6, afterSummary + 3, pw - 18, afterSummary + 3);
      purposeData.slice(0, 5).forEach((p, i) => {
        doc.setFontSize(9); doc.setTextColor(60, 60, 60); doc.setFont('helvetica', 'normal');
        doc.text(`${p.purpose}: ${p.count} loan${p.count !== 1 ? 's' : ''}`, pw / 2 + 6, afterSummary + 13 + i * 10);
      });

      /* monthly breakdown table */
      const afterRisk = afterSummary + 13 + 3 * 10 + 12;
      doc.setTextColor(30, 30, 30); doc.setFontSize(12); doc.setFont('helvetica', 'bold');
      doc.text(`Monthly Breakdown  (${label})`, 18, afterRisk);
      doc.line(18, afterRisk + 3, pw - 18, afterRisk + 3);

      autoTable(doc, {
        startY: afterRisk + 6,
        head: [['Month', 'Applications', 'Active/Apprvd', 'Rejected', 'Pending', 'Disbursed (Rs.)']],
        body: monthlyData.map(r => [
          r.month,
          r.applications,
          r.disbursed_n,
          r.rejected,
          r.pending,
          Number(r.disbursed).toLocaleString(),
        ]),
        theme: 'striped',
        headStyles: { fillColor: [67, 97, 238], textColor: 255, fontStyle: 'bold', fontSize: 9 },
        alternateRowStyles: { fillColor: [248, 249, 252] },
        styles: { fontSize: 8, cellPadding: 3 },
      });

      /* page footer */
      const pages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pages; i++) {
        doc.setPage(i);
        doc.setFontSize(8); doc.setTextColor(180, 180, 180);
        doc.text(
          `SmartLoan BLMS  ·  ${label}  ·  Page ${i} of ${pages}`,
          pw / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' }
        );
      }

      doc.save(`SmartLoan_Report_${dateRange}_${today.toISOString().split('T')[0]}.pdf`);
      setExportOK(true);
      setTimeout(() => setExportOK(false), 3000);
    } catch (err) {
      console.error('PDF export error:', err);
      alert('Error generating PDF. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  /* ── shared UI styles ──────────────────────────────────────────────────── */
  const card = {
    background:   isDark ? '#0f172a' : '#ffffff',
    border:       `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'}`,
    borderRadius: '8px',
  };
  const tooltipStyle = {
    background:   isDark ? '#1e293b' : '#fff',
    border:       `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
    borderRadius: '8px',
    fontSize:     12,
  };
  const gridLine  = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
  const axisProps = { stroke: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.4)', fontSize: 11, tickLine: false, axisLine: false };

  const statCards = [
    { label: 'Total Applications', value: total,         Icon: FileText,   accent: '#4361ee', sub: RANGE_LABEL[dateRange] },
    { label: 'Active Loans',       value: nActive,       Icon: Activity,   accent: '#10b981', sub: `${nCompleted} completed · ${nOverdue} overdue` },
    { label: 'Pending Review',     value: nPending,      Icon: Clock,      accent: '#f59e0b', sub: 'Awaiting decision' },
    { label: 'Total Disbursed',    value: fmt(totalAmt), Icon: CreditCard, accent: '#8b5cf6', sub: `${approvalPct}% approval rate`, small: true },
  ];

  /* ── loading ── */
  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh' }}>
      <div style={{ width:34, height:34, border:'3px solid rgba(67,97,238,0.15)', borderTopColor:'#4361ee', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform:rotate(360deg); } }`}</style>
    </div>
  );

  /* ── render ── */
  return (
    <div style={{ padding:'24px 28px', animation:'fadeIn 0.3s ease' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:28 }}>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ width:42, height:42, borderRadius:10, background:'#4361ee', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow:'0 4px 12px rgba(67,97,238,0.3)' }}>
            <BarChart3 size={20} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize:24, fontWeight:700, color:colors.text, margin:'0 0 3px' }}>Reports</h1>
            <p style={{ fontSize:13, color:colors.textMuted, margin:0 }}>
              Loan portfolio analytics ·&nbsp;
              <strong style={{ color:colors.textSecondary }}>{RANGE_LABEL[dateRange]}</strong>
              <span style={{ marginLeft:8 }}>({loans.length} loan{loans.length !== 1 ? 's' : ''})</span>
            </p>
          </div>
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <select
            value={dateRange}
            onChange={e => setDateRange(e.target.value)}
            style={{ padding:'8px 12px', background: isDark ? '#0f172a' : '#fff', border:`1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`, borderRadius:8, color:colors.text, fontSize:13, cursor:'pointer', outline:'none' }}
          >
            <option value="1month">Last Month</option>
            <option value="3months">Last 3 Months</option>
            <option value="6months">Last 6 Months</option>
            <option value="1year">Last Year</option>
          </select>

          <button onClick={fetchData} title="Refresh" style={{ width:34, height:34, border:`1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`, borderRadius:8, background:'transparent', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <RefreshCw size={15} color={colors.textMuted} />
          </button>

          <button onClick={exportToPDF} disabled={exporting} style={{ padding:'8px 16px', background: exportOK ? '#10b981' : '#4361ee', border:'none', borderRadius:8, color:'white', fontSize:13, fontWeight:600, cursor: exporting ? 'wait' : 'pointer', display:'flex', alignItems:'center', gap:6, opacity: exporting ? 0.7 : 1, transition:'background 0.2s' }}>
            {exportOK ? <CheckCircle size={15} /> : <Download size={15} />}
            {exporting ? 'Generating…' : exportOK ? 'Downloaded!' : 'Export PDF'}
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:20 }}>
        {statCards.map((s, i) => (
          <div key={i} style={{ ...card, padding:'18px 20px' }}>
            <div style={{ width:34, height:34, borderRadius:9, background:`${s.accent}18`, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:14 }}>
              <s.Icon size={16} color={s.accent} strokeWidth={2} />
            </div>
            <p style={{ fontSize: s.small ? 16 : 26, fontWeight:700, color:colors.text, margin:'0 0 3px', lineHeight:1.2 }}>{s.value}</p>
            <p style={{ fontSize:13, fontWeight:600, color:colors.textSecondary, margin:'0 0 2px' }}>{s.label}</p>
            <p style={{ fontSize:11, color:colors.textMuted, margin:0 }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Row 1 — Application Trends + Risk Distribution */}
      <div style={{ display:'grid', gridTemplateColumns:'3fr 2fr', gap:16, marginBottom:16 }}>

        {/* Bar chart */}
        <div style={{ ...card, padding:'20px 24px' }}>
          <div style={{ marginBottom:16 }}>
            <h2 style={{ fontSize:15, fontWeight:600, color:colors.text, margin:'0 0 2px' }}>Application Trends</h2>
            <p style={{ fontSize:12, color:colors.textMuted, margin:0 }}>
              {RANGE_LABEL[dateRange]} — {RANGE_MONTHS[dateRange]} month{RANGE_MONTHS[dateRange] > 1 ? 's' : ''} of data
            </p>
          </div>
          {monthlyData.every(r => r.applications === 0) ? (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:220, color:colors.textMuted, fontSize:13 }}>No data for this period</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={monthlyData} barCategoryGap="32%" barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridLine} vertical={false} />
                <XAxis dataKey="month" {...axisProps} />
                <YAxis {...axisProps} allowDecimals={false} />
                <Tooltip cursor={{ fill: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }} contentStyle={tooltipStyle} />
                <Legend iconType="square" iconSize={9} wrapperStyle={{ fontSize:11, paddingTop:8 }} />
                <Bar dataKey="applications" fill="#4361ee" radius={[4,4,0,0]} maxBarSize={20} name="Applications" />
                <Bar dataKey="disbursed_n"  fill="#10b981" radius={[4,4,0,0]} maxBarSize={20} name="Active/Approved" />
                <Bar dataKey="rejected"     fill="#ef4444" radius={[4,4,0,0]} maxBarSize={20} name="Rejected" />
                <Bar dataKey="pending"      fill="#f59e0b" radius={[4,4,0,0]} maxBarSize={20} name="Pending" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Pie chart */}
        <div style={{ ...card, padding:'20px 24px' }}>
          <div style={{ marginBottom:16 }}>
            <h2 style={{ fontSize:15, fontWeight:600, color:colors.text, margin:'0 0 2px' }}>Risk Distribution</h2>
            <p style={{ fontSize:12, color:colors.textMuted, margin:0 }}>By risk score band</p>
          </div>
          {total === 0 ? (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:160, color:colors.textMuted, fontSize:13 }}>No data</div>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={riskData} cx="50%" cy="50%" innerRadius={46} outerRadius={70} paddingAngle={4} dataKey="value">
                  {riskData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(v, _, p) => [`${v}% (${p.payload.count} loans)`]} />
              </PieChart>
            </ResponsiveContainer>
          )}
          <div style={{ display:'flex', flexDirection:'column', gap:10, marginTop:16 }}>
            {riskData.map((r, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ width:10, height:10, borderRadius:2, background:r.color, display:'block' }} />
                  <span style={{ fontSize:12, color:colors.textSecondary }}>{r.name} Risk</span>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ width:72, height:5, borderRadius:3, background: isDark ? '#1e293b' : '#f1f5f9', overflow:'hidden' }}>
                    <div style={{ width:`${r.value}%`, height:'100%', background:r.color, borderRadius:3 }} />
                  </div>
                  <span style={{ fontSize:12, fontWeight:600, color:colors.text, minWidth:68, textAlign:'right' }}>
                    {r.value}% ({r.count})
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 2 — Disbursement Trend + Loan Type Breakdown */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>

        {/* Line chart */}
        <div style={{ ...card, padding:'20px 24px' }}>
          <div style={{ marginBottom:20 }}>
            <h2 style={{ fontSize:15, fontWeight:600, color:colors.text, margin:'0 0 2px' }}>Disbursement Trend</h2>
            <p style={{ fontSize:12, color:colors.textMuted, margin:0 }}>Monthly total principal disbursed</p>
          </div>
          {monthlyData.every(r => r.disbursed === 0) ? (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:200, color:colors.textMuted, fontSize:13 }}>No disbursements in this period</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridLine} vertical={false} />
                <XAxis dataKey="month" {...axisProps} />
                <YAxis {...axisProps} tickFormatter={v => v >= 1e6 ? `${(v/1e6).toFixed(1)}M` : v >= 1e3 ? `${(v/1e3).toFixed(0)}K` : v} />
                <Tooltip contentStyle={tooltipStyle} formatter={v => [`Rs. ${Number(v).toLocaleString()}`, 'Disbursed']} />
                <Line type="monotone" dataKey="disbursed" stroke="#4361ee" strokeWidth={2.5} dot={{ fill:'#4361ee', strokeWidth:0, r:4 }} activeDot={{ r:6, fill:'#4361ee' }} name="Disbursed" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Loan type bars */}
        <div style={{ ...card, padding:'20px 24px' }}>
          <div style={{ marginBottom:20 }}>
            <h2 style={{ fontSize:15, fontWeight:600, color:colors.text, margin:'0 0 2px' }}>Loan Type Breakdown</h2>
            <p style={{ fontSize:12, color:colors.textMuted, margin:0 }}>Applications by loan type</p>
          </div>
          {purposeData.length === 0 ? (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:200, color:colors.textMuted, fontSize:13 }}>No data</div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:13 }}>
              {purposeData.slice(0, 6).map((p, i) => {
                const pct = total > 0 ? Math.round((p.count / total) * 100) : 0;
                const cols = ['#4361ee','#10b981','#f59e0b','#8b5cf6','#06b6d4','#ef4444'];
                return (
                  <div key={i}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                      <span style={{ fontSize:13, color:colors.textSecondary, fontWeight:500 }}>{p.purpose}</span>
                      <span style={{ fontSize:12, color:colors.textMuted }}>{p.count} · {pct}%</span>
                    </div>
                    <div style={{ height:6, background: isDark ? '#1e293b' : '#f1f5f9', borderRadius:3, overflow:'hidden' }}>
                      <div style={{ width:`${pct}%`, height:'100%', background:cols[i % cols.length], borderRadius:3, transition:'width 0.5s ease' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin   { to { transform:rotate(360deg); } }
        select option { background: ${isDark ? '#1e293b' : '#ffffff'}; color: ${colors.text}; }
        @media (max-width:1280px) {
          div[style*="repeat(4,1fr)"] { grid-template-columns: repeat(2,1fr) !important; }
          div[style*="3fr 2fr"]       { grid-template-columns: 1fr !important; }
          div[style*="1fr 1fr"]       { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
