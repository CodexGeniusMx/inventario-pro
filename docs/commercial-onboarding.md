# Onboarding comercial — Keep Inventory

## Modelo actual

CodexGenius realiza el onboarding inicial de cada cliente. No hay auto-registro público de empresas en esta fase.

## Paso 1 — CodexGenius crea la organización

1. Crear usuario auth en Supabase Authentication.
2. Ejecutar `bootstrap_first_admin` **solo si no existe organización**.
3. Asignar rol `owner` o `admin` al primer usuario.
4. Configurar organización:
   - Nombre comercial
   - Zona horaria `America/Mexico_City`
   - Moneda base y monedas permitidas

## Paso 2 — Primer Owner inicia sesión

El Owner accede a Keep Inventory y configura:

- Empresa
- Monedas
- Almacén predeterminado
- Keep AI / WhatsApp (opcional)

## Paso 3 — Owner invita empleados

Desde **Usuarios → Invitar usuario**:

- Correo del empleado
- Rol (Administrador, Gerente, Vendedor, Almacén, Solo lectura)
- El empleado recibe invitación y activa cuenta en `/accept-invite`

## Lo que el cliente NO necesita

- Acceso a Supabase
- Acceso a base de datos
- Crear filas manualmente en `profiles`
- Gestionar webhooks, n8n, tokens Meta u OpenAI

## Superadmin CodexGenius (futuro)

Jerarquía prevista:

```
CodexGenius (superadmin interno)
  └── Empresa A
        └── Owner
              ├── Admin
              ├── Gerente
              ├── Vendedor
              └── Almacén
```

No se expone como rol cliente en esta fase.

## Ventas y moneda (decisión de fase)

- **Catálogo**: precios en moneda base de la organización.
- **Compras**: moneda por transacción (MXN/USD permitidos).
- **Ventas**: permanecen en moneda base; no se simula multi-moneda de catálogo sin listas de precios/exchange rates explícitos.
