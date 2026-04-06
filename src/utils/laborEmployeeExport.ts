/**
 * Per-employee export — PDF and Excel with full month view,
 * scheduled hours, clock entries, absences and lateness.
 */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { EmployeeLaborSummary } from '@/hooks/useLaborHours';
import { formatHoursDecimal } from '@/hooks/useLaborHours';

function toArgentinaTime(isoStr: string): string {
  const d = new Date(isoStr);
  const offsetMs = -3 * 60 * 60 * 1000;
  const local = new Date(d.getTime() + d.getTimezoneOffset() * 60000 + offsetMs);
  return format(local, 'HH:mm');
}

function dayLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  const dayName = format(d, 'EEE', { locale: es });
  return `${dayName.charAt(0).toUpperCase() + dayName.slice(1)} ${format(d, 'dd/MM')}`;
}

function formatSchedule(startTime: string | null, endTime: string | null, startTime2: string | null, endTime2: string | null): string {
  if (!startTime || !endTime) return '-';
  const t1 = `${startTime.slice(0, 5)}-${endTime.slice(0, 5)}`;
  if (startTime2 && endTime2) {
    return `${t1} / ${startTime2.slice(0, 5)}-${endTime2.slice(0, 5)}`;
  }
  return t1;
}

interface DailyRow {
  date: string;
  label: string;
  schedule: string;
  checkIn: string;
  checkOut: string;
  hours: string;
  type: string;
  tardanza: string;
  isAbsent: boolean;
}

function buildDailyRows(s: EmployeeLaborSummary, year: number, month: number): DailyRow[] {
  const latenessMap = new Map(s.dailyLateness.map((l) => [l.date, l]));
  const schedMap = new Map(s.scheduledDays.map((sd) => [sd.date, sd]));
  const entriesByDate = new Map<string, typeof s.entries>();
  for (const e of s.entries) {
    const list = entriesByDate.get(e.date) ?? [];
    list.push(e);
    entriesByDate.set(e.date, list);
  }

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = format(new Date(), 'yyyy-MM-dd');
  const rows: DailyRow[] = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = format(new Date(year, month, d), 'yyyy-MM-dd');
    const sched = schedMap.get(dateStr);
    const dayEntries = entriesByDate.get(dateStr) ?? [];
    const hasEntries = dayEntries.length > 0;
    const hasSched = !!sched;

    // Skip days with no schedule AND no entries
    if (!hasSched && !hasEntries) continue;

    // Determine type
    let type = 'Regular';
    const isHoliday = dayEntries.some((e) => e.isHoliday) || false;
    const isDayOff = sched?.isDayOff || dayEntries.some((e) => e.isDayOff);
    const position = sched?.position;

    if (isHoliday) type = 'Feriado';
    else if (position === 'vacaciones') type = 'Vacaciones';
    else if (position === 'cumple') type = 'Cumpleaños';
    else if (isDayOff) type = 'Franco';

    const scheduleStr = (type === 'Franco' || type === 'Vacaciones' || type === 'Cumpleaños')
      ? (type === 'Franco' ? 'Franco' : type)
      : (hasSched ? formatSchedule(sched!.startTime, sched!.endTime, sched!.startTime2, sched!.endTime2) : '-');

    // Absent detection: had a working schedule, no clock entries, date is in the past
    const hadWorkSchedule = hasSched && !sched!.isDayOff && sched!.startTime && position !== 'vacaciones' && position !== 'cumple';
    const isAbsent = !!(hadWorkSchedule && !hasEntries && dateStr <= today && !isHoliday);

    if (isAbsent) {
      rows.push({
        date: dateStr,
        label: dayLabel(dateStr),
        schedule: scheduleStr,
        checkIn: '-',
        checkOut: '-',
        hours: '-',
        type: 'AUSENTE',
        tardanza: '-',
        isAbsent: true,
      });
      continue;
    }

    // Franco/Vacaciones/Cumple with no entries → single row
    if ((type === 'Franco' || type === 'Vacaciones' || type === 'Cumpleaños') && !hasEntries) {
      rows.push({
        date: dateStr,
        label: dayLabel(dateStr),
        schedule: scheduleStr,
        checkIn: '-',
        checkOut: '-',
        hours: '-',
        type,
        tardanza: '-',
        isAbsent: false,
      });
      continue;
    }

    // Has entries → one row per entry (split shifts = multiple rows)
    if (hasEntries) {
      const sorted = [...dayEntries].sort((a, b) => a.checkIn.localeCompare(b.checkIn));
      sorted.forEach((e, idx) => {
        const lateness = idx === 0 ? latenessMap.get(e.date) : undefined;
        rows.push({
          date: dateStr,
          label: idx === 0 ? dayLabel(dateStr) : '',
          schedule: idx === 0 ? scheduleStr : '',
          checkIn: e.checkIn ? toArgentinaTime(e.checkIn) : '-',
          checkOut: e.checkOut ? toArgentinaTime(e.checkOut) : 'Sin salida',
          hours: e.hoursDecimal > 0 ? e.hoursDecimal.toFixed(2) : '-',
          type: idx === 0 ? type : '',
          tardanza: lateness ? `${lateness.minutes}m (prog: ${lateness.scheduledStart.slice(0, 5)})` : '-',
          isAbsent: false,
        });
      });
    }
  }

  return rows;
}

const DAILY_HEADERS = ['Día', 'Horario', 'Entrada', 'Salida', 'Horas', 'Tipo', 'Tardanza'];

export function exportEmployeePDF(s: EmployeeLaborSummary, monthLabel: string, filename?: string) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // Parse year/month from first entry or scheduledDay
  const refDate = s.scheduledDays[0]?.date || s.entries[0]?.date || format(new Date(), 'yyyy-MM-dd');
  const [yearStr, monthStr] = refDate.split('-');
  const year = parseInt(yearStr);
  const month = parseInt(monthStr) - 1;

  const rows = buildDailyRows(s, year, month);

  // Header
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`Resumen Individual — ${monthLabel}`, 14, 15);

  doc.setFontSize(11);
  doc.text(s.userName, 14, 23);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(`Puesto: ${s.localRole?.toUpperCase() || '-'}  |  CUIL: ${s.cuil || '-'}`, 14, 29);
  doc.setTextColor(0);

  // Summary box
  const summaryData = [
    ['Hs Trabajadas', formatHoursDecimal(s.hsTrabajadasMes)],
    ['Hs Regulares', formatHoursDecimal(s.hsRegulares)],
    ['Vacaciones', `${s.diasVacaciones} días`],
    ['Faltas Inj.', s.faltasInjustificadas.toString()],
    ['Falta Just.', `${s.hsLicencia}h`],
    ['Tardanza Total', `${s.tardanzaAcumuladaMin} min`],
    ['Hs Feriados', s.feriadosHs.toFixed(2)],
    ['Hs Franco', s.hsFrancoTrabajado.toFixed(2)],
    ['Extras Hábil', s.hsExtrasDiaHabil.toFixed(2)],
    ['Extras Inhábil', s.hsExtrasInhabil.toFixed(2)],
    ['Presentismo', s.presentismo ? 'SI' : 'NO'],
  ];

  if (s.positionBreakdown.length > 0) {
    summaryData.push(['', '']);
    summaryData.push(['DESGLOSE POR PUESTO', '']);
    for (const pb of s.positionBreakdown) {
      const posLabel = pb.position.charAt(0).toUpperCase() + pb.position.slice(1);
      summaryData.push([`  ${posLabel}`, `${pb.hsTrabajadas.toFixed(2)} hs`]);
    }
  }

  autoTable(doc, {
    startY: 34,
    head: [['Concepto', 'Valor']],
    body: summaryData,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [41, 65, 106], textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 }, 1: { halign: 'right', cellWidth: 30 } },
    tableWidth: 70,
    didParseCell(data) {
      if (data.section === 'body' && data.row.index === 10) {
        const val = data.cell.raw as string;
        if (data.column.index === 1) {
          data.cell.styles.textColor = val === 'SI' ? [22, 163, 74] : [220, 38, 38];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
  });

  // Daily detail table
  const detailY = (doc as any).lastAutoTable.finalY + 8;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Detalle diario de fichajes', 14, detailY);

  autoTable(doc, {
    startY: detailY + 4,
    head: [DAILY_HEADERS],
    body: rows.map((r) => [r.label, r.schedule, r.checkIn, r.checkOut, r.hours, r.type, r.tardanza]),
    theme: 'grid',
    styles: { fontSize: 7, cellPadding: 1.8, lineWidth: 0.1, lineColor: [200, 200, 200] },
    headStyles: { fillColor: [41, 65, 106], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7 },
    columnStyles: {
      0: { cellWidth: 24 },
      1: { cellWidth: 32, fontSize: 6.5 },
      2: { halign: 'center', cellWidth: 16 },
      3: { halign: 'center', cellWidth: 16 },
      4: { halign: 'right', cellWidth: 14 },
      5: { halign: 'center', cellWidth: 22 },
      6: { cellWidth: 38 },
    },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    didParseCell(data) {
      if (data.section !== 'body') return;
      const rowIdx = data.row.index;
      const row = rows[rowIdx];
      if (!row) return;

      // AUSENTE row: red text, pink bg
      if (row.isAbsent) {
        data.cell.styles.textColor = [220, 38, 38];
        data.cell.styles.fillColor = [254, 226, 226];
        data.cell.styles.fontStyle = 'bold';
        return;
      }

      // Tardanza highlight
      if (data.column.index === 6 && data.cell.raw !== '-') {
        data.cell.styles.textColor = [234, 88, 12];
        data.cell.styles.fontStyle = 'bold';
      }
      // Type colors
      if (data.column.index === 5) {
        const val = data.cell.raw as string;
        if (val === 'Feriado') data.cell.styles.textColor = [37, 99, 235];
        if (val === 'Franco') data.cell.styles.textColor = [147, 51, 234];
        if (val === 'Vacaciones') data.cell.styles.textColor = [22, 163, 74];
        if (val === 'Cumpleaños') data.cell.styles.textColor = [234, 88, 12];
      }
    },
  });

  // Lateness summary
  if (s.dailyLateness.length > 0) {
    const lateY = (doc as any).lastAutoTable.finalY + 6;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(234, 88, 12);
    doc.text(`Tardanzas: ${s.dailyLateness.length} día(s) — Total: ${s.tardanzaAcumuladaMin} minutos`, 14, lateY);
    doc.setTextColor(0);
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text(
      `Generado: ${format(new Date(), 'dd/MM/yyyy HH:mm')}  —  Pág ${i}/${pageCount}`,
      14,
      doc.internal.pageSize.getHeight() - 7,
    );
  }

  doc.save(`${filename || `resumen-${s.userName.replace(/\s+/g, '_').toLowerCase()}`}.pdf`);
}

export function exportEmployeeExcel(s: EmployeeLaborSummary, monthLabel: string, filename?: string) {
  const wb = XLSX.utils.book_new();

  const refDate = s.scheduledDays[0]?.date || s.entries[0]?.date || format(new Date(), 'yyyy-MM-dd');
  const [yearStr, monthStr] = refDate.split('-');
  const year = parseInt(yearStr);
  const month = parseInt(monthStr) - 1;

  const rows = buildDailyRows(s, year, month);

  const data: (string | number)[][] = [];
  data.push([`Resumen Individual — ${monthLabel}`]);
  data.push([s.userName, s.localRole?.toUpperCase() || '-', `CUIL: ${s.cuil || '-'}`]);
  data.push([]);

  data.push(['Concepto', 'Valor']);
  data.push(['Hs Trabajadas', s.hsTrabajadasMes]);
  data.push(['Hs Regulares', s.hsRegulares]);
  data.push(['Vacaciones (días)', s.diasVacaciones]);
  data.push(['Faltas Inj.', s.faltasInjustificadas]);
  data.push(['Falta Just. (hs)', s.hsLicencia]);
  data.push(['Tardanza (min)', s.tardanzaAcumuladaMin]);
  data.push(['Hs Feriados', s.feriadosHs]);
  data.push(['Hs Franco', s.hsFrancoTrabajado]);
  data.push(['Extras Hábil', s.hsExtrasDiaHabil]);
  data.push(['Extras Inhábil', s.hsExtrasInhabil]);
  data.push(['Presentismo', s.presentismo ? 'SI' : 'NO']);

  if (s.positionBreakdown.length > 0) {
    data.push([]);
    data.push(['DESGLOSE POR PUESTO', '']);
    for (const pb of s.positionBreakdown) {
      const posLabel = pb.position.charAt(0).toUpperCase() + pb.position.slice(1);
      data.push([`  ${posLabel}`, pb.hsTrabajadas]);
    }
  }

  data.push([]);
  data.push(DAILY_HEADERS);
  for (const r of rows) {
    data.push([r.label, r.schedule, r.checkIn, r.checkOut, r.hours, r.type, r.tardanza]);
  }

  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [
    { wch: 16 }, { wch: 24 }, { wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 12 }, { wch: 30 },
  ];
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Resumen');
  XLSX.writeFile(wb, `${filename || `resumen-${s.userName.replace(/\s+/g, '_').toLowerCase()}`}.xlsx`);
}
