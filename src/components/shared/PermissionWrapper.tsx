import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Lock } from 'lucide-react';

interface PermissionWrapperProps {
  requiredRole: 'admin' | 'staff';
  requiredPermission?: 'can_delete_invoice' | 'can_edit_stock' | 'view_reports' | 'manage_settings';
  fallback?: 'hide' | 'lock';
  className?: string;
  children: React.ReactNode;
}

export const PermissionWrapper: React.FC<PermissionWrapperProps> = ({
  requiredRole,
  requiredPermission,
  fallback = 'hide',
  className = '',
  children
}) => {
  const { currentUser } = useAuth();

  const isAuthorized = 
    currentUser?.role === 'admin' || 
    currentUser?.role === requiredRole || 
    (requiredPermission && currentUser?.permissions?.[requiredPermission] === true);

  if (isAuthorized) {
    return <>{children}</>;
  }

  if (fallback === 'lock') {
    return (
      <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-400 dark:text-slate-500 text-xs font-semibold select-none ${className}`}>
        <Lock size={12} className="shrink-0 text-amber-500" />
        <span>Restricted ({requiredRole})</span>
      </div>
    );
  }

  return null;
};
