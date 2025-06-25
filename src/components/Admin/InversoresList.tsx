import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabase';
import { useAdmin } from '../../contexts/AdminContext';
import TransaccionesManager from './TransaccionesManager';
import { User, DollarSign, Calendar, ChevronDown, ChevronRight } from 'lucide-react';

interface Inversor {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  capital_inicial: number;
  ganancia_semanal: number;
  total: number;
  created_at: string;
}

interface InversoresListProps {
  onStatsUpdate: () => void;
}

const InversoresList: React.FC<InversoresListProps> = ({ onStatsUpdate }) => {
  const { admin } = useAdmin();
  const [inversores, setInversores] = useState<Inversor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInversor, setSelectedInversor] = useState<string | null>(null);

  useEffect(() => {
    fetchInversores();
  }, []);

  const fetchInversores = async () => {
    try {
      const { data, error } = await supabase
        .from('inversores')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInversores(data || []);
    } catch (error) {
      console.error('Error fetching inversores:', error);
    } finally {
      setLoading(false);
    }
  };

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

  if (loading) {
    return (
      <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-cyan-200/30">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Lista de Inversores */}
      <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-cyan-200/30">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center">
          <User className="w-6 h-6 mr-3" />
          Lista de Inversores ({inversores.length})
        </h3>
        
        {inversores.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-white/70">No hay inversores registrados</p>
          </div>
        ) : (
          <div className="space-y-4">
            {inversores.map((inversor) => (
              <div key={inversor.id} className="bg-white/10 rounded-lg border border-white/20">
                <button
                  onClick={() => setSelectedInversor(
                    selectedInversor === inversor.id ? null : inversor.id
                  )}
                  className="w-full p-4 text-left hover:bg-white/5 transition-colors rounded-lg"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h4 className="text-white font-semibold">
                          {inversor.nombre} {inversor.apellido}
                        </h4>
                        <p className="text-white/70 text-sm">{inversor.email}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-6">
                      <div className="text-right">
                        <p className="text-white font-semibold">
                          {formatCurrency(inversor.total)}
                        </p>
                        <p className="text-white/70 text-sm">Total</p>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-green-300 font-semibold">
                          {formatCurrency(inversor.ganancia_semanal)}
                        </p>
                        <p className="text-white/70 text-sm">Semanal</p>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-white/80 text-sm">
                          {formatDate(inversor.created_at)}
                        </p>
                        <p className="text-white/70 text-sm">Registro</p>
                      </div>
                      
                      {selectedInversor === inversor.id ? (
                        <ChevronDown className="w-5 h-5 text-white/70" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-white/70" />
                      )}
                    </div>
                  </div>
                </button>
                
                {selectedInversor === inversor.id && (
                  <div className="border-t border-white/20 p-4">
                    <TransaccionesManager 
                      inversorId={inversor.id}
                      inversorNombre={`${inversor.nombre} ${inversor.apellido}`}
                      isAdmin={admin?.role === 'admin'}
                      onUpdate={fetchInversores}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default InversoresList;