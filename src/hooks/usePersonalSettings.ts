import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './use-toast';
import {
  getPersonalSettings,
  updatePersonalSettings,
  updateProfileData,
  updateTheme,
  updateNotificationSettings,
  getFullProfile,
  createInitialProfile,
  PersonalSettings,
  ProfileData
} from '../services/personalSettings';
import { logger } from '../shared/lib/logger';

export const usePersonalSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query para obter configurações pessoais
  const {
    data: settings,
    isLoading: isLoadingSettings,
    error: settingsError,
    refetch: refetchSettings
  } = useQuery({
    queryKey: ['personalSettings', user?.id],
    queryFn: () => getPersonalSettings(user?.id ?? ''),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
  });

  // Query para obter perfil completo
  const {
    data: profile,
    isLoading: isLoadingProfile,
    error: profileError,
    refetch: refetchProfile
  } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => getFullProfile(user?.id ?? ''),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Mutation para atualizar configurações
  const updateSettingsMutation = useMutation({
    mutationFn: ({ settings }: { settings: Partial<PersonalSettings> }) =>
      updatePersonalSettings(user?.id ?? '', settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personalSettings', user?.id] });
      toast({
        title: "Configurações atualizadas",
        description: "As suas configurações foram salvas com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Não foi possível salvar as configurações.",
        variant: "destructive",
      });
      logger.error('Erro ao atualizar configurações:', error);
    },
  });

  // Mutation para atualizar perfil
  const updateProfileMutation = useMutation({
    mutationFn: ({ profileData }: { profileData: ProfileData }) =>
      updateProfileData(user?.id ?? '', profileData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['personalSettings', user?.id] });
      toast({
        title: "Perfil atualizado",
        description: "As suas informações foram atualizadas com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o perfil.",
        variant: "destructive",
      });
      logger.error('Erro ao atualizar perfil:', error);
    },
  });

  // Mutation para atualizar tema
  const updateThemeMutation = useMutation({
    mutationFn: ({ theme }: { theme: 'light' | 'dark' | 'system' }) =>
      updateTheme(user?.id ?? '', theme),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['personalSettings', user?.id] });
      toast({
        title: "Tema alterado",
        description: `Tema alterado para ${variables.theme === 'system' ? 'sistema' : variables.theme === 'dark' ? 'escuro' : 'claro'}.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Não foi possível alterar o tema.",
        variant: "destructive",
      });
      logger.error('Erro ao alterar tema:', error);
    },
  });

  // Mutation para atualizar notificações
  const updateNotificationsMutation = useMutation({
    mutationFn: ({ notifications }: { notifications: PersonalSettings['notifications'] }) =>
      updateNotificationSettings(user?.id ?? '', notifications),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personalSettings', user?.id] });
      toast({
        title: "Notificações configuradas",
        description: "As suas configurações de notificações foram salvas.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Não foi possível salvar as configurações de notificações.",
        variant: "destructive",
      });
      logger.error('Erro ao atualizar notificações:', error);
    },
  });

  // Mutation dedicada para local_reminders (evita enviar restantes campos)
  const updateLocalRemindersMutation = useMutation({
    mutationFn: ({ enabled }: { enabled: boolean }) => {
      const current = (settings as any)?.data?.personal_settings ?? {};
      const next: Partial<PersonalSettings> = {
        ...(current || {}),
        notifications: {
          ...(current?.notifications || {}),
          local_reminders: enabled,
        } as any,
      };
      return updatePersonalSettings(user?.id ?? '', next);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personalSettings', user?.id] });
    },
  });

  // Mutation para criar perfil inicial
  const createProfileMutation = useMutation({
    mutationFn: ({ email }: { email: string }) =>
      createInitialProfile(user?.id ?? '', email),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['personalSettings', user?.id] });
    },
    onError: (error) => {
      logger.error('Erro ao criar perfil inicial:', error);
    },
  });

  // Funções de conveniência
  const updateSettings = useCallback((newSettings: Partial<PersonalSettings>) => {
    if (!user?.id) return;
    updateSettingsMutation.mutate({ settings: newSettings });
  }, [user?.id, updateSettingsMutation]);

  const updateProfile = useCallback((profileData: ProfileData) => {
    if (!user?.id) return;
    updateProfileMutation.mutate({ profileData });
  }, [user?.id, updateProfileMutation]);

  const changeTheme = useCallback((theme: 'light' | 'dark' | 'system') => {
    if (!user?.id) return;
    updateThemeMutation.mutate({ theme });
  }, [user?.id, updateThemeMutation]);

  const updateNotifications = useCallback((notifications: PersonalSettings['notifications']) => {
    if (!user?.id) return;
    updateNotificationsMutation.mutate({ notifications });
  }, [user?.id, updateNotificationsMutation]);

  const setLocalRemindersEnabledRemote = useCallback((enabled: boolean) => {
    if (!user?.id) return;
    updateLocalRemindersMutation.mutate({ enabled });
  }, [user?.id, updateLocalRemindersMutation]);

  const createProfile = useCallback((email: string) => {
    if (!user?.id) return;
    createProfileMutation.mutate({ email });
  }, [user?.id, createProfileMutation]);

  // Estado local para tema (para aplicação imediata)
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark' | 'system'>('system');

  // Sincronizar tema local com as configurações
  useEffect(() => {
    const settingsObj = settings?.data as unknown;
    const personal = settingsObj && typeof settingsObj === 'object'
      ? (settingsObj as Record<string, unknown>)['personal_settings']
      : undefined;
    if (personal && typeof personal === 'object') {
      const maybeTheme = (personal as Record<string, unknown>)['theme'];
      if (maybeTheme === 'light' || maybeTheme === 'dark' || maybeTheme === 'system') {
        setCurrentTheme(maybeTheme);
      }
    }
  }, [settings?.data]);

  // Aplicar tema ao documento
  useEffect(() => {
    const applyTheme = (theme: 'light' | 'dark' | 'system') => {
      const root = document.documentElement;
      
      if (theme === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        root.setAttribute('data-theme', systemTheme);
      } else {
        root.setAttribute('data-theme', theme);
      }
    };

    applyTheme(currentTheme);

    // Listener para mudanças no tema do sistema
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (currentTheme === 'system') {
        applyTheme('system');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [currentTheme]);

  return {
    // Dados
    settings: settings?.data as unknown,
    profile: profile?.data as unknown,
    currentTheme,
    
    // Estados de loading
    isLoadingSettings,
    isLoadingProfile,
    isLoading: isLoadingSettings || isLoadingProfile,
    
    // Estados de mutation
    isUpdatingSettings: updateSettingsMutation.isPending,
    isUpdatingProfile: updateProfileMutation.isPending,
    isUpdatingTheme: updateThemeMutation.isPending,
    isUpdatingNotifications: updateNotificationsMutation.isPending,
    isCreatingProfile: createProfileMutation.isPending,
    
    // Erros
    settingsError,
    profileError,
    
    // Funções
    updateSettings,
    updateProfile,
    changeTheme,
    updateNotifications,
    setLocalRemindersEnabledRemote,
    createProfile,
    refetchSettings,
    refetchProfile,
  };
};