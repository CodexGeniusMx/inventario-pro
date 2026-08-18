# Ventas y monedas — Decisión comercial

## Decisión

Las ventas del catálogo se registran en la **moneda base** de la organización.

## Motivo

Los precios de catálogo (`products` / `product_variants`) están definidos en la moneda base. No existe una lista de precios paralela por moneda ni una tabla de tipos de cambio almacenados.

Mostrar el mismo valor numérico como MXN y USD sería incorrecto comercialmente.

## Comportamiento actual

- Catálogo: precios en moneda base (ej. MXN).
- Ventas: totales en moneda base.
- Compras: pueden usar monedas permitidas (MXN/USD) sin conversión automática.
- Reportes: no suman monedas distintas; los totales de compras se agrupan por moneda.

## Futuro (no implementado)

Para ventas multi-moneda reales se requeriría al menos una de:

1. Listas de precios por moneda permitida.
2. Tipos de cambio explícitos almacenados por organización/fecha.
3. Política de redondeo y conversión auditada.

Hasta entonces, Keep Inventory mantiene ventas en moneda base.
