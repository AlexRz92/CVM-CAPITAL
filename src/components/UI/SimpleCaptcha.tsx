import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

interface SimpleCaptchaProps {
  onVerify: (isValid: boolean) => void;
  reset?: boolean;
}

const SimpleCaptcha: React.FC<SimpleCaptchaProps> = ({ onVerify, reset }) => {
  const [captchaQuestion, setCaptchaQuestion] = useState('');
  const [correctAnswer, setCorrectAnswer] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState('');

  const generateCaptcha = () => {
    const operations = [
      { type: 'sum', symbol: '+' },
      { type: 'subtract', symbol: '-' },
      { type: 'multiply', symbol: '×' }
    ];
    
    const operation = operations[Math.floor(Math.random() * operations.length)];
    let num1, num2, answer;
    
    switch (operation.type) {
      case 'sum':
        num1 = Math.floor(Math.random() * 20) + 1;
        num2 = Math.floor(Math.random() * 20) + 1;
        answer = num1 + num2;
        break;
      case 'subtract':
        num1 = Math.floor(Math.random() * 20) + 10;
        num2 = Math.floor(Math.random() * 10) + 1;
        answer = num1 - num2;
        break;
      case 'multiply':
        num1 = Math.floor(Math.random() * 10) + 1;
        num2 = Math.floor(Math.random() * 10) + 1;
        answer = num1 * num2;
        break;
      default:
        num1 = 5;
        num2 = 3;
        answer = 8;
    }
    
    setCaptchaQuestion(`¿Cuánto es ${num1} ${operation.symbol} ${num2}?`);
    setCorrectAnswer(answer);
    setUserAnswer('');
    setIsVerified(false);
    setError('');
    onVerify(false);
  };

  useEffect(() => {
    generateCaptcha();
  }, []);

  useEffect(() => {
    if (reset) {
      generateCaptcha();
    }
  }, [reset]);

  const handleAnswerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUserAnswer(value);
    setError('');
    
    if (value && !isNaN(Number(value))) {
      const numericAnswer = parseInt(value, 10);
      if (numericAnswer === correctAnswer) {
        setIsVerified(true);
        setError('');
        onVerify(true);
      } else {
        setIsVerified(false);
        onVerify(false);
        if (value.length >= correctAnswer.toString().length) {
          setError('Respuesta incorrecta');
        }
      }
    } else {
      setIsVerified(false);
      onVerify(false);
    }
  };

  return (
    <div className="space-y-3">
      <label className="block text-white text-sm font-medium">
        Verificación Anti-Bot *
      </label>
      
      <div className="bg-white/10 border border-white/50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-white font-medium text-lg">{captchaQuestion}</span>
          <button
            type="button"
            onClick={generateCaptcha}
            className="text-white/80 hover:text-white transition-colors p-1"
            title="Generar nueva pregunta"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        
        <div className="flex items-center space-x-3">
          <input
            type="number"
            value={userAnswer}
            onChange={handleAnswerChange}
            className="flex-1 px-3 py-2 bg-white/10 border border-white/50 rounded-md text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent"
            placeholder="Tu respuesta"
            required
          />
          
          {isVerified && (
            <div className="text-green-400 text-sm font-medium">
              ✓ Verificado
            </div>
          )}
        </div>
        
        {error && (
          <div className="text-red-300 text-sm mt-2">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default SimpleCaptcha;