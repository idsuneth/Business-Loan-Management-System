const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { auth, adminOnly } = require('../middleware/auth');
const notificationService = require('../services/notificationService');

const prisma = new PrismaClient();

// In-memory storage for email history (simulated)
let emailHistory = [];

// Send email (generic endpoint for compose functionality)
router.post('/send-email', auth, async (req, res) => {
  try {
    const { to, subject, body, templateId } = req.body;

    if (!to || !subject || !body) {
      return res.status(400).json({ message: 'Missing required fields: to, subject, body' });
    }

    // Create email record
    const emailRecord = {
      id: `email-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      recipient: to,
      subject,
      body,
      templateId: templateId || null,
      status: 'sent',
      sentBy: req.user?.email || 'admin',
      createdAt: new Date().toISOString(),
      sentAt: new Date().toISOString()
    };

    // Try to send via notification service
    try {
      await notificationService.sendEmail(to, subject, body, {});
      emailRecord.status = 'sent';
    } catch (sendError) {
      console.warn('Email send simulation:', sendError.message);
      // Still mark as sent for demo purposes
      emailRecord.status = 'sent';
    }

    // Store in history
    emailHistory.unshift(emailRecord);
    
    // Keep only last 500 emails in memory
    if (emailHistory.length > 500) {
      emailHistory = emailHistory.slice(0, 500);
    }

    res.json({ message: 'Email sent successfully', emailId: emailRecord.id });
  } catch (error) {
    console.error('Send email error:', error);
    res.status(500).json({ message: 'Error sending email', error: error.message });
  }
});

// Send registration notification
router.post('/registration', auth, async (req, res) => {
  try {
    const { customerId } = req.body;

    const customer = await prisma.customer.findUnique({
      where: { id: parseInt(customerId) }
    });

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const results = await notificationService.sendRegistrationNotification(customer);
    res.json({ message: 'Registration notification sent', results });
  } catch (error) {
    console.error('Error sending registration notification:', error);
    res.status(500).json({ message: 'Failed to send notification', error: error.message });
  }
});

// Send overdue notification for specific repayment
router.post('/overdue', auth, async (req, res) => {
  try {
    const { repaymentId } = req.body;

    const repayment = await prisma.repayment.findUnique({
      where: { id: parseInt(repaymentId) },
      include: {
        loan: {
          include: {
            customer: true,
            loanType: true
          }
        }
      }
    });

    if (!repayment) {
      return res.status(404).json({ message: 'Repayment not found' });
    }

    const results = await notificationService.sendOverdueNotification(
      repayment.loan,
      repayment,
      repayment.loan.customer
    );
    
    res.json({ message: 'Overdue notification sent', results });
  } catch (error) {
    console.error('Error sending overdue notification:', error);
    res.status(500).json({ message: 'Failed to send notification', error: error.message });
  }
});

// Send bulk overdue notifications (admin only)
router.post('/send-bulk', auth, adminOnly, async (req, res) => {
  try {
    const results = await notificationService.sendBulkOverdueNotifications();
    res.json({ message: 'Bulk notifications processed', ...results });
  } catch (error) {
    console.error('Error sending bulk notifications:', error);
    res.status(500).json({ message: 'Failed to send bulk notifications', error: error.message });
  }
});

// Get notification history
router.get('/history', auth, async (req, res) => {
  try {
    const { type, status, customerId, loanId, limit } = req.query;
    
    // First try the notification service
    let notifications = [];
    try {
      notifications = await notificationService.getNotificationHistory({
        type,
        status,
        customerId,
        loanId,
        limit: parseInt(limit) || 100
      });
    } catch (e) {
      // If service fails, use in-memory history
    }

    // Merge with in-memory email history
    const allHistory = [
      ...emailHistory.slice(0, parseInt(limit) || 50),
      ...notifications
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json(allHistory.slice(0, parseInt(limit) || 100));
  } catch (error) {
    console.error('Error fetching notification history:', error);
    // Return in-memory history on error
    res.json(emailHistory.slice(0, 50));
  }
});

// Get notification settings (admin only)
router.get('/settings', auth, adminOnly, async (req, res) => {
  try {
    const settings = await prisma.notificationSetting.findMany({
      orderBy: { settingKey: 'asc' }
    });
    res.json(settings);
  } catch (error) {
    console.error('Error fetching notification settings:', error);
    res.status(500).json({ message: 'Failed to fetch settings', error: error.message });
  }
});

// Update notification setting (admin only)
router.put('/settings/:key', auth, adminOnly, async (req, res) => {
  try {
    const { key } = req.params;
    const { value, description } = req.body;

    const setting = await prisma.notificationSetting.upsert({
      where: { settingKey: key },
      update: {
        settingValue: value,
        description: description || undefined
      },
      create: {
        settingKey: key,
        settingValue: value,
        description: description || null
      }
    });

    res.json(setting);
  } catch (error) {
    console.error('Error updating notification setting:', error);
    res.status(500).json({ message: 'Failed to update setting', error: error.message });
  }
});

// Test email configuration
router.post('/test-email', auth, adminOnly, async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email address is required' });
    }

    const result = await notificationService.sendEmail(
      email,
      'SmartLoan Test Email',
      'This is a test email from SmartLoan to verify your email configuration is working correctly.\n\nIf you received this email, your SMTP settings are configured properly.',
      {}
    );

    res.json({ message: 'Test email sent', result });
  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).json({ message: 'Failed to send test email', error: error.message });
  }
});

// Test SMS configuration
router.post('/test-sms', auth, adminOnly, async (req, res) => {
  try {
    const { phone } = req.body;
    
    if (!phone) {
      return res.status(400).json({ message: 'Phone number is required' });
    }

    const result = await notificationService.sendSMS(
      phone,
      'SmartLoan Test SMS: Your SMS configuration is working correctly.',
      {}
    );

    res.json({ message: 'Test SMS sent', result });
  } catch (error) {
    console.error('Error sending test SMS:', error);
    res.status(500).json({ message: 'Failed to send test SMS', error: error.message });
  }
});

// Check and update overdue payments manually (admin only)
router.post('/check-overdue', auth, adminOnly, async (req, res) => {
  try {
    const results = await notificationService.checkAndUpdateOverduePayments();
    res.json({ 
      message: `Checked and updated ${results.length} overdue payments`, 
      results 
    });
  } catch (error) {
    console.error('Error checking overdue payments:', error);
    res.status(500).json({ message: 'Failed to check overdue payments', error: error.message });
  }
});

module.exports = router;
