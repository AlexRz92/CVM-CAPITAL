import React from 'react';
import { ArrowUpCircle, ArrowDownCircle, RefreshCw } from 'lucide-react';

interface Transaction {
  id: string;
  monto: number;
  tipo: string;
  fecha: string;
  descripcion: string;
}

interface TransactionsTableProps {
  transactions: Transaction[];
}

const TransactionsTable: React.FC<TransactionsTableProps> = ({ transactions }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getTransactionIcon = (tipo: string) => {
    switch (tipo.toLowerCase()) {
      case 'retiro':
        return <ArrowDownCircle className="w-5 h-5 text-red-400" />;
      case 'deposito':
        return <ArrowUpCircle className="w-5 h-5 text-green-400" />;
      case 'reinversion':
        return <RefreshCw className="w-5 h-5 text-blue-400" />;
      default:
        return <ArrowUpCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getAmountColor = (tipo: string) => {
    switch (tipo.toLowerCase()) {
      case 'retiro':
        return 'text-red-400';
      case 'deposito':
        return 'text-green-400';
      case 'reinversion':
        return 'text-blue-400';
      default:
        return 'text-gray-300';
    }
  };

  const getDisplayName = (tipo: string) => {
    switch (tipo.toLowerCase()) {
      case 'deposito':
        return 'Depósito';
      case 'retiro':
        return 'Retiro';
      case 'reinversion':
        return 'Reinversión';
      case 'ganancia':
        return 'Ganancia';
      default:
        return tipo.charAt(0).toUpperCase() + tipo.slice(1);
    }
  };

  return (
    <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-cyan-200/30">
      <h3 className="text-xl font-bold text-white mb-6 text-center">
        Historial de Transacciones
      </h3>
      
      {transactions.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-white/70">No hay transacciones registradas</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/30">
                <th className="text-left py-3 px-4 text-white/90 font-medium">Tipo</th>
                <th className="text-right py-3 px-4 text-white/90 font-medium">Monto</th>
                <th className="text-right py-3 px-4 text-white/90 font-medium">Fecha</th>
                <th className="text-left py-3 px-4 text-white/90 font-medium">Descripción</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((transaction) => (
                <tr key={transaction.id} className="border-b border-white/20 hover:bg-white/10 transition-colors">
                  <td className="py-4 px-4">
                    <div className="flex items-center space-x-3">
                      {getTransactionIcon(transaction.tipo)}
                      <span className="text-white font-medium">
                        {getDisplayName(transaction.tipo)}
                      </span>
                    </div>
                  </td>
                  <td className={`py-4 px-4 text-right font-bold ${getAmountColor(transaction.tipo)}`}>
                    {formatCurrency(transaction.monto)}
                  </td>
                  <td className="py-4 px-4 text-right text-white/80">
                    {formatDate(transaction.fecha)}
                  </td>
                  <td className="py-4 px-4 text-white/80">
                    {transaction.descripcion || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default TransactionsTable;