import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const securityItems = [
  {
    title: "Contraseña",
    description:
      "La gestión de contraseña se realiza mediante Supabase Auth. Usa “Olvidé mi contraseña” en el inicio de sesión si necesitas restablecerla.",
  },
  {
    title: "Autenticación en dos pasos (2FA)",
    description: "Próximamente. Se habilitará cuando la configuración segura esté lista.",
  },
  {
    title: "Sesiones activas",
    description: "Próximamente. Podrás revisar y cerrar sesiones desde aquí.",
  },
  {
    title: "Actividad de inicio de sesión",
    description: "Próximamente. Historial de accesos recientes a tu cuenta.",
  },
]

export function SecuritySettingsPanel() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Seguridad</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {securityItems.map((item) => (
          <div key={item.title} className="rounded-xl border p-4">
            <p className="text-sm font-medium">{item.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
