const nodemailer = require('nodemailer');
const twilio = require('twilio');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Email transporter (configured lazily)
let emailTransporter = null;

// Twilio client (configured lazily)
let twilioClient = null;

// Initialize email transporter
let _lastSmtpUser = null;
const getEmailTransporter = () => {
  // Reset cached transporter if SMTP_USER changed (e.g. after .env update)
  if (!emailTransporter || process.env.SMTP_USER !== _lastSmtpUser) {
    _lastSmtpUser = process.env.SMTP_USER;
    emailTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }
  return emailTransporter;
};

// Initialize Twilio client
const getTwilioClient = () => {
  if (!twilioClient && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  }
  return twilioClient;
};

// Helper to replace template variables
const replaceTemplateVariables = (template, variables) => {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value || '');
  }
  return result;
};

// Get notification setting
const getSetting = async (key) => {
  const setting = await prisma.notificationSetting.findUnique({
    where: { settingKey: key }
  });
  return setting?.settingValue;
};

// Log notification
const logNotification = async (data) => {
  try {
    await prisma.notification.create({
      data: {
        type: data.type,
        title: data.title || data.subject || `${data.type} notification`,
        recipient: data.recipient,
        subject: data.subject || null,
        message: data.message,
        status: data.status,
        errorMessage: data.errorMessage || null,
        relatedLoanId: data.loanId || null,
        relatedCustomerId: data.customerId || null,
        sentAt: data.status === 'sent' ? new Date() : null
      }
    });
  } catch (error) {
    console.error('Error logging notification:', error);
  }
};

// Send Email
const sendEmail = async (to, subject, body, options = {}) => {
  try {
    const emailEnabled = await getSetting('email_enabled');
    // Default to enabled if setting not yet in DB
    if (emailEnabled === 'false') {
      console.log('Email notifications are disabled');
      return { success: false, message: 'Email notifications disabled' };
    }

    const transporter = getEmailTransporter();
    
    if (!process.env.SMTP_USER) {
      console.log('SMTP not configured - email would be sent to:', to);
      await logNotification({
        type: 'email',
        recipient: to,
        subject,
        message: body,
        status: 'pending',
        errorMessage: 'SMTP not configured',
        ...options
      });
      return { success: false, message: 'SMTP not configured' };
    }

    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.SMTP_USER,
      to,
      subject,
      text: body,
      html: body.replace(/\n/g, '<br>')
    });

    await logNotification({
      type: 'email',
      recipient: to,
      subject,
      message: body,
      status: 'sent',
      ...options
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    await logNotification({
      type: 'email',
      recipient: to,
      subject,
      message: body,
      status: 'failed',
      errorMessage: error.message,
      ...options
    });
    return { success: false, error: error.message };
  }
};

// Send SMS
const sendSMS = async (to, body, options = {}) => {
  try {
    const smsEnabled = await getSetting('sms_enabled');
    if (smsEnabled !== 'true') {
      console.log('SMS notifications are disabled');
      return { success: false, message: 'SMS notifications disabled' };
    }

    const client = getTwilioClient();
    
    if (!client || !process.env.TWILIO_PHONE_NUMBER) {
      console.log('Twilio not configured - SMS would be sent to:', to);
      await logNotification({
        type: 'sms',
        recipient: to,
        message: body,
        status: 'pending',
        errorMessage: 'Twilio not configured',
        ...options
      });
      return { success: false, message: 'Twilio not configured' };
    }

    const message = await client.messages.create({
      body,
      from: process.env.TWILIO_PHONE_NUMBER,
      to
    });

    await logNotification({
      type: 'sms',
      recipient: to,
      message: body,
      status: 'sent',
      ...options
    });

    return { success: true, sid: message.sid };
  } catch (error) {
    console.error('Error sending SMS:', error);
    await logNotification({
      type: 'sms',
      recipient: to,
      message: body,
      status: 'failed',
      errorMessage: error.message,
      ...options
    });
    return { success: false, error: error.message };
  }
};

// Send registration notification
const sendRegistrationNotification = async (customer) => {
  const results = { email: null, sms: null };

  // Get templates
  const emailTemplate = await getSetting('registration_email_template');
  const smsTemplate = await getSetting('registration_sms_template');

  const variables = {
    customerName: customer.fullName,
    email: customer.email,
    phone: customer.phone
  };

  // Send email
  if (customer.email && emailTemplate) {
    const emailBody = replaceTemplateVariables(emailTemplate, variables);
    results.email = await sendEmail(
      customer.email,
      'Welcome to SmartLoan!',
      emailBody,
      { customerId: customer.id }
    );
  }

  // Send SMS
  if (customer.phone && smsTemplate) {
    const smsBody = replaceTemplateVariables(smsTemplate, variables);
    results.sms = await sendSMS(customer.phone, smsBody, { customerId: customer.id });
  }

  return results;
};

// Send overdue notification
const sendOverdueNotification = async (loan, repayment, customer) => {
  const results = { email: null, sms: null };

  // Get templates
  const emailTemplate = await getSetting('overdue_email_template');
  const smsTemplate = await getSetting('overdue_sms_template');

  // Calculate amounts
  const daysOverdue = repayment.daysOverdue || Math.floor((new Date() - new Date(repayment.dueDate)) / (1000 * 60 * 60 * 24));
  const lateFee = (loan.latePaymentRate || 0) * repayment.principalAmount * daysOverdue / 100;
  const totalDue = (repayment.amount || 0) + lateFee;

  const variables = {
    customerName: customer.fullName,
    amount: `$${repayment.amount?.toFixed(2) || '0.00'}`,
    dueDate: new Date(repayment.dueDate).toLocaleDateString(),
    daysOverdue: daysOverdue.toString(),
    principal: `$${repayment.principalAmount?.toFixed(2) || '0.00'}`,
    interest: `$${repayment.regularInterest?.toFixed(2) || '0.00'}`,
    lateFee: `$${lateFee.toFixed(2)}`,
    totalDue: `$${totalDue.toFixed(2)}`,
    loanType: loan.loanType?.name || loan.purpose
  };

  // Send email
  if (customer.email && emailTemplate) {
    const emailBody = replaceTemplateVariables(emailTemplate, variables);
    results.email = await sendEmail(
      customer.email,
      `Payment Overdue - ${daysOverdue} Days`,
      emailBody,
      { customerId: customer.id, loanId: loan.id }
    );
  }

  // Send SMS
  if (customer.phone && smsTemplate) {
    const smsBody = replaceTemplateVariables(smsTemplate, variables);
    results.sms = await sendSMS(customer.phone, smsBody, { customerId: customer.id, loanId: loan.id });
  }

  return results;
};

// Check and update overdue repayments
const checkAndUpdateOverduePayments = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Find all pending repayments past due date
  const overdueRepayments = await prisma.repayment.findMany({
    where: {
      status: 'pending',
      dueDate: {
        lt: today
      }
    },
    include: {
      loan: {
        include: {
          customer: true,
          loanType: true
        }
      }
    }
  });

  const results = [];

  for (const repayment of overdueRepayments) {
    const daysOverdue = Math.floor((today - new Date(repayment.dueDate)) / (1000 * 60 * 60 * 24));
    
    // Calculate late interest
    const lateRate = repayment.loan.latePaymentRate || 0.1;
    const lateInterest = (repayment.principalAmount || 0) * lateRate * daysOverdue / 100;

    // Update repayment status and late interest
    await prisma.repayment.update({
      where: { id: repayment.id },
      data: {
        status: 'overdue',
        daysOverdue,
        lateInterest
      }
    });

    results.push({
      repaymentId: repayment.id,
      loanId: repayment.loanId,
      customerId: repayment.loan.customerId,
      daysOverdue,
      lateInterest
    });
  }

  return results;
};

// Send bulk overdue notifications
const sendBulkOverdueNotifications = async () => {
  const autoNotify = await getSetting('auto_overdue_notification');
  if (autoNotify !== 'true') {
    return { sent: 0, message: 'Auto notifications disabled' };
  }

  const reminderDaysStr = await getSetting('overdue_reminder_days') || '1,3,7,14,30';
  const reminderDays = reminderDaysStr.split(',').map(d => parseInt(d.trim()));

  // First update all overdue payments
  await checkAndUpdateOverduePayments();

  // Find overdue repayments that match reminder days
  const overdueRepayments = await prisma.repayment.findMany({
    where: {
      status: 'overdue',
      daysOverdue: { in: reminderDays }
    },
    include: {
      loan: {
        include: {
          customer: true,
          loanType: true
        }
      }
    }
  });

  const results = [];

  for (const repayment of overdueRepayments) {
    const result = await sendOverdueNotification(
      repayment.loan,
      repayment,
      repayment.loan.customer
    );
    results.push({
      customerId: repayment.loan.customerId,
      repaymentId: repayment.id,
      ...result
    });
  }

  return { sent: results.length, results };
};

// Get notification history
const getNotificationHistory = async (filters = {}) => {
  const where = {};
  
  if (filters.type) where.type = filters.type;
  if (filters.status) where.status = filters.status;
  if (filters.customerId) where.relatedCustomerId = parseInt(filters.customerId);
  if (filters.loanId) where.relatedLoanId = parseInt(filters.loanId);

  return prisma.notification.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: filters.limit || 100
  });
};

module.exports = {
  sendEmail,
  sendSMS,
  sendRegistrationNotification,
  sendOverdueNotification,
  checkAndUpdateOverduePayments,
  sendBulkOverdueNotifications,
  getNotificationHistory,
  getSetting,
  replaceTemplateVariables
};
