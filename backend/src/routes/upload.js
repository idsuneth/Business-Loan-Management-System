const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// File filter - only allow images and PDFs
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|pdf/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Only images (jpg, png, gif) and PDF files are allowed'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: fileFilter
});

// Upload multiple documents
router.post('/documents', upload.fields([
  { name: 'idDocument', maxCount: 1 },
  { name: 'proofOfIncome', maxCount: 1 },
  { name: 'proofOfAddress', maxCount: 1 }
]), (req, res) => {
  try {
    const uploadedFiles = {};
    
    if (req.files) {
      if (req.files.idDocument) {
        uploadedFiles.idDocument = req.files.idDocument[0].filename;
      }
      if (req.files.proofOfIncome) {
        uploadedFiles.proofOfIncome = req.files.proofOfIncome[0].filename;
      }
      if (req.files.proofOfAddress) {
        uploadedFiles.proofOfAddress = req.files.proofOfAddress[0].filename;
      }
    }
    
    res.json({
      success: true,
      message: 'Files uploaded successfully',
      files: uploadedFiles
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Failed to upload files' });
  }
});

// Upload collateral documents (property deed or guarantor NIC images)
router.post('/collateral-documents', upload.fields([
  { name: 'propertyDocument', maxCount: 1 },
  { name: 'guarantorNic1', maxCount: 1 },
  { name: 'guarantorNic2', maxCount: 1 }
]), (req, res) => {
  try {
    const uploadedFiles = {};

    if (req.files) {
      if (req.files.propertyDocument) {
        uploadedFiles.propertyDocument = req.files.propertyDocument[0].filename;
      }
      if (req.files.guarantorNic1) {
        uploadedFiles.guarantorNic1 = req.files.guarantorNic1[0].filename;
      }
      if (req.files.guarantorNic2) {
        uploadedFiles.guarantorNic2 = req.files.guarantorNic2[0].filename;
      }
    }

    res.json({
      success: true,
      message: 'Collateral documents uploaded successfully',
      files: uploadedFiles
    });
  } catch (error) {
    console.error('Collateral upload error:', error);
    res.status(500).json({ message: 'Failed to upload collateral documents' });
  }
});

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File too large. Maximum size is 10MB' });
    }
    return res.status(400).json({ message: error.message });
  }
  if (error) {
    return res.status(400).json({ message: error.message });
  }
  next();
});

module.exports = router;
