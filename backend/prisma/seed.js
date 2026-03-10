const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed with LKR currency...');

  // Clear existing data
  console.log('🗑️ Clearing existing data...');
  await prisma.activity.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.repayment.deleteMany();
  await prisma.loan.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.loanType.deleteMany();
  await prisma.notificationSetting.deleteMany();
  await prisma.user.deleteMany();

  // Create users
  console.log('👤 Creating users...');
  const adminPassword = await bcrypt.hash('Admin@123', 10);
  const officerPassword = await bcrypt.hash('Officer@123', 10);

  await prisma.user.create({
    data: { email: 'admin@smartloan.com', fullName: 'Admin User', role: 'admin', password: adminPassword }
  });
  await prisma.user.create({
    data: { email: 'officer@smartloan.com', fullName: 'Loan Officer', role: 'officer', password: officerPassword }
  });

  // Create loan types with LKR amounts
  console.log('📋 Creating loan types (LKR)...');
  const loanTypes = await Promise.all([
    prisma.loanType.create({
      data: {
        name: 'Personal Loan',
        description: 'General purpose personal loans',
        interestRate: 12.5,
        latePaymentRate: 0.1,
        processingFee: 1.5,
        minAmount: 50000,
        maxAmount: 2000000,
        minTerm: 6,
        maxTerm: 60,
        isActive: true
      }
    }),
    prisma.loanType.create({
      data: {
        name: 'Home Loan',
        description: 'Housing and property loans',
        interestRate: 8.5,
        latePaymentRate: 0.08,
        processingFee: 1.0,
        minAmount: 1000000,
        maxAmount: 50000000,
        minTerm: 60,
        maxTerm: 300,
        isActive: true
      }
    }),
    prisma.loanType.create({
      data: {
        name: 'Vehicle Loan',
        description: 'Car and motorcycle financing',
        interestRate: 10.5,
        latePaymentRate: 0.1,
        processingFee: 1.5,
        minAmount: 200000,
        maxAmount: 15000000,
        minTerm: 12,
        maxTerm: 84,
        isActive: true
      }
    }),
    prisma.loanType.create({
      data: {
        name: 'Business Loan',
        description: 'Small and medium business financing',
        interestRate: 14.0,
        latePaymentRate: 0.12,
        processingFee: 2.0,
        minAmount: 100000,
        maxAmount: 10000000,
        minTerm: 12,
        maxTerm: 60,
        isActive: true
      }
    }),
    prisma.loanType.create({
      data: {
        name: 'Education Loan',
        description: 'Student and education financing',
        interestRate: 7.5,
        latePaymentRate: 0.05,
        processingFee: 0.5,
        minAmount: 100000,
        maxAmount: 5000000,
        minTerm: 12,
        maxTerm: 120,
        isActive: true
      }
    }),
    prisma.loanType.create({
      data: {
        name: 'Gold Loan',
        description: 'Loans against gold jewelry',
        interestRate: 11.0,
        latePaymentRate: 0.1,
        processingFee: 1.0,
        minAmount: 25000,
        maxAmount: 5000000,
        minTerm: 3,
        maxTerm: 36,
        isActive: true
      }
    }),
    prisma.loanType.create({
      data: {
        name: 'Agricultural Loan',
        description: 'Farming and agricultural purposes',
        interestRate: 9.0,
        latePaymentRate: 0.08,
        processingFee: 0.75,
        minAmount: 50000,
        maxAmount: 3000000,
        minTerm: 6,
        maxTerm: 48,
        isActive: true
      }
    })
  ]);

  // ──────────── Shared helpers ────────────
  const today = new Date();

  function monthsAgo(m) {
    const d = new Date(today);
    d.setMonth(d.getMonth() - m);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  // ──────────── 20 Realistic Sri Lankan Customers ────────────
  const customerData = [
    // 1 - High income male, Colombo, excellent credit  (completed loan 28 mo ago → reg 30 mo ago)
    {
      fullName: 'Kasun Perera', nic: '199012345678', email: 'kasun.perera@email.com',
      phone: '0771234567', gender: 'male', age: 34, address: '45, Galle Road',
      city: 'Colombo', occupation: 'Software Engineer', employer: 'WSO2',
      monthlyIncome: 320000, creditScore: 810, status: 'active',
      dateOfBirth: new Date('1990-03-15'), regAgo: 30
    },
    // 2 - Mid income female, Kandy, good credit  (pending loan → reg 1 mo ago)
    {
      fullName: 'Nimali Silva', nic: '199234567890', email: 'nimali.silva@email.com',
      phone: '0762345678', gender: 'female', age: 32, address: '12, Peradeniya Road',
      city: 'Kandy', occupation: 'Banking Officer', employer: 'Bank of Ceylon',
      monthlyIncome: 95000, creditScore: 730, status: 'active',
      dateOfBirth: new Date('1992-07-22'), regAgo: 1
    },
    // 3 - High income male, Galle, very good credit  (active on-track 20 mo → reg 22 mo ago)
    {
      fullName: 'Ruwan Fernando', nic: '198856789012', email: 'ruwan.fernando@email.com',
      phone: '0713456789', gender: 'male', age: 36, address: '78, Matara Road',
      city: 'Galle', occupation: 'Production Manager', employer: 'MAS Holdings',
      monthlyIncome: 185000, creditScore: 760, status: 'active',
      dateOfBirth: new Date('1988-11-05'), regAgo: 22
    },
    // 4 - High income male, Negombo, excellent credit  (active just started 2 mo → reg 4 mo ago)
    {
      fullName: 'Chaminda Jayawardena', nic: '198567890123', email: 'chaminda.j@email.com',
      phone: '0774567890', gender: 'male', age: 39, address: '23, Lewis Place',
      city: 'Negombo', occupation: 'Senior Pilot', employer: 'SriLankan Airlines',
      monthlyIncome: 450000, creditScore: 820, status: 'active',
      dateOfBirth: new Date('1985-01-18'), regAgo: 4
    },
    // 5 - Very high income female, Colombo, excellent credit  (completed loan 40 mo ago → reg 42 mo ago)
    {
      fullName: 'Dilini Wickramasinghe', nic: '199178901234', email: 'dilini.w@email.com',
      phone: '0705678901', gender: 'female', age: 33, address: '156, Union Place',
      city: 'Colombo', occupation: 'Finance Director', employer: 'John Keells Holdings',
      monthlyIncome: 520000, creditScore: 840, status: 'active',
      dateOfBirth: new Date('1991-04-12'), regAgo: 42
    },
    // 6 - Mid income male, Kandy, average credit  (active on-track 15 mo → reg 17 mo ago)
    {
      fullName: 'Nuwan Bandara', nic: '199389012345', email: 'nuwan.bandara@email.com',
      phone: '0786789012', gender: 'male', age: 31, address: '34, Katugastota Road',
      city: 'Kandy', occupation: 'Logistics Coordinator', employer: 'Hayleys PLC',
      monthlyIncome: 135000, creditScore: 680, status: 'active',
      dateOfBirth: new Date('1993-09-28'), regAgo: 17
    },
    // 7 - Lower income female, Matara, below average credit  (active overdue 14 mo → reg 16 mo ago)
    {
      fullName: 'Sachini Ranasinghe', nic: '199590123456', email: 'sachini.r@email.com',
      phone: '0717890123', gender: 'female', age: 29, address: '67, Station Road',
      city: 'Matara', occupation: 'Retail Supervisor', employer: 'Cargills Ceylon',
      monthlyIncome: 72000, creditScore: 600, status: 'active',
      dateOfBirth: new Date('1995-12-03'), regAgo: 16
    },
    // 8 - Mid income male, Kurunegala, good credit  (pending loan → reg 1 mo ago)
    {
      fullName: 'Tharaka Dissanayake', nic: '199101234567', email: 'tharaka.d@email.com',
      phone: '0728901234', gender: 'male', age: 33, address: '89, Colombo Road',
      city: 'Kurunegala', occupation: 'Marketing Executive', employer: 'Mobitel',
      monthlyIncome: 115000, creditScore: 710, status: 'active',
      dateOfBirth: new Date('1991-06-20'), regAgo: 1
    },
    // 9 - High income female, Colombo, very good credit  (active on-track 12 mo → reg 14 mo ago)
    {
      fullName: 'Ishara Gunasekara', nic: '198912345670', email: 'ishara.g@email.com',
      phone: '0739012345', gender: 'female', age: 35, address: '201, Bauddhaloka Mawatha',
      city: 'Colombo', occupation: 'Senior Accountant', employer: 'Commercial Bank',
      monthlyIncome: 175000, creditScore: 770, status: 'active',
      dateOfBirth: new Date('1989-02-14'), regAgo: 14
    },
    // 10 - High income male, Ratnapura, good credit  (completed loan 16 mo ago → reg 18 mo ago)
    {
      fullName: 'Malith Samaraweera', nic: '198723456781', email: 'malith.s@email.com',
      phone: '0740123456', gender: 'male', age: 37, address: '15, Gem Street',
      city: 'Ratnapura', occupation: 'Gem Merchant', employer: 'Self-employed',
      monthlyIncome: 280000, creditScore: 720, status: 'active',
      dateOfBirth: new Date('1987-08-30'), regAgo: 18
    },
    // 11 - Low income female, Anuradhapura, below average credit  (rejected loan → reg 2 mo ago)
    {
      fullName: 'Hashini Herath', nic: '199634567892', email: 'hashini.h@email.com',
      phone: '0751234567', gender: 'female', age: 28, address: '42, New Town',
      city: 'Anuradhapura', occupation: 'Government Clerk', employer: 'Divisional Secretariat',
      monthlyIncome: 62000, creditScore: 620, status: 'active',
      dateOfBirth: new Date('1996-05-10'), regAgo: 2
    },
    // 12 - Lower income male, Jaffna, low credit  (active overdue 18 mo → reg 20 mo ago)
    {
      fullName: 'Dinesh Rajapaksha', nic: '199445678903', email: 'dinesh.r@email.com',
      phone: '0762345670', gender: 'male', age: 30, address: '8, Hospital Road',
      city: 'Jaffna', occupation: 'Fisherman', employer: 'Northern Fisheries Co-op',
      monthlyIncome: 55000, creditScore: 560, status: 'active',
      dateOfBirth: new Date('1994-10-17'), regAgo: 20
    },
    // 13 - Very high income female, Colombo, excellent credit  (active just started 1 mo → reg 3 mo ago)
    {
      fullName: 'Kavindi Seneviratne', nic: '199256789014', email: 'kavindi.s@email.com',
      phone: '0773456780', gender: 'female', age: 32, address: '88, Havelock Road',
      city: 'Colombo', occupation: 'Tech Lead', employer: 'Virtusa',
      monthlyIncome: 380000, creditScore: 830, status: 'active',
      dateOfBirth: new Date('1992-01-25'), regAgo: 3
    },
    // 14 - Mid income male, Gampaha, average credit  (approved → reg 1 mo ago)
    {
      fullName: 'Ashan Karunaratne', nic: '199367890125', email: 'ashan.k@email.com',
      phone: '0714567891', gender: 'male', age: 31, address: '55, Yakkala Road',
      city: 'Gampaha', occupation: 'Quality Manager', employer: 'Brandix Lanka',
      monthlyIncome: 145000, creditScore: 690, status: 'active',
      dateOfBirth: new Date('1993-03-08'), regAgo: 1
    },
    // 15 - High income female, Colombo, very good credit  (active on-track 18 mo → reg 20 mo ago)
    {
      fullName: 'Nethmi Fonseka', nic: '199078901236', email: 'nethmi.f@email.com',
      phone: '0725678902', gender: 'female', age: 34, address: '33, Ward Place',
      city: 'Colombo', occupation: 'Relationship Manager', employer: 'HSBC Sri Lanka',
      monthlyIncome: 210000, creditScore: 780, status: 'active',
      dateOfBirth: new Date('1990-06-30'), regAgo: 20
    },
    // 16 - Low income male, Batticaloa, poor credit  (active overdue 12 mo → reg 14 mo ago)
    {
      fullName: 'Chathura De Silva', nic: '199589012347', email: 'chathura.d@email.com',
      phone: '0736789013', gender: 'male', age: 29, address: '19, Bar Road',
      city: 'Batticaloa', occupation: 'Shop Owner', employer: 'Self-employed',
      monthlyIncome: 48000, creditScore: 520, status: 'active',
      dateOfBirth: new Date('1995-09-12'), regAgo: 14
    },
    // 17 - Low-mid income female, Kalutara, below average credit  (pending → reg 1 mo ago)
    {
      fullName: 'Rashmi Peris', nic: '199790123458', email: 'rashmi.p@email.com',
      phone: '0747890124', gender: 'female', age: 27, address: '71, Galle Road',
      city: 'Kalutara', occupation: 'Factory Supervisor', employer: 'Ceylon Tea Factory',
      monthlyIncome: 68000, creditScore: 640, status: 'active',
      dateOfBirth: new Date('1997-11-22'), regAgo: 1
    },
    // 18 - Very high income male, Colombo, very good credit  (active just started 2 mo → reg 4 mo ago)
    {
      fullName: 'Lahiru Weerasinghe', nic: '198801234569', email: 'lahiru.w@email.com',
      phone: '0778901235', gender: 'male', age: 36, address: '112, Duplication Road',
      city: 'Colombo', occupation: 'Solutions Architect', employer: 'IFS Sri Lanka',
      monthlyIncome: 420000, creditScore: 790, status: 'active',
      dateOfBirth: new Date('1988-04-05'), regAgo: 4
    },
    // 19 - Low income female, Trincomalee, low credit  (active overdue 10 mo → reg 12 mo ago)
    {
      fullName: 'Sanduni Nanayakkara', nic: '199912345670', email: 'sanduni.n@email.com',
      phone: '0759012346', gender: 'female', age: 25, address: '5, Beach Road',
      city: 'Trincomalee', occupation: 'Hotel Receptionist', employer: 'Trinco Bay Hotel',
      monthlyIncome: 45000, creditScore: 550, status: 'active',
      dateOfBirth: new Date('1999-02-17'), regAgo: 12
    },
    // 20 - High income male, Colombo, good credit  (approved → reg 1 mo ago)
    {
      fullName: 'Buddhika Amarasekara', nic: '198612345671', email: 'buddhika.a@email.com',
      phone: '0760123457', gender: 'male', age: 38, address: '7, Independence Square',
      city: 'Colombo', occupation: 'Branch Manager', employer: 'Nations Trust Bank',
      monthlyIncome: 230000, creditScore: 750, status: 'active',
      dateOfBirth: new Date('1986-12-01'), regAgo: 1
    }
  ];

  console.log('👥 Creating 20 customers...');
  const customers = [];
  for (const cd of customerData) {
    const customer = await prisma.customer.create({
      data: {
        fullName: cd.fullName,
        nic: cd.nic,
        email: cd.email,
        phone: cd.phone,
        gender: cd.gender,
        age: cd.age,
        address: cd.address,
        city: cd.city,
        occupation: cd.occupation,
        employer: cd.employer,
        monthlyIncome: cd.monthlyIncome,
        creditScore: cd.creditScore,
        status: cd.status,
        dateOfBirth: cd.dateOfBirth,
        createdAt: monthsAgo(cd.regAgo ?? 0)
      }
    });
    customers.push(customer);
  }

  // ──────────── Loan assignments ────────────

  // 20 loans covering:
  //   3 completed, 4 active overdue, 4 active on-track, 3 active just started,
  //   3 pending, 2 approved, 1 rejected
  //   Collateral: Property, Personal Guarantee, or null
  const loanDefs = [
    // --- 3 COMPLETED (all repayments paid with realistic past dates) ---
    { ci: 0, lti: 0, amount: 500000, term: 24, status: 'completed', collateralType: 'Property', collateralValue: 4500000, notes: 'House in Colombo 7 as collateral', approvedAgo: 28, paidMonths: 24 },
    { ci: 4, lti: 1, amount: 8000000, term: 36, status: 'completed', collateralType: 'Property', collateralValue: 15000000, notes: 'Apartment at Havelock City', approvedAgo: 40, paidMonths: 36 },
    { ci: 9, lti: 5, amount: 400000, term: 12, status: 'completed', collateralType: 'Personal Guarantee', collateralValue: null, notes: 'Guarantor 1: Saman Kumara (NIC: 198745678901)\nGuarantor 2: Priya Perera (NIC: 199056789012)', approvedAgo: 16, paidMonths: 12 },

    // --- 4 ACTIVE OVERDUE (some payments past due and unpaid) ---
    { ci: 6, lti: 0, amount: 250000, term: 24, status: 'active', collateralType: 'Personal Guarantee', collateralValue: null, notes: 'Guarantor 1: Kumari Perera (NIC: 199312345678)\nGuarantor 2: Nimal De Silva (NIC: 199087654321)', approvedAgo: 14, paidMonths: 8 },
    { ci: 11, lti: 6, amount: 300000, term: 36, status: 'active', collateralType: 'Property', collateralValue: 2000000, notes: 'Farmland deed - 2 acres in Jaffna', approvedAgo: 18, paidMonths: 10 },
    { ci: 15, lti: 0, amount: 150000, term: 18, status: 'active', collateralType: null, collateralValue: null, notes: null, approvedAgo: 12, paidMonths: 5 },
    { ci: 18, lti: 4, amount: 200000, term: 24, status: 'active', collateralType: 'Personal Guarantee', collateralValue: null, notes: 'Guarantor 1: Ruwan Nanayakkara (NIC: 197823456789)\nGuarantor 2: Malini Fernando (NIC: 198534567890)', approvedAgo: 10, paidMonths: 4 },

    // --- 4 ACTIVE ON-TRACK (payments up to date) ---
    { ci: 2, lti: 2, amount: 2500000, term: 48, status: 'active', collateralType: 'Property', collateralValue: 3500000, notes: 'House deed - Galle Fort area', approvedAgo: 20, paidMonths: 20 },
    { ci: 5, lti: 3, amount: 1200000, term: 36, status: 'active', collateralType: 'Personal Guarantee', collateralValue: null, notes: 'Guarantor 1: Ajith Bandara (NIC: 196745678901)\nGuarantor 2: Kamal Rathnayake (NIC: 197856789012)', approvedAgo: 15, paidMonths: 15 },
    { ci: 8, lti: 0, amount: 800000, term: 36, status: 'active', collateralType: 'Property', collateralValue: 6000000, notes: 'Land in Nugegoda - 10 perches', approvedAgo: 12, paidMonths: 12 },
    { ci: 14, lti: 1, amount: 5000000, term: 60, status: 'active', collateralType: 'Property', collateralValue: 12000000, notes: 'Apartment at The Monarch, Colombo 3', approvedAgo: 18, paidMonths: 18 },

    // --- 3 ACTIVE JUST STARTED (1-2 payments) ---
    { ci: 3, lti: 2, amount: 3500000, term: 60, status: 'active', collateralType: 'Property', collateralValue: 5500000, notes: 'Property in Negombo beach area', approvedAgo: 2, paidMonths: 2 },
    { ci: 12, lti: 0, amount: 750000, term: 24, status: 'active', collateralType: null, collateralValue: null, notes: null, approvedAgo: 1, paidMonths: 1 },
    { ci: 17, lti: 3, amount: 5000000, term: 48, status: 'active', collateralType: 'Personal Guarantee', collateralValue: null, notes: 'Guarantor 1: Sampath Weerasinghe (NIC: 196012345601)\nGuarantor 2: Dinuka Perera (NIC: 199234567801)', approvedAgo: 2, paidMonths: 1 },

    // --- 3 PENDING (awaiting approval) ---
    { ci: 1, lti: 4, amount: 600000, term: 36, status: 'pending', collateralType: null, collateralValue: null, notes: 'For MBA at University of Colombo', approvedAgo: 0, paidMonths: 0 },
    { ci: 7, lti: 0, amount: 350000, term: 18, status: 'pending', collateralType: 'Property', collateralValue: 3000000, notes: 'Land in Kurunegala - 15 perches', approvedAgo: 0, paidMonths: 0 },
    { ci: 16, lti: 5, amount: 200000, term: 12, status: 'pending', collateralType: 'Personal Guarantee', collateralValue: null, notes: 'Guarantor 1: Chamari Silva (NIC: 199567890123)\nGuarantor 2: Indika Peris (NIC: 198978901234)', approvedAgo: 0, paidMonths: 0 },

    // --- 2 APPROVED (not yet disbursed, no repayments) ---
    { ci: 13, lti: 2, amount: 1800000, term: 48, status: 'approved', collateralType: 'Property', collateralValue: 4000000, notes: 'House deed - Gampaha', approvedAgo: 0, paidMonths: 0 },
    { ci: 19, lti: 3, amount: 3000000, term: 36, status: 'approved', collateralType: 'Personal Guarantee', collateralValue: null, notes: 'Guarantor 1: Rohan Amarasekara (NIC: 196234567890)\nGuarantor 2: Tharindu Kumara (NIC: 199345678901)', approvedAgo: 0, paidMonths: 0 },

    // --- 1 REJECTED ---
    { ci: 10, lti: 0, amount: 500000, term: 36, status: 'rejected', collateralType: null, collateralValue: null, notes: 'Income too low for requested amount', approvedAgo: 0, paidMonths: 0 }
  ];

  console.log('💳 Creating 20 loans with varied statuses...');

  const overdueCustomerIndices = [6, 11, 15, 18];

  for (const def of loanDefs) {
    const customer = customers[def.ci];
    const loanType = loanTypes[def.lti];
    const amount = def.amount;
    const term = def.term;
    const rate = loanType.interestRate;

    // Proper EMI formula
    const monthlyRate = rate / 12 / 100;
    const emi = monthlyRate > 0
      ? amount * monthlyRate * Math.pow(1 + monthlyRate, term) / (Math.pow(1 + monthlyRate, term) - 1)
      : amount / term;
    const totalAmount = emi * term;
    const totalInterest = totalAmount - amount;
    const processingFee = amount * (loanType.processingFee / 100);

    const riskScores = { completed: 0.15, active: 0.35, pending: 0.45, approved: 0.3, rejected: 0.85 };
    const riskScore = Math.max(0.05, Math.min(0.95, riskScores[def.status] + (Math.random() * 0.15 - 0.075)));

    const approvedAt = def.status !== 'pending' && def.status !== 'rejected' && def.approvedAgo > 0
      ? monthsAgo(def.approvedAgo)
      : (def.status === 'approved' ? new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000) : null);

    const createdAt = def.status === 'pending'
      ? new Date(today.getTime() - Math.floor(Math.random() * 5 + 1) * 24 * 60 * 60 * 1000)
      : (approvedAt ? new Date(approvedAt.getTime() - 7 * 24 * 60 * 60 * 1000) : monthsAgo(1));

    const loan = await prisma.loan.create({
      data: {
        customerId: customer.id,
        loanTypeId: loanType.id,
        amount,
        term,
        interestRate: rate,
        latePaymentRate: loanType.latePaymentRate,
        processingFee,
        totalInterest: Math.round(totalInterest),
        totalAmount: Math.round(totalAmount + processingFee),
        monthlyPayment: Math.round(emi),
        purpose: loanType.name,
        collateralType: def.collateralType,
        collateralValue: def.collateralValue,
        notes: def.notes,
        riskScore,
        aiRecommendation: riskScore < 0.3 ? 'Low Risk' : riskScore < 0.6 ? 'Medium Risk' : 'High Risk',
        status: def.status,
        approvedAt,
        approvedBy: approvedAt ? 'Admin User' : null,
        rejectedAt: def.status === 'rejected' ? monthsAgo(1) : null,
        rejectedBy: def.status === 'rejected' ? 'Admin User' : null,
        rejectionReason: def.status === 'rejected' ? 'Debt-to-income ratio exceeds maximum threshold' : null,
        createdAt,
        disbursedAt: ['active', 'completed'].includes(def.status) ? approvedAt : null,
      }
    });

    // Create repayments for approved/active/completed loans
    if (['approved', 'active', 'completed'].includes(def.status) && approvedAt) {
      const isOverdue = overdueCustomerIndices.includes(def.ci);

      for (let month = 1; month <= term; month++) {
        const dueDate = new Date(approvedAt);
        dueDate.setMonth(dueDate.getMonth() + month);
        dueDate.setHours(0, 0, 0, 0);

        let repaymentStatus = 'pending';
        let paidDate = null;
        let daysOverdue = 0;

        if (month <= def.paidMonths) {
          repaymentStatus = 'paid';
          const daysEarly = Math.floor(Math.random() * 4);
          paidDate = new Date(dueDate);
          paidDate.setDate(paidDate.getDate() - daysEarly);
        } else if (isOverdue && dueDate < today) {
          repaymentStatus = 'overdue';
          daysOverdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
        }

        await prisma.repayment.create({
          data: {
            loanId: loan.id,
            monthNumber: month,
            amount: Math.round(emi),
            principalAmount: Math.round(amount / term),
            regularInterest: Math.round(totalInterest / term),
            lateInterest: repaymentStatus === 'overdue' ? Math.round(emi * loanType.latePaymentRate * daysOverdue / 100) : 0,
            dueDate,
            paidDate,
            daysOverdue,
            status: repaymentStatus,
            paymentMethod: repaymentStatus === 'paid' ? ['cash', 'bank_transfer', 'mobile_money'][Math.floor(Math.random() * 3)] : null,
            receivedBy: repaymentStatus === 'paid' ? 'Loan Officer' : null,
          }
        });
      }
    }
  }

  // Create activities
  console.log('📝 Creating activities...');
  const activityList = [
    { type: 'customer_registered', title: 'New Customer', description: 'Kasun Perera registered as new customer', daysAgo: 30 },
    { type: 'loan_approved', title: 'Loan Approved', description: 'Personal Loan of Rs. 500,000 approved for Kasun Perera', daysAgo: 28 },
    { type: 'customer_registered', title: 'New Customer', description: 'Dilini Wickramasinghe registered as new customer', daysAgo: 25 },
    { type: 'loan_approved', title: 'Loan Approved', description: 'Home Loan of Rs. 8,000,000 approved for Dilini Wickramasinghe', daysAgo: 24 },
    { type: 'payment_received', title: 'Payment Received', description: 'Payment of Rs. 23,490 received from Kasun Perera', daysAgo: 15 },
    { type: 'loan_application', title: 'Loan Application', description: 'Nimali Silva applied for Education Loan - Rs. 600,000', daysAgo: 5 },
    { type: 'loan_application', title: 'Loan Application', description: 'Tharaka Dissanayake applied for Personal Loan - Rs. 350,000', daysAgo: 3 },
    { type: 'loan_overdue', title: 'Overdue Alert', description: 'Sachini Ranasinghe - Personal Loan payment overdue', daysAgo: 2 },
    { type: 'loan_application', title: 'Loan Application', description: 'Rashmi Peris applied for Gold Loan - Rs. 200,000', daysAgo: 1 },
    { type: 'loan_approved', title: 'Loan Approved', description: 'Vehicle Loan of Rs. 1,800,000 approved for Ashan Karunaratne', daysAgo: 0 },
  ];

  for (const act of activityList) {
    const d = new Date(today);
    d.setDate(d.getDate() - act.daysAgo);
    d.setHours(9 + Math.floor(Math.random() * 8), Math.floor(Math.random() * 60), 0, 0);
    await prisma.activity.create({
      data: { type: act.type, title: act.title, description: act.description, userId: 1, createdAt: d }
    });
  }

  // Create notifications
  console.log('🔔 Creating notifications...');
  const notifList = [
    { type: 'loan_pending', title: 'Loan Pending Approval', message: 'Education Loan from Nimali Silva (Rs. 600,000) requires approval', priority: 'high', daysAgo: 5 },
    { type: 'loan_pending', title: 'Loan Pending Approval', message: 'Personal Loan from Tharaka Dissanayake (Rs. 350,000) requires approval', priority: 'high', daysAgo: 3 },
    { type: 'loan_pending', title: 'Loan Pending Approval', message: 'Gold Loan from Rashmi Peris (Rs. 200,000) requires approval', priority: 'medium', daysAgo: 1 },
    { type: 'loan_overdue', title: 'Overdue Payment Alert', message: 'Sachini Ranasinghe - Personal Loan repayment overdue by multiple months', priority: 'urgent', daysAgo: 2 },
    { type: 'loan_overdue', title: 'Overdue Payment Alert', message: 'Dinesh Rajapaksha - Agricultural Loan repayment overdue', priority: 'urgent', daysAgo: 3 },
    { type: 'loan_overdue', title: 'Overdue Payment Alert', message: 'Chathura De Silva - Personal Loan repayment overdue', priority: 'high', daysAgo: 4 },
    { type: 'loan_overdue', title: 'Overdue Payment Alert', message: 'Sanduni Nanayakkara - Education Loan repayment overdue', priority: 'high', daysAgo: 2 },
    { type: 'payment_due', title: 'Upcoming Payments', message: '5 loan payments are due this week totaling approximately Rs. 285,000', priority: 'medium', daysAgo: 0 },
  ];

  for (const n of notifList) {
    const d = new Date(today);
    d.setDate(d.getDate() - n.daysAgo);
    d.setHours(8, 0, 0, 0);
    await prisma.notification.create({
      data: { type: n.type, title: n.title, message: n.message, priority: n.priority, isRead: n.daysAgo > 3, createdAt: d }
    });
  }

  console.log('');
  console.log('✅ Seed completed successfully!');
  console.log('   - 2 users (admin@smartloan.com / Admin@123, officer@smartloan.com / Officer@123)');
  console.log('   - 7 loan types');
  console.log('   - 20 customers (varied incomes, cities, genders, ages, credit scores)');
  console.log('   - 20 loans:');
  console.log('       3 completed (all payments paid with past dates)');
  console.log('       4 active with overdue payments');
  console.log('       4 active on-track');
  console.log('       3 active just started');
  console.log('       3 pending');
  console.log('       2 approved');
  console.log('       1 rejected');
  console.log('   - Collateral: Property, Personal Guarantee, or none');
  console.log('   - Activities and notifications');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
