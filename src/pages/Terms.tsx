import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

export default function Terms() {
  const navigate = useNavigate();

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-3xl font-bold">Termos de Uso</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>1. Aceitação dos Termos</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none">
          <p>
            Ao acessar e usar este sistema, você concorda em cumprir e estar vinculado aos seguintes termos e condições de uso.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2. Uso do Sistema</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none">
          <p>
            O sistema é destinado exclusivamente para gestão de contas de milhagem e vendas relacionadas. O usuário é responsável por manter suas credenciais de acesso seguras.
          </p>
          <ul>
            <li>Não compartilhe suas credenciais de acesso</li>
            <li>Use o sistema apenas para fins legítimos</li>
            <li>Mantenha seus dados atualizados</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>3. Privacidade e Dados</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none">
          <p>
            Seus dados são armazenados de forma segura e não serão compartilhados com terceiros sem seu consentimento. Consulte nossa Política de Privacidade para mais detalhes.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>4. Responsabilidades</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none">
          <p>
            O usuário é responsável por todas as atividades realizadas em sua conta. O sistema não se responsabiliza por perdas ou danos decorrentes de uso indevido.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>5. Modificações</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none">
          <p>
            Reservamo-nos o direito de modificar estes termos a qualquer momento. As alterações entrarão em vigor imediatamente após sua publicação.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>6. Contato</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none">
          <p>
            Para questões relacionadas a estes termos, entre em contato através do suporte.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
