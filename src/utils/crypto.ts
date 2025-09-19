import CryptoJS from 'crypto-js';

export const hashPassword = (password: string, salt: string): string => {
  return CryptoJS.PBKDF2(password, salt, {
    keySize: 256/32,
    iterations: 10000
  }).toString();
};

export const generateSalt = (): string => {
  return CryptoJS.lib.WordArray.random(128/8).toString();
};