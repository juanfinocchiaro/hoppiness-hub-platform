/**
 * WarningDocumentPreview - Documento membretado para imprimir apercibimientos
 */
import { forwardRef } from 'react';
import logoHoppiness from '@/assets/logo-hoppiness.png';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface WarningDocumentData {
  employeeName: string;
  employeeDni?: string;
  employeeRole: string;
  branchName: string;
  warningType: string;
  warningTypeLabel: string;
  incidentDate: string;
  description: string;
  issuedByName: string;
  referenceId?: string;
}

interface WarningDocumentPreviewProps {
  data: WarningDocumentData;
}

const WARNING_TYPE_OPTIONS = [
  { value: 'verbal', label: 'Llamado de atención verbal' },
  { value: 'written', label: 'Apercibimiento escrito' },
  { value: 'lateness', label: 'Llegada tarde' },
  { value: 'absence', label: 'Inasistencia' },
  { value: 'suspension', label: 'Suspensión' },
  { value: 'other', label: 'Otro' },
];

export const WarningDocumentPreview = forwardRef<HTMLDivElement, WarningDocumentPreviewProps>(
  ({ data }, ref) => {
    const today = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: es });
    const incidentFormatted = format(new Date(data.incidentDate), "dd 'de' MMMM 'de' yyyy", { locale: es });

    return (
      <div 
        ref={ref}
        className="bg-white text-black p-8 max-w-[210mm] mx-auto"
        style={{ 
          fontFamily: 'Arial, sans-serif',
          fontSize: '12pt',
          lineHeight: '1.5',
        }}
      >
        {/* Header with Logo */}
        <div className="flex items-center justify-between border-b-2 border-orange-500 pb-4 mb-6">
          <img src={logoHoppiness} alt="Hoppiness Club" className="h-16" />
          <div className="text-right">
            <h1 className="text-xl font-bold text-orange-600">APERCIBIMIENTO FORMAL</h1>
            <p className="text-sm text-gray-600">Sucursal: {data.branchName}</p>
            <p className="text-sm text-gray-600">Fecha de emisión: {today}</p>
          </div>
        </div>

        {/* Employee Data Section */}
        <div className="mb-6 p-4 bg-gray-50 rounded">
          <h2 className="font-bold text-sm uppercase text-gray-700 mb-2">Datos del Empleado</h2>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-gray-600">Nombre:</span>{' '}
              <strong>{data.employeeName}</strong>
            </div>
            <div>
              <span className="text-gray-600">DNI:</span>{' '}
              <strong>{data.employeeDni || '________________'}</strong>
            </div>
            <div>
              <span className="text-gray-600">Puesto:</span>{' '}
              <strong>{data.employeeRole}</strong>
            </div>
          </div>
        </div>

        {/* Warning Type Section */}
        <div className="mb-6">
          <h2 className="font-bold text-sm uppercase text-gray-700 mb-2">Tipo de Apercibimiento</h2>
          <div className="grid grid-cols-2 gap-1 text-sm">
            {WARNING_TYPE_OPTIONS.map(option => (
              <div key={option.value} className="flex items-center gap-2">
                <span className="w-4 h-4 border border-gray-400 flex items-center justify-center text-xs">
                  {data.warningType === option.value ? '✓' : ''}
                </span>
                <span>{option.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Incident Date */}
        <div className="mb-6">
          <h2 className="font-bold text-sm uppercase text-gray-700 mb-2">Fecha del Incidente</h2>
          <p className="p-2 border rounded">{incidentFormatted}</p>
        </div>

        {/* Description */}
        <div className="mb-8">
          <h2 className="font-bold text-sm uppercase text-gray-700 mb-2">Descripción del Incidente</h2>
          <div className="p-3 border rounded min-h-[100px] whitespace-pre-wrap">
            {data.description}
          </div>
        </div>

        {/* Signatures Section */}
        <div className="grid grid-cols-2 gap-8 mt-12">
          <div className="text-center">
            <div className="border-b border-gray-400 h-12 mb-2"></div>
            <p className="text-sm font-semibold">Firma del Empleado</p>
            <p className="text-xs text-gray-500 mt-1">Aclaración: ________________________</p>
          </div>
          <div className="text-center">
            <div className="border-b border-gray-400 h-12 mb-2"></div>
            <p className="text-sm font-semibold">Firma del Encargado</p>
            <p className="text-xs text-gray-500 mt-1">({data.issuedByName})</p>
          </div>
        </div>

        {/* Date of signature */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600">
            Fecha de firma: ______ / ______ / ____________
          </p>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-4 border-t text-xs text-gray-400 text-center">
          {data.referenceId && <p>Ref: {data.referenceId}</p>}
          <p className="mt-1">© {new Date().getFullYear()} Hoppiness Club - Documento interno</p>
        </div>
      </div>
    );
  }
);

WarningDocumentPreview.displayName = 'WarningDocumentPreview';
