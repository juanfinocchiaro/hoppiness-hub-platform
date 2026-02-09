
## Correccion: Firmas de Reglamento bloqueadas por politica de Storage desactualizada

### Problema encontrado

Luca Lipinski (y otros 9 encargados/franquiciados) no pueden subir fotos de firma de reglamento. El error ocurre en el **Storage** de archivos, no en la tabla `regulation_signatures`.

La politica de Storage para el bucket `regulation-signatures` valida permisos contra la tabla **vieja** `user_roles_v2`. Pero desde la migracion V2, los roles operativos estan en `user_branch_roles`. Luca existe en `user_branch_roles` como encargado pero NO tiene registro en `user_roles_v2`, por lo que el Storage le rechaza la subida.

**Usuarios afectados:** Luca Lipinski, Dalma Ledesma, Tomas Lambert, Gaston Lopez, Valentina Reginelli, Federico Finocchiaro, guadalupe malizia, Lucas Boros, Maria Eugenia Finocchiaro, Lucia Aste.

### Solucion

Actualizar la politica de Storage del bucket `regulation-signatures` para que valide contra `user_branch_roles` en vez de `user_roles_v2`.

### Cambio tecnico

**Migracion SQL** - Reemplazar la politica de INSERT en Storage:

Politica actual:
```
bucket_id = 'regulation-signatures'
AND EXISTS (
  SELECT 1 FROM user_roles_v2
  WHERE user_id = auth.uid() AND is_active = true
  AND (brand_role = 'superadmin' OR local_role IN ('franquiciado','encargado'))
)
```

Politica corregida:
```
bucket_id = 'regulation-signatures'
AND (
  is_superadmin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM user_branch_roles
    WHERE user_id = auth.uid() AND is_active = true
    AND local_role IN ('franquiciado','encargado')
  )
)
```

Tambien se actualizara la politica de SELECT del mismo bucket con la misma logica para que los usuarios afectados puedan ver las fotos que suban.

No se requieren cambios de frontend.
