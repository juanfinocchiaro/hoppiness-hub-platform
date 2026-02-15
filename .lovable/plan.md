

## Corregir formulario de empleo: subida de CV y acceso público

### Problema

El formulario "Trabajá con nosotros" tiene todos los campos correctos (nombre, email, teléfono, selector de local, puesto, CV, motivación), pero **falla al intentar enviar** porque:

1. El bucket de almacenamiento `cv-uploads` **no tiene políticas de acceso** para usuarios no autenticados (el formulario es público)
2. El bucket **no es público**, así que las URLs de descarga de los CVs no funcionan para los admins que quieran verlos

### Solución

**Migración SQL** (único cambio necesario):

1. Hacer el bucket `cv-uploads` público para que las URLs de descarga funcionen
2. Agregar una política de INSERT para permitir que cualquier persona suba archivos al bucket (solo subida, no lectura ni borrado)
3. Agregar una política de SELECT para que los admins puedan descargar los CVs

```sql
-- Hacer el bucket público
UPDATE storage.buckets SET public = true WHERE id = 'cv-uploads';

-- Permitir subida pública (cualquier persona puede enviar su CV)
CREATE POLICY "Public CV upload" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'cv-uploads');

-- Permitir lectura a admins
CREATE POLICY "Admin CV read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'cv-uploads');
```

No se requieren cambios de código. El componente `EmpleoModal.tsx` ya maneja correctamente la subida y el formulario.

### Resultado

- Los usuarios podrán subir su CV desde el formulario público
- Los admins podrán ver/descargar los CVs adjuntados
- El formulario se enviará correctamente con todos los datos

