/**
 * Verifica se o usuário tem acesso ativo ao sistema
 * Baseado em whitelist de emails ou status de assinatura válido
 */
export function hasActiveAccess(user?: { 
  email?: string; 
  subscription_status?: string;
} | null): boolean {
  console.log('[hasActiveAccess] Checking access for user:', {
    email: user?.email,
    subscription_status: user?.subscription_status
  });
  
  if (!user) {
    console.log('[hasActiveAccess] No user provided');
    return false;
  }

  // Verificar whitelist de emails sempre ativos
  const whitelistEnv = import.meta.env.VITE_ALWAYS_ACTIVE_EMAILS || '';
  console.log('[hasActiveAccess] Whitelist env:', whitelistEnv);
  
  const whitelist = new Set(
    whitelistEnv
      .toLowerCase()
      .split(',')
      .map(email => email.trim())
      .filter(Boolean)
  );
  
  console.log('[hasActiveAccess] Parsed whitelist:', Array.from(whitelist));

  if (user.email && whitelist.has(user.email.toLowerCase())) {
    console.log('[hasActiveAccess] ✅ Email found in whitelist');
    return true;
  }

  // Verificar status de assinatura válido
  const validStatuses = ['active', 'trialing'];
  const hasValidStatus = user.subscription_status 
    ? validStatuses.includes(user.subscription_status)
    : false;
  
  console.log('[hasActiveAccess] Valid status check:', hasValidStatus);
  return hasValidStatus;
}
