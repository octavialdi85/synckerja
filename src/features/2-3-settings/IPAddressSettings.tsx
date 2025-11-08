import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Wifi, Globe, Edit, Save, X } from 'lucide-react';
import { Button } from '@/features/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/features/ui/card';
import { Input } from '@/features/ui/input';
import { Label } from '@/features/ui/label';
import { Textarea } from '@/features/ui/textarea';
import { Switch } from '@/features/ui/switch';
import { Badge } from '@/features/ui/badge';
import { Alert, AlertDescription } from '@/features/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentEmployee } from '@/features/share/hooks/useCurrentEmployee';
import { toast } from 'sonner';

interface AllowedIP {
  id: string;
  ip_address: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
}

export const IPAddressSettings = () => {
  const [allowedIPs, setAllowedIPs] = useState<AllowedIP[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    ip_address: '',
    name: '',
    description: '',
    is_active: true
  });
  const { data: employee } = useCurrentEmployee();

  useEffect(() => {
    if (employee?.organization_id) {
      fetchAllowedIPs();
    }
  }, [employee?.organization_id]);

  const fetchAllowedIPs = async () => {
    if (!employee?.organization_id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('allowed_ip_addresses')
        .select('*')
        .eq('organization_id', employee.organization_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAllowedIPs(data || []);
    } catch (error) {
      console.error('Error fetching allowed IPs:', error);
      toast.error('Gagal memuat daftar IP address');
    } finally {
      setLoading(false);
    }
  };

  const validateIPAddress = (ip: string): boolean => {
    // Basic IP validation (IPv4 and CIDR notation)
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(?:\/(?:[0-9]|[1-2][0-9]|3[0-2]))?$/;
    return ipv4Regex.test(ip);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee?.organization_id) return;

    if (!validateIPAddress(formData.ip_address)) {
      toast.error('Format IP address tidak valid. Gunakan format seperti 192.168.1.1 atau 192.168.1.0/24');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('allowed_ip_addresses')
        .insert({
          organization_id: employee.organization_id,
          ip_address: formData.ip_address,
          name: formData.name,
          description: formData.description,
          is_active: formData.is_active,
          created_by: (await supabase.auth.getUser()).data.user?.id
        });

      if (error) throw error;

      toast.success('IP address berhasil ditambahkan');
      setFormData({ ip_address: '', name: '', description: '', is_active: true });
      setShowAddForm(false);
      fetchAllowedIPs();
    } catch (error: any) {
      console.error('Error adding IP:', error);
      if (error.code === '23505') {
        toast.error('IP address sudah ada dalam daftar');
      } else {
        toast.error('Gagal menambahkan IP address');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('allowed_ip_addresses')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      toast.success(`IP address ${!currentStatus ? 'diaktifkan' : 'dinonaktifkan'}`);
      fetchAllowedIPs();
    } catch (error) {
      console.error('Error updating IP status:', error);
      toast.error('Gagal mengubah status IP address');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus IP address ini?')) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('allowed_ip_addresses')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('IP address berhasil dihapus');
      fetchAllowedIPs();
    } catch (error) {
      console.error('Error deleting IP:', error);
      toast.error('Gagal menghapus IP address');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">IP Address Management</h3>
          <p className="text-sm text-gray-600 mt-1">
            Kelola daftar IP address yang diizinkan untuk absensi dari laptop/komputer
          </p>
        </div>
        <Button 
          onClick={() => setShowAddForm(!showAddForm)}
          disabled={loading}
        >
          <Plus className="h-4 w-4 mr-2" />
          Tambah IP
        </Button>
      </div>

      <Alert>
        <Wifi className="h-4 w-4" />
        <AlertDescription>
          IP address digunakan sebagai fallback ketika GPS tidak tersedia (laptop/komputer). 
          Gunakan format seperti 192.168.1.1 untuk IP tunggal atau 192.168.1.0/24 untuk range.
        </AlertDescription>
      </Alert>

      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tambah IP Address Baru</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="ip_address">IP Address *</Label>
                  <Input
                    id="ip_address"
                    value={formData.ip_address}
                    onChange={(e) => setFormData(prev => ({ ...prev, ip_address: e.target.value }))}
                    placeholder="192.168.1.1 atau 192.168.1.0/24"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Gunakan /24 untuk network range (contoh: 192.168.1.0/24)
                  </p>
                </div>
                <div>
                  <Label htmlFor="name">Nama/Label *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="WiFi Kantor Utama"
                    required
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="description">Deskripsi</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Deskripsi opsional untuk IP address ini"
                  rows={2}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
                <Label htmlFor="is_active">Aktif</Label>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={loading}>
                  <Save className="h-4 w-4 mr-2" />
                  Simpan
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowAddForm(false)}
                  disabled={loading}
                >
                  <X className="h-4 w-4 mr-2" />
                  Batal
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {allowedIPs.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Globe className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Belum ada IP address yang dikonfigurasi</p>
              <p className="text-sm text-gray-500">Tambah IP address pertama untuk mulai menggunakan fitur ini</p>
            </CardContent>
          </Card>
        ) : (
          allowedIPs.map((ip) => (
            <Card key={ip.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Wifi className="h-4 w-4 text-blue-600" />
                        <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                          {ip.ip_address}
                        </code>
                      </div>
                      <Badge variant={ip.is_active ? "default" : "secondary"}>
                        {ip.is_active ? 'Aktif' : 'Nonaktif'}
                      </Badge>
                    </div>
                    
                    <div className="mt-2">
                      <h4 className="font-medium text-gray-900">{ip.name}</h4>
                      {ip.description && (
                        <p className="text-sm text-gray-600 mt-1">{ip.description}</p>
                      )}
                    </div>
                    
                    <p className="text-xs text-gray-500 mt-2">
                      Ditambahkan: {new Date(ip.created_at).toLocaleDateString('id-ID')}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={ip.is_active}
                      onCheckedChange={() => handleToggleActive(ip.id, ip.is_active)}
                      disabled={loading}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(ip.id)}
                      disabled={loading}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
