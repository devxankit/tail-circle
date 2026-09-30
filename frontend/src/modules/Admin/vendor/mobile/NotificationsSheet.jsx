import { Bell } from 'lucide-react';
import { cn } from '../../../user/utils/cn';
import { BottomSheet } from './BottomSheet';

/**
 * The bell's list, as a sheet.
 *
 * Each panel's bell reads from a different place (the notifications API, or a
 * module context), so the shell hands this a normalised config:
 *
 *   { items: [{ id, title, body, time, unread }], unreadCount,
 *     onMarkAllRead, markAllDisabled, onItemClick, countLabel, footer,
 *     disabled, showCount, decorative }
 */
export function NotificationsSheet({ open, onClose, config }) {
  const items = config?.items || [];
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={(
        <span className="flex items-center gap-2">
          Notifications
          {config?.countLabel && (
            <span className="text-[11px] font-bold text-text-secondary bg-bg-secondary px-2 py-0.5 rounded-full">{config.countLabel}</span>
          )}
        </span>
      )}
      footer={config?.onMarkAllRead !== undefined || config?.footer ? (
        <div className="flex flex-col gap-2">
          {config?.footer}
          {config?.onMarkAllRead !== undefined && (
            <button
              type="button"
              onClick={() => config.onMarkAllRead?.()}
              disabled={config.markAllDisabled}
              className="w-full h-12 rounded-2xl bg-bg-secondary text-text-primary text-[15px] font-bold disabled:opacity-50"
            >
              Mark all as read
            </button>
          )}
        </div>
      ) : null}
    >
      {items.length ? (
        <div className="bg-white rounded-[20px] border border-border-light overflow-hidden">
          {items.map((n, i) => (
            <button
              key={n.id ?? i}
              type="button"
              onClick={() => config?.onItemClick?.(n)}
              className={cn(
                'w-full text-left px-4 py-3.5 flex gap-3 items-start',
                i > 0 && 'border-t border-border-light',
                n.unread ? 'bg-primary-light/10' : 'bg-white'
              )}
            >
              <span className={cn('w-2 h-2 rounded-full mt-1.5 shrink-0', n.unread ? 'bg-primary-main' : 'bg-transparent')} />
              <span className="flex-1 min-w-0">
                <span className={cn('block text-sm text-text-primary', n.unread ? 'font-bold' : 'font-medium')}>{n.title}</span>
                {n.body && <span className="block text-xs text-text-secondary mt-0.5">{n.body}</span>}
                {n.time && <span className="block text-[11px] text-text-secondary/80 mt-1">{n.time}</span>}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="py-12 text-center">
          <Bell size={32} className="mx-auto text-text-disabled mb-2" />
          <p className="text-sm font-semibold text-text-secondary">{config?.emptyText || 'No notifications yet.'}</p>
        </div>
      )}
    </BottomSheet>
  );
}

export default NotificationsSheet;
