const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Generate unique loan ID like "LN-20251209-0001"
const generateLoanId = async () => {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  
  // Get count of loans created today
  const startOfDay = new Date(today.setHours(0, 0, 0, 0));
  const endOfDay = new Date(today.setHours(23, 59, 59, 999));
  
  const todayCount = await prisma.loan.count({
    where: {
      createdAt: {
        gte: startOfDay,
        lte: endOfDay
      }
    }
  });
  
  const sequence = String(todayCount + 1).padStart(4, '0');
  return `LN-${dateStr}-${sequence}`;
};

// Create loan application
exports.apply = async (req, res) => {
  try {
    console.log('=== LOAN APPLICATION REQUEST ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    const { customerId, loanTypeId, amount, term, interestRate, purpose, collateralType, collateralValue, notes, creditScore, existingDebts, riskScore, status } = req.body;

    if (!customerId || !loanTypeId || !amount || !term) {
      return res.status(400).json({ message: 'Required fields missing: customerId, loanTypeId, amount, term' });
    }

    const loan = await prisma.loan.create({
      data: {
        customerId: parseInt(customerId),
        loanTypeId: parseInt(loanTypeId),
        amount: parseFloat(amount),
        term: parseInt(term),
        interestRate: parseFloat(interestRate) || 12,
        purpose: purpose || 'General Loan',
        collateralType: collateralType || null,
        collateralValue: collateralValue ? parseFloat(collateralValue) : null,
        notes: notes || null,
        riskScore: riskScore != null ? parseFloat(riskScore) : null,
        status: status || 'pending'
      },
      include: {
        customer: true,
        loanType: true
      }
    });

    console.log('Loan created successfully:', loan.id);
    res.status(201).json(loan);
  } catch (error) {
    console.error('Loan application error:', error);
    res.status(500).json({ message: 'Error creating loan application', error: error.message });
  }
};

// Get all loans
exports.getAll = async (req, res) => {
  try {
    console.log('=== GET ALL LOANS ===');
    const { status, customerId } = req.query;
    
    const where = {};
    if (status) {
      where.status = status;
    }
    if (customerId) {
      where.customerId = parseInt(customerId);
    }

    const loans = await prisma.loan.findMany({
      where,
      include: {
        customer: true,
        loanType: true,
        repayments: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Transform to include customerName for frontend
    const transformedLoans = loans.map(loan => {
      // Calculate paid and remaining amounts
      const totalPaid = loan.repayments
        ?.filter(r => r.status === 'paid')
        .reduce((sum, r) => sum + r.amount, 0) || 0;
      const remainingAmount = (loan.amount || 0) - totalPaid;
      const overdueAmount = loan.repayments
        ?.filter(r => r.status === 'overdue')
        .reduce((sum, r) => sum + r.amount, 0) || 0;

      return {
        id: loan.id,
        loanId: `LN-${loan.id}`,
        customerId: loan.customer?.id,
        customerName: loan.customer?.fullName || 'Unknown',
        amount: loan.amount,
        term: loan.term,
        interestRate: loan.interestRate,
        purpose: loan.purpose || loan.loanType?.name || 'N/A',
        status: loan.status,
        riskScore: loan.riskScore,
        aiRecommendation: loan.aiRecommendation,
        collateralType: loan.collateralType,
        collateralValue: loan.collateralValue,
        collateralDocuments: loan.collateralDocuments,
        notes: loan.notes,
        totalAmount: loan.totalAmount,
        monthlyPayment: loan.monthlyPayment,
        approvedAt: loan.approvedAt,
        approvedBy: loan.approvedBy,
        rejectedAt: loan.rejectedAt,
        rejectedBy: loan.rejectedBy,
        rejectionReason: loan.rejectionReason,
        createdAt: loan.createdAt,
        loanType: loan.loanType,
        customer: loan.customer,
        repayments: loan.repayments,
        submittedAt: loan.createdAt.toISOString().split('T')[0],
        totalPaid,
        remainingAmount,
        overdueAmount
      };
    });

    console.log(`Found ${loans.length} loans`);
    res.json(transformedLoans);
  } catch (error) {
    console.error('Error fetching loans:', error);
    res.status(500).json({ message: 'Error fetching loans', error: error.message });
  }
};

// Get loan by ID
exports.getById = async (req, res) => {
  try {
    const loan = await prisma.loan.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        customer: true,
        loanType: true,
        repayments: true
      }
    });

    if (!loan) {
      return res.status(404).json({ message: 'Loan not found' });
    }

    res.json(loan);
  } catch (error) {
    console.error('Error fetching loan:', error);
    res.status(500).json({ message: 'Error fetching loan', error: error.message });
  }
};

// Update loan (approve/reject)
exports.update = async (req, res) => {
  try {
    console.log('=== UPDATE LOAN ===');
    console.log('Loan ID:', req.params.id);
    console.log('Update data:', req.body);
    
    const { status, rejectionReason } = req.body;
    
    const updateData = { status };
    
    if (status === 'approved') {
      updateData.approvedAt = new Date();
      updateData.approvedBy = req.user?.id || 1;
    }
    if (status === 'rejected') {
      updateData.rejectedAt = new Date();
      updateData.rejectedBy = String(req.user?.id || 1);
      if (rejectionReason) updateData.rejectionReason = rejectionReason;
    }

    const loan = await prisma.loan.update({
      where: { id: parseInt(req.params.id) },
      data: updateData,
      include: {
        customer: true
      }
    });

    console.log('Loan updated:', loan);
    res.json(loan);
  } catch (error) {
    console.error('Error updating loan:', error);
    res.status(500).json({ message: 'Error updating loan', error: error.message });
  }
};

// Approve loan
exports.approve = async (req, res) => {
  try {
    const loan = await prisma.loan.update({
      where: { id: parseInt(req.params.id) },
      data: {
        status: 'approved',
        approvedAt: new Date(),
        approvedBy: req.user?.id || 1
      },
      include: {
        customer: true
      }
    });

    res.json(loan);
  } catch (error) {
    console.error('Error approving loan:', error);
    res.status(500).json({ message: 'Error approving loan', error: error.message });
  }
};

// Reject loan
exports.reject = async (req, res) => {
  try {
    const { rejectionReason } = req.body;
    const loan = await prisma.loan.update({
      where: { id: parseInt(req.params.id) },
      data: {
        status: 'rejected',
        rejectedAt: new Date(),
        rejectedBy: String(req.user?.id || 1),
        rejectionReason: rejectionReason || null
      },
      include: {
        customer: true
      }
    });

    res.json(loan);
  } catch (error) {
    console.error('Error rejecting loan:', error);
    res.status(500).json({ message: 'Error rejecting loan', error: error.message });
  }
};

// Get loan statistics
exports.getStats = async (req, res) => {
  try {
    const [totalLoans, pendingLoans, approvedLoans, rejectedLoans, allLoans] = await Promise.all([
      prisma.loan.count(),
      prisma.loan.count({ where: { status: 'pending' } }),
      prisma.loan.count({ where: { status: 'approved' } }),
      prisma.loan.count({ where: { status: 'rejected' } }),
      prisma.loan.findMany()
    ]);

    const totalAmount = allLoans.reduce((sum, loan) => sum + loan.loanAmount, 0);
    const approvedAmount = allLoans.filter(l => l.status === 'approved').reduce((sum, loan) => sum + loan.loanAmount, 0);

    res.json({
      totalLoans,
      pendingLoans,
      approvedLoans,
      rejectedLoans,
      totalAmount,
      approvedAmount,
      approvalRate: totalLoans > 0 ? ((approvedLoans / totalLoans) * 100).toFixed(1) : 0
    });
  } catch (error) {
    console.error('Error fetching loan stats:', error);
    res.status(500).json({ message: 'Error fetching loan statistics', error: error.message });
  }
};
