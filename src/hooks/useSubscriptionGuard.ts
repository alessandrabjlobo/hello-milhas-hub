import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { hasActiveAccess } from '@/lib/accessControl';

export function useSubscriptionGuard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    let isMounted = true;
    
    const runCheck = async () => {
      await checkAccess();
    };
    
    if (isMounted) {
      runCheck();
    }
    
    return () => {
      isMounted = false;
    };
  }, [user, authLoading]);
  
  const checkAccess = async (retryCount = 0) => {
    if (authLoading) return;
    
    if (!user) {
      console.log('[useSubscriptionGuard] No user, redirecting to login');
      navigate('/login');
      setLoading(false);
      return;
    }
    
    try {
      // Buscar dados de assinatura do usuário
      const { data: subscription, error } = await supabase
        .from('billing_subscriptions')
        .select('status')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) {
        console.error('[useSubscriptionGuard] Error checking subscription:', error);
        
        // Retry em caso de erro temporário (max 2 retries)
        if (retryCount < 2) {
          console.log('[useSubscriptionGuard] Retrying... (attempt', retryCount + 1, ')');
          setTimeout(() => checkAccess(retryCount + 1), 1000 * (retryCount + 1));
          return;
        }
      }
      
      // Verificar acesso usando a função centralizada
      const userData = {
        email: user.email,
        subscription_status: subscription?.status
      };
      
      const access = hasActiveAccess(userData);
      
      if (access) {
        console.log('[useSubscriptionGuard] ✅ User has access');
        setHasAccess(true);
      } else {
        // Fallback: buscar whitelist no backend quando ENV público estiver vazio
        try {
          const whitelistEnv = import.meta.env.VITE_ALWAYS_ACTIVE_EMAILS || '';
          const envHasEmails = whitelistEnv.trim().length > 0;
          if (!envHasEmails && user.email) {
            // cache simples para evitar múltiplas chamadas
            let emails: string[] | null = null;
            const cached = sessionStorage.getItem('wl_emails');
            if (cached) {
              try { emails = JSON.parse(cached); } catch { /* ignore */ }
            }
            if (!emails) {
              const { data, error: fnError } = await supabase.functions.invoke('get-whitelist');
              if (!fnError && (data as any)?.whitelist) {
                emails = (data as any).whitelist as string[];
                sessionStorage.setItem('wl_emails', JSON.stringify(emails));
              }
            }
            const inList = emails?.some(e => e.toLowerCase() === user.email!.toLowerCase());
            if (inList) {
              console.log('[useSubscriptionGuard] ✅ User whitelisted via backend');
              setHasAccess(true);
              return;
            }
          }
        } catch (e) {
          console.error('[useSubscriptionGuard] Whitelist fallback error:', e);
        }
        console.log('[useSubscriptionGuard] ❌ User does not have access, redirecting to /assinatura');
        navigate('/assinatura');
      }
    } catch (err) {
      console.error('[useSubscriptionGuard] Unexpected error:', err);
      // Em caso de erro inesperado, redirecionar para assinatura por segurança
      navigate('/assinatura');
    } finally {
      setLoading(false);
    }
  };
  
  return { hasAccess, loading };
}
