import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
      <Card>
        <CardHeader>
          <CardTitle>Configurações da Conta</CardTitle>
          <CardDescription>Gerencie as configurações da sua conta e da empresa.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="py-10 text-center text-muted-foreground">As opções de configuração serão implementadas em breve.</p>
        </CardContent>
      </Card>
    </div>
  );
}
