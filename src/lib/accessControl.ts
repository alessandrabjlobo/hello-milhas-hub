/**
 * Verifica se o usuário tem acesso ativo ao sistema
 * Baseado em whitelist de emails ou status de assinatura válido
 */
export function hasActiveAccess(user?: { 
  email?: string; 
  subscription_status?: string;
} | null): boolean {
  if (!user) return false;

  // Verificar whitelist de emails sempre ativos
  const whitelistEnv = import.meta.env.VITE_ALWAYS_ACTIVE_EMAILS || '';
  const whitelist = new Set(
    whitelistEnv
      .toLowerCase()
      .split(',')
      .map(email => email.trim())
      .filter(Boolean)
  );

  if (user.email && whitelist.has(user.email.toLowerCase())) {
    return true;
  }

  // Verificar status de assinatura válido
  const validStatuses = ['active', 'trialing'];
  return user.subscription_status 
    ? validStatuses.includes(user.subscription_status)
    : false;
}
