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
    checkAccess();
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
