# SmartLoan BLMS — Business Loan Management System

A full-stack loan management system with AI-powered eligibility checking, role-based access control, and automated notifications.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
  - [AI Model Setup](#ai-model-setup)
- [Environment Variables](#environment-variables)
- [API Endpoints](#api-endpoints)
- [User Roles](#user-roles)
- [Database Schema](#database-schema)
- [AI Model](#ai-model)
- [Screenshots](#screenshots)
- [License](#license)

---

## Overview

SmartLoan BLMS is a comprehensive Business Loan Management System designed for financial institutions. It streamlines the entire loan lifecycle — from customer registration and KYC, through loan application, AI-based eligibility analysis, approval workflows, disbursement, and repayment tracking — all within a modern, role-aware web interface.

---

## Features

- **Role-Based Access Control** — Separate dashboards and permissions for Admins and Loan Officers
- **Customer Management** — KYC registration with document uploads, credit score tracking
- **Loan Lifecycle Management** — Application → Approval/Rejection → Disbursement → Repayment
- **AI Eligibility Checker** — Machine learning model (Random Forest) predicts loan approval probability
- **Dynamic Loan Types** — Configurable interest rates, processing fees, and min/max limits
- **Repayment Tracking** — EMI schedules with late payment interest calculation
- **Automated Notifications** — Email (Nodemailer) and SMS (Twilio) alerts for loan events
- **Reports & Analytics** — Dashboard charts with daily/monthly breakdowns (Recharts)
- **PDF Export** — Generate reports using jsPDF
- **Activity Logs** — Audit trail of all system actions
- **Admin Notification Center** — System-wide alerts for administrators

---

## Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| React 18 | UI framework |
| Vite | Build tool & dev server |
| Tailwind CSS | Styling |
| React Router v6 | Client-side routing |
| Axios | HTTP client |
| Recharts | Data visualization |
| Three.js | 3D background effects |
| jsPDF + jsPDF-AutoTable | PDF report generation |
| Lucide React | Icon library |

### Backend
| Technology | Purpose |
|---|---|
| Node.js + Express | REST API server |
| Prisma ORM | Database access layer |
| SQLite | Database |
| JWT | Authentication tokens |
| bcryptjs | Password hashing |
| Multer | File uploads |
| Nodemailer | Email notifications |
| Twilio | SMS notifications |
| node-cron | Scheduled tasks |

### AI Model
| Technology | Purpose |
|---|---|
| Python 3 | Runtime |
| Flask | Model serving API |
| scikit-learn | Random Forest classifier |
| pandas + numpy | Data processing |
| joblib | Model serialization |

---

## Project Structure

```
BLMS/
├── backend/                  # Express API server
│   ├── src/
│   │   ├── server.js         # Entry point
│   │   ├── controllers/      # Business logic
│   │   ├── routes/           # API route definitions
│   │   ├── middleware/        # Auth & role guards
│   │   └── services/         # Notification service
│   ├── prisma/
│   │   ├── schema.prisma     # Database schema
│   │   └── seed.js           # Seed data
│   └── uploads/              # Uploaded documents
│
├── frontend/                 # React application
│   └── src/
│       ├── components/
│       │   ├── admin/        # Admin-only components
│       │   ├── officer/      # Loan officer components
│       │   ├── ai/           # AI eligibility UI
│       │   ├── auth/         # Login
│       │   └── common/       # Shared components
│       ├── context/          # React context (theme, etc.)
│       ├── pages/            # Page-level components
│       ├── services/         # API & auth services
│       └── utils/            # Validation helpers
│
└── ai-model/                 # Python ML service
    ├── generate_data.py      # Synthetic training data generator
    ├── train_model.py        # Model training script
    ├── predict.py            # Flask prediction API
    ├── data/                 # Training datasets
    └── model/                # Saved model artifacts
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [Python](https://www.python.org/) 3.10+
- npm or yarn

---

### Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Configure environment variables (see below)
cp .env.example .env

# Run database migrations
npx prisma migrate dev

# Seed the database with initial data
npm run seed

# Start the development server
npm run dev
```

The backend API will be available at `http://localhost:5000`.

---

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

The frontend will be available at `http://localhost:5173`.

---

### AI Model Setup

```bash
cd ai-model

# Create and activate a virtual environment (recommended)
python -m venv venv
venv\Scripts\activate       # Windows
# source venv/bin/activate  # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Generate synthetic training data
python generate_data.py

# Train the model
python train_model.py

# Start the prediction API
python predict.py
```

The AI prediction service will run on `http://localhost:5001` (default Flask port).

---

## Environment Variables

Create a `.env` file in the `backend/` directory:

```env
# Database
DATABASE_URL="file:./dev.db"

# Server
PORT=5000

# Authentication
JWT_SECRET=your_jwt_secret_key_here

# Email (Nodemailer)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# SMS (Twilio)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# AI Service
AI_SERVICE_URL=http://localhost:5001
```

Create a `.env` file in the `frontend/` directory (optional):

```env
VITE_API_URL=http://localhost:5000/api
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | User login |
| POST | `/api/auth/register` | Register user |
| GET | `/api/customers` | List all customers |
| POST | `/api/customers` | Register new customer |
| GET | `/api/customers/:id` | Get customer details |
| GET | `/api/loans` | List all loans |
| POST | `/api/loans` | Create loan application |
| PATCH | `/api/loans/:id/approve` | Approve a loan |
| PATCH | `/api/loans/:id/reject` | Reject a loan |
| GET | `/api/repayments/:loanId` | Get repayment schedule |
| POST | `/api/repayments/:id/pay` | Record a payment |
| POST | `/api/ai/predict` | AI eligibility prediction |
| GET | `/api/loan-types` | List loan types |
| GET | `/api/dashboard/stats` | Dashboard statistics |
| GET | `/api/notifications` | User notifications |
| GET | `/api/activities` | Activity log |

---

## User Roles

| Role | Capabilities |
|------|-------------|
| **Admin** | Full access — manage users, loan types, view all loans/customers, configure interest rates, access reports, manage notifications |
| **Officer** | Register customers, submit loan applications, record repayments, view assigned loan portfolio |

Default admin credentials are set via the seed script (`npm run seed`).

---

## Database Schema

Core entities and relationships:

- **User** — System users (admin / officer)
- **Customer** — Borrower profiles with KYC data
- **LoanType** — Configurable loan products with interest rates and limits
- **Loan** — Loan applications with status lifecycle (`pending → approved → disbursed → active → completed`)
- **Repayment** — Individual payment records with principal, interest, and late-fee breakdowns
- **Notification** — User-facing alerts
- **Activity** — Audit log entries

---

## AI Model

The AI eligibility checker uses a **Random Forest Classifier** trained on synthetic loan data.

**Input features:**
- Loan amount
- Loan duration (months)
- Monthly income
- Existing debts
- Credit score
- Debt-to-income ratio
- Loan-to-income ratio

**Output:**
- Approval probability (0–100%)
- Risk score
- Recommendation (Approved / High Risk / Rejected)

The model is served via a Flask REST API and called by the backend's `/api/ai/predict` endpoint.

---

## Screenshots

<img width="1919" height="942" alt="image" src="https://github.com/user-attachments/assets/02b5703a-9bfb-4a85-89c8-54c97cf337bc" />

---

## License

This project is licensed under the [MIT License](LICENSE).
