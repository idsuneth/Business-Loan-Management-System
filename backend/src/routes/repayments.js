const express = require('express');
const router = express.Router();

// Record a general payment for a loan (creates or updates repayment)
router.post('/', async (req, res) => {
  try {
    const prisma = req.prisma;
    const { loanId, amount, paymentType, paymentMethod, notes } = req.body;

    if (!loanId || !amount) {
      return res.status(400).json({ error: 'loanId and amount are required' });
    }

    const loan = await prisma.loan.findUnique({
      where: { id: parseInt(loanId) },
      include: {
        repayments: {
          where: { status: { in: ['pending', 'overdue'] } },
          orderBy: { monthNumber: 'asc' }
        }
      }
    });

    if (!loan) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    const paymentAmount = parseFloat(amount);
    let remainingPayment = paymentAmount;
    let paidRepayments = [];

    // Pay off pending/overdue repayments in order
    for (const repayment of loan.repayments) {
      if (remainingPayment <= 0) break;

      const totalDue = (repayment.amount || 0) + (repayment.lateInterest || 0);
      
      if (remainingPayment >= totalDue) {
        // Full payment for this repayment
        await prisma.repayment.update({
          where: { id: repayment.id },
          data: {
            status: 'paid',
            paidDate: new Date(),
            paymentMethod: paymentMethod || 'cash',
            transactionRef: notes || null
          }
        });
        remainingPayment -= totalDue;
        paidRepayments.push(repayment.id);
      } else {
        // Partial payment - update the remaining amount
        await prisma.repayment.update({
          where: { id: repayment.id },
          data: {
            status: 'partial',
            amount: repayment.amount - remainingPayment
          }
        });
        remainingPayment = 0;
      }
    }

    // Calculate new totals
    const paidRepaymentsList = await prisma.repayment.findMany({
      where: { loanId: parseInt(loanId), status: 'paid' }
    });
    const totalPaid = paidRepaymentsList.reduce((sum, r) => sum + (r.amount || 0), 0);
    const remainingAmount = (loan.totalAmount || loan.amount) - totalPaid;

    // Check if loan is fully paid
    const pendingCount = await prisma.repayment.count({
      where: {
        loanId: parseInt(loanId),
        status: { in: ['pending', 'overdue', 'partial'] }
      }
    });

    const isFullyPaid = pendingCount === 0;

    if (isFullyPaid) {
      await prisma.loan.update({
        where: { id: parseInt(loanId) },
        data: { status: 'completed' }
      });
    }

    // Create activity for payment
    try {
      await prisma.activity.create({
        data: {
          type: 'payment_received',
          title: 'Payment Received',
          description: `Payment of Rs. ${paymentAmount.toLocaleString()} received for loan #${loanId}`,
          entityType: 'loan',
          entityId: parseInt(loanId)
        }
      });
    } catch (activityError) {
      console.log('Activity logging skipped:', activityError.message);
    }

    res.json({
      success: true,
      message: 'Payment recorded successfully',
      amountPaid: paymentAmount,
      totalPaid,
      remainingAmount,
      isFullyPaid,
      paidRepayments
    });
  } catch (error) {
    console.error('Record payment error:', error);
    res.status(500).json({ error: 'Failed to record payment', details: error.message });
  }
});

// Pay full remaining amount
router.post('/pay-full/:loanId', async (req, res) => {
  try {
    const prisma = req.prisma;
    const loanId = parseInt(req.params.loanId);
    const { notes } = req.body;

    const loan = await prisma.loan.findUnique({
      where: { id: loanId },
      include: {
        repayments: {
          where: { status: { in: ['pending', 'overdue', 'partial'] } }
        },
        customer: true
      }
    });

    if (!loan) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    // Mark all pending repayments as paid
    for (const repayment of loan.repayments) {
      await prisma.repayment.update({
        where: { id: repayment.id },
        data: {
          status: 'paid',
          paidDate: new Date(),
          paymentMethod: 'full_payment',
          transactionRef: notes || 'Full payment'
        }
      });
    }

    // Mark loan as completed
    await prisma.loan.update({
      where: { id: loanId },
      data: { status: 'completed' }
    });

    // Create activity
    try {
      await prisma.activity.create({
        data: {
          type: 'loan_completed',
          title: 'Loan Completed',
          description: `${loan.customer?.fullName || 'Customer'} completed full payment for loan`,
          entityType: 'loan',
          entityId: loanId
        }
      });
    } catch (activityError) {
      console.log('Activity logging skipped');
    }

    res.json({
      success: true,
      message: 'Full payment recorded and loan completed',
      isFullyPaid: true
    });
  } catch (error) {
    console.error('Full payment error:', error);
    res.status(500).json({ error: 'Failed to process full payment', details: error.message });
  }
});

// Get repayment summary for a loan (for history modal)
router.get('/summary/:loanId', async (req, res) => {
  try {
    const prisma = req.prisma;
    const loanId = parseInt(req.params.loanId);

    const loan = await prisma.loan.findUnique({
      where: { id: loanId },
      include: {
        repayments: {
          orderBy: { monthNumber: 'asc' }
        }
      }
    });

    if (!loan) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    const paidRepayments = loan.repayments.filter(r => r.status === 'paid');
    const totalPaid = paidRepayments.reduce((sum, r) => sum + (r.amount || 0), 0);
    const remainingAmount = (loan.totalAmount || loan.amount) - totalPaid;
    const isFullyPaid = loan.repayments.every(r => r.status === 'paid');

    // Group by month
    const monthlyPayments = [];
    const monthGroups = {};
    
    paidRepayments.forEach(r => {
      if (r.paidDate) {
        const date = new Date(r.paidDate);
        const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
        if (!monthGroups[key]) {
          monthGroups[key] = {
            year: date.getFullYear(),
            month: date.getMonth() + 1,
            monthName: date.toLocaleString('default', { month: 'short' }),
            count: 0,
            total: 0
          };
        }
        monthGroups[key].count++;
        monthGroups[key].total += r.amount || 0;
      }
    });

    Object.values(monthGroups).forEach(m => monthlyPayments.push(m));
    monthlyPayments.sort((a, b) => b.year - a.year || b.month - a.month);

    // Recent payments
    const recentPayments = paidRepayments
      .filter(r => r.paidDate)
      .sort((a, b) => new Date(b.paidDate) - new Date(a.paidDate))
      .slice(0, 10)
      .map(r => ({
        paymentId: `PMT-${r.id.toString().padStart(4, '0')}`,
        amount: r.amount || 0,
        paidDate: r.paidDate,
        paymentType: r.paymentMethod || 'cash'
      }));

    res.json({
      totalPaid,
      remainingAmount,
      isFullyPaid,
      monthlyPayments,
      weeklyPayments: [],
      recentPayments
    });
  } catch (error) {
    console.error('Get repayment summary error:', error);
    res.status(500).json({ error: 'Failed to fetch repayment summary' });
  }
});

// Get all repayments with filters
router.get('/', async (req, res) => {
  try {
    const prisma = req.prisma;
    const { loanId, status, startDate, endDate } = req.query;
    
    const where = {};
    if (loanId) where.loanId = parseInt(loanId);
    if (status && status !== 'all') where.status = status;
    
    if (startDate || endDate) {
      where.dueDate = {};
      if (startDate) where.dueDate.gte = new Date(startDate);
      if (endDate) where.dueDate.lte = new Date(endDate);
    }
    
    const repayments = await prisma.repayment.findMany({
      where,
      include: {
        loan: {
          include: {
            customer: {
              select: {
                id: true,
                fullName: true,
                email: true,
                phone: true
              }
            },
            loanType: true
          }
        }
      },
      orderBy: { dueDate: 'asc' }
    });

    // Update overdue status for pending repayments
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const repayment of repayments) {
      if (repayment.status === 'pending' && new Date(repayment.dueDate) < today) {
        const daysOverdue = Math.floor((today - new Date(repayment.dueDate)) / (1000 * 60 * 60 * 24));
        const lateRate = repayment.loan.latePaymentRate || 0.1;
        const lateInterest = (repayment.principalAmount || 0) * lateRate * daysOverdue / 100;

        await prisma.repayment.update({
          where: { id: repayment.id },
          data: {
            status: 'overdue',
            daysOverdue,
            lateInterest
          }
        });

        repayment.status = 'overdue';
        repayment.daysOverdue = daysOverdue;
        repayment.lateInterest = lateInterest;
      }
    }
    
    res.json(repayments);
  } catch (error) {
    console.error('Get repayments error:', error);
    res.status(500).json({ error: 'Failed to fetch repayments' });
  }
});

// Get repayment schedule for a loan
router.get('/loan/:loanId', async (req, res) => {
  try {
    const prisma = req.prisma;
    const loanId = parseInt(req.params.loanId);
    
    const loan = await prisma.loan.findUnique({
      where: { id: loanId },
      include: { 
        customer: true,
        loanType: true,
        repayments: {
          orderBy: { monthNumber: 'asc' }
        }
      }
    });
    
    if (!loan) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    // Auto-generate repayment schedule if loan is approved/active but has no repayments
    if (
      loan.repayments.length === 0 &&
      ['approved', 'active', 'disbursed'].includes(loan.status) &&
      loan.term > 0
    ) {
      const startDate = loan.approvedAt || loan.disbursedAt || loan.createdAt || new Date();
      const monthlyPayment = loan.monthlyPayment || (loan.totalAmount || loan.amount) / loan.term;
      const principalPerMonth = loan.amount / loan.term;
      const totalInterest = (loan.totalAmount || loan.amount) - loan.amount;
      const interestPerMonth = totalInterest / loan.term;

      for (let i = 1; i <= loan.term; i++) {
        const dueDate = new Date(startDate);
        dueDate.setMonth(dueDate.getMonth() + i);

        const rep = await prisma.repayment.create({
          data: {
            loanId: loan.id,
            monthNumber: i,
            amount: Math.round(monthlyPayment),
            principalAmount: Math.round(principalPerMonth),
            regularInterest: Math.round(interestPerMonth),
            lateInterest: 0,
            penalty: 0,
            dueDate,
            status: 'pending',
            daysOverdue: 0
          }
        });
        loan.repayments.push(rep);
      }

      // Sort by month number after generation
      loan.repayments.sort((a, b) => a.monthNumber - b.monthNumber);
    }

    // Update overdue status and compute late interest
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const repayment of loan.repayments) {
      if ((repayment.status === 'pending' || repayment.status === 'overdue') && new Date(repayment.dueDate) < today) {
        const daysOverdue = Math.floor((today - new Date(repayment.dueDate)) / (1000 * 60 * 60 * 24));
        const lateRate = loan.loanType?.latePaymentRate || loan.latePaymentRate || 0.1;
        // Late interest = principal * daily rate * days overdue
        const lateInterest = Math.round((repayment.principalAmount || 0) * lateRate * daysOverdue / 100);

        await prisma.repayment.update({
          where: { id: repayment.id },
          data: {
            status: 'overdue',
            daysOverdue,
            lateInterest
          }
        });

        repayment.status = 'overdue';
        repayment.daysOverdue = daysOverdue;
        repayment.lateInterest = lateInterest;
      }
    }
    
    // Calculate summary with proper totals
    const paidRepayments = loan.repayments.filter(r => r.status === 'paid');
    const pendingRepayments = loan.repayments.filter(r => r.status === 'pending');
    const overdueRepayments = loan.repayments.filter(r => r.status === 'overdue');
    
    // Compute breakdown values
    const totalPrincipal = loan.repayments.reduce((sum, r) => sum + (r.principalAmount || 0), 0) || loan.amount;
    const totalRegularInterest = loan.repayments.reduce((sum, r) => sum + (r.regularInterest || 0), 0);
    const totalLateInterest = loan.repayments.reduce((sum, r) => sum + (r.lateInterest || 0), 0);
    const totalPenalty = loan.repayments.reduce((sum, r) => sum + (r.penalty || 0), 0);
    
    // Total paid = sum of paid repayments (principal + regular interest) + any late interest/penalty they paid
    const paidAmount = paidRepayments.reduce((sum, r) => {
      return sum + (r.principalAmount || 0) + (r.regularInterest || 0) + (r.lateInterest || 0) + (r.penalty || 0);
    }, 0);
    
    const totalAmount = totalPrincipal + totalRegularInterest + totalLateInterest + totalPenalty;
    const remainingAmount = Math.max(0, totalAmount - paidAmount);
    
    res.json({
      loan: {
        id: loan.id,
        amount: loan.amount,
        totalAmount: loan.totalAmount || totalAmount,
        term: loan.term,
        interestRate: loan.interestRate,
        latePaymentRate: loan.loanType?.latePaymentRate || loan.latePaymentRate || 0.1,
        monthlyPayment: loan.monthlyPayment,
        status: loan.status,
        loanTypeName: loan.loanType?.name || loan.purpose,
        customer: loan.customer
      },
      repayments: loan.repayments,
      summary: {
        totalPrincipal,
        totalRegularInterest,
        totalLateInterest,
        totalPenalty,
        totalAmount,
        paidAmount,
        remainingAmount,
        completedPayments: paidRepayments.length,
        pendingPayments: pendingRepayments.length,
        overduePayments: overdueRepayments.length,
        isFullyPaid: pendingRepayments.length === 0 && overdueRepayments.length === 0
      }
    });
  } catch (error) {
    console.error('Get loan repayments error:', error);
    res.status(500).json({ error: 'Failed to fetch loan repayments' });
  }
});

// Record a payment for a specific repayment
router.post('/pay/:id', async (req, res) => {
  try {
    const prisma = req.prisma;
    const repaymentId = parseInt(req.params.id);
    const { paymentMethod, transactionRef, receivedBy, notes } = req.body;
    
    const repayment = await prisma.repayment.findUnique({
      where: { id: repaymentId },
      include: {
        loan: {
          include: { customer: true, loanType: true }
        }
      }
    });
    
    if (!repayment) {
      return res.status(404).json({ error: 'Repayment not found' });
    }
    
    if (repayment.status === 'paid') {
      return res.status(400).json({ error: 'This payment has already been recorded' });
    }

    // Calculate total amount including late interest
    const totalAmount = (repayment.amount || 0) + (repayment.lateInterest || 0);
    
    const updatedRepayment = await prisma.repayment.update({
      where: { id: repaymentId },
      data: {
        status: 'paid',
        paidDate: new Date(),
        amount: totalAmount, // Update to include late interest
        paymentMethod: paymentMethod || 'cash',
        transactionRef: transactionRef || null,
        receivedBy: receivedBy || null
      },
      include: {
        loan: {
          include: { customer: true }
        }
      }
    });

    // Check if all repayments are paid
    const pendingCount = await prisma.repayment.count({
      where: {
        loanId: repayment.loanId,
        status: { in: ['pending', 'overdue'] }
      }
    });

    if (pendingCount === 0) {
      await prisma.loan.update({
        where: { id: repayment.loanId },
        data: { status: 'completed' }
      });
    }
    
    res.json({
      repayment: updatedRepayment,
      message: 'Payment recorded successfully',
      loanCompleted: pendingCount === 0
    });
  } catch (error) {
    console.error('Record payment error:', error);
    res.status(500).json({ error: 'Failed to record payment', details: error.message });
  }
});

// Record partial payment
router.post('/partial/:id', async (req, res) => {
  try {
    const prisma = req.prisma;
    const repaymentId = parseInt(req.params.id);
    const { amount, paymentMethod, transactionRef, receivedBy } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    const repayment = await prisma.repayment.findUnique({
      where: { id: repaymentId },
      include: {
        loan: true
      }
    });
    
    if (!repayment) {
      return res.status(404).json({ error: 'Repayment not found' });
    }
    
    if (repayment.status === 'paid') {
      return res.status(400).json({ error: 'This payment has already been fully paid' });
    }

    const totalDue = (repayment.amount || 0) + (repayment.lateInterest || 0);
    const paidAmount = parseFloat(amount);

    if (paidAmount >= totalDue) {
      // Full payment
      await prisma.repayment.update({
        where: { id: repaymentId },
        data: {
          status: 'paid',
          paidDate: new Date(),
          amount: totalDue,
          paymentMethod: paymentMethod || 'cash',
          transactionRef,
          receivedBy
        }
      });
    } else {
      // Partial payment - mark as partial and reduce amount
      await prisma.repayment.update({
        where: { id: repaymentId },
        data: {
          status: 'partial',
          amount: repayment.amount - paidAmount,
          paymentMethod: paymentMethod || 'cash'
        }
      });
    }

    res.json({
      message: paidAmount >= totalDue ? 'Full payment recorded' : 'Partial payment recorded',
      amountPaid: paidAmount,
      remainingAmount: Math.max(0, totalDue - paidAmount)
    });
  } catch (error) {
    console.error('Partial payment error:', error);
    res.status(500).json({ error: 'Failed to record partial payment' });
  }
});

// Get overdue repayments
router.get('/overdue', async (req, res) => {
  try {
    const prisma = req.prisma;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // First update all overdue statuses
    const pendingOverdue = await prisma.repayment.findMany({
      where: {
        status: 'pending',
        dueDate: { lt: today }
      },
      include: {
        loan: true
      }
    });

    for (const repayment of pendingOverdue) {
      const daysOverdue = Math.floor((today - new Date(repayment.dueDate)) / (1000 * 60 * 60 * 24));
      const lateRate = repayment.loan.latePaymentRate || 0.1;
      const lateInterest = (repayment.principalAmount || 0) * lateRate * daysOverdue / 100;

      await prisma.repayment.update({
        where: { id: repayment.id },
        data: {
          status: 'overdue',
          daysOverdue,
          lateInterest
        }
      });
    }

    // Get all overdue repayments
    const overdueRepayments = await prisma.repayment.findMany({
      where: { status: 'overdue' },
      include: {
        loan: {
          include: {
            customer: {
              select: {
                id: true,
                fullName: true,
                email: true,
                phone: true
              }
            },
            loanType: true
          }
        }
      },
      orderBy: { daysOverdue: 'desc' }
    });
    
    res.json(overdueRepayments);
  } catch (error) {
    console.error('Get overdue repayments error:', error);
    res.status(500).json({ error: 'Failed to fetch overdue repayments' });
  }
});

// Get upcoming payments (due within X days)
router.get('/upcoming', async (req, res) => {
  try {
    const prisma = req.prisma;
    const days = parseInt(req.query.days) || 7; // Default to 7 days
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + days);
    futureDate.setHours(23, 59, 59, 999);

    const upcomingPayments = await prisma.repayment.findMany({
      where: {
        status: 'pending',
        dueDate: {
          gt: today, // Greater than today (not due today)
          lte: futureDate // Within the next X days
        }
      },
      include: {
        loan: {
          include: {
            customer: {
              select: {
                id: true,
                fullName: true,
                email: true,
                phone: true
              }
            },
            loanType: true
          }
        }
      },
      orderBy: { dueDate: 'asc' }
    });
    
    res.json(upcomingPayments);
  } catch (error) {
    console.error('Get upcoming payments error:', error);
    res.status(500).json({ error: 'Failed to fetch upcoming payments' });
  }
});

// Get due today repayments
router.get('/due-today', async (req, res) => {
  try {
    const prisma = req.prisma;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dueToday = await prisma.repayment.findMany({
      where: {
        status: 'pending',
        dueDate: {
          gte: today,
          lt: tomorrow
        }
      },
      include: {
        loan: {
          include: {
            customer: {
              select: {
                id: true,
                fullName: true,
                email: true,
                phone: true
              }
            },
            loanType: true
          }
        }
      },
      orderBy: { dueDate: 'asc' }
    });
    
    res.json(dueToday);
  } catch (error) {
    console.error('Get due today error:', error);
    res.status(500).json({ error: 'Failed to fetch due today repayments' });
  }
});

// Get payment summary stats
router.get('/stats', async (req, res) => {
  try {
    const prisma = req.prisma;
    const { period } = req.query;
    
    const now = new Date();
    let startDate;
    
    if (period === 'daily') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (period === 'weekly') {
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 7);
    } else {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const [
      totalCollected,
      totalPending,
      totalOverdue,
      recentPayments
    ] = await Promise.all([
      prisma.repayment.aggregate({
        where: {
          status: 'paid',
          paidDate: { gte: startDate }
        },
        _sum: { amount: true }
      }),
      prisma.repayment.aggregate({
        where: { status: 'pending' },
        _sum: { amount: true }
      }),
      prisma.repayment.aggregate({
        where: { status: 'overdue' },
        _sum: { amount: true, lateInterest: true }
      }),
      prisma.repayment.findMany({
        where: { status: 'paid' },
        include: {
          loan: {
            include: { customer: true }
          }
        },
        orderBy: { paidDate: 'desc' },
        take: 10
      })
    ]);

    res.json({
      period: period || 'monthly',
      totalCollected: totalCollected._sum.amount || 0,
      totalPending: totalPending._sum.amount || 0,
      totalOverdue: (totalOverdue._sum.amount || 0) + (totalOverdue._sum.lateInterest || 0),
      recentPayments
    });
  } catch (error) {
    console.error('Get repayment stats error:', error);
    res.status(500).json({ error: 'Failed to fetch repayment stats' });
  }
});

module.exports = router;
