# Reglas de Negocio - Hoppiness

## Facturación

### Tipos de comprobante (Responsable Inscripto)
- **Factura A:** Solo a otro Responsable Inscripto (requiere CUIT)
- **Factura B:** A Consumidor Final, Monotributista, Exento (99% de las ventas)
- **Nota de Crédito:** Mismo tipo que la factura que anula (NC A o NC B)

### Desglose IVA
- Siempre enviar a AFIP con IVA desglosado (tanto A como B)
- Cálculo: Neto = Total / 1.21, IVA = Total - Neto

## Canales de venta

| Canal | Tipo | Facturación | Comisión |
|-------|------|-------------|----------|
| Mostrador | Propio | Configurable | 0% |
| Delivery propio | Propio | Configurable | 0% |
| TakeAway | Propio | Configurable | 0% |
| Rappi | Externo | Siempre factura | ~25% |
| PedidosYa | Externo | Siempre factura | ~25% |
| MP Delivery | Externo | Siempre factura | Variable |

## Stock y CMV

### Cálculo de CMV
```
CMV = Stock Inicial + Compras - Stock Final
```

### Equivalencias de ingredientes
- Cada ingrediente tiene unidad de compra y unidad de uso
- Ejemplo: Salsa se compra en KG, se usa en UNIDAD (sachet 50cc)
- Sin equivalencia configurada = CMV incalculable

## Caja

### Tipos de caja
- **Caja de venta:** Operación diaria, maneja el cajero
- **Caja de alivio:** Para descargar efectivo durante el turno
- **Caja resguardo:** Caja fuerte, solo acceso del franquiciado

### Cierre de turno
- Monto esperado = Apertura + Ingresos - Egresos
- Diferencia = Monto real - Monto esperado
- Toda diferencia debe justificarse

## Empleados (CCT 329/2000)

- Máximo 9 horas por día
- Máximo 190 horas por mes
- Horas extras después de estos límites
