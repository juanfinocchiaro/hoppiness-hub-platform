/**
 * RegulationSignatureSheet - Documento membretado de constancia de firma del reglamento
 * Genera un documento imprimible similar al apercibimiento para la firma del reglamento
 */
import { forwardRef } from 'react';
import logoHoppiness from '@/assets/logo-hoppiness-blue.png';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface RegulationSignatureSheetData {
  employeeName: string;
  employeeDni?: string;
  employeeRole: string;
  branchName: string;
  regulationVersion: number;
  regulationTitle: string;
  publishedAt: string;
  referenceId?: string;
}

interface RegulationSignatureSheetProps {
  data: RegulationSignatureSheetData;
}

export const RegulationSignatureSheet = forwardRef<HTMLDivElement, RegulationSignatureSheetProps>(
  ({ data }, ref) => {
    const today = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: es });
    const publishedFormatted = format(new Date(data.publishedAt), "dd 'de' MMMM 'de' yyyy", { locale: es });

    return (
      <div 
        ref={ref}
        className="bg-white text-black p-8 max-w-[210mm] mx-auto"
        style={{ 
          fontFamily: 'Arial, sans-serif',
          fontSize: '12pt',
          lineHeight: '1.6',
        }}
      >
        {/* Header with Logo */}
        <div className="flex items-center justify-between border-b-2 border-orange-500 pb-4 mb-6">
          <img src={logoHoppiness} alt="Hoppiness Club" className="h-16" />
          <div className="text-right">
            <h1 className="text-lg font-bold text-orange-600">CONSTANCIA DE RECEPCIÓN</h1>
            <h2 className="text-base font-bold text-orange-600">DEL REGLAMENTO INTERNO</h2>
            <p className="text-sm text-gray-600">Sucursal: {data.branchName}</p>
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

        {/* Regulation Info */}
        <div className="mb-6 p-4 bg-blue-50 rounded border border-blue-200">
          <h2 className="font-bold text-sm uppercase text-gray-700 mb-2">Información del Reglamento</h2>
          <div className="text-sm">
            <p><strong>Título:</strong> {data.regulationTitle}</p>
            <p><strong>Versión:</strong> {data.regulationVersion}</p>
            <p><strong>Fecha de publicación:</strong> {publishedFormatted}</p>
          </div>
        </div>

        {/* Declaration Text */}
        <div className="mb-8 text-justify">
          <p className="mb-4">
            Por la presente, el/la suscripto/a <strong>{data.employeeName}</strong>, 
            DNI N° <strong>{data.employeeDni || '________________'}</strong>, 
            en mi carácter de <strong>{data.employeeRole}</strong> de la sucursal 
            <strong> {data.branchName}</strong> de Hoppiness Club, declaro:
          </p>

          <ol className="list-decimal list-inside space-y-2 ml-4">
            <li>
              Que he recibido un ejemplar completo del <strong>Reglamento Interno de Trabajo</strong> 
              (Versión {data.regulationVersion}, publicado el {publishedFormatted}).
            </li>
            <li>
              Que he leído íntegramente su contenido y comprendo todas las disposiciones 
              allí establecidas.
            </li>
            <li>
              Que me comprometo a cumplir con todas las normas, políticas y procedimientos 
              detallados en dicho reglamento durante la vigencia de mi relación laboral 
              con la empresa.
            </li>
            <li>
              Que entiendo que el incumplimiento de las normas establecidas podrá dar lugar 
              a las sanciones disciplinarias correspondientes.
            </li>
          </ol>
        </div>

        {/* Signatures Section */}
        <div className="grid grid-cols-2 gap-8 mt-12">
          <div className="text-center">
            <div className="border-b border-gray-400 h-16 mb-2"></div>
            <p className="text-sm font-semibold">Firma del Empleado</p>
            <p className="text-xs text-gray-500 mt-1">Aclaración: ________________________</p>
          </div>
          <div className="text-center">
            <div className="border-b border-gray-400 h-16 mb-2"></div>
            <p className="text-sm font-semibold">Firma del Encargado</p>
            <p className="text-xs text-gray-500 mt-1">(Testigo)</p>
          </div>
        </div>

        {/* Date of signature */}
        <div className="mt-8 text-center">
          <p className="text-sm">
            Firmado en la ciudad de ________________________, 
            el día ______ de _________________ de __________.
          </p>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-4 border-t text-xs text-gray-400 text-center">
          {data.referenceId && <p>Ref: {data.referenceId}</p>}
          <p className="mt-1">© {new Date().getFullYear()} Hoppiness Club - Documento interno</p>
          <p className="text-[10px] mt-2">
            Este documento debe ser firmado en dos ejemplares: uno para el empleado y otro para archivo de la empresa.
          </p>
        </div>
      </div>
    );
  }
);

RegulationSignatureSheet.displayName = 'RegulationSignatureSheet';
