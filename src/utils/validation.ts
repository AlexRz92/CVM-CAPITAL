export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
};

export const isValidPassword = (password: string): boolean => {
  return password.length >= 6 && password.length <= 128 && 
         /[A-Z]/.test(password) && /\d/.test(password);
};

export const sanitizeInput = (input: string): string => {
  return input.trim().replace(/[<>'"]/g, '');
};

export const handleAmountChange = (value: string, setter: (value: string) => void) => {
  if (value.startsWith('0') && value.length > 1) return;
  if (value.includes(',')) return;
  
  if (value === '' || /^\d+$/.test(value)) {
    setter(value);
  }
};