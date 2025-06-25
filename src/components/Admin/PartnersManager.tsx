import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabase';
import { useAdmin } from '../../contexts/AdminContext';
import { Users, Plus, Edit, Trash2, UserCheck, UserX, Eye, CheckCircle, XCircle } from 'lucide-react';
import CryptoJS from 'crypto-js';
import PasswordStrengthIndicator from '../UI/PasswordStrengthIndicator';

interface Partner {
  id: string;
  nombre: string;
  email: string;
  username?: string;
  tipo: 'partner' | 'operador_partner';
  porcentaje_comision: number;
  porcentaje_especial: number;
  inversion_inicial: number;
  activo: boolean;
  created_at: string;
}

interface Inversor {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  total: number;
  partner_assigned?: boolean;
  partner_nombre?: string;
}

interface PartnersManagerProps {
  onUpdate: () => void;
}

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

// Función para validar contraseña
const validatePassword = (password: string): boolean => {
  return password.length >= 6 && /[A-Z]/.test(password) && /\d/.test(password);
};

const PartnersManager: React.FC<PartnersManagerProps> = ({ onUpdate }) => {
  const { admin } = useAdmin();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [inversores, setInversores] = useState<Inversor[]>([]);
  const [selectedInversores, setSelectedInversores] = useState<string[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showResumenModal, setShowResumenModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>('');
  const [viewingPartnerId, setViewingPartnerId] = useState<string>('');
  const [resumenPartners, setResumenPartners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPasswordStrength, setShowPasswordStrength] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    username: '',
    password: '',
    tipo: 'partner' as 'partner' | 'operador_partner',
    porcentaje_comision: 0,
    porcentaje_especial: 0,
    inversion_inicial: 0
  });

  useEffect(() => {
    fetchPartners();
    fetchInversores();
  }, []);

  // Validación en vivo del username
  useEffect(() => {
    if (formData.username && !editingId) {
      const timeoutId = setTimeout(() => {
        checkUsernameAvailability(formData.username);
      }, 500);
      return () => clearTimeout(timeoutId);
    } else {
      setUsernameAvailable(null);
    }
  }, [formData.username, editingId]);

  const checkUsernameAvailability = async (username: string) => {
    if (username.length < 3) {
      setUsernameAvailable(false);
      return;
    }

    setCheckingUsername(true);
    try {
      // Verificar en partners
      const { data: partnerData, error: partnerError } = await supabase
        .from('partners')
        .select('id')
        .eq('username', username)
        .single();

      // Verificar en admins
      const { data: adminData, error: adminError } = await supabase
        .from('admins')
        .select('id')
        .eq('username', username)
        .single();

      const isAvailable = (partnerError?.code === 'PGRST116') && (adminError?.code === 'PGRST116');
      setUsernameAvailable(isAvailable);
    } catch (error) {
      console.error('Error checking username:', error);
      setUsernameAvailable(false);
    } finally {
      setCheckingUsername(false);
    }
  };

  const fetchPartners = async () => {
    try {
      const { data, error } = await supabase
        .from('partners')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPartners(data || []);
    } catch (error) {
      console.error('Error fetching partners:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchInversores = async () => {
    try {
      const { data, error } = await supabase.rpc('obtener_inversores_disponibles');

      if (error) throw error;
      setInversores(data || []);
    } catch (error) {
      console.error('Error fetching inversores:', error);
    }
  };

  const fetchResumenPartners = async () => {
    try {
      const { data, error } = await supabase.rpc('obtener_resumen_partners');

      if (error) throw error;
      setResumenPartners(data || []);
    } catch (error) {
      console.error('Error fetching resumen partners:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar contraseña solo si se está creando un nuevo partner o se proporciona una nueva
    if (!editingId && !validatePassword(formData.password)) {
      alert('La contraseña debe tener al menos 6 caracteres, una mayúscula y un número');
      return;
    }

    if (editingId && formData.password && !validatePassword(formData.password)) {
      alert('La contraseña debe tener al menos 6 caracteres, una mayúscula y un número');
      return;
    }

    // Validar username disponible para nuevos partners
    if (!editingId && usernameAvailable === false) {
      alert('El nombre de usuario no está disponible');
      return;
    }
    
    try {
      if (editingId) {
        const updateData: any = {
          nombre: formData.nombre,
          email: formData.email,
          tipo: formData.tipo,
          porcentaje_comision: formData.porcentaje_comision,
          porcentaje_especial: formData.porcentaje_especial,
          inversion_inicial: formData.inversion_inicial
        };

        // Solo actualizar contraseña si se proporciona una nueva
        if (formData.password) {
          const salt = generateSalt();
          const hashedPassword = hashPassword(formData.password, salt);
          updateData.password_hash = hashedPassword;
          updateData.password_salt = salt;
        }

        const { error } = await supabase
          .from('partners')
          .update(updateData)
          .eq('id', editingId);

        if (error) throw error;
      } else {
        const salt = generateSalt();
        const hashedPassword = hashPassword(formData.password, salt);

        const { error } = await supabase
          .from('partners')
          .insert({
            nombre: formData.nombre,
            email: formData.email,
            username: formData.username,
            password_hash: hashedPassword,
            password_salt: salt,
            tipo: formData.tipo,
            porcentaje_comision: formData.porcentaje_comision,
            porcentaje_especial: formData.porcentaje_especial,
            inversion_inicial: formData.inversion_inicial,
            created_by: admin?.id
          });

        if (error) throw error;
      }

      setShowModal(false);
      setEditingId(null);
      resetForm();
      fetchPartners();
      onUpdate();
    } catch (error) {
      console.error('Error saving partner:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      email: '',
      username: '',
      password: '',
      tipo: 'partner',
      porcentaje_comision: 0,
      porcentaje_especial: 0,
      inversion_inicial: 0
    });
    setShowPasswordStrength(false);
    setUsernameAvailable(null);
  };

  const handleEdit = (partner: Partner) => {
    setEditingId(partner.id);
    setFormData({
      nombre: partner.nombre,
      email: partner.email,
      username: partner.username || '',
      password: '', // No mostrar contraseña actual
      tipo: partner.tipo,
      porcentaje_comision: partner.porcentaje_comision,
      porcentaje_especial: partner.porcentaje_especial,
      inversion_inicial: partner.inversion_inicial
    });
    setShowModal(true);
  };

  const handleTipoChange = (newTipo: 'partner' | 'operador_partner') => {
    setFormData(prev => ({
      ...prev,
      tipo: newTipo,
      porcentaje_especial: newTipo === 'partner' ? 0 : prev.porcentaje_especial
    }));
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este partner? Los inversores asignados serán liberados.')) return;
    
    try {
      // Primero liberar los inversores asignados
      await supabase
        .from('partner_inversores')
        .delete()
        .eq('partner_id', id);

      // Luego eliminar el partner
      const { error } = await supabase
        .from('partners')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      fetchPartners();
      fetchInversores(); // Actualizar lista de inversores disponibles
      onUpdate();
    } catch (error) {
      console.error('Error deleting partner:', error);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('partners')
        .update({ activo: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      fetchPartners();
      onUpdate();
    } catch (error) {
      console.error('Error toggling partner status:', error);
    }
  };

  const handleAssignInversores = async () => {
    if (!selectedPartnerId || selectedInversores.length === 0) return;

    try {
      // Primero, remover asignaciones existentes de estos inversores
      const { error: deleteError } = await supabase
        .from('partner_inversores')
        .delete()
        .in('inversor_id', selectedInversores);

      if (deleteError) throw deleteError;

      // Luego, crear nuevas asignaciones
      const assignments = selectedInversores.map(inversorId => ({
        partner_id: selectedPartnerId,
        inversor_id: inversorId,
        asignado_por: admin?.id
      }));

      const { error: insertError } = await supabase
        .from('partner_inversores')
        .insert(assignments);

      if (insertError) throw insertError;

      setShowAssignModal(false);
      setSelectedInversores([]);
      setSelectedPartnerId('');
      fetchInversores();
      onUpdate();
    } catch (error) {
      console.error('Error assigning inversores to partner:', error);
    }
  };

  const handleViewPartnerInversores = async (partnerId: string) => {
    setViewingPartnerId(partnerId);
    setShowViewModal(true);
  };

  const handleShowResumen = async () => {
    await fetchResumenPartners();
    setShowResumenModal(true);
  };

  const getPartnerInversores = () => {
    return inversores.filter(inv => inv.partner_assigned);
  };

  const getAvailableInversores = () => {
    return inversores.filter(inv => !inv.partner_assigned);
  };

  const toggleInversorSelection = (inversorId: string) => {
    setSelectedInversores(prev => 
      prev.includes(inversorId)
        ? prev.filter(id => id !== inversorId)
        : [...prev, inversorId]
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const handleFieldFocus = (field: string) => {
    if (formData[field as keyof typeof formData] === 0) {
      setFormData(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleFieldBlur = (field: string, value: string) => {
    if (value === '' || value === '0') {
      setFormData(prev => ({ ...prev, [field]: 0 }));
    }
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
      {/* Header con botones */}
      <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-cyan-200/30">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white flex items-center">
            <Users className="w-6 h-6 mr-3" />
            Gestión de Partners ({partners.length})
          </h3>
          
          <div className="flex space-x-3">
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center space-x-2 bg-green-500/30 text-green-200 px-4 py-2 rounded-lg hover:bg-green-500/40 transition-colors border border-green-400/50"
            >
              <Plus className="w-4 h-4" />
              <span className="font-semibold">Nuevo Partner</span>
            </button>
            
            <button
              onClick={() => setShowAssignModal(true)}
              className="flex items-center space-x-2 bg-blue-500/30 text-blue-200 px-4 py-2 rounded-lg hover:bg-blue-500/40 transition-colors border border-blue-400/50"
            >
              <UserCheck className="w-4 h-4" />
              <span className="font-semibold">Asignar Inversores</span>
            </button>

            <button
              onClick={handleShowResumen}
              className="flex items-center space-x-2 bg-purple-500/30 text-purple-200 px-4 py-2 rounded-lg hover:bg-purple-500/40 transition-colors border border-purple-400/50"
            >
              <Eye className="w-4 h-4" />
              <span className="font-semibold">Ver Resumen</span>
            </button>
          </div>
        </div>
        
        {/* Lista de Partners */}
        {partners.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-white/70">No hay partners registrados</p>
          </div>
        ) : (
          <div className="space-y-4">
            {partners.map((partner) => (
              <div key={partner.id} className="bg-white/10 rounded-lg p-4 border border-white/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                    
                    <div>
                      <h4 className="text-white font-semibold">{partner.nombre}</h4>
                      <p className="text-white/70 text-sm">{partner.email}</p>
                      <div className="flex items-center space-x-3 mt-1">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                          partner.tipo === 'operador_partner'
                            ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/50'
                            : 'bg-blue-500/20 text-blue-300 border border-blue-500/50'
                        }`}>
                          {partner.tipo === 'operador_partner' ? 'OPERADOR + PARTNER' : 'PARTNER'}
                        </span>
                        <span className="text-white/60 text-xs">
                          Comisión: {partner.porcentaje_comision}%
                        </span>
                        {partner.porcentaje_especial > 0 && (
                          <span className="text-white/60 text-xs">
                            Operador: {partner.porcentaje_especial}%
                          </span>
                        )}
                        <span className="text-white/60 text-xs">
                          Inversión: {formatCurrency(partner.inversion_inicial)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                      partner.activo 
                        ? 'bg-green-500/20 text-green-300 border border-green-500/50'
                        : 'bg-gray-500/20 text-gray-300 border border-gray-500/50'
                    }`}>
                      {partner.activo ? 'ACTIVO' : 'INACTIVO'}
                    </span>
                    
                    <button
                      onClick={() => handleViewPartnerInversores(partner.id)}
                      className="p-2 text-cyan-300 hover:bg-cyan-500/20 rounded transition-colors"
                      title="Ver inversores"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    
                    <button
                      onClick={() => handleToggleActive(partner.id, partner.activo)}
                      className={`p-2 rounded transition-colors ${
                        partner.activo
                          ? 'text-green-300 hover:bg-green-500/20'
                          : 'text-gray-300 hover:bg-gray-500/20'
                      }`}
                      title={partner.activo ? 'Desactivar' : 'Activar'}
                    >
                      {partner.activo ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                    </button>
                    
                    <button
                      onClick={() => handleEdit(partner)}
                      className="p-2 text-blue-300 hover:bg-blue-500/20 rounded transition-colors"
                      title="Editar"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    
                    <button
                      onClick={() => handleDelete(partner.id)}
                      className="p-2 text-red-300 hover:bg-red-500/20 rounded transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de crear/editar partner */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {editingId ? 'Editar Partner' : 'Crear Nuevo Partner'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {!editingId && (
                <>
                  <div>
                    <label className="block text-gray-700 text-sm font-medium mb-2">
                      Nombre de Usuario
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={formData.username}
                        onChange={(e) => setFormData({...formData, username: e.target.value})}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                        required
                      />
                      {formData.username && (
                        <div className="absolute right-3 top-3">
                          {checkingUsername ? (
                            <div className="w-5 h-5 border-2 border-gray-400 border-t-blue-500 rounded-full animate-spin"></div>
                          ) : usernameAvailable === true ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : usernameAvailable === false ? (
                            <XCircle className="w-5 h-5 text-red-500" />
                          ) : null}
                        </div>
                      )}
                    </div>
                    {formData.username && usernameAvailable !== null && (
                      <p className={`text-sm mt-1 ${usernameAvailable ? 'text-green-600' : 'text-red-600'}`}>
                        {usernameAvailable ? 'Nombre de usuario disponible' : 'Nombre de usuario no disponible'}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-gray-700 text-sm font-medium mb-2">
                      Contraseña
                    </label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => {
                        setFormData({...formData, password: e.target.value});
                        setShowPasswordStrength(e.target.value.length > 0);
                      }}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    <PasswordStrengthIndicator password={formData.password} show={showPasswordStrength} />
                  </div>
                </>
              )}

              {editingId && (
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">
                    Nueva Contraseña (dejar vacío para mantener actual)
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => {
                      setFormData({...formData, password: e.target.value});
                      setShowPasswordStrength(e.target.value.length > 0);
                    }}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <PasswordStrengthIndicator password={formData.password} show={showPasswordStrength} />
                </div>
              )}
              
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  Tipo de Partner
                </label>
                <select
                  value={formData.tipo}
                  onChange={(e) => handleTipoChange(e.target.value as 'partner' | 'operador_partner')}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="partner">Partner</option>
                  <option value="operador_partner">Partner + Operador</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  Inversión Inicial (USD)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.inversion_inicial}
                  onFocus={() => handleFieldFocus('inversion_inicial')}
                  onBlur={(e) => handleFieldBlur('inversion_inicial', e.target.value)}
                  onChange={(e) => setFormData({...formData, inversion_inicial: parseFloat(e.target.value) || 0})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">
                    % Comisión Partner
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.porcentaje_comision}
                    onFocus={() => handleFieldFocus('porcentaje_comision')}
                    onBlur={(e) => handleFieldBlur('porcentaje_comision', e.target.value)}
                    onChange={(e) => setFormData({...formData, porcentaje_comision: parseFloat(e.target.value) || 0})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">
                    % Operador
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.porcentaje_especial}
                    onFocus={() => handleFieldFocus('porcentaje_especial')}
                    onBlur={(e) => handleFieldBlur('porcentaje_especial', e.target.value)}
                    onChange={(e) => setFormData({...formData, porcentaje_especial: parseFloat(e.target.value) || 0})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={formData.tipo === 'partner'}
                  />
                </div>
              </div>
              
              <div className="flex space-x-4 pt-4">
                <button
                  type="submit"
                  disabled={!editingId && usernameAvailable === false}
                  className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingId ? 'Actualizar' : 'Crear'} Partner
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingId(null);
                    resetForm();
                  }}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de asignar inversores */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-4xl max-h-[80vh] overflow-hidden">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Asignar Inversores a Partner</h3>
            
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-medium mb-2">
                Seleccionar Partner
              </label>
              <select
                value={selectedPartnerId}
                onChange={(e) => setSelectedPartnerId(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Seleccionar partner...</option>
                {partners.filter(p => p.activo).map(partner => (
                  <option key={partner.id} value={partner.id}>
                    {partner.nombre} ({partner.tipo})
                  </option>
                ))}
              </select>
            </div>
            
            <div className="mb-4">
              <h4 className="text-gray-700 font-medium mb-2">
                Inversores Disponibles ({selectedInversores.length} seleccionados)
              </h4>
              <div className="max-h-60 overflow-y-auto border border-gray-300 rounded-lg">
                {getAvailableInversores().map((inversor) => (
                  <div
                    key={inversor.id}
                    className={`p-3 border-b border-gray-200 cursor-pointer hover:bg-gray-50 ${
                      selectedInversores.includes(inversor.id) ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => toggleInversorSelection(inversor.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">
                          {inversor.nombre} {inversor.apellido}
                        </p>
                        <p className="text-sm text-gray-600">{inversor.email}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">
                          {formatCurrency(inversor.total)}
                        </p>
                        <input
                          type="checkbox"
                          checked={selectedInversores.includes(inversor.id)}
                          onChange={() => toggleInversorSelection(inversor.id)}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex space-x-4">
              <button
                onClick={handleAssignInversores}
                disabled={!selectedPartnerId || selectedInversores.length === 0}
                className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Asignar Inversores
              </button>
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedInversores([]);
                  setSelectedPartnerId('');
                }}
                className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de resumen de partners */}
      {showResumenModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-6xl max-h-[80vh] overflow-hidden">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Resumen de Partners e Inversores</h3>
            
            <div className="max-h-96 overflow-y-auto">
              {resumenPartners.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No hay partners con inversores asignados</p>
              ) : (
                <div className="space-y-6">
                  {resumenPartners.map((partner) => (
                    <div key={partner.partner_id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900">{partner.partner_nombre}</h4>
                          <p className="text-sm text-gray-600 capitalize">{partner.partner_tipo.replace('_', ' + ')}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-green-600">
                            {formatCurrency(partner.monto_total)}
                          </p>
                          <p className="text-sm text-gray-600">{partner.total_inversores} inversores</p>
                        </div>
                      </div>
                      
                      {partner.inversores.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {partner.inversores.map((inversor: any) => (
                            <div key={inversor.id} className="bg-gray-50 p-3 rounded-lg">
                              <p className="font-medium text-gray-900">
                                {inversor.nombre} {inversor.apellido}
                              </p>
                              <p className="text-sm text-gray-600">{inversor.email}</p>
                              <p className="text-sm font-semibold text-green-600">
                                {formatCurrency(inversor.total)}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="mt-6">
              <button
                onClick={() => setShowResumenModal(false)}
                className="w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de ver inversores del partner */}
      {showViewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-4xl max-h-[80vh] overflow-hidden">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Inversores del Partner</h3>
            
            <div className="max-h-96 overflow-y-auto">
              {getPartnerInversores().length === 0 ? (
                <p className="text-gray-500 text-center py-8">No hay inversores asignados</p>
              ) : (
                <div className="space-y-3">
                  {getPartnerInversores().map((inversor) => (
                    <div key={inversor.id} className="p-3 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">
                            {inversor.nombre} {inversor.apellido}
                          </p>
                          <p className="text-sm text-gray-600">{inversor.email}</p>
                          {inversor.partner_nombre && (
                            <p className="text-xs text-blue-600">Partner: {inversor.partner_nombre}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gray-900">
                            {formatCurrency(inversor.total)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="mt-6">
              <button
                onClick={() => setShowViewModal(false)}
                className="w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PartnersManager;