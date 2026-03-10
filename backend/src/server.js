require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');

const authRoutes = require('./routes/auth');
const customerRoutes = require('./routes/customers');
const loanRoutes = require('./routes/loans');
const aiRoutes = require('./routes/ai');
const uploadRoutes = require('./routes/upload');
const repaymentRoutes = require('./routes/repayments');
const loanTypeRoutes = require('./routes/loanTypes');
const notificationRoutes = require('./routes/notifications');
const activityRoutes = require('./routes/activities');
const adminNotificationRoutes = require('./routes/adminNotifications');
const notificationService = require('./services/notificationService');

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173', 'http://127.0.0.1:3000', 'http://127.0.0.1:5173'],
  credentials: true
}));
app.use(express.json());

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Make prisma available to routes
app.use((req, res, next) => {
  req.prisma = prisma;
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/repayments', repaymentRoutes);
app.use('/api/loan-types', loanTypeRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/admin-notifications', adminNotificationRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'SmartLoan API is running' });
});

// Dashboard stats - Enhanced with payment breakdowns
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const { period } = req.query; // 'daily' or 'monthly'
    
    const now = new Date();
    let startDate;
    
    if (period === 'daily') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      allLoans,
      allRepayments,
      periodPaidRepayments,
      dueTodayRepayments,
      overdueRepayments
    ] = await Promise.all([
      prisma.loan.findMany({
        include: { repayments: true, loanType: true }
      }),
      prisma.repayment.findMany({
        include: { loan: true }
      }),
      prisma.repayment.findMany({
        where: {
          status: 'paid',
          paidDate: { gte: startDate }
        }
      }),
      prisma.repayment.findMany({
        where: {
          status: 'pending',
          dueDate: { gte: today, lt: tomorrow }
        }
      }),
      prisma.repayment.findMany({
        where: { status: 'overdue' }
      })
    ]);

    // Calculate loan stats
    const pendingLoans = allLoans.filter(l => l.status === 'pending').length;
    const activeLoans = allLoans.filter(l => ['active', 'disbursed', 'approved'].includes(l.status)).length;
    const completedLoans = allLoans.filter(l => l.status === 'completed').length;
    const requestedLoans = allLoans.filter(l => l.status === 'pending').length;
    const defaultedLoans = allLoans.filter(l => l.status === 'defaulted').length;

    // Calculate total principal released (all approved/active/completed loans)
    const disbursedLoans = allLoans.filter(l => ['active', 'disbursed', 'approved', 'completed'].includes(l.status));
    const totalPrincipalReleased = disbursedLoans.reduce((sum, l) => sum + (l.amount || 0), 0);

    // Calculate active principal — only subtract principal portions already paid
    const paidRepayments = allRepayments.filter(r => r.status === 'paid');
    const totalPrincipalPaid = paidRepayments.reduce((sum, r) => sum + (r.principalAmount || 0), 0);
    // Fallback: if principalAmount not stored, estimate from amount minus typical interest
    const activePrincipal = Math.max(0, totalPrincipalReleased - totalPrincipalPaid);

    // Payment Breakdown - Calculate paid, due, and pending for each category
    const paymentBreakdown = {
      principal: { paid: 0, due: 0, pending: 0 },
      interest: { paid: 0, due: 0, pending: 0 },
      penalty: { paid: 0, due: 0, pending: 0 },
      fees: { paid: 0, due: 0, pending: 0 }
    };

    // Calculate from period-paid repayments
    periodPaidRepayments.forEach(r => {
      paymentBreakdown.principal.paid += r.principalAmount || 0;
      paymentBreakdown.interest.paid += r.regularInterest || 0;
      paymentBreakdown.penalty.paid += (r.lateInterest || 0) + (r.penalty || 0);
    });

    // Calculate due today
    dueTodayRepayments.forEach(r => {
      paymentBreakdown.principal.due += r.principalAmount || 0;
      paymentBreakdown.interest.due += r.regularInterest || 0;
    });

    // Calculate overdue (penalty due)
    overdueRepayments.forEach(r => {
      paymentBreakdown.principal.due += r.principalAmount || 0;
      paymentBreakdown.interest.due += r.regularInterest || 0;
      paymentBreakdown.penalty.due += (r.lateInterest || 0) + (r.penalty || 0);
    });

    // Calculate pending (future payments)
    const pendingRepayments = allRepayments.filter(r => r.status === 'pending' && new Date(r.dueDate) > tomorrow);
    pendingRepayments.forEach(r => {
      paymentBreakdown.principal.pending += r.principalAmount || 0;
      paymentBreakdown.interest.pending += r.regularInterest || 0;
    });

    // Fees from loans
    disbursedLoans.forEach(l => {
      paymentBreakdown.fees.pending += l.processingFee || 0;
    });

    // Generate chart data (last 6 months)
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const chartData = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthLoans = allLoans.filter(l => {
        const loanDate = new Date(l.createdAt);
        return loanDate.getMonth() === d.getMonth() && loanDate.getFullYear() === d.getFullYear();
      });
      const monthApproved = monthLoans.filter(l => ['active', 'approved', 'disbursed', 'completed'].includes(l.status));
      chartData.push({
        month: months[d.getMonth()],
        loans: monthLoans.length,
        approved: monthApproved.length
      });
    }

    // Count unique loans (not individual installments)
    const overdueUniqueLoanIds = [...new Set(overdueRepayments.map(r => r.loanId))];
    const dueTodayUniqueLoanIds = [...new Set(dueTodayRepayments.map(r => r.loanId))];

    res.json({
      // Counts
      totalPrincipalReleased,
      activePrincipal,
      pendingLoans,
      activeLoans,
      fullyPaidLoans: completedLoans,
      overdueLoans: overdueUniqueLoanIds.length,
      defaultedLoans,
      requestedLoans,
      dueTodayLoans: dueTodayUniqueLoanIds.length,
      
      // Payment breakdown for cards
      paymentBreakdown,
      
      // Chart data
      chartData,
      
      // Period info
      period: period || 'monthly',
      periodStart: startDate.toISOString()
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Setup cron job for automatic overdue notifications
// Runs every day at 9:00 AM
cron.schedule('0 9 * * *', async () => {
  console.log('🕐 Running scheduled overdue payment check...');
  try {
    // First update overdue statuses
    const overdueResults = await notificationService.checkAndUpdateOverduePayments();
    console.log(`📊 Updated ${overdueResults.length} overdue payments`);
    
    // Then send notifications
    const notifyResults = await notificationService.sendBulkOverdueNotifications();
    console.log(`📧 Sent ${notifyResults.sent} overdue notifications`);
  } catch (error) {
    console.error('❌ Error in scheduled overdue check:', error);
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 SmartLoan API running on http://localhost:${PORT}`);
  console.log(`📅 Overdue notification cron job scheduled for 9:00 AM daily`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
