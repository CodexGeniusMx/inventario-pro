import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function AutomationsSupportPanel() {
  return (
    <Card id="automatizaciones">
      <CardHeader>
        <CardTitle>Soporte / Automatizaciones</CardTitle>
        <CardDescription>
          Las automatizaciones avanzadas son administradas por CodexGenius.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        <p>
          Estado: <span className="font-medium text-foreground">Administradas por CodexGenius</span>
        </p>
        <p>
          Contacta a soporte para agregar o modificar flujos como alertas de WhatsApp,
          reportes programados o integraciones externas.
        </p>
        <p>
          Los clientes no administran URLs de webhooks, tokens de Meta, claves de OpenAI ni credenciales de Supabase desde esta pantalla.
        </p>
      </CardContent>
    </Card>
  )
}
