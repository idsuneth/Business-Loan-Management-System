const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { auth, adminOnly } = require('../middleware/auth');

const prisma = new PrismaClient();

// Get all loan types (accessible to all authenticated users)
router.get('/', auth, async (req, res) => {
  try {
    const loanTypes = await prisma.loanType.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    });
    res.json(loanTypes);
  } catch (error) {
    console.error('Error fetching loan types:', error);
    res.status(500).json({ message: 'Failed to fetch loan types', error: error.message });
  }
});

// Get all loan types including inactive (admin only)
router.get('/all', auth, adminOnly, async (req, res) => {
  try {
    const loanTypes = await prisma.loanType.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(loanTypes);
  } catch (error) {
    console.error('Error fetching all loan types:', error);
    res.status(500).json({ message: 'Failed to fetch loan types', error: error.message });
  }
});

// Get single loan type
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const loanType = await prisma.loanType.findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!loanType) {
      return res.status(404).json({ message: 'Loan type not found' });
    }
    
    res.json(loanType);
  } catch (error) {
    console.error('Error fetching loan type:', error);
    res.status(500).json({ message: 'Failed to fetch loan type', error: error.message });
  }
});

// Create new loan type (admin only)
router.post('/', auth, adminOnly, async (req, res) => {
  try {
    const {
      name,
      description,
      interestRate,
      latePaymentRate,
      processingFee,
      minAmount,
      maxAmount,
      minTerm,
      maxTerm,
      isActive
    } = req.body;

    // Validation
    if (!name || interestRate === undefined) {
      return res.status(400).json({ message: 'Name and interest rate are required' });
    }

    const loanType = await prisma.loanType.create({
      data: {
        name,
        description: description || null,
        interestRate: parseFloat(interestRate),
        latePaymentRate: parseFloat(latePaymentRate) || 0.05,
        processingFee: parseFloat(processingFee) || 0,
        minAmount: parseFloat(minAmount) || 1000,
        maxAmount: parseFloat(maxAmount) || 1000000,
        minTerm: parseInt(minTerm) || 3,
        maxTerm: parseInt(maxTerm) || 60,
        isActive: isActive !== false
      }
    });

    res.status(201).json(loanType);
  } catch (error) {
    console.error('Error creating loan type:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ message: 'Loan type with this name already exists' });
    }
    res.status(500).json({ message: 'Failed to create loan type', error: error.message });
  }
});

// Update loan type (admin only)
router.put('/:id', auth, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      interestRate,
      latePaymentRate,
      processingFee,
      minAmount,
      maxAmount,
      minTerm,
      maxTerm,
      isActive
    } = req.body;

    const updateData = {};
    
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (interestRate !== undefined) updateData.interestRate = parseFloat(interestRate);
    if (latePaymentRate !== undefined) updateData.latePaymentRate = parseFloat(latePaymentRate);
    if (processingFee !== undefined) updateData.processingFee = parseFloat(processingFee);
    if (minAmount !== undefined) updateData.minAmount = parseFloat(minAmount);
    if (maxAmount !== undefined) updateData.maxAmount = parseFloat(maxAmount);
    if (minTerm !== undefined) updateData.minTerm = parseInt(minTerm);
    if (maxTerm !== undefined) updateData.maxTerm = parseInt(maxTerm);
    if (isActive !== undefined) updateData.isActive = isActive;

    const loanType = await prisma.loanType.update({
      where: { id: parseInt(id) },
      data: updateData
    });

    if (updateData.interestRate !== undefined) {
      try {
        await prisma.activity.create({
          data: {
            type: 'interest_rate_changed',
            title: 'Interest Rate Updated',
            description: `Interest rate for "${loanType.name}" updated to ${loanType.interestRate}%`,
            entityType: 'settings',
            entityId: loanType.id
          }
        });
      } catch (actErr) { console.log('Activity log skipped:', actErr.message); }
    }

    res.json(loanType);
  } catch (error) {
    console.error('Error updating loan type:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Loan type not found' });
    }
    if (error.code === 'P2002') {
      return res.status(400).json({ message: 'Loan type with this name already exists' });
    }
    res.status(500).json({ message: 'Failed to update loan type', error: error.message });
  }
});

// Delete loan type (admin only) - soft delete by setting isActive to false
router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if any loans are using this type
    const loansUsingType = await prisma.loan.count({
      where: { loanTypeId: parseInt(id) }
    });

    if (loansUsingType > 0) {
      // Soft delete - just deactivate
      await prisma.loanType.update({
        where: { id: parseInt(id) },
        data: { isActive: false }
      });
      return res.json({ message: 'Loan type deactivated (has associated loans)' });
    }

    // Hard delete if no loans are using it
    await prisma.loanType.delete({
      where: { id: parseInt(id) }
    });

    res.json({ message: 'Loan type deleted successfully' });
  } catch (error) {
    console.error('Error deleting loan type:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Loan type not found' });
    }
    res.status(500).json({ message: 'Failed to delete loan type', error: error.message });
  }
});

module.exports = router;
