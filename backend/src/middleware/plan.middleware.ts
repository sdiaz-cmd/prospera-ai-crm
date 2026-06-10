import { Request, Response, NextFunction } from 'express';
import { get } from '../database/db';
import { getPlan, PlanConfig } from '../config/plans';

type FeatureKey = keyof PlanConfig['features'];

export function requireFeature(feature: FeatureKey) {
  return (req: Request, res: Response, next: NextFunction) => {
    const companyId = req.user?.companyId;
    if (!companyId) { res.status(401).json({ message: 'No autenticado' }); return; }

    const company = get<{ plan: string }>('SELECT plan FROM companies WHERE id = ?', [companyId]);
    const planConfig = getPlan(company?.plan || 'trial');

    if (!planConfig.features[feature]) {
      res.status(403).json({
        error: 'plan_limit',
        message: `Esta función no está disponible en tu plan actual. Actualiza para acceder.`,
        feature,
        currentPlan: company?.plan || 'trial',
      });
      return;
    }
    next();
  };
}
