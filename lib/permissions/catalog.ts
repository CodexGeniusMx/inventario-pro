import type { AppRole } from "@/lib/auth/types"

export type PermissionDefinition = {
  resource: string
  action: string
  label: string
  description: string
}

export type PermissionGroup = {
  id: string
  label: string
  description: string
  permissions: PermissionDefinition[]
}

export const EDITABLE_ORG_ROLES: AppRole[] = [
  "admin",
  "manager",
  "seller",
  "warehouse",
  "read_only",
]

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    id: "products",
    label: "Productos",
    description: "Catálogo, precios y categorías.",
    permissions: [
      {
        resource: "products",
        action: "view",
        label: "Ver productos",
        description: "Consultar el catálogo de productos.",
      },
      {
        resource: "products",
        action: "read",
        label: "Ver productos (legacy)",
        description: "Compatibilidad con permisos heredados.",
      },
      {
        resource: "products",
        action: "create",
        label: "Crear productos",
        description: "Registrar nuevos productos y variantes.",
      },
      {
        resource: "products",
        action: "edit",
        label: "Editar productos",
        description: "Modificar productos existentes.",
      },
      {
        resource: "products",
        action: "write",
        label: "Editar productos (legacy)",
        description: "Compatibilidad con permisos heredados.",
      },
      {
        resource: "products",
        action: "archive",
        label: "Archivar productos",
        description: "Desactivar o archivar productos del catálogo.",
      },
      {
        resource: "products",
        action: "view_cost",
        label: "Ver costos",
        description: "Ver costos de adquisición y márgenes.",
      },
      {
        resource: "categories",
        action: "read",
        label: "Ver categorías",
        description: "Consultar categorías del catálogo.",
      },
      {
        resource: "categories",
        action: "write",
        label: "Administrar categorías",
        description: "Crear y editar categorías.",
      },
    ],
  },
  {
    id: "inventory",
    label: "Inventario",
    description: "Existencias, movimientos y ajustes.",
    permissions: [
      {
        resource: "inventory",
        action: "view",
        label: "Ver inventario",
        description: "Consultar existencias actuales.",
      },
      {
        resource: "inventory",
        action: "read",
        label: "Ver inventario (legacy)",
        description: "Compatibilidad con permisos heredados.",
      },
      {
        resource: "inventory",
        action: "view_movements",
        label: "Ver movimientos",
        description: "Consultar el historial de movimientos.",
      },
      {
        resource: "inventory",
        action: "adjust",
        label: "Ajustar inventario",
        description: "Registrar ajustes de stock.",
      },
      {
        resource: "inventory",
        action: "receive",
        label: "Recibir compras",
        description: "Confirmar recepciones de mercancía.",
      },
    ],
  },
  {
    id: "sales",
    label: "Ventas",
    description: "Operaciones comerciales de venta.",
    permissions: [
      {
        resource: "sales",
        action: "view",
        label: "Ver ventas",
        description: "Consultar ventas según alcance asignado.",
      },
      {
        resource: "sales",
        action: "read",
        label: "Ver ventas (legacy)",
        description: "Compatibilidad con permisos heredados.",
      },
      {
        resource: "sales",
        action: "view_all",
        label: "Ver todas las ventas",
        description: "Consultar ventas de todo el equipo.",
      },
      {
        resource: "sales",
        action: "create",
        label: "Crear ventas",
        description: "Registrar nuevas ventas.",
      },
      {
        resource: "sales",
        action: "write",
        label: "Crear ventas (legacy)",
        description: "Compatibilidad con permisos heredados.",
      },
      {
        resource: "sales",
        action: "complete",
        label: "Completar ventas",
        description: "Finalizar ventas pendientes.",
      },
      {
        resource: "sales",
        action: "cancel",
        label: "Cancelar ventas",
        description: "Anular ventas registradas.",
      },
      {
        resource: "sales",
        action: "return",
        label: "Procesar devoluciones de venta",
        description: "Registrar devoluciones vinculadas a ventas.",
      },
      {
        resource: "returns",
        action: "read",
        label: "Ver devoluciones",
        description: "Consultar devoluciones registradas.",
      },
      {
        resource: "returns",
        action: "write",
        label: "Gestionar devoluciones",
        description: "Crear y procesar devoluciones.",
      },
    ],
  },
  {
    id: "purchases",
    label: "Compras",
    description: "Órdenes de compra y recepciones.",
    permissions: [
      {
        resource: "purchases",
        action: "view",
        label: "Ver compras",
        description: "Consultar órdenes de compra.",
      },
      {
        resource: "purchases",
        action: "read",
        label: "Ver compras (legacy)",
        description: "Compatibilidad con permisos heredados.",
      },
      {
        resource: "purchases",
        action: "create",
        label: "Crear compras",
        description: "Registrar órdenes de compra.",
      },
      {
        resource: "purchases",
        action: "write",
        label: "Gestionar compras (legacy)",
        description: "Compatibilidad con permisos heredados.",
      },
      {
        resource: "purchases",
        action: "approve",
        label: "Aprobar compras",
        description: "Aprobar órdenes pendientes.",
      },
      {
        resource: "purchases",
        action: "receive",
        label: "Recibir compras",
        description: "Confirmar recepción de mercancía.",
      },
      {
        resource: "purchases",
        action: "view_cost",
        label: "Ver costos de compra",
        description: "Ver montos y costos en compras.",
      },
    ],
  },
  {
    id: "customers",
    label: "Clientes",
    description: "Directorio de clientes.",
    permissions: [
      {
        resource: "customers",
        action: "view",
        label: "Ver clientes",
        description: "Consultar clientes.",
      },
      {
        resource: "customers",
        action: "read",
        label: "Ver clientes (legacy)",
        description: "Compatibilidad con permisos heredados.",
      },
      {
        resource: "customers",
        action: "create",
        label: "Crear clientes",
        description: "Registrar nuevos clientes.",
      },
      {
        resource: "customers",
        action: "edit",
        label: "Editar clientes",
        description: "Actualizar datos de clientes.",
      },
      {
        resource: "customers",
        action: "write",
        label: "Gestionar clientes (legacy)",
        description: "Compatibilidad con permisos heredados.",
      },
    ],
  },
  {
    id: "suppliers",
    label: "Proveedores",
    description: "Directorio de proveedores.",
    permissions: [
      {
        resource: "suppliers",
        action: "view",
        label: "Ver proveedores",
        description: "Consultar proveedores.",
      },
      {
        resource: "suppliers",
        action: "read",
        label: "Ver proveedores (legacy)",
        description: "Compatibilidad con permisos heredados.",
      },
      {
        resource: "suppliers",
        action: "create",
        label: "Crear proveedores",
        description: "Registrar proveedores.",
      },
      {
        resource: "suppliers",
        action: "edit",
        label: "Editar proveedores",
        description: "Actualizar proveedores.",
      },
      {
        resource: "suppliers",
        action: "write",
        label: "Gestionar proveedores (legacy)",
        description: "Compatibilidad con permisos heredados.",
      },
    ],
  },
  {
    id: "reports",
    label: "Reportes y finanzas",
    description: "Informes y métricas financieras.",
    permissions: [
      {
        resource: "reports",
        action: "read",
        label: "Ver reportes",
        description: "Acceder a reportes operativos.",
      },
      {
        resource: "financial",
        action: "revenue",
        label: "Ver ingresos",
        description: "Consultar ingresos y ventas netas.",
      },
      {
        resource: "financial",
        action: "costs",
        label: "Ver costos",
        description: "Consultar costos y COGS.",
      },
      {
        resource: "financial",
        action: "profit",
        label: "Ver utilidad",
        description: "Consultar márgenes y utilidad bruta.",
      },
      {
        resource: "financial",
        action: "export",
        label: "Exportar datos financieros",
        description: "Exportar reportes con columnas sensibles.",
      },
      {
        resource: "audit",
        action: "read",
        label: "Ver auditoría",
        description: "Consultar registros de auditoría.",
      },
    ],
  },
  {
    id: "users",
    label: "Usuarios",
    description: "Administración del equipo.",
    permissions: [
      {
        resource: "users",
        action: "read",
        label: "Ver usuarios",
        description: "Consultar miembros del equipo.",
      },
      {
        resource: "users",
        action: "write",
        label: "Gestionar usuarios (legacy)",
        description: "Compatibilidad con permisos heredados.",
      },
      {
        resource: "users",
        action: "invite",
        label: "Invitar usuarios",
        description: "Enviar invitaciones al equipo.",
      },
      {
        resource: "users",
        action: "change_role",
        label: "Cambiar roles",
        description: "Modificar roles de usuarios.",
      },
      {
        resource: "users",
        action: "deactivate",
        label: "Desactivar usuarios",
        description: "Desactivar cuentas del equipo.",
      },
    ],
  },
  {
    id: "settings",
    label: "Configuración",
    description: "Preferencias de la empresa.",
    permissions: [
      {
        resource: "settings",
        action: "read",
        label: "Ver configuración",
        description: "Consultar ajustes de la empresa.",
      },
      {
        resource: "settings",
        action: "write",
        label: "Editar configuración (legacy)",
        description: "Compatibilidad con permisos heredados.",
      },
      {
        resource: "settings",
        action: "company",
        label: "Configurar empresa",
        description: "Editar datos generales de la empresa.",
      },
      {
        resource: "settings",
        action: "currency",
        label: "Configurar monedas",
        description: "Administrar monedas permitidas.",
      },
      {
        resource: "settings",
        action: "inventory",
        label: "Configurar inventario",
        description: "Ajustes de inventario y almacén predeterminado.",
      },
      {
        resource: "settings",
        action: "ai",
        label: "Configurar Keep AI",
        description: "Preferencias del asistente IA.",
      },
      {
        resource: "settings",
        action: "whatsapp",
        label: "Configurar WhatsApp",
        description: "Integración de WhatsApp (cuando esté disponible).",
      },
    ],
  },
  {
    id: "security",
    label: "Seguridad",
    description: "Control de acceso y permisos.",
    permissions: [
      {
        resource: "roles",
        action: "manage_permissions",
        label: "Administrar permisos de roles",
        description: "Editar la matriz de permisos por rol.",
      },
    ],
  },
]

export function permissionKey(resource: string, action: string): string {
  return `${resource}:${action}`
}

export function isProtectedRolePermission(
  role: AppRole,
  resource: string,
  action: string,
  currentlyGranted: boolean
): boolean {
  if (role === "owner") {
    return true
  }

  if (
    role === "admin" &&
    resource === "roles" &&
    action === "manage_permissions" &&
    currentlyGranted
  ) {
    return true
  }

  return false
}

export function getProtectedPermissionReason(
  role: AppRole,
  resource: string,
  action: string
): string | null {
  if (role === "owner") {
    return "El rol Propietario es de máxima autoridad y no puede modificarse."
  }

  if (role === "admin" && resource === "roles" && action === "manage_permissions") {
    return "Este permiso es obligatorio para proteger la administración de la empresa."
  }

  return null
}
