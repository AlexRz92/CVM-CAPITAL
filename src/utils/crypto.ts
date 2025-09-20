import CryptoJS from 'crypto-js';

export const hashPassword = (password: string, salt: string): string => {
  // Asegurar que el salt no esté vacío
  if (!salt || salt.trim() === '') {
    throw new Error('Salt cannot be empty');
  }
  
  // Usar configuración consistente con la base de datos
  return CryptoJS.PBKDF2(password, salt, {
    keySize: 256/32,
    iterations: 10000,
    hasher: CryptoJS.algo.SHA256
  }).toString();
};

export const generateSalt = (): string => {
  // Generar un salt más robusto
  const timestamp = Date.now().toString();
  const random = CryptoJS.lib.WordArray.random(128/8).toString();
  return CryptoJS.SHA256(timestamp + random).toString().substring(0, 32);
};