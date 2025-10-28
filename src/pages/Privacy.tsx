import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

export default function Privacy() {
  const navigate = useNavigate();

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-3xl font-bold">Política de Privacidade</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>1. Coleta de Informações</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none">
          <p>
            Coletamos informações necessárias para o funcionamento do sistema, incluindo:
          </p>
          <ul>
            <li>Dados de cadastro (nome, email, telefone)</li>
            <li>Informações de contas de milhagem</li>
            <li>Dados de fornecedores e transações</li>
            <li>Registros de auditoria e uso do sistema</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2. Uso das Informações</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none">
          <p>
            As informações coletadas são usadas para:
          </p>
          <ul>
            <li>Fornecer e melhorar nossos serviços</li>
            <li>Processar transações e gerenciar contas</li>
            <li>Enviar notificações importantes</li>
            <li>Garantir a segurança e integridade do sistema</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>3. Proteção de Dados</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none">
          <p>
            Implementamos medidas de segurança para proteger suas informações:
          </p>
          <ul>
            <li>Criptografia de dados sensíveis (senhas, CPFs)</li>
            <li>Controle de acesso baseado em roles</li>
            <li>Auditoria completa de todas as operações</li>
            <li>Backups regulares e seguros</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>4. Compartilhamento de Dados</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none">
          <p>
            Não compartilhamos seus dados pessoais com terceiros, exceto:
          </p>
          <ul>
            <li>Quando exigido por lei</li>
            <li>Com seu consentimento explícito</li>
            <li>Para processamento de pagamentos (dados mínimos necessários)</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>5. Seus Direitos</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none">
          <p>
            Você tem direito a:
          </p>
          <ul>
            <li>Acessar seus dados pessoais</li>
            <li>Solicitar correção de dados incorretos</li>
            <li>Solicitar exclusão de seus dados</li>
            <li>Exportar seus dados em formato legível</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>6. Cookies e Rastreamento</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none">
          <p>
            Usamos cookies essenciais para autenticação e funcionamento do sistema. Não usamos cookies de rastreamento ou publicidade.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>7. Atualizações desta Política</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none">
          <p>
            Esta política pode ser atualizada periodicamente. Notificaremos você sobre mudanças significativas por email ou através do sistema.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>8. Contato</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none">
          <p>
            Para questões relacionadas à privacidade e proteção de dados, entre em contato através do suporte.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
