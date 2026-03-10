const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Generate unique customer ID like "CUS-20251209-0001"
const generateCustomerId = async () => {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  
  // Get count of customers created today
  const startOfDay = new Date(today.setHours(0, 0, 0, 0));
  const endOfDay = new Date(today.setHours(23, 59, 59, 999));
  
  const todayCount = await prisma.customer.count({
    where: {
      createdAt: {
        gte: startOfDay,
        lte: endOfDay
      }
    }
  });
  
  const sequence = String(todayCount + 1).padStart(4, '0');
  return `CUS-${dateStr}-${sequence}`;
};

exports.register = async (req, res) => {
  try {
    console.log('Received customer registration request:', JSON.stringify(req.body, null, 2));
    
    const { fullName, nic, email, phone, address, city, occupation, employer, monthlyIncome, gender, age, kycDocuments } = req.body;

    // Validate required fields
    if (!fullName || !nic || !email) {
      console.log('Validation failed:', { fullName, nic, email });
      return res.status(400).json({ message: 'Full name, NIC, and email are required' });
    }

    // Check if customer already exists
    const existingCustomer = await prisma.customer.findFirst({
      where: {
        OR: [
          { email: email },
          { nic: nic }
        ]
      }
    });

    if (existingCustomer) {
      console.log('Customer already exists:', existingCustomer.id);
      return res.status(409).json({ message: 'Customer with this email or NIC already exists' });
    }

    // Generate unique customer ID
    const customerId = await generateCustomerId();

    console.log('Creating customer with data:', {
      customerId,
      fullName,
      nic,
      email,
      phone: phone || null,
      gender: gender || null,
      age: age ? parseInt(age) : null,
      address: address || null,
      city: city || null,
      occupation: occupation || null,
      employer: employer || null,
      monthlyIncome: monthlyIncome ? parseFloat(monthlyIncome) : null,
      kycDocuments: kycDocuments || null,
      status: 'active'
    });

    // Create customer in database using Prisma
    const customer = await prisma.customer.create({
      data: {
        customerId,
        fullName,
        nic,
        email,
        phone: phone || null,
        gender: gender || null,
        age: age ? parseInt(age) : null,
        address: address || null,
        city: city || null,
        occupation: occupation || null,
        employer: employer || null,
        monthlyIncome: monthlyIncome ? parseFloat(monthlyIncome) : null,
        kycDocuments: kycDocuments || null,
        status: 'active'
      }
    });

    console.log('Customer created successfully:', customer.id, 'CustomerId:', customer.customerId);
    res.status(201).json(customer);
  } catch (error) {
    console.error('Registration error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ message: 'Error registering customer', error: error.message });
  }
};

exports.getAll = async (req, res) => {
  try {
    const customers = await prisma.customer.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    });
    res.json(customers);
  } catch (error) {
    console.error('Fetch customers error:', error);
    res.status(500).json({ message: 'Error fetching customers' });
  }
};

exports.getById = async (req, res) => {
  try {
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
    console.error('Fetch customer error:', error);
    res.status(500).json({ message: 'Error fetching customer' });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Check if customer exists
    const existingCustomer = await prisma.customer.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingCustomer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    // Convert age to number if provided
    if (updateData.age) {
      updateData.age = parseInt(updateData.age);
    }

    // Convert monthlyIncome to float if provided
    if (updateData.monthlyIncome) {
      updateData.monthlyIncome = parseFloat(updateData.monthlyIncome);
    }

    // Update customer
    const customer = await prisma.customer.update({
      where: { id: parseInt(id) },
      data: updateData
    });

    res.json(customer);
  } catch (error) {
    console.error('Update customer error:', error);
    res.status(500).json({ message: 'Error updating customer' });
  }
};

exports.deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if customer exists
    const existingCustomer = await prisma.customer.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingCustomer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    // Delete customer
    await prisma.customer.delete({
      where: { id: parseInt(id) }
    });

    res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    console.error('Delete customer error:', error);
    res.status(500).json({ message: 'Error deleting customer' });
  }
};
