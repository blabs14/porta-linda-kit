import { useState, useEffect, useCallback } from 'react';
import { configSyncService, type SyncEvent } from '../services/configSyncService';
import type { ValidationResult } from '../utils/configValidation';

export interface PayrollNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  component?: string;
  timestamp: Date;
  duration?: number; // Auto-dismiss after milliseconds
  persistent?: boolean; // Don't auto-dismiss
  actions?: NotificationAction[];
}

export interface NotificationAction {
  label: string;
  action: () => void;
  variant?: 'primary' | 'secondary' | 'destructive';
}

export interface LoadingState {
  component: string;
  operation: string;
  progress?: number;
  message?: string;
}

export interface PayrollNotificationState {
  notifications: PayrollNotification[];
  loadingStates: LoadingState[];
  syncStatus: {
    inProgress: boolean;
    lastSync: Date | null;
    queueLength: number;
  };
}

let notificationIdCounter = 0;

function generateNotificationId(): string {
  return `notification_${++notificationIdCounter}_${Date.now()}`;
}

export function usePayrollNotifications() {
  const [state, setState] = useState<PayrollNotificationState>({
    notifications: [],
    loadingStates: [],
    syncStatus: {
      inProgress: false,
      lastSync: null,
      queueLength: 0,
    },
  });

  // Add notification
  const addNotification = useCallback((notification: Omit<PayrollNotification, 'id' | 'timestamp'>) => {
    const newNotification: PayrollNotification = {
      ...notification,
      id: generateNotificationId(),
      timestamp: new Date(),
    };

    setState(prev => ({
      ...prev,
      notifications: [...prev.notifications, newNotification],
    }));

    // Auto-dismiss if duration is specified and not persistent
    if (newNotification.duration && !newNotification.persistent) {
      setTimeout(() => {
        removeNotification(newNotification.id);
      }, newNotification.duration);
    }

    return newNotification.id;
  }, []);

  // Remove notification
  const removeNotification = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      notifications: prev.notifications.filter(n => n.id !== id),
    }));
  }, []);

  // Clear all notifications
  const clearNotifications = useCallback(() => {
    setState(prev => ({
      ...prev,
      notifications: [],
    }));
  }, []);

  // Clear notifications by type
  const clearNotificationsByType = useCallback((type: PayrollNotification['type']) => {
    setState(prev => ({
      ...prev,
      notifications: prev.notifications.filter(n => n.type !== type),
    }));
  }, []);

  // Clear notifications by component
  const clearNotificationsByComponent = useCallback((component: string) => {
    setState(prev => ({
      ...prev,
      notifications: prev.notifications.filter(n => n.component !== component),
    }));
  }, []);

  // Add loading state
  const addLoadingState = useCallback((loadingState: LoadingState) => {
    setState(prev => {
      // Remove existing loading state for same component and operation
      const filteredStates = prev.loadingStates.filter(
        s => !(s.component === loadingState.component && s.operation === loadingState.operation)
      );
      
      return {
        ...prev,
        loadingStates: [...filteredStates, loadingState],
      };
    });
  }, []);

  // Remove loading state
  const removeLoadingState = useCallback((component: string, operation: string) => {
    setState(prev => ({
      ...prev,
      loadingStates: prev.loadingStates.filter(
        s => !(s.component === component && s.operation === operation)
      ),
    }));
  }, []);

  // Clear all loading states
  const clearLoadingStates = useCallback(() => {
    setState(prev => ({
      ...prev,
      loadingStates: [],
    }));
  }, []);

  // Check if component is loading
  const isComponentLoading = useCallback((component: string, operation?: string) => {
    return state.loadingStates.some(
      s => s.component === component && (operation ? s.operation === operation : true)
    );
  }, [state.loadingStates]);

  // Get loading state for component
  const getLoadingState = useCallback((component: string, operation?: string) => {
    return state.loadingStates.find(
      s => s.component === component && (operation ? s.operation === operation : true)
    );
  }, [state.loadingStates]);

  // Notification helpers for common scenarios
  const notifySuccess = useCallback((message: string, component?: string, duration = 5000) => {
    return addNotification({
      type: 'success',
      title: 'Sucesso',
      message,
      component,
      duration,
    });
  }, [addNotification]);

  const notifyError = useCallback((message: string, component?: string, persistent = true) => {
    return addNotification({
      type: 'error',
      title: 'Erro',
      message,
      component,
      persistent,
    });
  }, [addNotification]);

  const notifyWarning = useCallback((message: string, component?: string, duration = 8000) => {
    return addNotification({
      type: 'warning',
      title: 'Aviso',
      message,
      component,
      duration,
    });
  }, [addNotification]);

  const notifyInfo = useCallback((message: string, component?: string, duration = 6000) => {
    return addNotification({
      type: 'info',
      title: 'Informação',
      message,
      component,
      duration,
    });
  }, [addNotification]);

  // Validation result notifications
  const notifyValidationResult = useCallback((result: ValidationResult, component?: string) => {
    // Clear previous validation notifications for this component
    if (component) {
      clearNotificationsByComponent(component);
    }

    // Add error notifications
    result.errors.forEach(error => {
      addNotification({
        type: 'error',
        title: 'Erro de Validação',
        message: error.message,
        component: error.component,
        persistent: true,
      });
    });

    // Add warning notifications
    result.warnings.forEach(warning => {
      addNotification({
        type: 'warning',
        title: 'Aviso de Validação',
        message: warning.message,
        component: warning.component,
        duration: 10000,
      });
    });

    // Add success notification if no errors
    if (result.isValid && result.warnings.length === 0) {
      notifySuccess('Configuração validada com sucesso', component);
    }
  }, [addNotification, clearNotificationsByComponent, notifySuccess]);

  // Sync event notifications
  const handleSyncEvent = useCallback((event: SyncEvent) => {
    switch (event.type) {
      case 'sync_started':
        addLoadingState({
          component: 'sync',
          operation: 'synchronization',
          message: 'Sincronizando configurações...',
        });
        break;

      case 'sync_completed':
        removeLoadingState('sync', 'synchronization');
        
        if (event.data?.success) {
          const updatedComponents = event.data.updatedComponents || [];
          if (updatedComponents.length > 0) {
            notifySuccess(
              `Sincronização concluída. Componentes atualizados: ${updatedComponents.join(', ')}`,
              'sync'
            );
          } else {
            notifyInfo('Sincronização concluída. Nenhuma alteração necessária.', 'sync');
          }

          // Show warnings if any
          if (event.data.warnings?.length > 0) {
            event.data.warnings.forEach((warning: string) => {
              notifyWarning(warning, 'sync');
            });
          }
        }
        break;

      case 'sync_failed':
        removeLoadingState('sync', 'synchronization');
        notifyError(
          `Falha na sincronização: ${event.data?.error || 'Erro desconhecido'}`,
          'sync'
        );
        break;

      case 'component_updated':
        if (event.component) {
          notifyInfo(
            `Componente ${event.component} atualizado automaticamente`,
            event.component,
            4000
          );
        }
        break;
    }
  }, [addLoadingState, removeLoadingState, notifySuccess, notifyInfo, notifyWarning, notifyError]);

  // Update sync status
  const updateSyncStatus = useCallback(() => {
    setState(prev => ({
      ...prev,
      syncStatus: {
        inProgress: configSyncService.isSyncInProgress(),
        lastSync: configSyncService.getLastSyncTimestamp(),
        queueLength: configSyncService.getQueueLength(),
      },
    }));
  }, []);

  // Subscribe to sync events
  useEffect(() => {
    const unsubscribe = configSyncService.subscribe(handleSyncEvent);
    
    // Update sync status periodically
    const interval = setInterval(updateSyncStatus, 1000);
    
    // Initial sync status update
    updateSyncStatus();

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [handleSyncEvent, updateSyncStatus]);

  // Auto-cleanup old notifications
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = new Date();
      setState(prev => ({
        ...prev,
        notifications: prev.notifications.filter(notification => {
          // Keep persistent notifications
          if (notification.persistent) return true;
          
          // Keep notifications with duration that haven't expired
          if (notification.duration) {
            const age = now.getTime() - notification.timestamp.getTime();
            return age < notification.duration;
          }
          
          // Remove notifications older than 30 seconds without duration
          const age = now.getTime() - notification.timestamp.getTime();
          return age < 30000;
        }),
      }));
    }, 5000); // Check every 5 seconds

    return () => clearInterval(cleanup);
  }, []);

  return {
    // State
    notifications: state.notifications,
    loadingStates: state.loadingStates,
    syncStatus: state.syncStatus,
    
    // Notification management
    addNotification,
    removeNotification,
    clearNotifications,
    clearNotificationsByType,
    clearNotificationsByComponent,
    
    // Loading state management
    addLoadingState,
    removeLoadingState,
    clearLoadingStates,
    isComponentLoading,
    getLoadingState,
    
    // Convenience methods
    notifySuccess,
    notifyError,
    notifyWarning,
    notifyInfo,
    notifyValidationResult,
    
    // Sync status
    updateSyncStatus,
  };
}

// Hook for component-specific notifications
export function useComponentNotifications(component: string) {
  const notifications = usePayrollNotifications();
  
  return {
    // Filter notifications for this component
    notifications: notifications.notifications.filter(n => n.component === component),
    
    // Component-specific loading state
    isLoading: (operation?: string) => notifications.isComponentLoading(component, operation),
    getLoadingState: (operation?: string) => notifications.getLoadingState(component, operation),
    
    // Component-specific notification methods
    notifySuccess: (message: string, duration?: number) => 
      notifications.notifySuccess(message, component, duration),
    notifyError: (message: string, persistent?: boolean) => 
      notifications.notifyError(message, component, persistent),
    notifyWarning: (message: string, duration?: number) => 
      notifications.notifyWarning(message, component, duration),
    notifyInfo: (message: string, duration?: number) => 
      notifications.notifyInfo(message, component, duration),
    
    // Component-specific loading methods
    addLoadingState: (operation: string, message?: string, progress?: number) => 
      notifications.addLoadingState({ component, operation, message, progress }),
    removeLoadingState: (operation: string) => 
      notifications.removeLoadingState(component, operation),
    
    // Clear component notifications
    clearNotifications: () => notifications.clearNotificationsByComponent(component),
    
    // Validation notifications
    notifyValidationResult: (result: ValidationResult) => 
      notifications.notifyValidationResult(result, component),
  };
}

export default usePayrollNotifications;