import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.0.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
});

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Mapeamento de Price ID para Plan (pode ser expandido no futuro)
const getPlanFromPriceId = (priceId: string): 'start' | 'pro' => {
  // Por enquanto, todos os preços são 'pro'
  // Adicione mais lógica aqui se houver múltiplos planos
  return 'pro';
};

// Mapeamento de status Stripe para status do banco
const mapStripeStatus = (stripeStatus: string): string => {
  const statusMap: Record<string, string> = {
    'trialing': 'trialing',
    'active': 'active',
    'past_due': 'past_due',
    'canceled': 'cancelled',
    'unpaid': 'suspended',
    'incomplete': 'grace_period',
    'incomplete_expired': 'cancelled',
  };
  return statusMap[stripeStatus] || 'suspended';
};

// Billing Adapter (inline para edge function)
const billingAdapter = {
  async findUserByEmail(email: string) {
    const { data } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', email)
      .maybeSingle();
    return data;
  },
  
  async createAuthUserIfMissing(email: string): Promise<string> {
    const existing = await this.findUserByEmail(email);
    if (existing) return existing.id;
    
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { full_name: email.split('@')[0] }
    });
    
    if (error) throw error;
    return data.user.id;
  },
  
  async upsertStripeIds(userId: string, stripeData: any) {
    const renewalDate = new Date();
    renewalDate.setDate(renewalDate.getDate() + 30);
    
    const { error } = await supabase
      .from('billing_subscriptions')
      .upsert({
        user_id: userId,
        stripe_customer_id: stripeData.customerId,
        stripe_subscription_id: stripeData.subscriptionId,
        plan: stripeData.plan,
        status: stripeData.status,
        billing_email: stripeData.billingEmail,
        stripe_price_id: stripeData.stripePriceId,
        renewal_date: renewalDate.toISOString(),
      }, {
        onConflict: 'user_id'
      });
    
    if (error) throw error;
  },
  
  async updateStatusByCustomerId(customerId: string, update: any) {
    const { error } = await supabase
      .from('billing_subscriptions')
      .update({
        status: update.status,
        ...(update.plan && { plan: update.plan }),
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_customer_id', customerId);
    
    if (error) throw error;
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const signature = req.headers.get('stripe-signature');
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    if (!signature || !webhookSecret) {
      console.error('Missing signature or webhook secret');
      return new Response('Webhook Error', { status: 400 });
    }

    const body = await req.text();
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    console.log('Processing Stripe event:', event.type);

    // Processar eventos
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const email = session.customer_email || session.customer_details?.email;
        
        if (!email) {
          console.error('No email found in checkout session');
          break;
        }

        console.log('Creating/updating user for email:', email);
        
        // Criar usuário se não existe
        const userId = await billingAdapter.createAuthUserIfMissing(email);
        
        // Buscar detalhes da subscription
        const subscriptionId = session.subscription as string;
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = subscription.items.data[0]?.price.id;
        const plan = getPlanFromPriceId(priceId);
        const status = mapStripeStatus(subscription.status);
        
        // Salvar dados Stripe
        await billingAdapter.upsertStripeIds(userId, {
          customerId: session.customer as string,
          subscriptionId: subscriptionId,
          plan: plan,
          status: status,
          billingEmail: email,
          stripePriceId: priceId,
        });
        
        console.log('User created/updated successfully:', userId);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const priceId = subscription.items.data[0]?.price.id;
        const plan = getPlanFromPriceId(priceId);
        const status = mapStripeStatus(subscription.status);
        
        await billingAdapter.updateStatusByCustomerId(subscription.customer as string, {
          status: status,
          plan: plan,
        });
        
        console.log('Subscription updated:', subscription.id);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        
        await billingAdapter.updateStatusByCustomerId(subscription.customer as string, {
          status: 'cancelled',
        });
        
        console.log('Subscription canceled:', subscription.id);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        
        await billingAdapter.updateStatusByCustomerId(invoice.customer as string, {
          status: 'past_due',
        });
        
        console.log('Payment failed for customer:', invoice.customer);
        break;
      }

      default:
        console.log('Unhandled event type:', event.type);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Webhook error:', err);
    return new Response(`Webhook Error: ${(err as Error).message}`, {
      status: 400,
      headers: corsHeaders,
    });
  }
});
