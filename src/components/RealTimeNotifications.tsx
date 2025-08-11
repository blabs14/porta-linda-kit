import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { useToast } from '../hooks/use-toast';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Bell, X } from 'lucide-react';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useConfirmation } from '../hooks/useConfirmation';
import { ConfirmationDialog } from './ui/confirmation-dialog';

interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  created_at: string;
}

export const RealTimeNotifications = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [filterType, setFilterType] = useState<'all' | Notification['type']>('all');
  const [filterRead, setFilterRead] = useState<'all' | 'unread' | 'read'>('all');
  const confirmation = useConfirmation();

  const updateUnreadCount = useCallback(() => {
    setUnreadCount((notifications || []).filter(n => !n.read).length);
  }, [notifications]);

  const loadNotifications = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('id,user_id,title,message,type,read,created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const normalizeType = (t: unknown): Notification['type'] => {
        return t === 'success' || t === 'warning' || t === 'error' ? t : 'info';
      };
      const typed: Notification[] = (data || []).map((n: any) => ({
        id: String(n.id),
        user_id: String(n.user_id),
        title: String(n.title ?? ''),
        message: String(n.message ?? ''),
        type: normalizeType(n.type),
        read: Boolean(n.read),
        created_at: String(n.created_at ?? new Date().toISOString()),
      }));

      setNotifications(typed);
      setUnreadCount(typed.filter(n => !n.read).length);
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    // Carregar notificações existentes
    loadNotifications();

    // Subscrever a notificações em tempo real
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotification = payload.new as any;
          const normalizeType = (t: unknown): Notification['type'] => {
            return t === 'success' || t === 'warning' || t === 'error' ? t : 'info';
          };
          const typed: Notification = {
            id: String(newNotification.id),
            user_id: String(newNotification.user_id),
            title: String(newNotification.title ?? ''),
            message: String(newNotification.message ?? ''),
            type: normalizeType(newNotification.type),
            read: Boolean(newNotification.read),
            created_at: String(newNotification.created_at ?? new Date().toISOString()),
          };
          setNotifications(prev => [typed, ...prev]);
          setUnreadCount(prev => prev + 1);
          
          // Mostrar toast para nova notificação
          toast({
            title: typed.title,
            description: typed.message,
            variant: typed.type === 'error' ? 'destructive' : 'default',
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const updated = payload.new as any;
          const normalizeType = (t: unknown): Notification['type'] => {
            return t === 'success' || t === 'warning' || t === 'error' ? t : 'info';
          };
          const typed: Notification = {
            id: String(updated.id),
            user_id: String(updated.user_id),
            title: String(updated.title ?? ''),
            message: String(updated.message ?? ''),
            type: normalizeType(updated.type),
            read: Boolean(updated.read),
            created_at: String(updated.created_at ?? new Date().toISOString()),
          };
          setNotifications(prev => 
            prev.map(notif => 
              notif.id === typed.id ? typed : notif
            )
          );
          updateUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, toast, loadNotifications, updateUnreadCount]);

  const markAsRead = async (notificationId: string) => {
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
    }
  };

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user?.id)
        .eq('read', false);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(notif => ({ ...notif, read: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Erro ao marcar todas como lidas:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => 
        prev.filter(notif => notif.id !== notificationId)
      );
      updateUnreadCount();
    } catch (error) {
      console.error('Erro ao eliminar notificação:', error);
    }
  };
  const confirmAndDelete = (notificationId: string) => {
    confirmation.confirm(
      {
        title: 'Eliminar Notificação',
        message: 'Tem a certeza que deseja eliminar esta notificação? Esta ação não pode ser desfeita.',
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
        variant: 'destructive',
      },
      async () => {
        await deleteNotification(notificationId);
      }
    );
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      default:
        return 'ℹ️';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  const filteredNotifications = useMemo(() => {
    return (notifications || [])
      .filter(n => (filterType === 'all' ? true : n.type === filterType))
      .filter(n => (filterRead === 'all' ? true : filterRead === 'unread' ? !n.read : n.read));
  }, [notifications, filterType, filterRead]);

  if (!user) return null;

  return (
    <div className="relative">
      {/* Botão de notificações */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="relative"
        aria-label="Notificações"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </Button>

      {/* Dropdown de notificações */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto bg-white border border-gray-300 rounded-lg shadow-lg z-50">
          <div className="p-4 border-b border-gray-300">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Notificações</h3>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Marcar todas como lidas
                </Button>
              )}
            </div>
            {/* Filtros rápidos */}
            <div className="grid grid-cols-2 gap-2 mt-3">
              <div>
                <Label className="text-xs">Tipo</Label>
                <Select value={filterType} onValueChange={(v) => setFilterType(v as any)}>
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="success">Sucesso</SelectItem>
                    <SelectItem value="warning">Aviso</SelectItem>
                    <SelectItem value="error">Erro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Estado</Label>
                <Select value={filterRead} onValueChange={(v) => setFilterRead(v as any)}>
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="unread">Por ler</SelectItem>
                    <SelectItem value="read">Lidas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="p-2">
            {filteredNotifications.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p>Nenhuma notificação</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 rounded-lg border ${getNotificationColor(notification.type)} ${
                      !notification.read ? 'ring-2 ring-blue-200' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-2 flex-1">
                        <span className="text-lg">
                          {getNotificationIcon(notification.type)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-gray-900 flex items-center gap-2">
                            {notification.title}
                            {!notification.read && (
                              <Badge variant="secondary" className="text-[10px]">Por ler</Badge>
                            )}
                            <Badge variant="outline" className="text-[10px] capitalize">{notification.type}</Badge>
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-400 mt-2">
                            {new Date(notification.created_at).toLocaleString('pt-PT')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        {!notification.read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markAsRead(notification.id)}
                            className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                            aria-label="Marcar como lida"
                          >
                            ✓
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => confirmAndDelete(notification.id)}
                          className="h-6 w-6 p-0 text-gray-400 hover:text-red-600"
                          aria-label="Eliminar notificação"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Overlay para fechar quando clicar fora */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={confirmation.isOpen}
        onClose={confirmation.close}
        onConfirm={confirmation.onConfirm}
        onCancel={confirmation.onCancel}
        title={confirmation.options.title}
        message={confirmation.options.message}
        confirmText={confirmation.options.confirmText}
        cancelText={confirmation.options.cancelText}
        variant={confirmation.options.variant}
      />
    </div>
  );
}; 