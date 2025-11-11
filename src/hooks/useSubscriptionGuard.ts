import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

export function useSubscriptionGuard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    checkAccess();
  }, [user, authLoading]);
  
  const checkAccess = async () => {
    if (authLoading) return;
    
    if (!user) {
      navigate('/login');
      setLoading(false);
      return;
    }
    
    // 1. Verificar whitelist via VITE env (fallback)
    const whitelistEnv = import.meta.env.VITE_ALWAYS_ACTIVE_EMAILS || '';
    const whitelist = whitelistEnv.split(',').map((e: string) => e.trim().toLowerCase()).filter(Boolean);
    
    if (whitelist.length > 0 && whitelist.includes(user.email?.toLowerCase() || '')) {
      console.log('User in whitelist (env), granting access');
      setHasAccess(true);
      setLoading(false);
      return;
    }
    
    // 2. Verificar status de assinatura
    const { data: subscription, error } = await supabase
      .from('billing_subscriptions')
      .select('status')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (error) {
      console.error('Error checking subscription:', error);
    }
    
    const validStatuses = ['trialing', 'active'];
    const hasValidSubscription = subscription && validStatuses.includes(subscription.status);
    
    if (hasValidSubscription) {
      console.log('User has valid subscription:', subscription.status);
      setHasAccess(true);
    } else {
      console.log('User does not have valid subscription, redirecting to /assinatura');
      navigate('/assinatura');
    }
    
    setLoading(false);
  };
  
  return { hasAccess, loading };
}
