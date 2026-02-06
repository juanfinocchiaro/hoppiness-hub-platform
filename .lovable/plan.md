

# Plan: Agregar Botón "Google Calendar" para Convocantes y Participantes

## Ubicaciones del Botón

| Usuario | Dónde lo ve | Componente |
|---------|-------------|------------|
| **Participante convocado** | Mi Cuenta → Card de Reuniones → Dialog | `MyMeetingsCard.tsx` |
| **Encargado/Coordinador que convoca** | Mi Local/Mi Marca → Reuniones → Detalle | `MeetingDetail.tsx` |

```text
┌─ MeetingDetail.tsx (para encargados) ────────────────────┐
│                                                          │
│  Reunión: Operaciones            [Cancelar] [Iniciar]    │
│  📅 Jueves 6 de febrero, 16:00                           │
│                                                          │
│  ┌──────────────────────────────────────────────────┐    │
│  │  👥 Convocados (5 participantes)                 │    │
│  │  [Avatar] Juan  [Avatar] María  [Avatar] Pedro   │    │
│  └──────────────────────────────────────────────────┘    │
│                                                          │
│  [📅 Agregar a mi Google Calendar]  ← NUEVO              │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

## Cambios Técnicos

### 1. Crear función utilitaria

```typescript
// src/lib/calendarLinks.ts
export function generateGoogleCalendarLink(meeting: {
  title: string;
  date: string;
  area?: string;
  branchName?: string;
  participantCount?: number;
}): string {
  const startDate = new Date(meeting.date);
  const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // +1 hora
  
  // Formato requerido por Google: YYYYMMDDTHHmmssZ
  const formatDate = (d: Date) => 
    d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  
  const details = [
    `Reunión de ${meeting.area || 'equipo'} - Hoppiness Club`,
    meeting.participantCount ? `${meeting.participantCount} participantes convocados` : '',
  ].filter(Boolean).join('\n');
  
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: meeting.title,
    dates: `${formatDate(startDate)}/${formatDate(endDate)}`,
    details,
    location: meeting.branchName || 'Hoppiness Club',
  });
  
  return `https://www.google.com/calendar/render?${params.toString()}`;
}
```

### 2. Agregar botón en `MeetingDetail.tsx`

En el sub-componente `ConvocadaContent`, agregar el botón después de la lista de convocados:

```tsx
function ConvocadaContent({ meeting, pendingParticipants }: Props) {
  const calendarUrl = generateGoogleCalendarLink({
    title: meeting.title,
    date: meeting.scheduled_at || meeting.date,
    area: MEETING_AREAS.find(a => a.value === meeting.area)?.label,
    branchName: meeting.branches?.name,
    participantCount: pendingParticipants.length,
  });

  return (
    <>
      <Card>
        {/* ... lista de convocados existente ... */}
      </Card>
      
      <Button
        variant="outline"
        className="w-full sm:w-auto"
        onClick={() => window.open(calendarUrl, '_blank')}
      >
        <Calendar className="w-4 h-4 mr-2" />
        Agregar a mi Google Calendar
      </Button>
    </>
  );
}
```

### 3. Agregar botón en `MyMeetingsCard.tsx`

En el dialog de reunión convocada:

```tsx
{selectedMeeting.status === 'convocada' && (
  <div className="space-y-3">
    <div className="bg-muted/50 p-4 rounded-lg text-center">
      {/* ... mensaje existente ... */}
    </div>
    
    <Button
      variant="outline"
      className="w-full"
      onClick={() => window.open(
        generateGoogleCalendarLink({
          title: selectedMeeting.title,
          date: selectedMeeting.date,
          area: MEETING_AREAS.find(a => a.value === selectedMeeting.area)?.label,
        }),
        '_blank'
      )}
    >
      <Calendar className="w-4 h-4 mr-2" />
      Agregar a mi Google Calendar
    </Button>
  </div>
)}
```

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/lib/calendarLinks.ts` | **Crear** - Función `generateGoogleCalendarLink` |
| `src/components/meetings/MeetingDetail.tsx` | Agregar botón en `ConvocadaContent` |
| `src/components/cuenta/MyMeetingsCard.tsx` | Agregar botón en dialog de reunión convocada |

## Resultado

- **Encargados/Coordinadores**: Ven el botón en la vista de detalle de la reunión convocada
- **Participantes**: Ven el botón en el dialog de Mi Cuenta
- **Sin OAuth**: Funciona con cualquier cuenta de Google, sin autenticación adicional
- **Pre-llenado**: El evento aparece listo para guardar con título, fecha, duración y ubicación

