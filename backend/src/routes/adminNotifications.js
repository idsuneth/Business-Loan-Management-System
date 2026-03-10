const express = require('express');
const router = express.Router();

// Get all notifications (admin)
router.get('/', async (req, res) => {
  try {
    const prisma = req.prisma;
    const { unreadOnly } = req.query;
    
    const where = {};
    if (unreadOnly === 'true') {
      where.isRead = false;
    }
    
    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    
    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Get unread count
router.get('/unread-count', async (req, res) => {
  try {
    const prisma = req.prisma;
    
    const count = await prisma.notification.count({
      where: { isRead: false }
    });
    
    res.json({ count });
  } catch (error) {
    console.error('Error counting notifications:', error);
    res.status(500).json({ error: 'Failed to count notifications' });
  }
});

// Mark notification as read
router.put('/:id/read', async (req, res) => {
  try {
    const prisma = req.prisma;
    
    const notification = await prisma.notification.update({
      where: { id: parseInt(req.params.id) },
      data: { 
        isRead: true,
        readAt: new Date()
      }
    });
    
    res.json(notification);
  } catch (error) {
    console.error('Error marking notification read:', error);
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

// Mark all as read
router.put('/mark-all-read', async (req, res) => {
  try {
    const prisma = req.prisma;
    
    await prisma.notification.updateMany({
      where: { isRead: false },
      data: { 
        isRead: true,
        readAt: new Date()
      }
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking all notifications read:', error);
    res.status(500).json({ error: 'Failed to update notifications' });
  }
});

// Create notification
router.post('/', async (req, res) => {
  try {
    const prisma = req.prisma;
    const { type, title, message, priority, entityType, entityId } = req.body;
    
    const notification = await prisma.notification.create({
      data: {
        type,
        title,
        message,
        priority: priority || 'medium',
        entityType,
        entityId
      }
    });
    
    res.status(201).json(notification);
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ error: 'Failed to create notification' });
  }
});

module.exports = router;
