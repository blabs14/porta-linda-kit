import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { useToast } from '../../hooks/use-toast';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Bell, X, Users, UserPlus, UserMinus, AlertTriangle, CheckCircle, DollarSign, Target } from 'lucide-react';
import { FamilyNotification } from '../../types/family';

interface FamilyNotificationsProps {
  familyId: string;
}

export const FamilyNotifications: React.FC<FamilyNotificationsProps> = ({ familyId }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<FamilyNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const loadFamilyNotifications = useCallback(async () => {
    if (!user?.id || !familyId) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('family_id', familyId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const typedData = (data || []) as FamilyNotification[];
      setNotifications(typedData);
      updateUnreadCount(typedData);
    } catch (error) {
      console.error('Erro ao carregar notificações familiares:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as notificações',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, familyId, toast]);

  const updateUnreadCount = useCallback((notifList?: FamilyNotification[]) => {
    const list = notifList || notifications;
    const unread = list.filter(n => !n.read).length;
    setUnreadCount(unread);
  }, [notifications]);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId ? { ...notif, read: true } : notif
        )
      );
      updateUnreadCount();
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível marcar a notificação como lida',
        variant: 'destructive',
      });
    }
  }, [updateUnreadCount, toast]);

  const markAllAsRead = useCallback(async () => {
    if (!familyId) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('family_id', familyId)
        .eq('read', false);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(notif => ({ ...notif, read: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Erro ao marcar todas as notificações como lidas:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível marcar todas as notificações como lidas',
        variant: 'destructive',
      });
    }
  }, [familyId, toast]);

  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
      updateUnreadCount();
    } catch (error) {
      console.error('Erro ao eliminar notificação:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível eliminar a notificação',
        variant: 'destructive',
      });
    }
  }, [updateUnreadCount, toast]);

  const getNotificationIcon = useCallback((category?: string) => {
    switch (category) {
      case 'invite':
        return <UserPlus className="h-4 w-4" />;
      case 'member':
        return <Users className="h-4 w-4" />;
      case 'transaction':
        return <DollarSign className="h-4 w-4" />;
      case 'budget':
        return <AlertTriangle className="h-4 w-4" />;
      case 'goal':
        return <Target className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  }, []);

  const getNotificationColor = useCallback((type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  }, []);

  // Carregar notificações iniciais
  useEffect(() => {
    loadFamilyNotifications();
  }, [loadFamilyNotifications]);

  // Subscrever a notificações em tempo real
  useEffect(() => {
    if (!user?.id || !familyId) return;

    const channel = supabase
      .channel(`family-notifications-${familyId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `family_id=eq.${familyId}`,
        },
        (payload) => {
          const newNotification = payload.new as FamilyNotification;
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);
          
          // Mostrar toast para nova notificação
          toast({
            title: newNotification.title,
            description: newNotification.message,
            variant: newNotification.type === 'error' ? 'destructive' : 'default',
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `family_id=eq.${familyId}`,
        },
        (payload) => {
          const updatedNotification = payload.new as FamilyNotification;
          setNotifications(prev => 
            prev.map(notif => 
              notif.id === updatedNotification.id ? updatedNotification : notif
            )
          );
          updateUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, familyId, toast, updateUnreadCount]);

  return (
    <div className="relative">
      {/* Botão de notificações */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="relative"
        disabled={isLoading}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

      {/* Painel de notificações */}
      {isOpen && (
        <div className="absolute right-0 top-12 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="font-semibold text-gray-900">Notificações da Família</h3>
            <div className="flex gap-2">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="text-xs"
                >
                  Marcar todas como lidas
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-gray-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2">A carregar notificações...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Nenhuma notificação</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-gray-50 transition-colors ${
                      !notification.read ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-full ${getNotificationColor(notification.type)}`}>
                        {getNotificationIcon(notification.category)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <p className="text-sm font-medium text-gray-900">
                            {notification.title}
                          </p>
                          <div className="flex gap-1">
                            {!notification.read && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => markAsRead(notification.id)}
                                className="h-6 w-6 p-0"
                              >
                                <CheckCircle className="h-3 w-3" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteNotification(notification.id)}
                              className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-400 mt-2">
                          {new Date(notification.created_at).toLocaleString('pt-PT')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}; 