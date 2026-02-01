-- Allow users to delete messages in conversations of their active organization (e.g. from chat dropdown "Hapus")
CREATE POLICY "Users can delete own org whatsapp messages"
  ON public.whatsapp_messages FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM whatsapp_conversations c
      JOIN profiles p ON p.active_organization_id = c.organization_id AND p.user_id = auth.uid()
      WHERE c.id = whatsapp_messages.conversation_id
    )
  );
