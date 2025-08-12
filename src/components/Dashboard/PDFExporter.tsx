import React, { useState } from 'react';
import { FileText, Download } from 'lucide-react';
import { supabase } from '../../config/supabase';
import { formatCurrency, formatDate } from '../../utils/formatters';
import jsPDF from 'jspdf';

// Importar autoTable como módulo separado
import autoTable from 'jspdf-autotable';

// Extender el tipo jsPDF para incluir autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: typeof autoTable;
  }
}

interface PDFExporterProps {
  userId: string;
  userName: string;
  userType: 'inversor' | 'partner';
}

interface TransactionData {
  id: string;
  monto: number;
  tipo: string;
  fecha: string;
  descripcion: string;
  modulo_nombre?: string;
}

interface ModuleData {
  id: string;
  nombre: string;
  saldo_actual: number;
  total_ganancias: number;
  transacciones_count: number;
}

const PDFExporter: React.FC<PDFExporterProps> = ({ userId, userName, userType }) => {
  const [exporting, setExporting] = useState(false);

  const fetchUserData = async () => {
    try {
      console.log('Fetching user data for PDF export:', { userId, userName, userType });
      
      // Obtener todos los módulos activos
      const { data: modulos, error: errorModulos } = await supabase
        .from('modulos_independientes')
        .select('*')
        .eq('activo', true);

      if (errorModulos) throw errorModulos;
      
      console.log('Módulos encontrados:', modulos?.length || 0);

      // Verificar acceso a módulos y obtener transacciones
      const modulosConDatos: ModuleData[] = [];
      const todasTransacciones: TransactionData[] = [];

      for (const modulo of modulos || []) {
        // Verificar acceso al módulo
        const { data: asignacion, error: errorAsignacion } = await supabase
          .from('modulo_asignaciones')
          .select('id')
          .eq('modulo_id', modulo.id)
          .eq(userType === 'inversor' ? 'inversor_id' : 'partner_id', userId)
          .eq('activo', true)
          .maybeSingle();

        if (errorAsignacion || !asignacion) {
          console.log(`Sin acceso al módulo: ${modulo.nombre}`);
          continue;
        }
        
        console.log('Acceso verificado para módulo:', modulo.nombre);

        // Obtener transacciones del módulo
        const { data: transaccionesModulo, error: errorTransModulo } = await supabase
          .from('modulo_transacciones')
          .select('*')
          .eq('modulo_id', modulo.id)
          .eq(userType === 'inversor' ? 'inversor_id' : 'partner_id', userId)
          .eq('usuario_tipo', userType)
          .order('fecha', { ascending: false });

        if (errorTransModulo) {
          console.error(`Error obteniendo transacciones del módulo ${modulo.nombre}:`, errorTransModulo);
          continue;
        }
        
        console.log(`Transacciones del módulo ${modulo.nombre}:`, transaccionesModulo?.length || 0);

        // Calcular saldo y ganancias del módulo
        let saldo_actual = 0;
        let total_ganancias = 0;

        transaccionesModulo?.forEach(t => {
          switch (t.tipo.toLowerCase()) {
            case 'deposito':
              saldo_actual += Number(t.monto);
              break;
            case 'retiro':
              saldo_actual -= Number(t.monto);
              break;
            case 'ganancia':
              saldo_actual += Number(t.monto);
              total_ganancias += Number(t.monto);
              break;
          }
        });

        // Solo incluir módulos con transacciones
        if ((transaccionesModulo?.length || 0) > 0) {
          modulosConDatos.push({
            id: modulo.id,
            nombre: modulo.nombre,
            saldo_actual,
            total_ganancias,
            transacciones_count: transaccionesModulo?.length || 0
          });

          // Agregar transacciones con nombre del módulo
          transaccionesModulo?.forEach(t => {
            todasTransacciones.push({
              ...t,
              modulo_nombre: modulo.nombre
            });
          });
        }
      }

      // Calcular totales generales
      const saldo_total_modulos = modulosConDatos.reduce((sum, m) => sum + m.saldo_actual, 0);
      const ganancias_total_modulos = modulosConDatos.reduce((sum, m) => sum + m.total_ganancias, 0);
      
      console.log('Datos calculados:', {
        modulosConDatos: modulosConDatos.length,
        todasTransacciones: todasTransacciones.length,
        saldo_total_modulos,
        ganancias_total_modulos
      });

      return {
        transacciones: todasTransacciones,
        modulosConDatos,
        saldo_total_modulos,
        ganancias_total_modulos
      };
    } catch (error) {
      console.error('Error fetching user data for PDF:', error);
      throw error;
    }
  };

  const generatePDF = async (data: any) => {
    console.log('Generando PDF con datos:', data);
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    
    // Colores corporativos
    const primaryColor = [34, 139, 238]; // Azul
    const secondaryColor = [99, 102, 241]; // Índigo
    const textColor = [31, 41, 55]; // Gris oscuro
    
    // Header con logo y título
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    // Título principal
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('CVM CAPITAL', pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Reporte de Inversiones', pageWidth / 2, 30, { align: 'center' });
    
    // Información del usuario
    let yPosition = 55;
    doc.setTextColor(...textColor);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(`Reporte de ${userType === 'inversor' ? 'Inversor' : 'Socio'}`, 20, yPosition);
    
    yPosition += 10;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Nombre: ${userName}`, 20, yPosition);
    
    yPosition += 8;
    doc.text(`Fecha de generación: ${new Date().toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}`, 20, yPosition);
    
    yPosition += 8;
    doc.text(`Tipo de usuario: ${userType === 'inversor' ? 'Inversor' : 'Socio'}`, 20, yPosition);
    
    // Resumen financiero
    yPosition += 20;
    doc.setFillColor(...secondaryColor);
    doc.rect(15, yPosition - 5, pageWidth - 30, 8, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('RESUMEN FINANCIERO', 20, yPosition);
    
    yPosition += 15;
    doc.setTextColor(...textColor);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    
    // Tabla de resumen usando autoTable
    const resumenData = [
      ['Concepto', 'Monto'],
      ['Saldo Total Módulos', formatCurrency(data.saldo_total_modulos)],
      ['Ganancias Total Módulos', formatCurrency(data.ganancias_total_modulos)]
    ];
    
    // Usar autoTable correctamente
    autoTable(doc, {
      startY: yPosition,
      head: [resumenData[0]],
      body: resumenData.slice(1),
      theme: 'grid',
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      bodyStyles: {
        textColor: textColor
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      styles: {
        fontSize: 10,
        cellPadding: 5
      },
      columnStyles: {
        0: { cellWidth: 100 },
        1: { cellWidth: 60, halign: 'right' }
      }
    });
    
    yPosition = (doc as any).lastAutoTable.finalY + 20;
    
    // Resumen por módulos si hay datos
    if (data.modulosConDatos.length > 0) {
      // Verificar si necesitamos nueva página
      if (yPosition > pageHeight - 80) {
        doc.addPage();
        yPosition = 20;
      }
      
      doc.setFillColor(...secondaryColor);
      doc.rect(15, yPosition - 5, pageWidth - 30, 8, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('RESUMEN POR MÓDULOS', 20, yPosition);
      
      yPosition += 15;
      
      const modulosTableData = [
        ['Módulo', 'Saldo Actual', 'Ganancias', 'Transacciones']
      ];
      
      data.modulosConDatos.forEach((modulo: ModuleData) => {
        modulosTableData.push([
          modulo.nombre,
          formatCurrency(modulo.saldo_actual),
          formatCurrency(modulo.total_ganancias),
          modulo.transacciones_count.toString()
        ]);
      });
      
      autoTable(doc, {
        startY: yPosition,
        head: [modulosTableData[0]],
        body: modulosTableData.slice(1),
        theme: 'grid',
        headStyles: {
          fillColor: primaryColor,
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        bodyStyles: {
          textColor: textColor
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        styles: {
          fontSize: 9,
          cellPadding: 4
        }
      });
      
      yPosition = (doc as any).lastAutoTable.finalY + 20;
    }
    
    // Historial de transacciones recientes
    if (yPosition > pageHeight - 100) {
      doc.addPage();
      yPosition = 20;
    }
    
    doc.setFillColor(...secondaryColor);
    doc.rect(15, yPosition - 5, pageWidth - 30, 8, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('HISTORIAL DE TRANSACCIONES RECIENTES', 20, yPosition);
    
    yPosition += 15;
    
    // Ordenar transacciones por fecha (más recientes primero) y tomar las 15 más recientes
    const transaccionesRecientes = data.transacciones
      .sort((a: any, b: any) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
      .slice(0, 15);
    
    if (transaccionesRecientes.length > 0) {
      const transaccionesTableData = [
        ['Fecha', 'Tipo', 'Monto', 'Módulo', 'Descripción']
      ];
      
      transaccionesRecientes.forEach((transaccion: any) => {
        const tipoDisplay = transaccion.tipo.charAt(0).toUpperCase() + transaccion.tipo.slice(1);
        transaccionesTableData.push([
          formatDate(transaccion.fecha).split(',')[0], // Solo fecha, sin hora
          tipoDisplay,
          formatCurrency(transaccion.monto),
          transaccion.modulo_nombre || 'Principal',
          (transaccion.descripcion || '').substring(0, 200) + (transaccion.descripcion?.length > 200 ? '...' : '')
        ]);
      });
      
      autoTable(doc, {
        startY: yPosition,
        head: [transaccionesTableData[0]],
        body: transaccionesTableData.slice(1),
        theme: 'grid',
        headStyles: {
          fillColor: primaryColor,
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        bodyStyles: {
          textColor: textColor
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        styles: {
          fontSize: 8,
          cellPadding: 3
        },
        columnStyles: {
          0: { cellWidth: 20 },
          1: { cellWidth: 20 },
          2: { cellWidth: 30, halign: 'right' },
          3: { cellWidth: 30 },
          4: { cellWidth: 80 }
        }
      });
    } else {
      doc.setTextColor(...textColor);
      doc.setFontSize(11);
      doc.text('No hay transacciones registradas', 20, yPosition);
    }
    
    // Footer en todas las páginas
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      
      // Línea separadora
      doc.setDrawColor(...primaryColor);
      doc.setLineWidth(0.5);
      doc.line(20, pageHeight - 25, pageWidth - 20, pageHeight - 25);
      
      // Texto del footer
      doc.setTextColor(...textColor);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('CVM Capital - Inversión Inteligente, siempre con ustedes', 20, pageHeight - 15);
      doc.text(`Página ${i} de ${totalPages}`, pageWidth - 20, pageHeight - 15, { align: 'right' });
      doc.text(`Generado el ${new Date().toLocaleDateString('es-ES')}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    }
    
    return doc;
  };

  const handleExportPDF = async () => {
    if (!userId) {
      alert('Error: No se pudo identificar el usuario');
      return;
    }
    
    setExporting(true);
    try {
      console.log('Iniciando exportación PDF para:', { userId, userName, userType });
      
      // Obtener datos del usuario
      const userData = await fetchUserData();
      console.log('Datos obtenidos:', userData);
      
      // Generar PDF
      const doc = await generatePDF(userData);
      
      // Generar nombre del archivo
      const fechaActual = new Date().toISOString().split('T')[0];
      const tipoUsuario = userType === 'inversor' ? 'Inversor' : 'Socio';
      const nombreArchivo = `CVM_Capital_${tipoUsuario}_${userName.replace(/\s+/g, '_')}_${fechaActual}.pdf`;
      
      // Descargar el archivo
      doc.save(nombreArchivo);
      
      console.log('PDF generado exitosamente:', nombreArchivo);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Error al exportar PDF. Por favor, inténtalo más tarde.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <button
      onClick={handleExportPDF}
      disabled={exporting}
      className="bg-white/20 text-white px-6 py-3 rounded-lg hover:bg-white/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-3 border border-white/30 backdrop-blur-sm font-semibold"
    >
      {exporting ? (
        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
      ) : (
        <FileText className="w-5 h-5" />
      )}
      <span>{exporting ? 'Generando PDF...' : 'Exportar PDF'}</span>
      {!exporting && <Download className="w-4 h-4" />}
    </button>
  );
};

export default PDFExporter;
