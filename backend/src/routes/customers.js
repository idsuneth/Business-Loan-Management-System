const express = require('express');
const router = express.Router();

// Get all customers
router.get('/', async (req, res) => {
  try {
    const prisma = req.prisma;
    const customers = await prisma.customer.findMany({
      include: {
        loans: {
          select: {
            id: true,
            amount: true,
            status: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(customers);
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({ message: 'Failed to fetch customers' });
  }
});

// Check for duplicate NIC or email before registration
router.get('/check-duplicate', async (req, res) => {
  try {
    const prisma = req.prisma;
    const { nic, email } = req.query;

    if (!nic && !email) {
      return res.status(400).json({ message: 'Provide nic or email query param' });
    }

    const orConditions = [];
    if (nic) orConditions.push({ nic });
    if (email) orConditions.push({ email });

    const existing = await prisma.customer.findFirst({
      where: { OR: orConditions },
      select: { id: true, nic: true, email: true }
    });

    if (existing) {
      return res.json({
        exists: true,
        field: existing.nic === nic ? 'nic' : 'email'
      });
    }

    res.json({ exists: false });
  } catch (error) {
    console.error('Check duplicate error:', error);
    res.status(500).json({ message: 'Failed to check duplicate' });
  }
});

// Get single customer
router.get('/:id', async (req, res) => {
  try {
    const prisma = req.prisma;
    const customer = await prisma.customer.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        loans: true
      }
    });
    
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    
    res.json(customer);
  } catch (error) {
    console.error('Get customer error:', error);
    res.status(500).json({ message: 'Failed to fetch customer' });
  }
});

// Create customer
router.post('/', async (req, res) => {
  try {
    const prisma = req.prisma;
    const {
      fullName, nic, email, phone,
      gender, age,
      address, city, state, zipCode,
      occupation, employer, monthlyIncome,
      kycDocuments, status, creditScore, dateOfBirth
    } = req.body;

    if (!fullName || !nic || !email) {
      return res.status(400).json({ message: 'Full name, NIC, and email are required' });
    }

    const parsedKyc = typeof kycDocuments === 'string' ? kycDocuments : (kycDocuments ? JSON.stringify(kycDocuments) : null);

    const customer = await prisma.customer.create({
      data: {
        fullName,
        nic,
        email,
        phone: phone || null,
        gender: gender || null,
        age: age ? parseInt(age) : null,
        address: address || null,
        city: city || null,
        state: state || null,
        zipCode: zipCode || null,
        occupation: occupation || null,
        employer: employer || null,
        monthlyIncome: monthlyIncome ? parseFloat(monthlyIncome) : null,
        kycDocuments: parsedKyc,
        status: status || 'active',
        creditScore: creditScore ? parseInt(creditScore) : null,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null
      }
    });

    try {
      await prisma.activity.create({
        data: {
          type: 'customer_registered',
          title: 'Customer Registered',
          description: `New customer registered: ${fullName} (${nic})`,
          entityType: 'customer',
          entityId: customer.id
        }
      });
    } catch (actErr) { console.log('Activity log skipped:', actErr.message); }

    res.status(201).json(customer);
  } catch (error) {
    console.error('Create customer error:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ message: 'Customer with email or NIC already exists' });
    }
    res.status(500).json({ message: 'Failed to create customer' });
  }
});

// Update customer
router.put('/:id', async (req, res) => {
  try {
    const prisma = req.prisma;
    const {
      fullName, nic, email, phone,
      gender, age,
      address, city, state, zipCode,
      occupation, employer, monthlyIncome,
      kycDocuments, status, creditScore, dateOfBirth
    } = req.body;

    const parsedKyc = typeof kycDocuments === 'string' ? kycDocuments : (kycDocuments ? JSON.stringify(kycDocuments) : null);

    const updateData = {};
    
    // Only include fields that are provided
    if (fullName !== undefined) updateData.fullName = fullName;
    if (nic !== undefined) updateData.nic = nic;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone || null;
    if (gender !== undefined) updateData.gender = gender || null;
    if (age !== undefined) updateData.age = age ? parseInt(age) : null;
    if (address !== undefined) updateData.address = address || null;
    if (city !== undefined) updateData.city = city || null;
    if (state !== undefined) updateData.state = state || null;
    if (zipCode !== undefined) updateData.zipCode = zipCode || null;
    if (occupation !== undefined) updateData.occupation = occupation || null;
    if (employer !== undefined) updateData.employer = employer || null;
    if (monthlyIncome !== undefined) updateData.monthlyIncome = monthlyIncome ? parseFloat(monthlyIncome) : null;
    if (kycDocuments !== undefined) updateData.kycDocuments = parsedKyc;
    if (status !== undefined) updateData.status = status;
    if (creditScore !== undefined) updateData.creditScore = creditScore ? parseInt(creditScore) : null;
    if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;

    const customer = await prisma.customer.update({
      where: { id: parseInt(req.params.id) },
      data: updateData
    });

    res.json(customer);
  } catch (error) {
    console.error('Update customer error:', error);
    res.status(500).json({ message: 'Failed to update customer' });
  }
});

// Delete customer
router.delete('/:id', async (req, res) => {
  try {
    const prisma = req.prisma;
    const customerId = parseInt(req.params.id);

    // Get all loans for this customer
    const loans = await prisma.loan.findMany({
      where: { customerId },
      select: { id: true }
    });
    const loanIds = loans.map(l => l.id);

    // Delete repayments for all those loans
    if (loanIds.length > 0) {
      await prisma.repayment.deleteMany({ where: { loanId: { in: loanIds } } });
      await prisma.loan.deleteMany({ where: { customerId } });
    }

    await prisma.customer.delete({ where: { id: customerId } });
    res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    console.error('Delete customer error:', error);
    res.status(500).json({ message: 'Failed to delete customer' });
  }
});

// Search customers
router.get('/search/:query', async (req, res) => {
  try {
    const prisma = req.prisma;
    const query = req.params.query.toLowerCase();
    
    const customers = await prisma.customer.findMany({
      where: {
        OR: [
          { fullName: { contains: query, mode: 'insensitive' } },
          { nic: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } }
        ]
      }
    });
    
    res.json(customers);
  } catch (error) {
    console.error('Search customers error:', error);
    res.status(500).json({ message: 'Failed to search customers' });
  }
});

module.exports = router;
