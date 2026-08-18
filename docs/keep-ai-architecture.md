# Keep AI — Arquitectura (Fase comercial)

## Objetivo

Keep AI permite consultas en lenguaje natural y preparación de acciones operativas sin bypass de permisos ni mutaciones directas a tablas.

## Capas

```
Usuario (UI / WhatsApp futuro)
  → Keep AI agent (LLM o fallback)
  → herramientas estructuradas autorizadas
  → validación server-side + RLS
  → PostgreSQL / RPCs
  → respuesta en lenguaje natural
```

## Proveedor de lenguaje

- **Con credencial:** OpenAI-compatible chat completions con function calling.
- **Variables de entorno (servidor):**
  - `KEEP_AI_API_KEY` o `OPENAI_API_KEY`
  - `KEEP_AI_MODEL` (default: `gpt-4o-mini`)
  - `KEEP_AI_BASE_URL` (opcional, default OpenAI)
- **Sin credencial:** modo fallback mejorado (herramientas + heurísticas), claramente identificado en la respuesta API (`provider: "fallback"`).

No se exponen API keys, prompts del sistema ni schemas de herramientas al cliente.

## Herramientas estructuradas

Implementadas en `lib/keep-ai/tools/executor.ts`:

- `searchProducts`, `listInventory`, `getProductStock`
- `getLowStock`, `getOutOfStock`
- `getSalesToday`, `getSalesSummary`
- `getPendingPurchases`
- `searchCustomers`, `searchSuppliers`
- `createProductDraft` (solo preparación)

Cada herramienta valida permisos del usuario autenticado antes de consultar datos.

## Contexto conversacional

El panel envía historial reciente (`history`) al endpoint `/api/keep-ai`. El LLM y el fallback usan contexto para follow-ups como "y cuánto cuestan".

## Nivel 2 — Preparar acciones

Para mutaciones, Keep AI devuelve `preparedAction` y la UI muestra tarjeta de confirmación. **No ejecuta** cambios automáticamente.

## Nivel 3 — Confirmación obligatoria

Operaciones sensibles requieren confirmación explícita antes de invocar server actions/RPCs (fase posterior).

## Permisos

Keep AI hereda permisos del usuario autenticado. Diferencia:

- "Entendí la solicitud pero no tienes permiso" (`denied: true`)
- "No encontré información" (consulta válida sin resultados)

## Configuración cliente

`/settings` → Asistente IA:

- Activado / desactivado
- Consultas
- Preparar acciones
- Confirmación antes de cambios

## WhatsApp futuro (documentado, no implementado)

```
WhatsApp Business
  → capa CodexGenius / n8n
  → Keep AI
  → API autorizada de Keep Inventory
  → servicios de negocio
  → Supabase
```

## CodexGenius Superadmin (futuro)

Rol interno de plataforma, no expuesto a clientes:

```
CodexGenius
  ├── Empresa A → Propietario → roles cliente
  └── Empresa B → Propietario → roles cliente
```

CodexGenius crea organización + primer Propietario; el cliente administra empleados desde Keep Inventory.
