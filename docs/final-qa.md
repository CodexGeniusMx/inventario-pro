# Keep Inventory — Plan de QA en estado limpio

Este documento guía la verificación manual después del reset de datos de desarrollo.

## Prerrequisitos

1. Aplicar migraciones `00026` y `00027` en el entorno de QA.
2. Ejecutar el script de reset de desarrollo **solo después de aprobación** (`docs/dev-data-reset.sql`).
3. Confirmar branding: **Keep Inventory** / **CodexGenius**.
4. Confirmar interfaz completamente en español.

## Secuencia de QA

### 1. Autenticación
- [ ] Login con cuenta Owner/Admin existente
- [ ] Logout y reingreso
- [ ] Usuario inactivo muestra error apropiado

### 2. Configuración
- [ ] Abrir `/settings`
- [ ] Actualizar nombre de empresa y zona horaria (`America/Mexico_City`)
- [ ] Guardar monedas (ver escenarios A/B/C abajo)
- [ ] Seleccionar almacén predeterminado
- [ ] Ver prefijos de documentos (solo lectura)
- [ ] Configurar Keep AI (activado, consultas, confirmación)
- [ ] Configurar WhatsApp (sin exponer secretos)
- [ ] Ver sección Automatizaciones administradas por CodexGenius

### 3. Usuarios e invitaciones
- [ ] Abrir `/users`
- [ ] Invitar usuario con rol Vendedor
- [ ] Completar flujo de aceptación en `/accept-invite`
- [ ] Verificar membresía y rol asignados
- [ ] Cambiar rol / desactivar usuario

### 4. Almacenes y catálogo
- [ ] Crear almacén principal
- [ ] Crear categoría (si aplica)
- [ ] Crear producto **PlayStation 5**
  - SKU: `PS5-001`
  - Costo base: `9000` MXN
  - Precio venta: `11999` MXN
  - Punto reorden: `5`
- [ ] Verificar moneda base visible en detalle/edición

### 5. Inventario
- [ ] Stock inicial: `10` unidades
- [ ] Ajuste: `+5` → esperado `15`
- [ ] Ver movimientos inmutables generados
- [ ] Intentar stock negativo → debe rechazarse

### 6. Compras
- [ ] Crear proveedor **Sony México**
- [ ] Crear OC: `10` unidades PS5
- [ ] Recibir compra completa → esperado `25`
- [ ] Ver moneda de transacción en detalle (sin conversión automática)

### 7. Ventas y devoluciones
- [ ] Crear cliente
- [ ] Venta de `5` PS5 → esperado `20`
- [ ] Devolución de `2` → esperado `22`
- [ ] Venta con stock insuficiente → rechazada

### 8. Panel y reportes
- [ ] Panel carga métricas reales
- [ ] Reportes por módulo cargan
- [ ] Exportar CSV
- [ ] Totales **no mezclan monedas** (MXN y USD por separado)

### 9. Permisos por rol

#### Vendedor
- [ ] Puede ver productos/stock
- [ ] Puede crear ventas permitidas
- [ ] **No** ve costos ni utilidad
- [ ] **No** accede a configuración/usuarios

#### Almacén
- [ ] Puede ver stock y movimientos
- [ ] Puede recibir compras
- [ ] **No** ve utilidad ni reportes financieros

#### Owner
- [ ] Acceso completo según permisos

### 10. Búsqueda global
- [ ] Barra superior muestra "Buscar… Ctrl+K" / "⌘K"
- [ ] Ctrl/Cmd+K abre el diálogo de búsqueda
- [ ] Escribir funciona con caret visible
- [ ] Resultados de productos, clientes, compras, ventas
- [ ] Keep AI permanece separado (orb flotante)

### 11. Keep AI
- [ ] Orb flotante ~130px desde abajo (desktop)
- [ ] Panel abre/cierra con Escape
- [ ] Variaciones naturales:
  - "que productos tenemos"
  - "qué tenemos en inventario"
  - "cuantos ps5 quedan"
  - "que productos tienen stock bajo"
  - "como vamos de ventas hoy"
- [ ] Contexto: "cuantos ps5 tenemos" → "y cuanto cuestan"
- [ ] Ambigüedad: "cuantos apple tenemos" → pide aclaración
- [ ] Vendedor: utilidad del mes → denegado con mensaje claro
- [ ] Mutación: prepara borrador, no ejecuta sin confirmación

## Escenarios de moneda

### Escenario A — MXN únicamente
- Base: MXN
- Permitidas: MXN
- Esperado: sin selector USD; catálogo y compras en MXN

### Escenario B — USD únicamente
- Base: USD
- Permitidas: USD
- Esperado: sin selector MXN

### Escenario C — MXN + USD
- Base: MXN
- Permitidas: MXN + USD
- Esperado: selector en compras; sin conversión automática; reportes separados por moneda

## Flujo numérico de ejemplo (PS5)

| Paso | Operación | Stock esperado |
|------|-----------|----------------|
| 1 | Stock inicial 10 | 10 |
| 2 | Ajuste +5 | 15 |
| 3 | Compra recibida +10 | 25 |
| 4 | Venta -5 | 20 |
| 5 | Devolución +2 | 22 |

## Criterios de aprobación

- Sin textos en inglés en UI
- Sin regresiones en ventas/compras/inventario/devoluciones
- Permisos aplicados en UI **y** servidor
- Keep AI respeta permisos
- Infraestructura técnica oculta al cliente
