import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../config/supabase';
import CryptoJS from 'crypto-js';

interface User {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  capital_inicial: number;
  ganancia_semanal: number;
  total: number;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (userData: RegisterData) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  loading: boolean;
}

interface RegisterData {
  nombre: string;
  apellido: string;
  email: string;
  password: string;
  pregunta_secreta: string;
  respuesta_secreta: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Clave secreta para encriptación (en producción debe estar en variables de entorno)
const SECRET_KEY = 'CVM_CAPITAL_2024_SECURE_KEY_!@#$%^&*()';

// Función para hashear contraseñas
const hashPassword = (password: string, salt: string): string => {
  return CryptoJS.PBKDF2(password, salt, {
    keySize: 256/32,
    iterations: 10000
  }).toString();
};

// Función para generar salt aleatorio
const generateSalt = (): string => {
  return CryptoJS.lib.WordArray.random(128/8).toString();
};

// Función para validar entrada y prevenir inyección SQL
const sanitizeInput = (input: string): string => {
  return input.trim().replace(/[<>'"]/g, '');
};

// Función para validar email
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
};

// Función para validar contraseña
const isValidPassword = (password: string): boolean => {
  return password.length >= 6 && password.length <= 128 && 
         /[A-Z]/.test(password) && /\d/.test(password);
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  useEffect(() => {
    // Verificar si hay una sesión guardada
    const savedToken = localStorage.getItem('cvm_session_token');
    const savedUser = localStorage.getItem('cvm_user_data');
    
    if (savedToken && savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        setUser(userData);
        setSessionToken(savedToken);
      } catch (error) {
        console.error('Error parsing saved user data:', error);
        localStorage.removeItem('cvm_session_token');
        localStorage.removeItem('cvm_user_data');
      }
    }
    
    setLoading(false);

    // Detectar cuando la página se recarga (F5 o refresh)
    const handleBeforeUnload = () => {
      // Limpiar sesión al recargar la página
      localStorage.removeItem('cvm_session_token');
      localStorage.removeItem('cvm_user_data');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      // Validaciones de entrada
      if (!email || !password) {
        return { success: false, error: 'Email y contraseña son requeridos' };
      }

      const sanitizedEmail = sanitizeInput(email.toLowerCase());
      
      if (!isValidEmail(sanitizedEmail)) {
        return { success: false, error: 'Formato de email inválido' };
      }

      if (password.length < 6 || password.length > 128) {
        return { success: false, error: 'Contraseña inválida' };
      }

      console.log('Intentando login con:', sanitizedEmail);
      
      // Buscar usuario en la base de datos
      const { data: userData, error: userError } = await supabase
        .from('inversores')
        .select('*')
        .eq('email', sanitizedEmail)
        .maybeSingle();

      if (userError) {
        console.error('Error verificando usuario:', userError);
        return { success: false, error: 'Error de conexión. Inténtalo más tarde.' };
      }

      if (!userData) {
        return { success: false, error: 'Credenciales incorrectas' };
      }

      // Verificar contraseña hasheada
      const hashedPassword = hashPassword(password, userData.password_salt || '');
      
      if (hashedPassword !== userData.password_hash) {
        return { success: false, error: 'Credenciales incorrectas' };
      }

      // Generar token de sesión
      const sessionToken = CryptoJS.AES.encrypt(
        JSON.stringify({
          userId: userData.id,
          email: userData.email,
          timestamp: Date.now()
        }),
        SECRET_KEY
      ).toString();

      // Guardar sesión
      localStorage.setItem('cvm_session_token', sessionToken);
      localStorage.setItem('cvm_user_data', JSON.stringify({
        id: userData.id,
        nombre: userData.nombre,
        apellido: userData.apellido,
        email: userData.email,
        capital_inicial: 0, // Ya no se usa esta columna
        ganancia_semanal: 0, // Ya no se usa esta columna
        total: userData.total || 0
      }));

      setUser({
        id: userData.id,
        nombre: userData.nombre,
        apellido: userData.apellido,
        email: userData.email,
        capital_inicial: 0, // Ya no se usa esta columna
        ganancia_semanal: 0, // Ya no se usa esta columna
        total: userData.total || 0
      });
      
      setSessionToken(sessionToken);
      
      return { success: true };
      
    } catch (error: any) {
      console.error('Error en login:', error);
      return { success: false, error: 'Error de conexión. Inténtalo más tarde.' };
    }
  };

  const register = async (userData: RegisterData) => {
    try {
      console.log('Iniciando proceso de registro para:', userData.email);
      
      // Validaciones de entrada
      const sanitizedEmail = sanitizeInput(userData.email.toLowerCase());
      const sanitizedNombre = sanitizeInput(userData.nombre);
      const sanitizedApellido = sanitizeInput(userData.apellido);
      const sanitizedRespuesta = sanitizeInput(userData.respuesta_secreta.toLowerCase());
      
      if (!isValidEmail(sanitizedEmail)) {
        return { success: false, error: 'Formato de email inválido' };
      }

      if (!isValidPassword(userData.password)) {
        return { success: false, error: 'La contraseña debe tener al menos 6 caracteres, una mayúscula y un número' };
      }

      if (!sanitizedNombre || !sanitizedApellido) {
        return { success: false, error: 'Nombre y apellido son requeridos' };
      }

      if (!userData.pregunta_secreta || !sanitizedRespuesta) {
        return { success: false, error: 'Pregunta y respuesta de seguridad son requeridas' };
      }

      // Verificar conexión a Supabase
      console.log('Verificando conexión a Supabase...');
      const { data: testConnection, error: connectionError } = await supabase
        .from('configuracion_sistema')
        .select('id')
        .limit(1);

      if (connectionError) {
        console.error('Error de conexión a Supabase:', connectionError);
        return { success: false, error: 'Error de conexión a la base de datos. Verifica tu conexión a internet.' };
      }

      console.log('Conexión a Supabase exitosa');

      // Verificar si el email ya existe
      console.log('Verificando si el email ya existe...');
      const { data: existingUser, error: checkError } = await supabase
        .from('inversores')
        .select('id')
        .eq('email', sanitizedEmail)
        .maybeSingle();

      if (checkError) {
        console.error('Error verificando email existente:', checkError);
        return { success: false, error: 'Error de conexión. Inténtalo más tarde.' };
      }

      if (existingUser) {
        return { success: false, error: 'Este correo ya está registrado' };
      }

      console.log('Email disponible, procediendo con el registro...');

      // Generar salt y hashear contraseña
      const salt = generateSalt();
      const hashedPassword = hashPassword(userData.password, salt);

      console.log('Insertando nuevo usuario...');

      // Insertar nuevo usuario
      const { data: newUser, error: insertError } = await supabase
        .from('inversores')
        .insert({
          nombre: sanitizedNombre,
          apellido: sanitizedApellido,
          email: sanitizedEmail,
          password_hash: hashedPassword,
          password_salt: salt,
          pregunta_secreta: userData.pregunta_secreta,
          respuesta_secreta: sanitizedRespuesta,
          capital_inicial: 0,
          ganancia_semanal: 0,
          total: 0
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error al insertar usuario:', insertError);
        
        let errorMessage = 'Error al registrar usuario';
        if (insertError.code === '23505') {
          errorMessage = 'Este correo ya está registrado';
        } else if (insertError.message) {
          errorMessage = `Error: ${insertError.message}`;
        }
        
        return { success: false, error: errorMessage };
      }

      console.log('Usuario registrado exitosamente:', newUser);
      
      // Auto-login después del registro
      const loginResult = await login(sanitizedEmail, userData.password);
      
      return loginResult;
      
    } catch (error: any) {
      console.error('Error general en register:', error);
      return { success: false, error: `Error de conexión: ${error.message || 'Inténtalo más tarde.'}` };
    }
  };

  const logout = () => {
    try {
      console.log('Cerrando sesión...');
      localStorage.removeItem('cvm_session_token');
      localStorage.removeItem('cvm_user_data');
      setUser(null);
      setSessionToken(null);
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const value = {
    user,
    login,
    register,
    logout,
    loading
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};