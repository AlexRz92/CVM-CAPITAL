import React from 'react';
import { ArrowUpCircle, ArrowDownCircle, TrendingUp } from 'lucide-react';

interface Transaction {
  id: string;
  monto: number;
  tipo: string;
  fecha: string;
  descripcion: string;
}

interface ModuloTransactionsTableProps {
  transactions: Transaction[];
}

const ModuloTransactionsTable: React.FC<ModuloTransactionsTableProps> = ({ transactions }) => {
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
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTransactionIcon = (tipo: string) => {
    switch (tipo.toLowerCase()) {
      case 'retiro':
        return <ArrowDownCircle className="w-5 h-5 text-red-400" />;
      case 'deposito':
        return <ArrowUpCircle className="w-5 h-5 text-green-400" />;
      case 'ganancia':
        return <TrendingUp className="w-5 h-5 text-yellow-400" />;
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
      case 'ganancia':
        return 'text-yellow-400';
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
      case 'ganancia':
        return 'Ganancia';
      default:
        return tipo.charAt(0).toUpperCase() + tipo.slice(1);
    }
  };

  // Separar ganancias del resto de transacciones
  const ganancias = transactions.filter(t => t.tipo.toLowerCase() === 'ganancia');
  const otrasTransacciones = transactions.filter(t => t.tipo.toLowerCase() !== 'ganancia');

  return (
    <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-cyan-200/30">
      <h3 className="text-xl font-bold text-white mb-6 text-center">
        Historial de Transacciones del Módulo
      </h3>
      
      {transactions.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-white/70">No hay transacciones registradas en este módulo</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Sección de Ganancias */}
          {ganancias.length > 0 && (
            <div>
              <h4 className="text-lg font-semibold text-yellow-300 mb-4 flex items-center">
                <TrendingUp className="w-5 h-5 mr-2" />
                Ganancias Mensuales ({ganancias.length})
              </h4>
              <div className="bg-yellow-500/10 rounded-lg p-4 border border-yellow-500/30 mb-4">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-yellow-500/30">
                        <th className="text-left py-2 px-3 text-yellow-200 font-medium text-sm">Fecha</th>
                        <th className="text-right py-2 px-3 text-yellow-200 font-medium text-sm">Monto</th>
                        <th className="text-left py-2 px-3 text-yellow-200 font-medium text-sm">Descripción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ganancias.map((transaction) => (
                        <tr key={transaction.id} className="border-b border-yellow-500/20 hover:bg-yellow-500/10 transition-colors">
                          <td className="py-3 px-3 text-yellow-100 text-sm">
                            {formatDate(transaction.fecha)}
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-yellow-300">
                            {formatCurrency(transaction.monto)}
                          </td>
                          <td className="py-3 px-3 text-yellow-100 text-sm">
                            {transaction.descripcion || 'Ganancia mensual'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Sección de Otras Transacciones */}
          {otrasTransacciones.length > 0 && (
            <div>
              <h4 className="text-lg font-semibold text-white mb-4">
                Otras Transacciones ({otrasTransacciones.length})
              </h4>
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
                    {otrasTransacciones.map((transaction) => (
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
            </div>
          )}

          {/* Mensaje informativo si no hay ganancias */}
          {ganancias.length === 0 && otrasTransacciones.length > 0 && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <p className="text-blue-200 text-sm text-center">
                <strong>Sin ganancias registradas:</strong> Las ganancias aparecerán aquí cuando sean procesadas por el administrador
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ModuloTransactionsTable;