/**
 * Dropdown Status lead — kode sama dengan sidebar livechat.
 * Dipakai di: LivechatQuickActionPanel (sidebar) dan LeadsTableNew (leads-management).
 */
import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/features/ui/select';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';
import { getLeadStatusDisplayName } from './leadStatusDisplay';

export interface LeadStatusOption {
  id: string;
  name: string;
  color: string;
}

function getStatusColorClass(status: LeadStatusOption | null | undefined): string {
  if (!status?.color) return 'bg-gray-50 text-gray-700 border-gray-200';
  const colorMap: Record<string, string> = {
    '#F59E0B': 'bg-yellow-50 text-yellow-700 border-yellow-200',
    '#10B981': 'bg-green-50 text-green-700 border-green-200',
    '#059669': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    '#EF4444': 'bg-red-50 text-red-700 border-red-200',
    '#6B7280': 'bg-gray-50 text-gray-700 border-gray-200',
    '#3B82F6': 'bg-blue-50 text-blue-700 border-blue-200',
  };
  return colorMap[status.color] ?? 'bg-gray-50 text-gray-700 border-gray-200';
}

// Sama seperti livechat: Unread (Open) dikunci ketika status On Going / Qualified / Converted / Resolve / Lost
const STATUSES_THAT_LOCK_UNREAD = ['lost', 'closed', 'converted', 'in progress', 'qualified', 'on going'];

export interface LeadStatusSelectProps {
  value: string | undefined;
  onValueChange: (value: string) => void;
  leadStatuses: LeadStatusOption[];
  /** Nama status saat ini di DB (Open, In Progress, Closed, dll) — untuk mengunci opsi Unread */
  currentStatusName: string;
  disabled?: boolean;
  /** ClassName untuk SelectTrigger (sidebar: w-full text-sm rounded-lg; table: w-28 h-7 text-xs rounded-sm) */
  triggerClassName?: string;
  placeholder?: string;
  isLoading?: boolean;
}

export function LeadStatusSelect({
  value,
  onValueChange,
  leadStatuses,
  currentStatusName,
  disabled = false,
  triggerClassName = 'w-full text-sm border rounded-lg font-medium',
  placeholder,
  isLoading = false,
}: LeadStatusSelectProps) {
  const { t } = useAppTranslation();
  const currentStatus = leadStatuses.find((s) => s.id === value);
  // Kunci Unread jika status saat ini On going / Qualified / Converted / Resolve / Lost (cekal celah kecurangan)
  const nameFromProp = (currentStatusName ?? '').trim().toLowerCase();
  const nameFromValue = (currentStatus?.name ?? '').trim().toLowerCase();
  const isUnreadLocked =
    STATUSES_THAT_LOCK_UNREAD.some((n) => nameFromProp === n) ||
    STATUSES_THAT_LOCK_UNREAD.some((n) => nameFromValue === n);
  const isOpenOptionDisabled = (statusName: string) =>
    (statusName?.trim().toLowerCase() === 'open') && isUnreadLocked;

  if (isLoading) {
    return (
      <div className="h-9 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500">
        ...
      </div>
    );
  }
  if (leadStatuses.length === 0) {
    return (
      <div className="text-xs text-gray-500">
        {t('whatsappInbox.noStatuses', 'No statuses configured')}
      </div>
    );
  }

  // Guard: jangan izinkan pilih Open (Unread) bila status saat ini On going / Qualified / Converted / Resolve / Lost
  const handleValueChange = (newValue: string) => {
    const newStatus = leadStatuses.find((s) => s.id === newValue);
    if (newStatus?.name?.trim().toLowerCase() === 'open' && isUnreadLocked) return;
    onValueChange(newValue);
  };

  return (
    <Select value={value ?? undefined} onValueChange={handleValueChange}>
      <SelectTrigger
        className={`${triggerClassName} ${getStatusColorClass(currentStatus ?? undefined)}`}
        disabled={disabled}
      >
        <SelectValue placeholder={placeholder ?? t('whatsappInbox.selectStatus', 'Select status')} />
      </SelectTrigger>
      <SelectContent>
        {leadStatuses
          .filter((s) => {
            const name = (s.name ?? '').trim().toLowerCase();
            if (name === 'lost') return false;
            if (name === 'open' && isUnreadLocked) return false;
            return true;
          })
          .map((status) => {
            const disableUnread = isOpenOptionDisabled(status.name ?? '');
            return (
              <SelectItem
                key={status.id}
                value={status.id}
                disabled={disableUnread}
                className={disableUnread ? 'opacity-60 cursor-not-allowed pointer-events-none select-none' : undefined}
                title={
                  disableUnread
                    ? t('leadsManagement.openDisabledForTerminalStatus', 'Status On Going/Qualified/Converted/Resolve tidak dapat dikembalikan ke Unread')
                    : undefined
                }
              >
                {getLeadStatusDisplayName(status.name)}
              </SelectItem>
            );
          })}
      </SelectContent>
    </Select>
  );
}
