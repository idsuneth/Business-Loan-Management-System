import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
  Banknote, CreditCard, Clock, Calendar, Activity, CheckCircle,
  AlertTriangle, FileText, Bell, ChevronRight, LayoutDashboard,
  TrendingUp, Users, RefreshCw, XCircle
} from 'lucide-react';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

const ACTIVITY_COLORS = {
  customer_registered:  { bg: 'rgba(59,130,246,0.12)',  color: '#3b82f6', Icon: Users },
  loan_application:     { bg: 'rgba(139,92,246,0.12)',   color: '#8b5cf6', Icon: FileText },
  loan_approved:        { bg: 'rgba(16,185,129,0.12)',   color: '#10b981', Icon: CheckCircle },
  loan_rejected:        { bg: 'rgba(239,68,68,0.12)',    color: '#ef4444', Icon: XCircle },
  loan_disbursed:       { bg: 'rgba(67,97,238,0.12)',    color: '#4361ee', Icon: Banknote },
  loan_overdue:         { bg: 'rgba(239,68,68,0.12)',    color: '#ef4444', Icon: AlertTriangle },
  interest_rate_changed:{ bg: 'rgba(245,158,11,0.12)',   color: '#f59e0b', Icon: TrendingUp },
  payment_received:     { bg: 'rgba(6,182,212,0.12)',    color: '#06b6d4', Icon: Banknote },
  default:              { bg: 'rgba(100,116,139,0.12)',  color: '#64748b', Icon: Activity },
};

const NOTIF_PRIORITY = {
  urgent: { bg: 'rgba(239,68,68,0.1)',   dot: '#ef4444' },
  high:   { bg: 'rgba(245,158,11,0.1)',  dot: '#f59e0b' },
  normal: { bg: 'rgba(67,97,238,0.08)',  dot: '#4361ee' },
};

export default function AdminDashboard({ onNavigate }) {
  const { isDark, colors } = useTheme();
  const [stats, setStats] = useState({
    totalPrincipalReleased: 0, activePrincipal: 0,
    pendingLoans: 0, dueTodayLoans: 0,
    activeLoans: 0, fullyPaidLoans: 0,
    overdueLoans: 0, requestedLoans: 0
  });
  const [period, setPeriod] = useState('daily');
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState([]);
  const [activities, setActivities] = useState([]);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => { fetchData(); }, [period]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [dashRes, actRes, notifRes] = await Promise.all([
        api.get(`/dashboard/stats?period=${period}`),
        api.get('/activities?limit=12'),
        api.get('/admin-notifications?unreadOnly=false')
      ]);
      const d = dashRes.data;
      setStats({
        totalPrincipalReleased: d.totalPrincipalReleased || 0,
        activePrincipal: d.activePrincipal || 0,
        pendingLoans: d.pendingLoans || 0,
        dueTodayLoans: d.dueTodayLoans || 0,
        activeLoans: d.activeLoans || 0,
        fullyPaidLoans: d.fullyPaidLoans || 0,
        overdueLoans: d.overdueLoans || 0,
        requestedLoans: d.requestedLoans || 0
      });
      if (d.chartData) setChartData(d.chartData);
      setActivities(actRes.data || []);
      setNotifications(notifRes.data?.slice(0, 6) || []);
    } catch (e) {
      console.error('Dashboard fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n) => new Intl.NumberFormat('en-LK', {
    style: 'currency', currency: 'LKR',
    minimumFractionDigits: 0, maximumFractionDigits: 0
  }).format(n).replace('LKR', 'Rs.');

  const timeAgo = (date) => {
    const d = Math.floor((Date.now() - new Date(date)) / 1000);
    if (d < 60) return `${d}s ago`;
    if (d < 3600) return `${Math.floor(d/60)}m ago`;
    if (d < 86400) return `${Math.floor(d/3600)}h ago`;
    return `${Math.floor(d/86400)}d ago`;
  };

  // ── Stat card definitions ───────────────────────────────────────────────────
  const statCards = [
    { label: 'Total Released',   value: fmt(stats.totalPrincipalReleased), Icon: Banknote,    accent: '#4361ee', filter: null,                     sub: 'All disbursed principal' },
    { label: 'Active Principal', value: fmt(stats.activePrincipal),        Icon: CreditCard,    accent: '#06b6d4', filter: { status:'active' },        sub: 'Outstanding balance' },
    { label: 'Active Loans',     value: stats.activeLoans,                 Icon: Activity,      accent: '#10b981', filter: { status:'active' },        sub: 'Running accounts' },
    { label: 'Pending',          value: stats.pendingLoans,                Icon: Clock,         accent: '#f59e0b', filter: { status:'pending' },       sub: 'Awaiting approval', urgent: stats.pendingLoans > 0 },
    { label: 'Due Today',        value: stats.dueTodayLoans,               Icon: Calendar,      accent: '#ef4444', navPage: 'repayments', filter: null,                     sub: 'Repayments due', urgent: stats.dueTodayLoans > 0 },
    { label: 'Overdue',          value: stats.overdueLoans,                Icon: AlertTriangle, accent: '#ef4444', navPage: 'all-loans',  filter: { status:'overdue' },     sub: 'Missed payments',   urgent: stats.overdueLoans > 0 },
    { label: 'Completed',        value: stats.fullyPaidLoans,              Icon: CheckCircle,   accent: '#10b981', filter: { status:'completed' },     sub: 'Fully settled' },
    { label: 'Requested',        value: stats.requestedLoans,              Icon: FileText,      accent: '#8b5cf6', filter: { status:'pending' },       sub: 'New applications' },
  ];

  const card = {
    background: isDark ? '#0f172a' : '#ffffff',
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'}`,
    borderRadius: '8px',
  };

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh' }}>
      <div style={{ width:36, height:36, border:'3px solid rgba(67,97,238,0.15)', borderTopColor:'#4361ee', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform:rotate(360deg); } }`}</style>
    </div>
  );

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div style={{ padding:'24px 28px', animation:'fadeIn 0.3s ease' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'28px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ width:42, height:42, borderRadius:10, background:'#4361ee', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow:'0 4px 12px rgba(67,97,238,0.3)' }}>
            <LayoutDashboard size={20} color="#ffffff" />
          </div>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:3 }}>
              <h1 style={{ fontSize:24, fontWeight:700, color:colors.text, margin:0 }}>Dashboard</h1>
              <span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', background:'rgba(16,185,129,0.12)', color:'#10b981', borderRadius:20, border:'1px solid rgba(16,185,129,0.2)' }}>
                Live
              </span>
            </div>
            <p style={{ color:colors.textMuted, fontSize:13, margin:0 }}>
              {period === 'daily' ? "Today's overview" : "This month's overview"}
            </p>
          </div>
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          {/* Period toggle */}
          <div style={{ display:'flex', background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)', borderRadius:8, padding:3 }}>
            {['daily','monthly'].map(p => (
              <button key={p} onClick={() => setPeriod(p)} style={{
                padding:'6px 14px', border:'none', borderRadius:6, cursor:'pointer',
                background: period === p ? '#4361ee' : 'transparent',
                color: period === p ? '#fff' : colors.textSecondary,
                fontSize:13, fontWeight:600, transition:'all 0.15s'
              }}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>

          {/* Refresh */}
          <button onClick={fetchData} style={{
            width:34, height:34, border:`1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
            borderRadius:8, background:'transparent', cursor:'pointer',
            display:'flex', alignItems:'center', justifyContent:'center'
          }}>
            <RefreshCw size={15} color={colors.textMuted} />
          </button>
        </div>
      </div>

      {/* ── Stat Cards ─────────────────────────────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:24 }}>
        {statCards.map((s, i) => {
          const isMonetary = i < 2;
          return (
            <div
              key={i}
              onClick={() => (s.navPage || s.filter) && onNavigate && onNavigate(s.navPage || 'all-loans', s.filter)}
              style={{
                ...card,
                padding:'18px 20px',
                cursor: (s.navPage || s.filter) ? 'pointer' : 'default',
                transition:'transform 0.15s, box-shadow 0.15s',
                outline: s.urgent ? `1.5px solid ${s.accent}40` : 'none',
              }}
              onMouseEnter={e => { if (s.navPage || s.filter) { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow = isDark ? '0 6px 20px rgba(0,0,0,0.3)' : '0 6px 20px rgba(0,0,0,0.08)'; }}}
              onMouseLeave={e => { e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='none'; }}
            >
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
                <div style={{ width:36, height:36, borderRadius:9, background:`${s.accent}18`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <s.Icon size={17} color={s.accent} strokeWidth={2} />
                </div>
                {s.urgent && (
                  <span style={{ width:8, height:8, borderRadius:'50%', background:s.accent, display:'block', boxShadow:`0 0 0 3px ${s.accent}25` }} />
                )}
              </div>

              <p style={{ fontSize: isMonetary ? 17 : 26, fontWeight:700, color:colors.text, margin:'0 0 4px', lineHeight:1.2 }}>
                {s.value}
              </p>
              <p style={{ fontSize:13, fontWeight:600, color:colors.textSecondary, margin:'0 0 2px' }}>{s.label}</p>
              <p style={{ fontSize:11, color:colors.textMuted, margin:0 }}>{s.sub}</p>

              {(s.navPage || s.filter) && (
                <div style={{ display:'flex', alignItems:'center', gap:4, marginTop:12 }}>
                  <span style={{ fontSize:11, color:s.accent, fontWeight:600 }}>View details</span>
                  <ChevronRight size={12} color={s.accent} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Middle Row: Chart + Activity ───────────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'3fr 2fr', gap:16, marginBottom:16 }}>

        {/* Chart */}
        <div style={{ ...card, padding:'20px 24px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
            <div>
              <h2 style={{ fontSize:15, fontWeight:600, color:colors.text, margin:'0 0 2px' }}>Monthly Loan Trends</h2>
              <p style={{ fontSize:12, color:colors.textMuted, margin:0 }}>Applications vs. approved</p>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:14 }}>
              {[{ color:'#4361ee', label:'Applications' }, { color:'#10b981', label:'Approved' }].map(l => (
                <div key={l.label} style={{ display:'flex', alignItems:'center', gap:5 }}>
                  <span style={{ width:10, height:10, borderRadius:3, background:l.color, display:'block' }} />
                  <span style={{ fontSize:11, color:colors.textMuted }}>{l.label}</span>
                </div>
              ))}
            </div>
          </div>

          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'} vertical={false} />
              <XAxis dataKey="month" stroke={colors.textMuted} fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke={colors.textMuted} fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip
                cursor={{ fill: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}
                contentStyle={{ background: isDark ? '#1e293b' : '#fff', border:`1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`, borderRadius:8, fontSize:12 }}
              />
              <Bar dataKey="loans"    fill="#4361ee" name="Applications" radius={[5,5,0,0]} maxBarSize={24} />
              <Bar dataKey="approved" fill="#10b981" name="Approved"     radius={[5,5,0,0]} maxBarSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Activity */}
        <div style={{ ...card, padding:'20px', display:'flex', flexDirection:'column' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
            <h2 style={{ fontSize:15, fontWeight:600, color:colors.text, margin:0 }}>Recent Activity</h2>
            <span style={{ fontSize:11, color:colors.textMuted }}>{activities.length} events</span>
          </div>

          <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:2, maxHeight:220, scrollbarWidth:'none' }}>
            {activities.length === 0 ? (
              <p style={{ color:colors.textMuted, fontSize:13, textAlign:'center', padding:'24px 0' }}>No recent activity</p>
            ) : activities.map((a, i) => {
              const cfg = ACTIVITY_COLORS[a.type] || ACTIVITY_COLORS.default;
              return (
                <div key={a.id || i} style={{
                  display:'flex', alignItems:'flex-start', gap:10, padding:'9px 8px',
                  borderRadius:8, transition:'background 0.12s'
                }}
                  onMouseEnter={e => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ width:30, height:30, borderRadius:8, background:cfg.bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <cfg.Icon size={14} color={cfg.color} strokeWidth={2} />
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontSize:12, fontWeight:600, color:colors.text, margin:'0 0 1px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                      {a.title || a.type.replace(/_/g,' ')}
                    </p>
                    <p style={{ fontSize:11, color:colors.textMuted, margin:0, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                      {a.description}
                    </p>
                  </div>
                  <span style={{ fontSize:10, color:colors.textMuted, flexShrink:0, marginTop:2 }}>{timeAgo(a.createdAt)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Notifications ──────────────────────────────────────────────────── */}
      <div style={{ ...card, padding:'20px 24px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <h2 style={{ fontSize:15, fontWeight:600, color:colors.text, margin:0 }}>Notifications</h2>
            {unreadCount > 0 && (
              <span style={{ fontSize:11, fontWeight:700, padding:'1px 8px', background:'rgba(239,68,68,0.12)', color:'#ef4444', borderRadius:20, border:'1px solid rgba(239,68,68,0.2)' }}>
                {unreadCount} new
              </span>
            )}
          </div>
          <button
            onClick={() => onNavigate && onNavigate('notifications')}
            style={{ fontSize:12, color:'#4361ee', background:'transparent', border:'none', cursor:'pointer', fontWeight:600, display:'flex', alignItems:'center', gap:4 }}
          >
            See all <ChevronRight size={13} color="#4361ee" />
          </button>
        </div>

        {notifications.length === 0 ? (
          <div style={{ textAlign:'center', padding:'24px 0' }}>
            <Bell size={28} color={colors.textMuted} strokeWidth={1.5} />
            <p style={{ fontSize:13, color:colors.textMuted, marginTop:8 }}>All caught up</p>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
            {notifications.map((n) => {
              const prio = NOTIF_PRIORITY[n.priority] || NOTIF_PRIORITY.normal;
              return (
                <div
                  key={n.id}
                  onClick={async () => {
                    try { await api.put(`/admin-notifications/${n.id}/read`); } catch {}
                    setNotifications(prev => prev.map(x => x.id === n.id ? {...x, isRead:true} : x));
                    if (n.type === 'loan_pending') onNavigate?.('approvals');
                    else if (n.type === 'loan_overdue') onNavigate?.('all-loans', { status:'overdue' });
                  }}
                  style={{
                    padding:'12px 14px',
                    borderRadius:10,
                    border:`1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`,
                    background: n.isRead ? (isDark ? 'rgba(255,255,255,0.02)' : '#fafafa') : (isDark ? 'rgba(67,97,238,0.08)' : 'rgba(67,97,238,0.04)'),
                    cursor:'pointer',
                    transition:'background 0.15s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(67,97,238,0.07)'}
                  onMouseLeave={e => e.currentTarget.style.background = n.isRead ? (isDark ? 'rgba(255,255,255,0.02)' : '#fafafa') : (isDark ? 'rgba(67,97,238,0.08)' : 'rgba(67,97,238,0.04)')}
                >
                  <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
                    <div style={{ position:'relative', flexShrink:0 }}>
                      <div style={{ width:34, height:34, borderRadius:9, background:prio.bg, display:'flex', alignItems:'center', justifyContent:'center' }}>
                        {n.type === 'loan_overdue'
                          ? <AlertTriangle size={16} color={prio.dot} strokeWidth={2} />
                          : n.type === 'payment_due'
                          ? <Calendar size={16} color={prio.dot} strokeWidth={2} />
                          : <Clock size={16} color={prio.dot} strokeWidth={2} />
                        }
                      </div>
                      {!n.isRead && (
                        <span style={{ position:'absolute', top:-2, right:-2, width:8, height:8, borderRadius:'50%', background:prio.dot, border:'2px solid ' + (isDark ? '#0f172a' : '#fff') }} />
                      )}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontSize:12, fontWeight:600, color:colors.text, margin:'0 0 3px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                        {n.title}
                      </p>
                      <p style={{ fontSize:11, color:colors.textMuted, margin:'0 0 6px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {n.message}
                      </p>
                      <span style={{ fontSize:10, color:colors.textMuted }}>{timeAgo(n.createdAt)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @media (max-width:1280px) {
          div[style*="repeat(4,1fr)"] { grid-template-columns: repeat(2,1fr) !important; }
          div[style*="3fr 2fr"]       { grid-template-columns: 1fr !important; }
          div[style*="repeat(3,1fr)"] { grid-template-columns: repeat(2,1fr) !important; }
        }
        @media (max-width:800px) {
          div[style*="repeat(2,1fr)"] { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
