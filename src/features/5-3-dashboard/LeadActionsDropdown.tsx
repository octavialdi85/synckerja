import { Link } from 'react-router-dom';
import { Button } from "@/features/ui/button";
import { Edit, MessageCircle } from "lucide-react";
import { NewLead } from '@/types/leads';

const ZERO_UUID = '00000000-0000-0000-0000-000000000000';

interface LeadActionsDropdownProps {
  lead: NewLead & { _fromWhatsApp?: boolean; _fromEmail?: boolean };
  onEdit: (lead: NewLead) => void;
  onViewDetail?: (lead: NewLead) => void;
  onDelete?: (leadId: string) => void;
}

/** Lead from channel: one button = Open in Live Chat (by conversation id or ticket_id). Manual lead: one button = Edit. No Delete, no View Detail. */
export const LeadActionsDropdown = ({ lead, onEdit, onViewDetail, onDelete }: LeadActionsDropdownProps) => {
  const fromWhatsApp = (lead as any)._fromWhatsApp === true;
  const fromEmail = (lead as any)._fromEmail === true || (typeof lead.id === 'string' && lead.id.startsWith('email-'));
  const hasConversationId = fromWhatsApp || fromEmail;
  const ticketId = (lead.ticket_id ?? '').trim();
  const hasTicketId = /^(WA-|IG-|EMAIL-)/i.test(ticketId);
  const canOpenChat = hasConversationId || hasTicketId;
  const isManualLead = (lead.created_by ?? '').trim() !== '' && lead.created_by !== ZERO_UUID;

  if (canOpenChat) {
    const url = hasConversationId
      ? `/operations/consultant/all/livechat?conversation=${String(lead.id).replace(/^wa-/, '').replace(/^email-/, '')}`
      : `/operations/consultant/all/livechat?ticket_id=${encodeURIComponent(ticketId)}`;
    return (
      <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs font-medium" asChild>
        <Link to={url}>
          <MessageCircle className="h-4 w-4" />
          Open Chat
        </Link>
      </Button>
    );
  }

  if (isManualLead) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="h-8 gap-1.5 text-xs font-medium"
        onClick={() => onEdit(lead)}
      >
        <Edit className="h-4 w-4" />
        Edit
      </Button>
    );
  }

  return null;
};
