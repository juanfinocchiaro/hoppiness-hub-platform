/**
 * RegulationSignatureSheet - Documento membretado de constancia de firma del reglamento
 * Usa estilos inline para garantizar impresión A4 correcta
 */
import { forwardRef, useState, useEffect } from 'react';
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
    const [logoBase64, setLogoBase64] = useState<string>('');
    const today = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: es });
    const publishedFormatted = format(new Date(data.publishedAt), "dd 'de' MMMM 'de' yyyy", { locale: es });

    // Convert logo to base64 for print compatibility
    useEffect(() => {
      fetch(logoHoppiness)
        .then(res => res.blob())
        .then(blob => {
          const reader = new FileReader();
          reader.onload = () => setLogoBase64(reader.result as string);
          reader.readAsDataURL(blob);
        });
    }, []);

    return (
      <div 
        ref={ref}
        style={{
          backgroundColor: 'white',
          color: 'black',
          padding: '32px',
          maxWidth: '210mm',
          margin: '0 auto',
          fontFamily: 'Arial, sans-serif',
          fontSize: '12pt',
          lineHeight: '1.6',
        }}
      >
        {/* Header with Logo */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '2px solid #f97316',
          paddingBottom: '16px',
          marginBottom: '24px',
        }}>
          <img 
            src={logoBase64 || logoHoppiness} 
            alt="Hoppiness Club" 
            style={{ height: '64px' }}
          />
          <div style={{ textAlign: 'right' }}>
            <h1 style={{
              fontSize: '16px',
              fontWeight: 'bold',
              color: '#ea580c',
              margin: 0,
            }}>CONSTANCIA DE RECEPCIÓN</h1>
            <h2 style={{
              fontSize: '14px',
              fontWeight: 'bold',
              color: '#ea580c',
              margin: '4px 0 0 0',
            }}>DEL REGLAMENTO INTERNO</h2>
            <p style={{ fontSize: '14px', color: '#666', margin: '4px 0 0 0' }}>
              Sucursal: {data.branchName}
            </p>
          </div>
        </div>

        {/* Employee Data Section */}
        <div style={{
          marginBottom: '24px',
          padding: '16px',
          backgroundColor: '#f5f5f5',
          borderRadius: '4px',
        }}>
          <h2 style={{
            fontWeight: 'bold',
            fontSize: '11pt',
            textTransform: 'uppercase',
            color: '#555',
            marginBottom: '8px',
            marginTop: 0,
          }}>Datos del Empleado</h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '8px',
            fontSize: '11pt',
          }}>
            <div>
              <span style={{ color: '#666' }}>Nombre:</span>{' '}
              <strong>{data.employeeName}</strong>
            </div>
            <div>
              <span style={{ color: '#666' }}>DNI:</span>{' '}
              <strong>{data.employeeDni || '________________'}</strong>
            </div>
            <div>
              <span style={{ color: '#666' }}>Puesto:</span>{' '}
              <strong>{data.employeeRole}</strong>
            </div>
          </div>
        </div>

        {/* Regulation Info */}
        <div style={{
          marginBottom: '24px',
          padding: '16px',
          backgroundColor: '#eff6ff',
          borderRadius: '4px',
          border: '1px solid #bfdbfe',
        }}>
          <h2 style={{
            fontWeight: 'bold',
            fontSize: '11pt',
            textTransform: 'uppercase',
            color: '#555',
            marginBottom: '8px',
            marginTop: 0,
          }}>Información del Reglamento</h2>
          <div style={{ fontSize: '11pt' }}>
            <p style={{ margin: '4px 0' }}><strong>Título:</strong> {data.regulationTitle}</p>
            <p style={{ margin: '4px 0' }}><strong>Versión:</strong> {data.regulationVersion}</p>
            <p style={{ margin: '4px 0' }}><strong>Fecha de publicación:</strong> {publishedFormatted}</p>
          </div>
        </div>

        {/* Declaration Text */}
        <div style={{ marginBottom: '32px', textAlign: 'justify' }}>
          <p style={{ marginBottom: '16px' }}>
            Por la presente, el/la suscripto/a <strong>{data.employeeName}</strong>, 
            DNI N° <strong>{data.employeeDni || '________________'}</strong>, 
            en mi carácter de <strong>{data.employeeRole}</strong> de la sucursal
            <strong> {data.branchName}</strong> de Hoppiness Club, declaro:
          </p>

          <ol style={{ marginLeft: '16px', paddingLeft: '8px' }}>
            <li style={{ marginBottom: '8px' }}>
              Que he recibido un ejemplar completo del <strong>Reglamento Interno de Trabajo</strong> 
              {' '}(Versión {data.regulationVersion}, publicado el {publishedFormatted}).
            </li>
            <li style={{ marginBottom: '8px' }}>
              Que he leído íntegramente su contenido y comprendo todas las disposiciones 
              allí establecidas.
            </li>
            <li style={{ marginBottom: '8px' }}>
              Que me comprometo a cumplir con todas las normas, políticas y procedimientos 
              detallados en dicho reglamento durante la vigencia de mi relación laboral 
              con la empresa.
            </li>
            <li style={{ marginBottom: '8px' }}>
              Que entiendo que el incumplimiento de las normas establecidas podrá dar lugar 
              a las sanciones disciplinarias correspondientes.
            </li>
          </ol>
        </div>

        {/* Signatures Section */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '32px',
          marginTop: '48px',
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              borderBottom: '1px solid #888',
              height: '64px',
              marginBottom: '8px',
            }}></div>
            <p style={{ fontSize: '11pt', fontWeight: '600', margin: 0 }}>Firma del Empleado</p>
            <p style={{ fontSize: '9pt', color: '#888', marginTop: '4px' }}>
              Aclaración: ________________________
            </p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              borderBottom: '1px solid #888',
              height: '64px',
              marginBottom: '8px',
            }}></div>
            <p style={{ fontSize: '11pt', fontWeight: '600', margin: 0 }}>Firma del Encargado</p>
            <p style={{ fontSize: '9pt', color: '#888', marginTop: '4px' }}>(Testigo)</p>
          </div>
        </div>

        {/* Date of signature */}
        <div style={{
          marginTop: '32px',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: '11pt', margin: 0 }}>
            Firmado en la ciudad de ________________________, 
            el día ______ de _________________ de __________.
          </p>
        </div>

        {/* Footer */}
        <div style={{
          marginTop: '48px',
          paddingTop: '16px',
          borderTop: '1px solid #ddd',
          textAlign: 'center',
          fontSize: '9pt',
          color: '#aaa',
        }}>
          {data.referenceId && <p style={{ margin: 0 }}>Ref: {data.referenceId}</p>}
          <p style={{ marginTop: '4px' }}>© {new Date().getFullYear()} Hoppiness Club - Documento interno</p>
          <p style={{ fontSize: '8pt', marginTop: '8px' }}>
            Este documento debe ser firmado en dos ejemplares: uno para el empleado y otro para archivo de la empresa.
          </p>
        </div>
      </div>
    );
  }
);

RegulationSignatureSheet.displayName = 'RegulationSignatureSheet';
