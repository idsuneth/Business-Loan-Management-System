// Role-based access control middleware

const roleCheck = (...allowedRoles) => {
  return (req, res, next) => {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    // Check if user's role is in the allowed roles
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'Access denied. Insufficient permissions.',
        requiredRoles: allowedRoles,
        userRole: req.user.role
      });
    }

    next();
  };
};

// Convenience middleware for admin-only routes
const adminOnly = roleCheck('admin');

// Convenience middleware for officer and admin routes
const officerOrAdmin = roleCheck('officer', 'admin');

module.exports = { roleCheck, adminOnly, officerOrAdmin };
