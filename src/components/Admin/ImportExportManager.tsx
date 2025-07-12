import React, { useState } from 'react';
import { Upload, Download, FileText, Users, AlertTriangle, CheckCircle } from 'lucide-react';
import { supabase } from '../../config/supabase';
import { useAdmin } from '../../contexts/AdminContext';
import CryptoJS from 'crypto-js';

interface ImportExportManagerProps {
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

const ImportExportManager: React.FC<ImportExportManagerProps> = ({ onUpdate }) => {
  const { admin } = useAdmin();
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importResults, setImportResults] = useState<any>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'text/csv') {
      setSelectedFile(file);
    } else {
      alert('Por favor selecciona un archivo CSV válido');
      event.target.value = '';
    }
  };

  const parseCSV = (csvText: string): any[] => {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    // Validar headers requeridos
    const requiredHeaders = ['nombre', 'apellido', 'email'];
    const optionalHeaders = ['deposito', 'retiro', 'ganancia'];
    
    for (const header of requiredHeaders) {
      if (!headers.includes(header)) {
        throw new Error(`Falta la columna requerida: ${header}`);
      }
    }

    const inversores = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length < 3) continue;

      const inversor: any = {};
      headers.forEach((header, index) => {
        if (requiredHeaders.includes(header)) {
          inversor[header] = values[index] || '';
        } else if (optionalHeaders.includes(header)) {
          inversor[header] = parseFloat(values[index]) || 0;
        }
      });

      if (inversor.nombre && inversor.apellido && inversor.email) {
        inversores.push(inversor);
      }
    }

    return inversores;
  };

  const handleImportInversores = async () => {
    if (!selectedFile) {
      alert('Por favor selecciona un archivo CSV');
      return;
    }

    setImporting(true);
    try {
      // Leer archivo CSV
      const csvText = await selectedFile.text();
      const inversores = parseCSV(csvText);

      if (inversores.length === 0) {
        throw new Error('No se encontraron datos válidos para importar');
      }

      // Procesar cada inversor individualmente
      const results = {
        total_procesados: inversores.length,
        total_exitosos: 0,
        total_errores: 0,
        detalles: [] as any[]
      };

      for (const inv of inversores) {
        try {
          // Verificar si el email ya existe
          const { data: existingUser, error: checkError } = await supabase
            .from('inversores')
            .select('id')
            .eq('email', inv.email.toLowerCase())
            .maybeSingle();

          if (checkError) {
            throw new Error(`Error verificando email: ${checkError.message}`);
          }

          if (existingUser) {
            results.total_errores++;
            results.detalles.push({
              email: inv.email,
              status: 'error',
              mensaje: 'Email ya existe en el sistema'
            });
            continue;
          }

          // Generar salt y hashear contraseña temporal
          const salt = generateSalt();
          const hashedPassword = hashPassword('cvmcapital', salt);

          // Insertar nuevo inversor (SIN capital_inicial)
          const { data: newUser, error: insertError } = await supabase
            .from('inversores')
            .insert({
              nombre: inv.nombre,
              apellido: inv.apellido,
              email: inv.email.toLowerCase(),
              password_hash: hashedPassword,
              password_salt: salt,
              pregunta_secreta: '¿Cuál es tu comida favorita?',
              respuesta_secreta: 'pizza',
              ganancia_semanal2: 0,
              total: 0
            })
            .select()
            .single();

          if (insertError) {
            throw new Error(`Error insertando usuario: ${insertError.message}`);
          }

          // Crear transacciones si se especificaron
          const transacciones = [];
          if (inv.deposito && inv.deposito > 0) {
            transacciones.push({
              inversor_id: newUser.id,
              usuario_tipo: 'inversor',
              monto: inv.deposito,
              tipo: 'deposito',
              descripcion: 'Depósito inicial - Importación CSV'
            });
          }
          if (inv.retiro && inv.retiro > 0) {
            transacciones.push({
              inversor_id: newUser.id,
              usuario_tipo: 'inversor',
              monto: inv.retiro,
              tipo: 'retiro',
              descripcion: 'Retiro - Importación CSV'
            });
          }
          if (inv.ganancia && inv.ganancia > 0) {
            transacciones.push({
              inversor_id: newUser.id,
              usuario_tipo: 'inversor',
              monto: inv.ganancia,
              tipo: 'ganancia',
              descripcion: 'Ganancia - Importación CSV'
            });
          }

          if (transacciones.length > 0) {
            const { error: transError } = await supabase
              .from('transacciones')
              .insert(transacciones);

            if (transError) {
              console.error('Error insertando transacciones:', transError);
            }
          }

          results.total_exitosos++;
          results.detalles.push({
            email: inv.email,
            status: 'exitoso',
            mensaje: `Usuario creado exitosamente${transacciones.length > 0 ? ` con ${transacciones.length} transacciones` : ''}`
          });

        } catch (error) {
          results.total_errores++;
          results.detalles.push({
            email: inv.email,
            status: 'error',
            mensaje: (error as Error).message
          });
        }
      }

      setImportResults(results);
      setShowImportModal(false);
      setSelectedFile(null);
      onUpdate();

    } catch (error) {
      console.error('Error importing inversores:', error);
      alert('Error al importar: ' + (error as Error).message);
    } finally {
      setImporting(false);
    }
  };

  const handleExportInversores = async () => {
    setExporting(true);
    try {
      // Obtener inversores con sus transacciones calculadas
      const { data: inversores, error: inversoresError } = await supabase
        .from('inversores')
        .select('id, nombre, apellido, email, total, created_at')
        .order('created_at', { ascending: false });

      if (inversoresError) throw inversoresError;

      // Para cada inversor, calcular sus totales desde transacciones
      const inversoresConTotales = await Promise.all(
        (inversores || []).map(async (inversor) => {
          // Obtener transacciones del inversor
          const { data: transacciones, error: transError } = await supabase
            .from('transacciones')
            .select('monto, tipo')
            .eq('inversor_id', inversor.id)
            .eq('usuario_tipo', 'inversor');

          if (transError) {
            console.error('Error fetching transactions for inversor:', inversor.id, transError);
            return {
              ...inversor,
              deposito: 0,
              retiro: 0,
              ganancia_total: 0,
              saldo_actual: inversor.total || 0
            };
          }

          // Calcular totales por tipo
          let deposito = 0;
          let retiro = 0;
          let ganancia_total = 0;

          transacciones?.forEach(t => {
            switch (t.tipo.toLowerCase()) {
              case 'deposito':
                deposito += Number(t.monto);
                break;
              case 'retiro':
                retiro += Number(t.monto);
                break;
              case 'ganancia':
                ganancia_total += Number(t.monto);
                break;
            }
          });

          return {
            ...inversor,
            deposito,
            retiro,
            ganancia_total,
            saldo_actual: inversor.total || 0
          };
        })
      );

      // Convertir a CSV
      const headers = ['Nombre', 'Apellido', 'Email', 'Depósito', 'Retiro', 'Ganancia Total', 'Saldo Actual'];
      const csvContent = [
        headers.join(','),
        ...inversoresConTotales.map((row: any) => [
          row.nombre,
          row.apellido,
          row.email,
          row.deposito.toFixed(2),
          row.retiro.toFixed(2),
          row.ganancia_total.toFixed(2),
          row.saldo_actual.toFixed(2)
        ].join(','))
      ].join('\n');

      // Descargar archivo
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `inversores_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (error) {
      console.error('Error exporting inversores:', error);
      alert('Error al exportar: ' + (error as Error).message);
    } finally {
      setExporting(false);
    }
  };

  const handleExportPartners = async () => {
    setExporting(true);
    try {
      // Obtener partners con sus transacciones calculadas
      const { data: partners, error: partnersError } = await supabase
        .from('partners')
        .select('id, nombre, username, created_at')
        .order('created_at', { ascending: false });

      if (partnersError) throw partnersError;

      // Para cada partner, calcular sus totales desde transacciones
      const partnersConTotales = await Promise.all(
        (partners || []).map(async (partner) => {
          // Obtener transacciones del partner
          const { data: transacciones, error: transError } = await supabase
            .from('transacciones')
            .select('monto, tipo, descripcion')
            .eq('partner_id', partner.id)
            .eq('usuario_tipo', 'partner');

          if (transError) {
            console.error('Error fetching transactions for partner:', partner.id, transError);
            return {
              ...partner,
              tipo: 'Partner',
              inversion_inicial: 0,
              deposito: 0,
              retiro: 0,
              ganancia_total: 0,
              saldo_actual: 0
            };
          }

          // Calcular totales por tipo
          let inversion_inicial = 0;
          let deposito = 0;
          let retiro = 0;
          let ganancia_total = 0;

          transacciones?.forEach(t => {
            switch (t.tipo.toLowerCase()) {
              case 'deposito':
                if (t.descripcion && t.descripcion.includes('Inversión inicial')) {
                  inversion_inicial += Number(t.monto);
                } else {
                  deposito += Number(t.monto);
                }
                break;
              case 'retiro':
                retiro += Number(t.monto);
                break;
              case 'ganancia':
                ganancia_total += Number(t.monto);
                break;
            }
          });

          // Calcular saldo actual
          const saldo_actual = inversion_inicial + deposito + ganancia_total - retiro;

          return {
            ...partner,
            tipo: 'Partner',
            inversion_inicial,
            deposito,
            retiro,
            ganancia_total,
            saldo_actual
          };
        })
      );

      // Convertir a CSV
      const headers = ['Nombre', 'Username', 'Tipo', 'Inversión Inicial', 'Depósito', 'Retiro', 'Ganancia Total', 'Saldo Actual'];
      const csvContent = [
        headers.join(','),
        ...partnersConTotales.map((row: any) => [
          row.nombre,
          row.username,
          row.tipo,
          row.inversion_inicial.toFixed(2),
          row.deposito.toFixed(2),
          row.retiro.toFixed(2),
          row.ganancia_total.toFixed(2),
          row.saldo_actual.toFixed(2)
        ].join(','))
      ].join('\n');

      // Descargar archivo
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `partners_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (error) {
      console.error('Error exporting partners:', error);
      alert('Error al exportar: ' + (error as Error).message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Importar/Exportar Inversores */}
      <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-cyan-200/30">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center">
          <Users className="w-6 h-6 mr-3" />
          Gestión de Inversores
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => setShowImportModal(true)}
            disabled={importing}
            className="flex items-center justify-center space-x-3 bg-green-500/20 text-green-300 p-4 rounded-lg hover:bg-green-500/30 transition-colors disabled:opacity-50 border border-green-400/50"
          >
            <Upload className="w-5 h-5" />
            <span>{importing ? 'Importando...' : 'Importar Inversores'}</span>
          </button>

          <button
            onClick={handleExportInversores}
            disabled={exporting}
            className="flex items-center justify-center space-x-3 bg-blue-500/20 text-blue-300 p-4 rounded-lg hover:bg-blue-500/30 transition-colors disabled:opacity-50 border border-blue-400/50"
          >
            <Download className="w-5 h-5" />
            <span>{exporting ? 'Exportando...' : 'Exportar Inversores'}</span>
          </button>
        </div>

        <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <h4 className="text-yellow-300 font-semibold mb-2">Formato CSV para Importación</h4>
          <p className="text-yellow-200 text-sm mb-2">
            <strong>Columnas requeridas:</strong> nombre,apellido,email
          </p>
          <p className="text-yellow-200 text-sm mb-2">
            <strong>Columnas opcionales:</strong> deposito,retiro,ganancia
          </p>
          <p className="text-yellow-200 text-sm mb-2">
            <strong>Ejemplo de formato correcto:</strong>
          </p>
          <div className="bg-black/20 p-2 rounded text-xs text-yellow-100 font-mono">
            nombre,apellido,email,deposito,retiro,ganancia<br/>
            Juan,Pérez,juan@email.com,1000,0,0<br/>
            María,García,maria@email.com,500,100,200
          </div>
          <p className="text-yellow-200 text-sm mt-2">
            <strong>Contraseña temporal:</strong> "cvmcapital" (debe cambiarse en el primer login)
          </p>
          <p className="text-yellow-200 text-sm">
            <strong>Pregunta temporal:</strong> "¿Cuál es tu comida favorita?" con respuesta "pizza"
          </p>
        </div>
      </div>

      {/* Exportar Partners */}
      <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-cyan-200/30">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center">
          <FileText className="w-6 h-6 mr-3" />
          Exportar Partners
        </h3>

        <button
          onClick={handleExportPartners}
          disabled={exporting}
          className="flex items-center justify-center space-x-3 bg-purple-500/20 text-purple-300 p-4 rounded-lg hover:bg-purple-500/30 transition-colors disabled:opacity-50 border border-purple-400/50 w-full md:w-auto"
        >
          <Download className="w-5 h-5" />
          <span>{exporting ? 'Exportando...' : 'Exportar Partners'}</span>
        </button>

        <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <p className="text-blue-200 text-sm">
            Exporta todos los datos de partners incluyendo inversiones, transacciones y ganancias calculadas desde la tabla de transacciones.
          </p>
        </div>
      </div>

      {/* Modal de importación con selector de archivo */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Importar Inversores</h3>
            
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-medium mb-2">
                Seleccionar archivo CSV
              </label>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {selectedFile && (
                <p className="text-green-600 text-sm mt-2">
                  Archivo seleccionado: {selectedFile.name}
                </p>
              )}
            </div>

            <div className="mb-4 p-4 bg-blue-50 rounded-lg">
              <h4 className="text-blue-800 font-semibold mb-2">Formato esperado:</h4>
              <code className="text-sm text-blue-700 block bg-white p-2 rounded border">
                nombre,apellido,email,deposito,retiro,ganancia<br/>
                Juan,Pérez,juan@email.com,1000,0,0<br/>
                María,García,maria@email.com,500,100,200
              </code>
              <div className="mt-3 text-sm text-blue-700">
                <p><strong>Nota importante:</strong></p>
                <ul className="list-disc list-inside mt-1">
                  <li>Contraseña temporal: <strong>cvmcapital</strong></li>
                  <li>Pregunta de seguridad temporal: "¿Cuál es tu comida favorita?"</li>
                  <li>Respuesta temporal: "pizza"</li>
                  <li>El usuario debe cambiar estos datos en su primer login</li>
                  <li>Las transacciones se registran en la tabla unificada</li>
                </ul>
              </div>
            </div>
            
            <div className="flex space-x-4">
              <button
                onClick={handleImportInversores}
                disabled={importing || !selectedFile}
                className="flex-1 bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {importing ? 'Importando...' : 'Importar'}
              </button>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setSelectedFile(null);
                }}
                className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de resultados de importación */}
      {importResults && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Importación Completada</h3>
            </div>
            
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{importResults.total_procesados}</div>
                <div className="text-sm text-blue-800">Procesados</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{importResults.total_exitosos}</div>
                <div className="text-sm text-green-800">Exitosos</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{importResults.total_errores}</div>
                <div className="text-sm text-red-800">Errores</div>
              </div>
            </div>

            {importResults.detalles && importResults.detalles.length > 0 && (
              <div className="max-h-60 overflow-y-auto mb-4">
                <h4 className="font-semibold text-gray-900 mb-2">Detalles:</h4>
                {importResults.detalles.map((detalle: any, index: number) => (
                  <div key={index} className={`p-2 rounded mb-2 ${
                    detalle.status === 'exitoso' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                  }`}>
                    <strong>{detalle.email}:</strong> {detalle.mensaje}
                  </div>
                ))}
              </div>
            )}

            {importResults.total_exitosos > 0 && (
              <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-yellow-800 text-sm">
                  <strong>Recordatorio:</strong> Los inversores importados tienen la contraseña temporal "cvmcapital" 
                  y deben cambiarla junto con la pregunta de seguridad en su primer login. Las transacciones se han 
                  registrado en la tabla unificada de transacciones.
                </p>
              </div>
            )}
            
            <button
              onClick={() => setImportResults(null)}
              className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImportExportManager;