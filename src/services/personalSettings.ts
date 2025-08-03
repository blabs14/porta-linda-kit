import { supabase } from '../lib/supabaseClient';

export interface PersonalSettings {
  theme: 'light' | 'dark' | 'system';
  notifications: {
    email: boolean;
    push: boolean;
    goal_reminders: boolean;
    budget_alerts: boolean;
    transaction_alerts: boolean;
  };
  appearance: {
    theme: 'light' | 'dark' | 'system';
    compact_mode: boolean;
    show_currency_symbol: boolean;
  };
}

export interface ProfileData {
  first_name?: string;
  last_name?: string;
  phone?: string;
  birth_date?: string;
  personal_settings?: PersonalSettings;
}

// Obter configurações pessoais do utilizador
export const getPersonalSettings = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('personal_settings, first_name, last_name, phone, birth_date')
    .eq('user_id', userId)
    .single();
  
  return { data, error };
};

// Atualizar configurações pessoais
export const updatePersonalSettings = async (userId: string, settings: Partial<PersonalSettings>) => {
  const { data, error } = await supabase
    .from('profiles')
    .update({ 
      personal_settings: settings,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId)
    .select('personal_settings')
    .single();
  
  return { data, error };
};

// Atualizar dados do perfil
export const updateProfileData = async (userId: string, profileData: ProfileData) => {
  const { data, error } = await supabase
    .from('profiles')
    .update({
      first_name: profileData.first_name,
      last_name: profileData.last_name,
      phone: profileData.phone,
      birth_date: profileData.birth_date,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId)
    .select('first_name, last_name, phone, birth_date')
    .single();
  
  return { data, error };
};

// Atualizar apenas o tema
export const updateTheme = async (userId: string, theme: 'light' | 'dark' | 'system') => {
  // Primeiro obter as configurações atuais
  const { data: currentSettings } = await getPersonalSettings(userId);
  
  if (!currentSettings?.personal_settings) {
    // Se não existem configurações, criar com valores padrão
    const defaultSettings: PersonalSettings = {
      theme,
      notifications: {
        email: true,
        push: true,
        goal_reminders: true,
        budget_alerts: true,
        transaction_alerts: false
      },
      appearance: {
        theme,
        compact_mode: false,
        show_currency_symbol: true
      }
    };
    
    return updatePersonalSettings(userId, defaultSettings);
  }
  
  // Atualizar apenas o tema nas configurações existentes
  const updatedSettings = {
    ...currentSettings.personal_settings,
    theme,
    appearance: {
      ...currentSettings.personal_settings.appearance,
      theme
    }
  };
  
  return updatePersonalSettings(userId, updatedSettings);
};

// Atualizar configurações de notificações
export const updateNotificationSettings = async (userId: string, notifications: PersonalSettings['notifications']) => {
  const { data: currentSettings } = await getPersonalSettings(userId);
  
  if (!currentSettings?.personal_settings) {
    const defaultSettings: PersonalSettings = {
      theme: 'system',
      notifications,
      appearance: {
        theme: 'system',
        compact_mode: false,
        show_currency_symbol: true
      }
    };
    
    return updatePersonalSettings(userId, defaultSettings);
  }
  
  const updatedSettings = {
    ...currentSettings.personal_settings,
    notifications
  };
  
  return updatePersonalSettings(userId, updatedSettings);
};

// Obter perfil completo do utilizador
export const getFullProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single();
  
  return { data, error };
};

// Criar perfil inicial se não existir
export const createInitialProfile = async (userId: string, email: string) => {
  const defaultSettings: PersonalSettings = {
    theme: 'system',
    notifications: {
      email: true,
      push: true,
      goal_reminders: true,
      budget_alerts: true,
      transaction_alerts: false
    },
    appearance: {
      theme: 'system',
      compact_mode: false,
      show_currency_symbol: true
    }
  };

  const { data, error } = await supabase
    .from('profiles')
    .insert({
      user_id: userId,
      nome: email.split('@')[0], // Usar parte do email como nome inicial
      personal_settings: defaultSettings,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single();
  
  return { data, error };
}; 