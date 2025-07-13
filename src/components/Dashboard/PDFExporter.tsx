import React, { useState } from 'react';
import { Download, FileText, Loader } from 'lucide-react';
import { supabase } from '../../config/supabase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

interface PDFExporterProps {
  userId: string;
  userName: string;
  userType: 'inversor' | 'partner';
}

const PDFExporter: React.FC<PDFExporterProps> = ({ userId, userName, userType }) => {
  const [loading, setLoading] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
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

  const captureChart = async (chartId: string): Promise<string | null> => {
    try {
      const chartElement = document.querySelector(`[data-chart-id="${chartId}"]`) as HTMLElement;
      if (!chartElement) {
        // Buscar por clase o selector alternativo
        const alternativeElement = document.querySelector('.recharts-wrapper') as HTMLElement;
        if (alternativeElement) {
          const canvas = await html2canvas(alternativeElement, {
            backgroundColor: '#ffffff',
            scale: 2,
            logging: false,
            useCORS: true
          });
          return canvas.toDataURL('image/png');
        }
        return null;
      }

      const canvas = await html2canvas(chartElement, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true
      });
      
      return canvas.toDataURL('image/png');
    } catch (error) {
      console.error('Error capturing chart:', error);
      return null;
    }
  };

  const generateInversorPDF = async () => {
    try {
      // Obtener datos del inversor
      const { data: userData, error: userError } = await supabase
        .from('inversores')
        .select('*')
        .eq('id', userId)
        .single();

      if (userError) throw userError;

      // Obtener transacciones desde la tabla unificada
      const { data: transactions, error: transError } = await supabase
        .from('transacciones')
        .select('*')
        .eq('inversor_id', userId)
        .eq('usuario_tipo', 'inversor')
        .order('fecha', { ascending: false });

      if (transError) throw transError;

      // Obtener ganancias mensuales
      const { data: monthlyData, error: monthlyError } = await supabase.rpc('obtener_ganancias_mensuales_inversor', {
        p_inversor_id: userId
      });

      if (monthlyError) throw monthlyError;

      // Crear PDF
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let yPosition = 20;

      // Colores corporativos
      const primaryColor = [59, 130, 246]; // Azul
      const secondaryColor = [34, 197, 94]; // Verde
      const textColor = [31, 41, 55]; // Gris oscuro
      const lightGray = [243, 244, 246]; // Gris claro

      // Header con logo y título
      doc.setFillColor(...primaryColor);
      doc.rect(0, 0, pageWidth, 40, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('CVM CAPITAL', 20, 25);
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('Reporte de Inversión', 20, 32);
      
      // Fecha de generación
      doc.setFontSize(10);
      doc.text(`Generado: ${new Date().toLocaleDateString('es-ES')}`, pageWidth - 60, 25);

      yPosition = 50;

      // Información del inversor (SIN EMAIL)
      doc.setTextColor(...textColor);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('INFORMACIÓN DEL INVERSOR', 20, yPosition);
      
      yPosition += 10;
      doc.setFillColor(...lightGray);
      doc.rect(20, yPosition, pageWidth - 40, 20, 'F');
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...textColor);
      doc.text(`Nombre: ${userData.nombre} ${userData.apellido}`, 25, yPosition + 8);
      doc.text(`Saldo Actual: ${formatCurrency(userData.total)}`, pageWidth - 80, yPosition + 8);
      doc.text(`Fecha de Registro: ${formatDate(userData.created_at)}`, pageWidth - 80, yPosition + 16);

      yPosition += 30;

      // Resumen financiero
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('RESUMEN FINANCIERO', 20, yPosition);
      
      yPosition += 10;

      // Calcular totales
      const depositos = transactions?.filter(t => t.tipo === 'deposito').reduce((sum, t) => sum + t.monto, 0) || 0;
      const retiros = transactions?.filter(t => t.tipo === 'retiro').reduce((sum, t) => sum + t.monto, 0) || 0;
      const ganancias = transactions?.filter(t => t.tipo === 'ganancia').reduce((sum, t) => sum + t.monto, 0) || 0;

      const summaryData = [
        ['Concepto', 'Monto'],
        ['Total Depósitos', formatCurrency(depositos)],
        ['Total Retiros', formatCurrency(retiros)],
        ['Total Ganancias', formatCurrency(ganancias)],
        ['Saldo Actual', formatCurrency(userData.total)]
      ];

      autoTable(doc, {
        startY: yPosition,
        head: [summaryData[0]],
        body: summaryData.slice(1),
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
          fillColor: lightGray
        },
        margin: { left: 20, right: 20 }
      });

      yPosition = (doc as any).lastAutoTable.finalY + 20;

      // Ganancias mensuales
      if (monthlyData && monthlyData.length > 0) {
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('GANANCIAS MENSUALES', 20, yPosition);
        
        yPosition += 10;

        const monthlyTableData = [
          ['Mes', 'Ganancia']
        ];

        monthlyData.forEach((month: any) => {
          monthlyTableData.push([
            month.mes || month.mes,
            formatCurrency(month.ganancia)
          ]);
        });

        autoTable(doc, {
          startY: yPosition,
          head: [monthlyTableData[0]],
          body: monthlyTableData.slice(1),
          theme: 'grid',
          headStyles: {
            fillColor: secondaryColor,
            textColor: [255, 255, 255],
            fontStyle: 'bold'
          },
          bodyStyles: {
            textColor: textColor
          },
          alternateRowStyles: {
            fillColor: lightGray
          },
          margin: { left: 20, right: 20 }
        });

        yPosition = (doc as any).lastAutoTable.finalY + 20;
      }

      // Nueva página para transacciones si es necesario
      if (yPosition > pageHeight - 60) {
        doc.addPage();
        yPosition = 20;
      }

      // Historial de transacciones
      if (transactions && transactions.length > 0) {
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('HISTORIAL DE TRANSACCIONES', 20, yPosition);
        
        yPosition += 10;

        const transactionData = [
          ['Fecha', 'Tipo', 'Monto', 'Descripción']
        ];

        transactions.slice(0, 20).forEach(transaction => {
          transactionData.push([
            formatDate(transaction.fecha),
            transaction.tipo.charAt(0).toUpperCase() + transaction.tipo.slice(1),
            formatCurrency(transaction.monto),
            transaction.descripcion || '-'
          ]);
        });

        autoTable(doc, {
          startY: yPosition,
          head: [transactionData[0]],
          body: transactionData.slice(1),
          theme: 'grid',
          headStyles: {
            fillColor: primaryColor,
            textColor: [255, 255, 255],
            fontStyle: 'bold'
          },
          bodyStyles: {
            textColor: textColor,
            fontSize: 9
          },
          alternateRowStyles: {
            fillColor: lightGray
          },
          margin: { left: 20, right: 20 },
          columnStyles: {
            0: { cellWidth: 35 },
            1: { cellWidth: 25 },
            2: { cellWidth: 30 },
            3: { cellWidth: 'auto' }
          }
        });
      }

      // Footer
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFillColor(...primaryColor);
        doc.rect(0, pageHeight - 15, pageWidth, 15, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.text('CVM Capital - Inversión Inteligente, siempre con ustedes', 20, pageHeight - 8);
        doc.text(`Página ${i} de ${totalPages}`, pageWidth - 30, pageHeight - 8);
      }

      // Descargar PDF
      doc.save(`CVM_Capital_Reporte_${userData.nombre}_${userData.apellido}_${new Date().toISOString().split('T')[0]}.pdf`);

    } catch (error) {
      console.error('Error generating PDF:', error);
      throw error;
    }
  };

  const generatePartnerPDF = async () => {
    try {
      // Obtener datos del partner
      const { data: partnerData, error: partnerError } = await supabase
        .from('partners')
        .select('*')
        .eq('id', userId)
        .single();

      if (partnerError) throw partnerError;

      // Obtener transacciones del partner desde la tabla unificada
      const { data: transactions, error: transError } = await supabase
        .from('transacciones')
        .select('*')
        .eq('partner_id', userId)
        .eq('usuario_tipo', 'partner')
        .order('fecha', { ascending: false });

      if (transError) throw transError;

      // Obtener ganancias mensuales del partner
      const { data: monthlyData, error: monthlyError } = await supabase.rpc('obtener_ganancias_mensuales_partner', {
        p_partner_id: userId
      });

      if (monthlyError) throw monthlyError;

      // Crear PDF
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let yPosition = 20;

      // Colores corporativos
      const primaryColor = [147, 51, 234]; // Púrpura para partners
      const secondaryColor = [34, 197, 94]; // Verde
      const textColor = [31, 41, 55]; // Gris oscuro
      const lightGray = [243, 244, 246]; // Gris claro

      // Header con logo y título
      doc.setFillColor(...primaryColor);
      doc.rect(0, 0, pageWidth, 40, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('CVM CAPITAL', 20, 25);
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('Reporte de Socio', 20, 32);
      
      // Fecha de generación
      doc.setFontSize(10);
      doc.text(`Generado: ${new Date().toLocaleDateString('es-ES')}`, pageWidth - 60, 25);

      yPosition = 50;

      // Calcular inversión inicial desde transacciones
      const inversionInicialFromTransactions = transactions?.find(t => 
        t.tipo === 'deposito' && 
        t.descripcion && 
        t.descripcion.includes('Inversión inicial')
      )?.monto ?? 0;

      // Calcular saldo actual desde transacciones
      let saldoActual = 0;
      transactions?.forEach(transaction => {
        switch (transaction.tipo.toLowerCase()) {
          case 'deposito':
            saldoActual += Number(transaction.monto);
            break;
          case 'retiro':
            saldoActual -= Number(transaction.monto);
            break;
          case 'ganancia':
            saldoActual += Number(transaction.monto);
            break;
        }
      });

      // Información del partner
      doc.setTextColor(...textColor);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('INFORMACIÓN DEL SOCIO', 20, yPosition);
      
      yPosition += 10;
      doc.setFillColor(...lightGray);
      doc.rect(20, yPosition, pageWidth - 40, 20, 'F');
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...textColor);
      doc.text(`Nombre: ${partnerData.nombre}`, 25, yPosition + 8);
      doc.text(`Saldo Actual: ${formatCurrency(saldoActual)}`, pageWidth - 80, yPosition + 8);
      doc.text(`Saldo Actual: ${formatCurrency(saldoActual)}`, 25, yPosition + 16);
      doc.text(`Fecha de Registro: ${formatDate(partnerData.created_at)}`, pageWidth - 80, yPosition + 16);

      yPosition += 30;

      // Resumen financiero
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('RESUMEN FINANCIERO', 20, yPosition);
      
      yPosition += 10;

      // Calcular totales
      const depositos = transactions?.filter(t => t.tipo === 'deposito').reduce((sum, t) => sum + t.monto, 0) || 0;
      const retiros = transactions?.filter(t => t.tipo === 'retiro').reduce((sum, t) => sum + t.monto, 0) || 0;
      const ganancias = transactions?.filter(t => t.tipo === 'ganancia').reduce((sum, t) => sum + t.monto, 0) || 0;

      const summaryData = [
        ['Concepto', 'Monto'],
        ['Total Depósitos', formatCurrency(depositos)],
        ['Total Retiros', formatCurrency(retiros)],
        ['Total Ganancias', formatCurrency(ganancias)],
        ['Saldo Actual', formatCurrency(saldoActual)]
      ];

      autoTable(doc, {
        startY: yPosition,
        head: [summaryData[0]],
        body: summaryData.slice(1),
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
          fillColor: lightGray
        },
        margin: { left: 20, right: 20 }
      });

      yPosition = (doc as any).lastAutoTable.finalY + 20;

      // Ganancias mensuales
      if (monthlyData && monthlyData.length > 0) {
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('GANANCIAS MENSUALES', 20, yPosition);
        
        yPosition += 10;

        const monthlyTableData = [
          ['Mes', 'Ganancia Total', 'Ganancia Base', 'Ganancia Adicional']
        ];

        monthlyData.forEach((month: any) => {
          monthlyTableData.push([
            month.mes || month.mes,
            formatCurrency(month.ganancia_total),
            formatCurrency(month.ganancia_base || 0),
            formatCurrency(month.ganancia_adicional || 0)
          ]);
        });

        autoTable(doc, {
          startY: yPosition,
          head: [monthlyTableData[0]],
          body: monthlyTableData.slice(1),
          theme: 'grid',
          headStyles: {
            fillColor: secondaryColor,
            textColor: [255, 255, 255],
            fontStyle: 'bold'
          },
          bodyStyles: {
            textColor: textColor,
            fontSize: 10
          },
          alternateRowStyles: {
            fillColor: lightGray
          },
          margin: { left: 20, right: 20 }
        });

        yPosition = (doc as any).lastAutoTable.finalY + 20;
      }

      // Nueva página para transacciones si es necesario
      if (yPosition > pageHeight - 60) {
        doc.addPage();
        yPosition = 20;
      }

      // Historial de transacciones
      if (transactions && transactions.length > 0) {
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('HISTORIAL DE TRANSACCIONES', 20, yPosition);
        
        yPosition += 10;

        const transactionData = [
          ['Fecha', 'Tipo', 'Monto', 'Descripción']
        ];

        // Agregar transacciones
        transactions.slice(0, 20).forEach(transaction => {
          transactionData.push([
            formatDate(transaction.fecha),
            transaction.tipo.charAt(0).toUpperCase() + transaction.tipo.slice(1),
            formatCurrency(transaction.monto),
            transaction.descripcion || '-'
          ]);
        });

        autoTable(doc, {
          startY: yPosition,
          head: [transactionData[0]],
          body: transactionData.slice(1),
          theme: 'grid',
          headStyles: {
            fillColor: primaryColor,
            textColor: [255, 255, 255],
            fontStyle: 'bold'
          },
          bodyStyles: {
            textColor: textColor,
            fontSize: 9
          },
          alternateRowStyles: {
            fillColor: lightGray
          },
          margin: { left: 20, right: 20 },
          columnStyles: {
            0: { cellWidth: 35 },
            1: { cellWidth: 25 },
            2: { cellWidth: 30 },
            3: { cellWidth: 'auto' }
          }
        });
      }

      // Footer
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFillColor(...primaryColor);
        doc.rect(0, pageHeight - 15, pageWidth, 15, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.text('CVM Capital - Panel de Socio', 20, pageHeight - 8);
        doc.text(`Página ${i} de ${totalPages}`, pageWidth - 30, pageHeight - 8);
      }

      // Descargar PDF
      doc.save(`CVM_Capital_Socio_${partnerData.nombre}_${new Date().toISOString().split('T')[0]}.pdf`);

    } catch (error) {
      console.error('Error generating partner PDF:', error);
      throw error;
    }
  };

  const handleExportPDF = async () => {
    setLoading(true);
    try {
      if (userType === 'inversor') {
        await generateInversorPDF();
      } else {
        await generatePartnerPDF();
      }
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Error al generar el PDF. Por favor, inténtalo más tarde.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleExportPDF}
      disabled={loading}
      className="flex items-center space-x-3 bg-white/20 text-white px-6 py-3 rounded-lg hover:bg-white/30 transition-all duration-300 border border-white/30 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? (
        <>
          <Loader className="w-5 h-5 animate-spin" />
          <span>Generando PDF...</span>
        </>
      ) : (
        <>
          <Download className="w-5 h-5" />
          <span>Exportar PDF</span>
          <FileText className="w-5 h-5" />
        </>
      )}
    </button>
  );
};

export default PDFExporter;