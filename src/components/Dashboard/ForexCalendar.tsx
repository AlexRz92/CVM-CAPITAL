import React from 'react';
import { Calendar } from 'lucide-react';

const ForexCalendar: React.FC = () => {
  const openFinancialJuice = () => {
    window.open('https://www.financialjuice.com/home', '_blank');
  };

  return (
    <button
      onClick={openFinancialJuice}
      className="fixed bottom-24 right-6 w-16 h-16 bg-gradient-to-br from-green-500 to-green-700 text-white rounded-full shadow-2xl hover:scale-110 transition-all duration-300 flex items-center justify-center z-40"
      title="Calendario Económico"
    >
      <Calendar className="w-8 h-8" />
    </button>
  );
};

export default ForexCalendar;