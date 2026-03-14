import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PLAN_LABELS } from '@/lib/plans';

export type PlanType = 'trial' | 'basic' | 'pro' | 'enterprise';
export type SubscriptionStatus = 'active' | 'trial' | 'expired' | 'blocked' | 'suspended' | 'cancelled';

export interface Subscription {
  id: string;
  user_id: string;
  plan: PlanType;
  status: SubscriptionStatus;
  trial_start_date: string;
  trial_end_date: string | null;
  plan_started_at: string | null;
  plan_expires_at: string | null;
  blocked_at: string | null;
  blocked_reason: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  created_at: string;
  updated_at: string;
}

export const useSubscription = () => {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  const checkStripeSubscription = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('check-subscription');
      if (!error && data?.subscribed) {
        // Stripe has an active subscription, reload local data
        await loadSubscriptionLocal();
      }
    } catch {
      // Silently fail — Stripe check is supplementary
    }
  }, []);

  const loadSubscriptionLocal = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (error) {
        console.error('Error loading subscription:', error);
        setLoading(false);
        return;
      }

      setSubscription(data as Subscription | null);
    } catch (error) {
      console.error('Error in loadSubscription:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSubscription = useCallback(async () => {
    await loadSubscriptionLocal();
    // Also check Stripe in background
    checkStripeSubscription();
  }, [loadSubscriptionLocal, checkStripeSubscription]);

  useEffect(() => {
    loadSubscription();
  }, [loadSubscription]);

  // Periodic check every 60s
  useEffect(() => {
    const interval = setInterval(checkStripeSubscription, 60000);
    return () => clearInterval(interval);
  }, [checkStripeSubscription]);

  const isTrial = subscription?.status === 'trial';
  
  // Check if trial has expired by date even if status hasn't been updated yet
  const isTrialExpiredByDate = (() => {
    if (!isTrial || !subscription?.trial_end_date) return false;
    return new Date(subscription.trial_end_date).getTime() < Date.now();
  })();

  // Check if paid plan has expired by date
  const isPlanExpiredByDate = (() => {
    if (!subscription?.plan_expires_at || subscription.status !== 'active') return false;
    return new Date(subscription.plan_expires_at).getTime() < Date.now();
  })();

  const isActive = (subscription?.status === 'active' && !isPlanExpiredByDate) || 
                   (subscription?.status === 'trial' && !isTrialExpiredByDate);
  const isExpired = subscription?.status === 'expired' || isTrialExpiredByDate || isPlanExpiredByDate;
  const isBlocked = subscription?.status === 'blocked' || subscription?.status === 'suspended' || subscription?.status === 'cancelled';
  
  const trialDaysRemaining = (() => {
    if (!subscription?.trial_end_date || !isTrial || isTrialExpiredByDate) return 0;
    const now = new Date();
    const end = new Date(subscription.trial_end_date);
    const diffMs = end.getTime() - now.getTime();
    if (diffMs <= 0) return 0;
    let businessDays = 0;
    const current = new Date(now);
    current.setHours(0, 0, 0, 0);
    const endDate = new Date(end);
    endDate.setHours(0, 0, 0, 0);
    while (current <= endDate) {
      const day = current.getDay();
      if (day !== 0 && day !== 6) businessDays++;
      current.setDate(current.getDate() + 1);
    }
    return Math.max(0, businessDays);
  })();

  const isTrialExpiring = isTrial && !isTrialExpiredByDate && trialDaysRemaining <= 2;
  const canWrite = isActive;

  return {
    subscription,
    loading,
    isActive,
    isTrial,
    isExpired,
    isBlocked,
    trialDaysRemaining,
    isTrialExpiring,
    canWrite,
    planLabel: subscription ? (PLAN_LABELS[subscription.plan] || 'Trial') : 'Trial',
    refresh: loadSubscription,
  };
};
