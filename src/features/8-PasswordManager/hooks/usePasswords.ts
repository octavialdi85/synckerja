import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUser } from './useCurrentUser';
import { useCurrentOrg } from '@/features/1-login/hooks/useCurrentOrg';
import { useToast } from './use-toast';
import type { Password, PasswordFormData, Category } from '../types';

export const usePasswords = () => {
  const [passwords, setPasswords] = useState<Password[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [passwordsLoading, setPasswordsLoading] = useState(true);
  const [effectSettled, setEffectSettled] = useState(false); // true only after first effect run has settled (no flash before effect)
  const { user, loading: userLoading } = useCurrentUser();
  const { organizationId, loading: orgLoading } = useCurrentOrg();
  const { toast } = useToast();
  const isActiveRef = useRef(true);
  const lastFetchedKeyRef = useRef<string | null>(null);

  // Fetch categories
  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('password_categories')
        .select('*')
        .order('name');

      if (error) throw error;

      const categoriesWithCount = (data || []).map((cat) => ({
        id: cat.id,
        name: cat.name,
        icon: cat.icon || 'lock',
        count: 0, // Will be updated when passwords are fetched
      }));

      if (!isActiveRef.current) return;
      setCategories(categoriesWithCount);
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to load categories',
        variant: 'destructive',
      });
    }
  };

  // Fetch passwords (loading is set by caller; no setLoading(true) here to avoid flicker)
  const fetchPasswords = async () => {
    if (!user || !organizationId) return;

    try {
      const { data, error } = await supabase
        .from('passwords')
        .select(`
          *,
          password_categories!inner(id, name, icon)
        `)
        .eq('user_id', user.id)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedPasswords: Password[] = (data || []).map((item: any) => ({
        id: item.id,
        title: item.title,
        username: item.username,
        password: item.password,
        url: item.url || undefined,
        category: item.password_categories?.id || 'general',
        notes: item.notes || undefined,
        isFavorite: item.is_favorite || false,
        createdAt: new Date(item.created_at),
        updatedAt: new Date(item.updated_at),
      }));
      if (!isActiveRef.current) return;
      setPasswords(formattedPasswords);
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to load passwords',
        variant: 'destructive',
      });
    } finally {
      // Caller (effect) sets passwordsLoading false after both categories + passwords complete
      if (!isActiveRef.current) return;
    }
  };

  // Add password
  const addPassword = async (data: PasswordFormData) => {
    if (!user || !organizationId) return;

    try {
      const { data: newPassword, error } = await supabase
        .from('passwords')
        .insert([
          {
            user_id: user.id,
            organization_id: organizationId,
            title: data.title,
            username: data.username,
            password: data.password,
            url: data.url || null,
            category_id: data.category,
            notes: data.notes || null,
            is_favorite: data.isFavorite,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Password saved successfully',
      });

      await fetchPasswords();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save password',
        variant: 'destructive',
      });
      throw error;
    }
  };

  // Update password
  const updatePassword = async (id: string, data: PasswordFormData) => {
    if (!user || !organizationId) return;

    try {
      const { error } = await supabase
        .from('passwords')
        .update({
          title: data.title,
          username: data.username,
          password: data.password,
          url: data.url || null,
          category_id: data.category,
          notes: data.notes || null,
          is_favorite: data.isFavorite,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .eq('organization_id', organizationId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Password updated successfully',
      });

      await fetchPasswords();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update password',
        variant: 'destructive',
      });
      throw error;
    }
  };

  // Delete password
  const deletePassword = async (id: string) => {
    if (!user || !organizationId) return;

    try {
      const { error } = await supabase
        .from('passwords')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)
        .eq('organization_id', organizationId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Password deleted successfully',
      });

      await fetchPasswords();
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to delete password',
        variant: 'destructive',
      });
    }
  };

  // Toggle favorite
  const toggleFavorite = async (id: string) => {
    if (!user || !organizationId) return;

    try {
      const password = passwords.find((p) => p.id === id);
      if (!password) return;

      const { error } = await supabase
        .from('passwords')
        .update({
          is_favorite: !password.isFavorite,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .eq('organization_id', organizationId);

      if (error) throw error;

      await fetchPasswords();
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to update favorite',
        variant: 'destructive',
      });
    }
  };

  // Single effect: fetch categories and passwords when user + org are ready. Run only once per (user, org). Wait for BOTH before clearing loading to avoid flicker.
  useEffect(() => {
    isActiveRef.current = true;
    const key = user && organizationId ? `${user.id}-${organizationId}` : null;

    if (key) {
      if (lastFetchedKeyRef.current === key) {
        return () => { isActiveRef.current = false; };
      }
      lastFetchedKeyRef.current = key;
      setPasswordsLoading(true);
      Promise.all([fetchCategories(), fetchPasswords()]).finally(() => {
        if (isActiveRef.current) {
          setPasswordsLoading(false);
          setEffectSettled(true);
        }
      });
    } else {
      lastFetchedKeyRef.current = null;
      setPasswordsLoading(false);
      setEffectSettled(true);
    }

    return () => {
      isActiveRef.current = false;
      lastFetchedKeyRef.current = null;
    };
  }, [user, organizationId]);

  // Update category counts when passwords change
  useEffect(() => {
    if (passwords.length > 0 && categories.length > 0) {
      const updatedCategories = categories.map((cat) => ({
        ...cat,
        count: passwords.filter((p) => p.category === cat.id).length,
      }));
      const hasChange = updatedCategories.some((uc, i) => (categories[i]?.count ?? -1) !== uc.count);
      if (!hasChange) return;
      if (!isActiveRef.current) return;
      setCategories(updatedCategories);
    }
  }, [passwords, categories]);

  // No flicker: show loading until effect has settled AND auth + fetch are done (never show content before first effect run)
  const loading = !effectSettled || userLoading || orgLoading || passwordsLoading;

  return {
    passwords,
    categories,
    loading,
    addPassword,
    updatePassword,
    deletePassword,
    toggleFavorite,
    refetch: fetchPasswords,
  };
};

