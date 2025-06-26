import React, { useState, useEffect } from 'react';
import { User, DollarSign, TrendingUp, ChevronDown, ChevronRight } from 'lucide-react';
import { supabase } from '../../config/supabase';

interface Inversor {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  total: number;
  ganancia_semanal: number;
}

interface InversorConGanancia {
  inversor_id: string;
  nombre: string;
  apellido: string;
  email: string;
  total_invertido: number;
  ganancia_semanal: number;
  ganancia_para_partner: number;
  porcentaje_ganancia: number;
}

interface SocioInversoresListProps {
  inversores: Inversor[];
}

const SocioInversoresList: React.FC<SocioInversoresListProps> = ({ inversores }) => {
  const [inversoresConGanancias, setInversoresConGanancias] = useState<InversorConGanancia[]>([]);
  const [expandedInversor, setExpandedInversor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Obtener el partner ID del localStorage
  const getPartnerId = () => {
    const partnerData = localStorage.getItem('cvm_partner_data');
    if (partnerData) {
      try {
        const partner = JSON.parse(partnerData);
        return partner.id;
      } catch (error) {
        console.error('Error parsing partner data:', error);
      }
    }
    return null;
  };

  useEffect(() => {
    const partnerId = getPartnerId();
    if (partnerId) {
      fetchInversoresConGanancias(partnerId);
    }
  }, []);

  const fetchInversoresConGanancias = async (partnerId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('obtener_inversores_con_ganancias_partner', {
        p_partner_id: partnerId
      });

      if (error) throw error;
      setInversoresConGanancias(data || []);
    } catch (error) {
      console.error('Error fetching inversores con ganancias:', error);
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

  const totalInversion = inversores.reduce((sum, inv) => sum + inv.total, 0);
  const totalGanancias = inversores.reduce((sum, inv) => sum + inv.ganancia_semanal, 0);
  const totalGananciasParaPartner = inversoresConGanancias.reduce((sum, inv) => sum + inv.ganancia_para_partner, 0);

  const toggleExpanded = (inversorId: string) => {
    setExpandedInversor(expandedInversor === inversorId ? null : inversorId);
  };

  return (
    <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-cyan-200/30">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-white flex items-center">
          <User className="w-6 h-6 mr-3" />
          Mis Inversores ({inversores.length})
        </h3>
        
        <div className="flex items-center space-x-6 text-sm">
          <div className="text-right">
            <p className="text-white/70">Total Invertido</p>
            <p className="text-white font-bold">{formatCurrency(totalInversion)}</p>
          </div>
          <div className="text-right">
            <p className="text-white/70">Ganancias Semanales</p>
            <p className="text-green-300 font-bold">{formatCurrency(totalGanancias)}</p>
          </div>
          <div className="text-right">
            <p className="text-white/70">Mi Ganancia de Ellos</p>
            <p className="text-yellow-300 font-bold">{formatCurrency(totalGananciasParaPartner)}</p>
          </div>
        </div>
      </div>
      
      {inversores.length === 0 ? (
        <div className="text-center py-12">
          <User className="w-16 h-16 mx-auto mb-4 text-white/30" />
          <p className="text-white/70">No tienes inversores asignados</p>
        </div>
      ) : (
        <div className="space-y-4">
          {inversores.map((inversor) => {
            const inversorConGanancia = inversoresConGanancias.find(
              inv => inv.inversor_id === inversor.id
            );
            const isExpanded = expandedInversor === inversor.id;

            return (
              <div key={inversor.id} className="bg-white/10 rounded-lg border border-white/20">
                <button
                  onClick={() => toggleExpanded(inversor.id)}
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
                        <div className="flex items-center space-x-2 mb-1">
                          <DollarSign className="w-4 h-4 text-blue-300" />
                          <span className="text-white font-semibold">
                            {formatCurrency(inversor.total)}
                          </span>
                        </div>
                        <p className="text-white/70 text-xs">Total Invertido</p>
                      </div>
                      
                      <div className="text-right">
                        <div className="flex items-center space-x-2 mb-1">
                          <TrendingUp className="w-4 h-4 text-green-300" />
                          <span className="text-green-300 font-semibold">
                            {formatCurrency(inversor.ganancia_semanal)}
                          </span>
                        </div>
                        <p className="text-white/70 text-xs">Su Ganancia Semanal</p>
                      </div>

                      {inversorConGanancia && (
                        <div className="text-right">
                          <div className="flex items-center space-x-2 mb-1">
                            <TrendingUp className="w-4 h-4 text-yellow-300" />
                            <span className="text-yellow-300 font-semibold">
                              {formatCurrency(inversorConGanancia.ganancia_para_partner)}
                            </span>
                          </div>
                          <p className="text-white/70 text-xs">Mi Ganancia de Él</p>
                        </div>
                      )}
                      
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-white/70" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-white/70" />
                      )}
                    </div>
                  </div>
                </button>

                {isExpanded && inversorConGanancia && (
                  <div className="border-t border-white/20 p-4 bg-white/5">
                    <h5 className="text-white font-medium mb-3">Desglose de Ganancias</h5>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white/10 rounded-lg p-3">
                        <h6 className="text-white/80 text-sm font-medium mb-2">Ganancia del Inversor</h6>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-white/70 text-sm">Capital invertido:</span>
                            <span className="text-white font-medium">{formatCurrency(inversorConGanancia.total_invertido)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-white/70 text-sm">Porcentaje ganancia:</span>
                            <span className="text-white font-medium">{inversorConGanancia.porcentaje_ganancia}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-white/70 text-sm">Ganancia bruta (5%):</span>
                            <span className="text-white font-medium">{formatCurrency(inversorConGanancia.total_invertido * 0.05)}</span>
                          </div>
                          <div className="flex justify-between border-t border-white/20 pt-2">
                            <span className="text-green-300 text-sm font-medium">Su ganancia (70%):</span>
                            <span className="text-green-300 font-bold">{formatCurrency(inversorConGanancia.ganancia_semanal)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white/10 rounded-lg p-3">
                        <h6 className="text-white/80 text-sm font-medium mb-2">Mi Ganancia de Este Inversor</h6>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-white/70 text-sm">Ganancia bruta (5%):</span>
                            <span className="text-white font-medium">{formatCurrency(inversorConGanancia.total_invertido * 0.05)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-white/70 text-sm">Porción partners (30%):</span>
                            <span className="text-white font-medium">{formatCurrency(inversorConGanancia.total_invertido * 0.05 * 0.30)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-white/70 text-sm">Mi porcentaje:</span>
                            <span className="text-white font-medium">
                              {/* Calcular el porcentaje basado en el tipo de partner */}
                              {inversorConGanancia.ganancia_para_partner === (inversorConGanancia.total_invertido * 0.05 * 0.30) ? '100%' : '33.33%'}
                            </span>
                          </div>
                          <div className="flex justify-between border-t border-white/20 pt-2">
                            <span className="text-yellow-300 text-sm font-medium">Mi ganancia:</span>
                            <span className="text-yellow-300 font-bold">{formatCurrency(inversorConGanancia.ganancia_para_partner)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                      <p className="text-blue-200 text-sm">
                        <strong>Cálculo:</strong> De los ${formatCurrency(inversorConGanancia.total_invertido * 0.05)} que genera este inversor, 
                        él recibe ${formatCurrency(inversorConGanancia.ganancia_semanal)} (70%) y yo recibo ${formatCurrency(inversorConGanancia.ganancia_para_partner)} 
                        de la porción de partners (30%).
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-4">
          <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  );
};

export default SocioInversoresList;