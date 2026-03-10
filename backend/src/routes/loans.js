const express = require('express');
const router = express.Router();

// Get all loans with filters
router.get('/', async (req, res) => {
  try {
    const prisma = req.prisma;
    const { status, loanType, search, startDate, endDate, customerId } = req.query;

    const where = {};
    
    // Customer ID filter
    if (customerId) {
      where.customerId = parseInt(customerId);
    }
    
    // Status filter
    if (status && status !== 'all') {
      if (status === 'overdue') {
        // Overdue loans are stored as 'active' in DB but have overdue repayments
        where.status = 'active';
        where.repayments = { some: { status: 'overdue' } };
      } else {
        where.status = status;
      }
    }
    
    // Loan type filter
    if (loanType && loanType !== 'all') {
      where.loanTypeId = parseInt(loanType);
    }
    
    // Date range filter
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }
    
    // Search filter (customer name)
    if (search) {
      where.customer = {
        fullName: {
          contains: search
        }
      };
    }

    const loans = await prisma.loan.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            creditScore: true,
            nic: true,
            address: true,
            city: true,
            monthlyIncome: true,
            occupation: true,
            employer: true
          }
        },
        loanType: true,
        repayments: {
          orderBy: { monthNumber: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Format response with calculated fields
    const formattedLoans = loans.map(loan => {
      // Calculate next due date
      const pendingRepayments = loan.repayments.filter(r => r.status === 'pending' || r.status === 'overdue');
      const nextDue = pendingRepayments.length > 0 ? pendingRepayments[0] : null;
      
      // Calculate totals
      const paidAmount = loan.repayments
        .filter(r => r.status === 'paid')
        .reduce((sum, r) => sum + (r.amount || 0), 0);
      
      const overdueAmount = loan.repayments
        .filter(r => r.status === 'overdue')
        .reduce((sum, r) => sum + (r.amount || 0) + (r.lateInterest || 0), 0);

      const totalLateInterest = loan.repayments
        .filter(r => r.status === 'overdue')
        .reduce((sum, r) => sum + (r.lateInterest || 0), 0);

      const nextDueLateInterest = nextDue?.lateInterest || 0;

      return {
        ...loan,
        customerName: loan.customer?.fullName || 'Unknown',
        loanTypeName: loan.loanType?.name || loan.purpose,
        loanAmount: loan.amount,
        duration: loan.term,
        nextDueDate: nextDue?.dueDate || null,
        nextDueAmount: nextDue?.amount || null,
        nextDueLateInterest,
        totalLateInterest,
        paidAmount,
        overdueAmount,
        remainingAmount: (loan.totalAmount || loan.amount) - paidAmount
      };
    });

    res.json(formattedLoans);
  } catch (error) {
    console.error('Get loans error:', error);
    res.status(500).json({ error: 'Failed to fetch loans' });
  }
});

// Get pending loans (for approval queue)
router.get('/pending', async (req, res) => {
  try {
    const prisma = req.prisma;
    const loans = await prisma.loan.findMany({
      where: { status: 'pending' },
      include: {
        customer: {
          select: {
            id: true,
            fullName: true,
            email: true,
            creditScore: true,
            monthlyIncome: true
          }
        },
        loanType: true
      },
      orderBy: { createdAt: 'desc' }
    });

    const formattedLoans = loans.map(loan => ({
      ...loan,
      customerName: loan.customer?.fullName || 'Unknown',
      loanTypeName: loan.loanType?.name || loan.purpose,
      loanAmount: loan.amount,
      duration: loan.term
    }));

    res.json(formattedLoans);
  } catch (error) {
    console.error('Get pending loans error:', error);
    res.status(500).json({ error: 'Failed to fetch pending loans' });
  }
});

// Get single loan with full details
router.get('/:id', async (req, res) => {
  try {
    const prisma = req.prisma;
    const loan = await prisma.loan.findUnique({
      where: { id: parseInt(req.params.id) },
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

    // Update overdue status for pending repayments
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const repayment of loan.repayments) {
      if (repayment.status === 'pending' && new Date(repayment.dueDate) < today) {
        const daysOverdue = Math.floor((today - new Date(repayment.dueDate)) / (1000 * 60 * 60 * 24));
        const lateRate = loan.latePaymentRate || 0.1;
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

    // Calculate summary
    const paidRepayments = loan.repayments.filter(r => r.status === 'paid');
    const pendingRepayments = loan.repayments.filter(r => r.status === 'pending');
    const overdueRepayments = loan.repayments.filter(r => r.status === 'overdue');

    const summary = {
      totalPrincipal: loan.amount,
      totalInterest: loan.totalInterest || 0,
      processingFee: loan.processingFee || 0,
      totalAmount: loan.totalAmount || loan.amount,
      monthlyPayment: loan.monthlyPayment || 0,
      
      paidPrincipal: paidRepayments.reduce((sum, r) => sum + (r.principalAmount || 0), 0),
      paidInterest: paidRepayments.reduce((sum, r) => sum + (r.regularInterest || 0), 0),
      paidLateInterest: paidRepayments.reduce((sum, r) => sum + (r.lateInterest || 0), 0),
      totalPaid: paidRepayments.reduce((sum, r) => sum + (r.amount || 0), 0),
      
      pendingAmount: pendingRepayments.reduce((sum, r) => sum + (r.amount || 0), 0),
      overdueAmount: overdueRepayments.reduce((sum, r) => sum + (r.amount || 0), 0),
      totalLateInterest: overdueRepayments.reduce((sum, r) => sum + (r.lateInterest || 0), 0),
      
      completedPayments: paidRepayments.length,
      remainingPayments: pendingRepayments.length + overdueRepayments.length,
      overduePayments: overdueRepayments.length
    };

    res.json({
      ...loan,
      customerName: loan.customer?.fullName || 'Unknown',
      loanTypeName: loan.loanType?.name || loan.purpose,
      summary
    });
  } catch (error) {
    console.error('Get loan error:', error);
    res.status(500).json({ error: 'Failed to fetch loan' });
  }
});

// Create loan with dynamic interest rates
router.post('/', async (req, res) => {
  try {
    const prisma = req.prisma;
    const {
      customerId, loanTypeId, amount, term, purpose,
      collateralType, collateralValue, collateralDocuments, notes, riskScore, aiRecommendation
    } = req.body;

    // Get loan type for interest rates
    let interestRate = parseFloat(req.body.interestRate) || 12;
    let latePaymentRate = 0.1;
    let processingFeeRate = 0;
    let loanType = null;

    if (loanTypeId) {
      loanType = await prisma.loanType.findUnique({
        where: { id: parseInt(loanTypeId) }
      });

      if (loanType) {
        interestRate = loanType.interestRate;
        latePaymentRate = loanType.latePaymentRate;
        processingFeeRate = loanType.processingFee;
      }
    }

    const loanAmount = parseFloat(amount || req.body.loanAmount);
    const loanTerm = parseInt(term || req.body.duration);

    // Calculate loan amounts
    const totalInterest = loanAmount * (interestRate / 100) * (loanTerm / 12);
    const processingFee = loanAmount * (processingFeeRate / 100);
    const totalAmount = loanAmount + totalInterest + processingFee;
    const monthlyPayment = totalAmount / loanTerm;

    const loan = await prisma.loan.create({
      data: {
        customerId: parseInt(customerId),
        loanTypeId: loanTypeId ? parseInt(loanTypeId) : null,
        amount: loanAmount,
        term: loanTerm,
        interestRate,
        latePaymentRate,
        processingFee,
        totalInterest,
        totalAmount,
        monthlyPayment,
        purpose,
        collateralType,
        collateralValue: collateralValue ? parseFloat(collateralValue) : null,
        collateralDocuments: collateralDocuments || null,
        notes,
        riskScore: riskScore ? parseFloat(riskScore) : null,
        aiRecommendation,
        status: 'pending'
      },
      include: {
        customer: {
          select: {
            fullName: true
          }
        },
        loanType: true
      }
    });

    try {
      await prisma.activity.create({
        data: {
          type: 'loan_application',
          title: 'New Loan Application',
          description: `Loan application submitted for ${loan.customer?.fullName || 'Unknown'} - Rs. ${loan.amount?.toLocaleString()}`,
          entityType: 'loan',
          entityId: loan.id
        }
      });
    } catch (actErr) { console.log('Activity log skipped:', actErr.message); }

    res.status(201).json({
      ...loan,
      customerName: loan.customer?.fullName || 'Unknown',
      loanTypeName: loan.loanType?.name || loan.purpose,
      loanAmount: loan.amount,
      duration: loan.term
    });
  } catch (error) {
    console.error('Create loan error:', error);
    res.status(500).json({ error: 'Failed to create loan' });
  }
});

// Approve loan and generate repayment schedule
router.put('/:id/approve', async (req, res) => {
  try {
    const prisma = req.prisma;
    const { approvedBy } = req.body;

    const existingLoan = await prisma.loan.findUnique({
      where: { id: parseInt(req.params.id) }
    });

    if (!existingLoan) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    const loan = await prisma.loan.update({
      where: { id: parseInt(req.params.id) },
      data: {
        status: 'approved',
        approvedAt: new Date(),
        approvedBy: approvedBy || 'Admin'
      },
      include: {
        customer: {
          select: {
            fullName: true
          }
        },
        loanType: true
      }
    });

    // Generate repayment schedule
    const startDate = new Date();
    const monthlyPayment = loan.monthlyPayment || loan.totalAmount / loan.term;
    const principalPerMonth = loan.amount / loan.term;
    const interestPerMonth = (loan.totalInterest + (loan.processingFee || 0)) / loan.term;

    for (let i = 1; i <= loan.term; i++) {
      const dueDate = new Date(startDate);
      dueDate.setMonth(dueDate.getMonth() + i);

      await prisma.repayment.create({
        data: {
          loanId: loan.id,
          monthNumber: i,
          amount: monthlyPayment,
          principalAmount: principalPerMonth,
          regularInterest: interestPerMonth,
          lateInterest: 0,
          penalty: 0,
          dueDate,
          status: 'pending',
          daysOverdue: 0
        }
      });
    }

    try {
      await prisma.activity.create({
        data: {
          type: 'loan_approved',
          title: 'Loan Approved',
          description: `Loan #${loan.id} approved for ${loan.customer?.fullName || 'Unknown'} - Rs. ${loan.amount?.toLocaleString()}`,
          entityType: 'loan',
          entityId: loan.id
        }
      });
    } catch (actErr) { console.log('Activity log skipped:', actErr.message); }

    res.json({
      ...loan,
      customerName: loan.customer?.fullName || 'Unknown',
      loanTypeName: loan.loanType?.name || loan.purpose,
      loanAmount: loan.amount,
      duration: loan.term,
      message: 'Loan approved and repayment schedule generated'
    });
  } catch (error) {
    console.error('Approve loan error:', error);
    res.status(500).json({ error: 'Failed to approve loan' });
  }
});

// Disburse loan
router.put('/:id/disburse', async (req, res) => {
  try {
    const prisma = req.prisma;

    const loan = await prisma.loan.update({
      where: { id: parseInt(req.params.id) },
      data: {
        status: 'active',
        disbursedAt: new Date()
      },
      include: {
        customer: {
          select: {
            fullName: true
          }
        },
        loanType: true
      }
    });

    try {
      await prisma.activity.create({
        data: {
          type: 'loan_disbursed',
          title: 'Loan Disbursed',
          description: `Loan #${loan.id} disbursed to ${loan.customer?.fullName || 'Unknown'} - Rs. ${loan.amount?.toLocaleString()}`,
          entityType: 'loan',
          entityId: loan.id
        }
      });
    } catch (actErr) { console.log('Activity log skipped:', actErr.message); }

    res.json({
      ...loan,
      customerName: loan.customer?.fullName || 'Unknown',
      loanTypeName: loan.loanType?.name || loan.purpose,
      message: 'Loan disbursed successfully'
    });
  } catch (error) {
    console.error('Disburse loan error:', error);
    res.status(500).json({ error: 'Failed to disburse loan' });
  }
});

// Reject loan
router.put('/:id/reject', async (req, res) => {
  try {
    const prisma = req.prisma;
    const { rejectedBy, rejectionReason } = req.body;

    const loan = await prisma.loan.update({
      where: { id: parseInt(req.params.id) },
      data: {
        status: 'rejected',
        rejectedAt: new Date(),
        rejectedBy: rejectedBy || 'Admin',
        rejectionReason
      },
      include: {
        customer: {
          select: {
            fullName: true
          }
        },
        loanType: true
      }
    });

    try {
      await prisma.activity.create({
        data: {
          type: 'loan_rejected',
          title: 'Loan Rejected',
          description: `Loan #${loan.id} rejected for ${loan.customer?.fullName || 'Unknown'}${rejectionReason ? ': ' + rejectionReason : ''}`,
          entityType: 'loan',
          entityId: loan.id
        }
      });
    } catch (actErr) { console.log('Activity log skipped:', actErr.message); }

    res.json({
      ...loan,
      customerName: loan.customer?.fullName || 'Unknown',
      loanTypeName: loan.loanType?.name || loan.purpose,
      loanAmount: loan.amount,
      duration: loan.term
    });
  } catch (error) {
    console.error('Reject loan error:', error);
    res.status(500).json({ error: 'Failed to reject loan' });
  }
});

// Update loan
router.put('/:id', async (req, res) => {
  try {
    const prisma = req.prisma;
    const {
      amount, term, interestRate, purpose,
      collateralType, collateralValue, collateralDocuments, notes, status, rejectionReason
    } = req.body;

    const data = {
      amount: amount ? parseFloat(amount) : undefined,
      term: term ? parseInt(term) : undefined,
      interestRate: interestRate ? parseFloat(interestRate) : undefined,
      purpose,
      collateralType,
      collateralValue: collateralValue ? parseFloat(collateralValue) : undefined,
      collateralDocuments: collateralDocuments !== undefined ? collateralDocuments : undefined,
      notes,
      status
    };

    if (status === 'rejected') {
      data.rejectedAt = new Date();
      data.rejectedBy = 'Admin';
      data.rejectionReason = rejectionReason || null;
    }

    const loan = await prisma.loan.update({
      where: { id: parseInt(req.params.id) },
      data,
      include: { customer: { select: { fullName: true } } }
    });

    if (status === 'rejected' || status === 'approved') {
      try {
        await prisma.activity.create({
          data: {
            type: status === 'approved' ? 'loan_approved' : 'loan_rejected',
            title: status === 'approved' ? 'Loan Approved' : 'Loan Rejected',
            description: status === 'approved'
              ? `Loan #${loan.id} approved for ${loan.customer?.fullName || 'Unknown'} - Rs. ${loan.amount?.toLocaleString()}`
              : `Loan #${loan.id} rejected for ${loan.customer?.fullName || 'Unknown'}${rejectionReason ? ': ' + rejectionReason : ''}`,
            entityType: 'loan',
            entityId: loan.id
          }
        });
      } catch (actErr) { console.log('Activity log skipped:', actErr.message); }
    }

    res.json(loan);
  } catch (error) {
    console.error('Update loan error:', error);
    res.status(500).json({ error: 'Failed to update loan' });
  }
});

// Delete loan
router.delete('/:id', async (req, res) => {
  try {
    const prisma = req.prisma;
    
    // Delete repayments first
    await prisma.repayment.deleteMany({
      where: { loanId: parseInt(req.params.id) }
    });
    
    await prisma.loan.delete({
      where: { id: parseInt(req.params.id) }
    });
    res.json({ message: 'Loan deleted successfully' });
  } catch (error) {
    console.error('Delete loan error:', error);
    res.status(500).json({ error: 'Failed to delete loan' });
  }
});

module.exports = router;
