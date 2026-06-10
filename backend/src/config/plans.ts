export type PlanName = 'trial' | 'starter' | 'growth' | 'enterprise';

export interface PlanConfig {
  maxUsers: number;
  features: {
    crm: boolean;
    erp: boolean;
    marketing: boolean;
    landing: boolean;
    ai: boolean;
    reports: boolean;
  };
}

export const PLANS: Record<PlanName, PlanConfig> = {
  trial: {
    maxUsers: 5,
    features: { crm: true, erp: false, marketing: false, landing: false, ai: false, reports: true },
  },
  starter: {
    maxUsers: 5,
    features: { crm: true, erp: false, marketing: false, landing: false, ai: false, reports: true },
  },
  growth: {
    maxUsers: 15,
    features: { crm: true, erp: true, marketing: true, landing: true, ai: false, reports: true },
  },
  enterprise: {
    maxUsers: Infinity,
    features: { crm: true, erp: true, marketing: true, landing: true, ai: true, reports: true },
  },
};

export function getPlan(plan: string): PlanConfig {
  return PLANS[plan as PlanName] ?? PLANS.trial;
}
