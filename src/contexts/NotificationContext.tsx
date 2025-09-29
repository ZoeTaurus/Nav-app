import React, { createContext, useContext, useState, ReactNode } from 'react';

interface Notification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

interface NotificationContextType {
  notifications: Notification[];
  showNotification: (message: string, type?: Notification['type'], duration?: number) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const showNotification = (
    message: string, 
    type: Notification['type'] = 'info', 
    duration: number = 5000
  ) => {
    const id = Math.random().toString(36).substr(2, 9);
    const notification: Notification = { id, message, type, duration };
    
    setNotifications(prev => [...prev, notification]);
    
    if (duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, duration);
    }
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const value: NotificationContextType = {
    notifications,
    showNotification,
    removeNotification,
    clearNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <NotificationContainer />
    </NotificationContext.Provider>
  );
};

const NotificationContainer: React.FC = () => {
  const { notifications, removeNotification } = useContext(NotificationContext)!;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {notifications.map(notification => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onRemove={removeNotification}
        />
      ))}
    </div>
  );
};

interface NotificationItemProps {
  notification: Notification;
  onRemove: (id: string) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onRemove }) => {
  const getNotificationStyles = () => {
    const baseStyles = "notification bg-white rounded-lg shadow-lg border p-4 max-w-sm cursor-pointer";
    
    switch (notification.type) {
      case 'success':
        return `${baseStyles} notification success border-l-4 border-l-green-500`;
      case 'error':
        return `${baseStyles} notification error border-l-4 border-l-red-500`;
      case 'warning':
        return `${baseStyles} notification warning border-l-4 border-l-yellow-500`;
      default:
        return `${baseStyles} notification info border-l-4 border-l-blue-500`;
    }
  };

  const getIconColor = () => {
    switch (notification.type) {
      case 'success':
        return 'text-green-500';
      case 'error':
        return 'text-red-500';
      case 'warning':
        return 'text-yellow-500';
      default:
        return 'text-blue-500';
    }
  };

  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'warning':
        return '⚠';
      default:
        return 'ℹ';
    }
  };

  return (
    <div
      className={getNotificationStyles()}
      onClick={() => onRemove(notification.id)}
    >
      <div className="flex items-start">
        <span className={`${getIconColor()} text-lg mr-3 mt-0.5 font-bold`}>
          {getIcon()}
        </span>
        <div className="flex-1">
          <p className="text-gray-800 text-sm font-medium">
            {notification.message}
          </p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(notification.id);
          }}
          className="ml-2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          ×
        </button>
      </div>
    </div>
  );
};

export const useNotification = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
