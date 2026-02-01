export interface WhatsAppConfig {
  id: string;
  organization_id: string;
  whatsapp_business_account_id: string;
  whatsapp_access_token: string;
  verify_token: string;
  phone_number_id: string | null;
  display_phone_number: string | null;
  whatsapp_business_name: string | null;
  name_status: string | null; // Meta display name verification: APPROVED | DECLINED
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface WhatsAppConfigUpsert {
  organization_id: string;
  whatsapp_business_account_id: string;
  whatsapp_access_token: string;
  verify_token: string;
  phone_number_id?: string | null;
  display_phone_number?: string | null;
  whatsapp_business_name?: string | null;
}

export interface WhatsAppConversation {
  id: string;
  organization_id: string;
  customer_wa_id: string;
  customer_name: string | null;
  last_message_at: string | null;
  last_message_body: string | null;
  created_at: string;
  updated_at: string;
}

export type WhatsAppMessageStatus = 'sent' | 'delivered' | 'read';

export interface WhatsAppMessage {
  id: string;
  conversation_id: string;
  direction: 'inbound' | 'outbound';
  wa_message_id: string | null;
  body: string | null;
  message_type: string;
  raw_metadata: unknown;
  created_at: string;
  status: WhatsAppMessageStatus | null;
  status_updated_at: string | null;
  read_at: string | null;
}
