# 🎯 Sistema de Assinaturas Stripe

## 1. Configuração Inicial

### 1.1. Secrets Configurados
Os seguintes secrets já foram adicionados no sistema:
- ✅ `STRIPE_PUBLISHABLE_KEY` (chave pública do Stripe)
- ✅ `STRIPE_SECRET_KEY` (chave secreta do Stripe)
- ✅ `STRIPE_WEBHOOK_SECRET` (secret do webhook)
- ✅ `STRIPE_PRICE_ID` (ID do price/plano no Stripe)
- ✅ `VITE_ALWAYS_ACTIVE_EMAILS` (whitelist de e-mails com acesso sempre ativo)

### 1.2. Configurar Webhook no Stripe Dashboard

**IMPORTANTE**: Você precisa configurar o webhook no Stripe para que o sistema funcione corretamente.

1. Acesse o [Stripe Dashboard](https://dashboard.stripe.com/)
2. Vá em **Developers → Webhooks**
3. Clique em **"Add endpoint"**
4. Configure o endpoint:
   - **URL**: `https://esejpxzlijvcvlkkpmci.supabase.co/functions/v1/stripe-webhook`
   - **Descrição**: "Webhook de assinaturas"
   - **Eventos a ouvir**:
     - ✅ `checkout.session.completed`
     - ✅ `customer.subscription.created`
     - ✅ `customer.subscription.updated`
     - ✅ `customer.subscription.deleted`
     - ✅ `invoice.payment_failed`

5. Após criar o webhook, copie o **"Signing secret"** (começa com `whsec_`)
6. **Atualize o secret** `STRIPE_WEBHOOK_SECRET` com esse valor no Lovable

### 1.3. Ativar Customer Portal no Stripe

1. Acesse [Stripe Dashboard → Settings → Billing → Customer Portal](https://dashboard.stripe.com/settings/billing/portal)
2. Clique em **"Activate Customer Portal"**
3. Configure as opções:
   - ✅ **Permitir cancelamento de assinatura**: ON
   - ✅ **Permitir atualização de método de pagamento**: ON
   - ✅ **Permitir troca de plano**: ON (opcional)
4. Customize o **branding** (logo, cores) para combinar com sua marca
5. Salve as alterações

### 1.4. Configurar Trial de 7 dias no Price

**No Stripe Dashboard:**
1. Vá em **Products → Seu produto → Pricing**
2. No seu Price (usado no `STRIPE_PRICE_ID`), configure:
   - **Trial period**: 7 days
   - **Collect payment method during trial**: ON ✅ (IMPORTANTE!)

Isso garante que o cartão seja cadastrado mesmo durante o período de teste.

---

## 2. Fluxo de Usuário

### 2.1. Novo Usuário (Primeiro Acesso)
1. Usuário acessa landing page (`/`)
2. Clica em **"Comece já"**
3. Redireciona para `/assinatura` (página de planos)
4. Escolhe um plano e clica em **"Começar Teste Gratuito"**
5. Redireciona para **Stripe Checkout** (hosted)
6. Preenche dados de cartão (não será cobrado durante trial)
7. Webhook do Stripe recebe `checkout.session.completed`
8. Sistema cria conta automaticamente no banco
9. Usuário é redirecionado para `/conta`
10. Acessa o app via **"Ir para o app"**

### 2.2. Usuário Existente (Retornando)
1. Usuário acessa landing page (`/`)
2. Clica em **"Já tenho conta (Login)"**
3. Faz login em `/login`
4. Sistema verifica status de assinatura
5. Se `status === 'trialing' ou 'active'`: acessa `/dashboard`
6. Se não: redireciona para `/assinatura`

### 2.3. Whitelist (Bypass de Assinatura)
E-mails configurados em `VITE_ALWAYS_ACTIVE_EMAILS` têm acesso liberado independente de assinatura Stripe.

**Exemplo de configuração:**
```
VITE_ALWAYS_ACTIVE_EMAILS=admin@exemplo.com,suporte@exemplo.com,fvs.lobo@gmail.com
```

---

## 3. Estrutura de Dados

### 3.1. Tabela `billing_subscriptions`

Campos Stripe adicionados:
```sql
- stripe_customer_id: TEXT (ID do cliente no Stripe, ex: cus_xxx)
- stripe_subscription_id: TEXT (ID da assinatura, ex: sub_xxx)
- billing_email: TEXT (e-mail usado no checkout)
- stripe_price_id: TEXT (ID do price/plano)
```

Campos existentes mantidos:
```sql
- user_id: UUID (FK para auth.users)
- plan: 'start' | 'pro'
- status: 'trialing' | 'active' | 'past_due' | 'cancelled' | 'grace_period' | 'suspended'
- renewal_date: TIMESTAMP
```

### 3.2. Mapeamento de Status Stripe → App

| Status Stripe        | Status App      | Acesso Liberado? |
|---------------------|-----------------|------------------|
| `trialing`          | `trialing`      | ✅ Sim           |
| `active`            | `active`        | ✅ Sim           |
| `past_due`          | `past_due`      | ❌ Não           |
| `canceled`          | `cancelled`     | ❌ Não           |
| `unpaid`            | `suspended`     | ❌ Não           |
| `incomplete`        | `grace_period`  | ❌ Não           |
| `incomplete_expired`| `cancelled`     | ❌ Não           |

---

## 4. Edge Functions Criadas

### 4.1. `stripe-webhook` (Público)
- **URL**: `https://esejpxzlijvcvlkkpmci.supabase.co/functions/v1/stripe-webhook`
- **Autenticação**: Webhook signature (Stripe)
- **Função**: Receber eventos do Stripe e sincronizar com banco

**Eventos processados:**
- `checkout.session.completed`: Criar usuário e assinatura
- `customer.subscription.created/updated`: Atualizar status
- `customer.subscription.deleted`: Marcar como cancelado
- `invoice.payment_failed`: Marcar como past_due

### 4.2. `stripe-checkout` (Autenticada)
- **URL**: `https://esejpxzlijvcvlkkpmci.supabase.co/functions/v1/stripe-checkout`
- **Autenticação**: Bearer token (Supabase)
- **Função**: Criar sessão de checkout

**Body esperado:**
```json
{
  "email": "usuario@exemplo.com"
}
```

**Resposta:**
```json
{
  "url": "https://checkout.stripe.com/c/pay/cs_xxx"
}
```

### 4.3. `stripe-portal` (Autenticada)
- **URL**: `https://esejpxzlijvcvlkkpmci.supabase.co/functions/v1/stripe-portal`
- **Autenticação**: Bearer token (Supabase)
- **Função**: Criar sessão do Customer Portal

**Resposta:**
```json
{
  "url": "https://billing.stripe.com/p/session/xxx"
}
```

---

## 5. Páginas Criadas

### 5.1. `/login` (Login)
- Formulário de login (e-mail + senha)
- Link "Esqueci minha senha"
- Texto auxiliar indicando como criar conta via trial

### 5.2. `/assinatura` (Escolha de Plano)
- Cards com planos Start e Pro
- Badge "Mais Popular"
- Botão "Começar Teste Gratuito"
- FAQ sobre trial e troca de planos

### 5.3. `/conta` (Gerenciamento)
- Status da assinatura (badge colorido)
- Detalhes do plano atual
- E-mail de cobrança
- Data de renovação/fim do trial
- Botão "Gerenciar Cobrança" → abre Customer Portal
- Botão "Ir para o App" (se status válido)

---

## 6. Proteção de Rotas

### 6.1. Lógica do `useSubscriptionGuard`

```typescript
1. Verificar se usuário está autenticado
   └─ Se NÃO: redirecionar para /login

2. Verificar se e-mail está na whitelist (VITE_ALWAYS_ACTIVE_EMAILS)
   └─ Se SIM: liberar acesso (bypass)

3. Verificar status de assinatura no banco
   └─ Se status ∈ ['trialing', 'active']: liberar acesso
   └─ Se NÃO: redirecionar para /assinatura
```

### 6.2. Rotas Protegidas

Todas as rotas internas do app estão protegidas pelo `<ProtectedRoute>`:
- `/dashboard`
- `/sales/*`
- `/accounts/*`
- `/tickets`
- `/reports`
- `/calculator`
- `/settings/*`
- etc.

### 6.3. Rotas Públicas (Sem Proteção)

- `/` (landing page)
- `/login`
- `/assinatura`
- `/conta`
- `/auth` (compatibilidade)
- `/legal/terms`
- `/legal/privacy`

---

## 7. Desenvolvimento vs Produção

### 7.1. Ambiente de Teste (Development)

**Stripe Test Mode:**
- Use chaves `pk_test_` e `sk_test_`
- Cartões de teste: https://stripe.com/docs/testing
  - Sucesso: `4242 4242 4242 4242`
  - Falha: `4000 0000 0000 0002`
- Webhook local com Stripe CLI:
  ```bash
  stripe listen --forward-to http://localhost:54321/functions/v1/stripe-webhook
  ```

### 7.2. Ambiente de Produção (Live)

**Stripe Live Mode:**
1. Troque as secrets para chaves `pk_live_` e `sk_live_`
2. Configure webhook público no Stripe Dashboard
3. Ative Customer Portal em modo live
4. Teste com cartão real (ou use valor mínimo)

---

## 8. Troubleshooting

### 8.1. Webhook não dispara
**Sintomas**: Usuário completa checkout mas conta não é criada

**Soluções:**
1. Verifique se `STRIPE_WEBHOOK_SECRET` está correto
2. Teste webhook manualmente no Stripe Dashboard:
   - Vá em **Developers → Webhooks → Seu endpoint**
   - Clique em **"Send test webhook"**
   - Escolha evento `checkout.session.completed`
3. Veja logs da edge function:
   - Acesse Lovable Cloud → Edge Functions → stripe-webhook → Logs

### 8.2. Usuário não consegue acessar app
**Sintomas**: Login funciona mas redireciona para `/assinatura`

**Soluções:**
1. Verifique status da assinatura:
   ```sql
   SELECT * FROM billing_subscriptions WHERE user_id = 'uuid-do-usuario';
   ```
2. Verifique se e-mail está na whitelist (`VITE_ALWAYS_ACTIVE_EMAILS`)
3. Veja console do navegador para logs do `useSubscriptionGuard`

### 8.3. Trial não aparece ou cobra imediatamente
**Sintomas**: Usuário é cobrado antes dos 7 dias

**Soluções:**
1. Verifique configuração do Price no Stripe:
   - Trial period: 7 days ✅
   - Collect payment method during trial: ON ✅
2. Verifique se `trial_period_days: 7` está no checkout session (edge function)

### 8.4. Customer Portal não abre
**Sintomas**: Botão "Gerenciar Cobrança" não funciona

**Soluções:**
1. Verifique se Customer Portal está ativado no Stripe Dashboard
2. Veja logs da edge function `stripe-portal`
3. Confirme que `stripe_customer_id` existe no banco:
   ```sql
   SELECT stripe_customer_id FROM billing_subscriptions WHERE user_id = 'uuid';
   ```

---

## 9. Checklist de Go-Live

Antes de ativar o sistema em produção:

- [ ] Webhook configurado no Stripe com URL correta
- [ ] Secret `STRIPE_WEBHOOK_SECRET` atualizado com signing secret
- [ ] Customer Portal ativado no Stripe
- [ ] Trial de 7 dias configurado no Price
- [ ] Collect payment method during trial: ON
- [ ] Chaves de produção (`pk_live_`, `sk_live_`) configuradas
- [ ] Whitelist `VITE_ALWAYS_ACTIVE_EMAILS` configurada
- [ ] Testado fluxo completo de checkout
- [ ] Testado fluxo de login e acesso protegido
- [ ] Testado Customer Portal
- [ ] Branding do Stripe configurado (logo, cores)

---

## 10. Suporte e Documentação

### Links Úteis
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Stripe Checkout](https://stripe.com/docs/payments/checkout)
- [Stripe Customer Portal](https://stripe.com/docs/billing/subscriptions/customer-portal)
- [Stripe Testing](https://stripe.com/docs/testing)

### Logs e Debugging
- **Edge Functions**: Lovable Cloud → Edge Functions → [nome da função] → Logs
- **Webhooks Stripe**: Stripe Dashboard → Developers → Webhooks → [seu endpoint] → Events
- **Console Browser**: F12 → Console (veja logs do `useSubscriptionGuard`)

---

## 11. Migração do Sistema Antigo (PIX)

O sistema anterior de pagamento PIX (`/settings/billing`) foi mantido para compatibilidade, mas recomenda-se:

1. **Avisar usuários existentes** sobre a mudança via e-mail/banner
2. **Período de transição**: permitir ambos os sistemas por 30 dias
3. **Migração de dados**: manter `pix_instructions` e `receipt_url` no banco para histórico
4. **Desativação gradual**: desativar upload PIX após data definida

---

**Sistema implementado com sucesso! 🎉**

Para dúvidas ou problemas, consulte os logs das edge functions e o troubleshooting acima.
