const express = require('express');
const router = express.Router();

// Get recent activities
router.get('/', async (req, res) => {
  try {
    const prisma = req.prisma;
    const limit = parseInt(req.query.limit) || 10;
    
    const activities = await prisma.activity.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit
    });
    
    res.json(activities);
  } catch (error) {
    console.error('Error fetching activities:', error);
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

// Create activity
router.post('/', async (req, res) => {
  try {
    const prisma = req.prisma;
    const { type, title, description, entityType, entityId, userId } = req.body;
    
    const activity = await prisma.activity.create({
      data: {
        type,
        title,
        description,
        entityType,
        entityId,
        userId
      }
    });
    
    res.status(201).json(activity);
  } catch (error) {
    console.error('Error creating activity:', error);
    res.status(500).json({ error: 'Failed to create activity' });
  }
});

module.exports = router;
