import { lazy } from 'react';

// Lazy loading das páginas
export const Dashboard = lazy(() => import('../pages/Dashboard'));
export const Transacoes = lazy(() => import('../pages/Transacoes'));
export const Relatorios = lazy(() => import('../pages/Relatorios'));
export const Objetivos = lazy(() => import('../pages/Objetivos'));
export const Familia = lazy(() => import('../pages/Familia'));
export const Analises = lazy(() => import('../pages/Analises'));
export const ContasPage = lazy(() => import('../pages/Contas'));
export const OrcamentosPage = lazy(() => import('../pages/Orcamentos')); 