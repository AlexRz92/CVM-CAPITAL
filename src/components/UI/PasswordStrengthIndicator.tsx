import React from 'react';
import { Check, X } from 'lucide-react';

interface PasswordStrengthIndicatorProps {
  password: string;
  show: boolean;
}

const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({ password, show }) => {
  const requirements = [
    { text: 'Al menos 6 caracteres', test: password.length >= 6 },
    { text: 'Una letra mayúscula', test: /[A-Z]/.test(password) },
    { text: 'Un número', test: /\d/.test(password) }
  ];

  const strength = requirements.filter(req => req.test).length;
  const strengthColor = strength === 0 ? 'bg-red-500' : 
                       strength === 1 ? 'bg-red-400' : 
                       strength === 2 ? 'bg-yellow-400' : 'bg-green-500';

  if (!show) return null;

  return (
    <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
      <div className="mb-2">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-gray-700">Fortaleza de contraseña</span>
          <span className={`font-medium ${strength === 3 ? 'text-green-600' : 'text-gray-600'}`}>
            {strength === 0 ? 'Débil' : strength === 1 ? 'Débil' : strength === 2 ? 'Media' : 'Fuerte'}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${strengthColor}`}
            style={{ width: `${(strength / 3) * 100}%` }}
          ></div>
        </div>
      </div>
      
      <ul className="space-y-1">
        {requirements.map((req, index) => (
          <li key={index} className="flex items-center space-x-2 text-sm">
            {req.test ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <X className="w-4 h-4 text-red-500" />
            )}
            <span className={req.test ? 'text-green-700' : 'text-gray-600'}>
              {req.text}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PasswordStrengthIndicator;