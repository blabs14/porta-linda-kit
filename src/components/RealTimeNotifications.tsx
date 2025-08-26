import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Badge } from './ui/badge';
import { Bell } from 'lucide-react';

export const RealTimeNotifications = () => {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <div className="relative">
      <button
        className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md"
        title="Notificações (temporariamente indisponíveis)"
        disabled
      >
        <Bell className="h-6 w-6" />
        <Badge 
          variant="secondary" 
          className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs bg-gray-400"
        >
          !
        </Badge>
      </button>
      
      {/* Tooltip informativo */}
      <div className="absolute top-full right-0 mt-2 w-64 bg-white border border-gray-200 rounded-md shadow-lg p-3 text-sm text-gray-600 z-50 hidden group-hover:block">
        <p className="font-medium mb-1">Notificações temporariamente indisponíveis</p>
        <p className="text-xs">Estamos a resolver problemas de conectividade. As notificações serão reativadas em breve.</p>
      </div>
    </div>
  );
};