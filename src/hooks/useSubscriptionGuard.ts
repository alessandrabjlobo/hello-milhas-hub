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
  
  const checkAccess = async () => {
    if (authLoading) return;
    
    if (!user) {
      navigate('/login');
      setLoading(false);
      return;
    }
    
    // Buscar dados de assinatura do usuário
    const { data: subscription, error } = await supabase
      .from('billing_subscriptions')
      .select('status')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (error) {
      console.error('Error checking subscription:', error);
    }
    
    // Verificar acesso usando a função centralizada
    const userData = {
      email: user.email,
      subscription_status: subscription?.status
    };
    
    const access = hasActiveAccess(userData);
    
    if (access) {
      console.log('User has access:', userData);
      setHasAccess(true);
    } else {
      console.log('User does not have access, redirecting to /assinatura');
      navigate('/assinatura');
    }
    
    setLoading(false);
  };
  
  return { hasAccess, loading };
}
