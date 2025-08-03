import { lazy } from 'react';

// Lazy loading das páginas
export const Dashboard = lazy(() => import('../pages/Dashboard'));

export const Family = lazy(() => import('../pages/Family')); 