
# Plan: Sistema de Visibilidad Jerárquica de Coaching

## Problema Identificado

Actualmente hay dos issues principales:

### Issue 1: Bug de Tab Duplicado
En `CoachingPage.tsx` (líneas 365-378), hay DOS tabs con el mismo `value="team"`:
```tsx
{(isEncargado || isSuperadmin) && (
  <TabsTrigger value="team">Equipo</TabsTrigger>
)}
{isFranquiciado && (
  <TabsTrigger value="team">Empleados</TabsTrigger>
)}
```
Esto causa que aparezcan fusionados como "Equipo Empleados".

### Issue 2: Sidebar Oculto para Franquiciado
En `LocalSidebar.tsx`, el item de Coaching solo aparece si `canDoCoaching` es `true`. Para Franquiciado esto es `false` (correctamente), pero el Franquiciado SÍ debe ver la página de Coaching (solo lectura).

### Issue 3: Falta de Visibilidad Jerárquica
Según el documento del usuario:

| Rol | Ve coachings de... |
|-----|---------------------|
| Marca | Encargados (los que hizo) + Empleados de TODA la red (solo lectura) |
| Franquiciado | SU encargado (hecho por marca) + Empleados de SU local (solo lectura) |
| Encargado | SU propia evaluación (hecha por marca) + Empleados que él evaluó |
| Empleado | Solo SU propia evaluación |

---

## Solución Propuesta

### 1. Agregar Permiso de Visualización

**En `usePermissionsV2.ts`**, agregar nuevo permiso:
```typescript
// Coaching
canDoCoaching: hasCurrentBranchAccess && (isSuperadmin || isEncargado),
canViewCoaching: hasCurrentBranchAccess && (isSuperadmin || isEncargado || isFranquiciado),
```

### 2. Actualizar Sidebar

**En `LocalSidebar.tsx`**, cambiar la condición:
```tsx
// Antes
{canDoCoaching && (
  <NavItemButton to={`${basePath}/equipo/coaching`} icon={ClipboardList} label="Coaching" />
)}

// Después
{canViewCoaching && (
  <NavItemButton to={`${basePath}/equipo/coaching`} icon={ClipboardList} label="Coaching" />
)}
```

### 3. Corregir Tabs en CoachingPage

**En `CoachingPage.tsx`**, unificar la lógica:

```tsx
<Tabs value={activeTab} onValueChange={setActiveTab}>
  <TabsList className="flex-wrap h-auto gap-1">
    {/* Tab Mi Encargado - Solo Franquiciado */}
    {isFranquiciado && (
      <TabsTrigger value="manager" className="gap-2">
        <User className="h-4 w-4" />
        Mi Encargado
      </TabsTrigger>
    )}
    
    {/* Tab Mi Evaluación - Solo Encargado */}
    {isEncargado && (
      <TabsTrigger value="own" className="gap-2">
        <Star className="h-4 w-4" />
        Mi Evaluación
      </TabsTrigger>
    )}
    
    {/* Tab Equipo - Todos los que pueden ver coaching */}
    {local.canViewCoaching && (
      <TabsTrigger value="team" className="gap-2">
        <Users className="h-4 w-4" />
        Equipo
      </TabsTrigger>
    )}
    
    {/* Resto de tabs... */}
  </TabsList>
</Tabs>
```

### 4. Actualizar Tab "Equipo" con Vista de Solo Lectura

**En `CoachingPage.tsx`**, modificar el contenido del tab "team":

```tsx
<TabsContent value="team" className="mt-4">
  <Card>
    <CardHeader>
      <CardTitle>Empleados del Local</CardTitle>
      <CardDescription>
        {local.canDoCoaching 
          ? 'Seleccioná un empleado para realizar su coaching mensual'
          : 'Coachings realizados a los empleados del local'}
      </CardDescription>
    </CardHeader>
    <CardContent>
      {/* Banner de solo lectura para Franquiciado */}
      {isFranquiciado && (
        <Alert className="mb-4" variant="info">
          <Eye className="h-4 w-4" />
          <AlertTitle>Modo lectura</AlertTitle>
          <AlertDescription>
            Los coachings son realizados por el Encargado. 
            Aquí podés ver el estado de las evaluaciones.
          </AlertDescription>
        </Alert>
      )}
      
      {renderMemberList(
        teamMembers, 
        hasCoachingThisMonth,
        'No hay empleados activos en este local'
      )}
    </CardContent>
  </Card>
</TabsContent>
```

### 5. Actualizar renderMemberList para Solo Lectura

Modificar `renderMemberList` para que Franquiciado vea coachings completados pero no pueda evaluar:

```tsx
const renderMemberList = (...) => {
  // ...
  return (
    <div className="space-y-2">
      {members.map(member => {
        const hasCoaching = checkHasCoaching(member.id);
        
        return (
          <Collapsible
            key={member.id}
            open={isExpanded}
            // Solo expandible si puede hacer coaching Y no tiene coaching
            onOpenChange={() => !hasCoaching && local.canDoCoaching && handleToggleEmployee(member.id)}
          >
            {/* Row */}
            <CollapsibleTrigger asChild disabled={hasCoaching || !local.canDoCoaching}>
              <div className={...}>
                {/* Avatar y nombre */}
                
                {/* Estado */}
                {hasCoaching ? (
                  <Badge variant="secondary" className="gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Completado
                  </Badge>
                ) : local.canDoCoaching ? (
                  <span>Evaluar</span>
                ) : (
                  <Badge variant="outline" className="gap-1">
                    <Clock className="h-3 w-3" />
                    Pendiente
                  </Badge>
                )}
              </div>
            </CollapsibleTrigger>
            
            {/* Form solo si puede hacer coaching */}
            {local.canDoCoaching && (
              <CollapsibleContent>
                <CoachingForm ... />
              </CollapsibleContent>
            )}
          </Collapsible>
        );
      })}
    </div>
  );
};
```

---

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/hooks/usePermissionsV2.ts` | Agregar `canViewCoaching` |
| `src/components/layout/LocalSidebar.tsx` | Usar `canViewCoaching` en lugar de `canDoCoaching` |
| `src/pages/local/BranchLayout.tsx` | Pasar nuevo permiso al sidebar |
| `src/pages/local/CoachingPage.tsx` | Corregir tabs duplicados, agregar banner solo lectura |

---

## Resumen de Permisos Resultantes

| Rol | canDoCoaching | canViewCoaching | Acceso |
|-----|---------------|-----------------|--------|
| Superadmin | ✅ | ✅ | Puede hacer coaching + ver todo |
| Encargado | ✅ | ✅ | Puede hacer coaching + ver su evaluación |
| Franquiciado | ❌ | ✅ | Solo lectura (ve encargado + empleados) |
| Cajero/Empleado | ❌ | ❌ | Sin acceso a Mi Local |

Esta arquitectura implementa exactamente la "visibilidad jerárquica" solicitada, donde cada rol ve lo que corresponde según su nivel.
