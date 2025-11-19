import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAgencySettings } from "@/hooks/useAgencySettings";
import { Skeleton } from "@/components/ui/skeleton";
import { Save, Building2 } from "lucide-react";

export default function AgencySettings() {
  const { settings, loading, updateSettings } = useAgencySettings();
  
  const [agencyName, setAgencyName] = useState("");
  const [phone, setPhone] = useState("");
  const [instagram, setInstagram] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [website, setWebsite] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setAgencyName(settings.agency_name);
      setPhone(settings.phone || "");
      setInstagram(settings.instagram || "");
      setEmail(settings.email || "");
      setAddress(settings.address || "");
      setWebsite(settings.website || "");
    }
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings({
        agency_name: agencyName,
        phone,
        instagram,
        email,
        address,
        website,
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container py-8 space-y-4">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Building2 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Configurações da Agência</h1>
          <p className="text-sm text-muted-foreground">
            Personalize os dados que aparecerão nos orçamentos exportados
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informações da Agência</CardTitle>
          <CardDescription>
            Estes dados serão exibidos no cabeçalho e rodapé dos orçamentos em PDF
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="agencyName">Nome da Agência *</Label>
            <Input
              id="agencyName"
              value={agencyName}
              onChange={(e) => setAgencyName(e.target.value)}
              placeholder="Ex: Viagens Premium Ltda"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(11) 99999-9999"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="instagram">Instagram</Label>
              <Input
                id="instagram"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                placeholder="@suaagencia"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="contato@agencia.com.br"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Endereço</Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Rua Exemplo, 123 - São Paulo, SP"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://www.agencia.com.br"
            />
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button onClick={handleSave} disabled={saving || !agencyName}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Salvando..." : "Salvar Configurações"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
