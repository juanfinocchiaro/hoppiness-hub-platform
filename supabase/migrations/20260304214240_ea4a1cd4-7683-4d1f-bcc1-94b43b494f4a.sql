
ALTER TABLE public.periodos RENAME TO periods;
ALTER TABLE public.periods RENAME COLUMN periodo TO period;
ALTER TABLE public.periods RENAME COLUMN estado TO status;
ALTER TABLE public.periods RENAME COLUMN cerrado_por TO closed_by;
ALTER TABLE public.periods RENAME COLUMN fecha_cierre TO closed_at;
ALTER TABLE public.periods RENAME COLUMN motivo_cierre TO close_reason;
ALTER TABLE public.periods RENAME COLUMN motivo_reapertura TO reopen_reason;
ALTER TABLE public.periods RENAME COLUMN reabierto_por TO reopened_by;
ALTER TABLE public.periods RENAME COLUMN fecha_reapertura TO reopened_at;
ALTER TABLE public.periods RENAME COLUMN aprobado_por TO approved_by;
ALTER TABLE public.periods RENAME COLUMN fecha_aprobacion TO approved_at;
ALTER TABLE public.periods RENAME COLUMN observaciones TO notes;
