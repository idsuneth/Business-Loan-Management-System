// Email validation
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Phone validation (10 digits)
export const isValidPhone = (phone) => {
  const phoneRegex = /^\d{10}$/
  return phoneRegex.test(phone.replace(/\D/g, ''))
}

// Password validation (min 8 chars, at least 1 uppercase, 1 number)
export const isValidPassword = (password) => {
  return password.length >= 8 && /[A-Z]/.test(password) && /\d/.test(password)
}

// Loan amount validation (1000 - 5000000)
export const isValidLoanAmount = (amount) => {
  return amount >= 1000 && amount <= 5000000
}

// Income validation (positive number)
export const isValidIncome = (income) => {
  return income > 0 && income < 1000000
}

// Credit score validation (300 - 850)
export const isValidCreditScore = (score) => {
  return score >= 300 && score <= 850
}

// Validate all form fields
export const validateForm = (fields) => {
  const errors = {}
  
  if (fields.email && !isValidEmail(fields.email)) {
    errors.email = 'Invalid email address'
  }
  
  if (fields.phone && !isValidPhone(fields.phone)) {
    errors.phone = 'Phone must be 10 digits'
  }
  
  if (fields.password && !isValidPassword(fields.password)) {
    errors.password = 'Password must be at least 8 characters with 1 uppercase and 1 number'
  }
  
  if (fields.loanAmount && !isValidLoanAmount(fields.loanAmount)) {
    errors.loanAmount = 'Loan amount must be between 1000 and 5000000'
  }
  
  if (fields.monthlyIncome && !isValidIncome(fields.monthlyIncome)) {
    errors.monthlyIncome = 'Invalid income amount'
  }
  
  if (fields.creditScore && !isValidCreditScore(fields.creditScore)) {
    errors.creditScore = 'Credit score must be between 300 and 850'
  }
  
  return errors
}
