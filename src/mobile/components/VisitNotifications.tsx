import { Card, CardContent, CardHeader, CardTitle } from "@/mobile/components/ui/card";
import { Badge } from "@/mobile/components/ui/badge";
import { Button } from "@/mobile/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/mobile/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/mobile/components/ui/select";
import { Bell, Clock, MapPin, User, Phone, MessageCircle, ChevronRight, Star } from "lucide-react";
import { useClientLocations } from "@/mobile/hooks/useClientLocations";
import { useState } from "react";
import { toast } from "@/features/ui/use-toast";
interface VisitNotification {
  id: string;
  title: string;
  message: string;
  notification_type: 'reminder' | 'overdue' | 'completed';
  scheduled_for: string;
  is_read: boolean;
  client_visit?: {
    client?: {
      company_name: string;
    };
    visit_purpose: string;
  };
}
interface VisitNotificationsProps {
  notifications?: VisitNotification[];
  onMarkAsRead?: (notificationId: string) => void;
}
export const VisitNotifications = ({
  notifications = [],
  onMarkAsRead
}: VisitNotificationsProps) => {
  const {
    clientLocations,
    loading,
    error
  } = useClientLocations();
  const unreadNotifications = notifications.filter(n => !n.is_read);
  const [priorities, setPriorities] = useState<Record<string, string>>({});
  const handlePriorityChange = (locationId: string, priority: string) => {
    setPriorities(prev => ({
      ...prev,
      [locationId]: priority
    }));
    toast({
      title: "Prioritas Updated",
      description: `Prioritas visit berhasil diubah ke ${priority}`
    });
  };
  const handleWhatsApp = (phone: string, companyName: string) => {
    if (!phone) {
      toast({
        title: "Nomor HP tidak tersedia",
        variant: "destructive"
      });
      return;
    }
    const message = `Halo, saya ingin mengatur jadwal kunjungan ke ${companyName}`;
    const whatsappUrl = `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };
  const handleCall = (phone: string) => {
    if (!phone) {
      toast({
        title: "Nomor HP tidak tersedia",
        variant: "destructive"
      });
      return;
    }
    window.open(`tel:${phone}`, '_self');
  };
  const truncateAddress = (address: string, maxLength: number = 50) => {
    if (!address) return "Alamat belum diatur";
    return address.length > maxLength ? `${address.substring(0, maxLength)}...` : address;
  };
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-destructive text-destructive-foreground';
      case 'medium':
        return 'bg-warning text-warning-foreground';
      case 'low':
        return 'bg-success text-success-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  // If loading, show skeleton
  if (loading) {
    return <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className="h-5 w-5 text-primary" />
            Notifikasi Kunjungan
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pt-0">
          <div className="space-y-2">
            {[1, 2, 3].map(i => <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </div>)}
          </div>
        </CardContent>
      </Card>;
  }

  // Show client locations data instead of notifications
  if (clientLocations.length === 0 && !error) {
    return <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className="h-5 w-5 text-primary" />
            Notifikasi Kunjungan
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pt-0">
          <div className="text-center py-4 text-muted-foreground">
            <Bell className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Tidak ada notifikasi</p>
            <p className="text-xs mt-1">Notifikasi pengingat akan muncul di sini</p>
          </div>
        </CardContent>
      </Card>;
  }
  return <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-lg">
            <Bell className="h-5 w-5 text-primary" />
            Notifikasi Kunjungan
          </div>
          {clientLocations.length > 0 && <Badge variant="default" className="text-xs">
              {clientLocations.length} lokasi
            </Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pt-0 space-y-2">
        {error && <div className="text-center py-4 text-destructive">
            <p className="text-sm">Error: {error}</p>
          </div>}
        
        {clientLocations.map(location => <div key={location.id} className="border rounded-lg p-3 border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors">
            {/* Header with company name and priority */}
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                <div>
                  <span className="text-sm font-medium">{location.clients?.company_name || "Client Belum Diatur"}</span>
                  {location.clients?.contact_person && <p className="text-xs text-muted-foreground">Contact: {location.clients.contact_person}</p>}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                
              </div>
            </div>

            {/* Address (truncated) */}
            <p className="text-sm text-muted-foreground mb-2">
              {truncateAddress(location.address || "Alamat belum diatur")}
            </p>

            {/* Time schedule info */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{location.planned_start_time?.slice(0, 5) || '08:00'} - {location.planned_end_time?.slice(0, 5) || '17:00'}</span>
              </div>
              <div className="flex items-center gap-1">
                <User className="h-3 w-3" />
                <span>Radius: {location.radius_meters}m</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <div className="flex gap-2 items-center">
                <Select value={priorities[location.id] || 'medium'} onValueChange={value => handlePriorityChange(location.id, value)}>
                  <SelectTrigger className="w-24 h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
                
                {location.clients?.contact_phone && <>
                    <Button size="sm" variant="outline" onClick={() => handleCall(location.clients?.contact_phone || '')} className="h-7 text-xs">
                      <Phone className="h-3 w-3 mr-1" />
                      Call
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleWhatsApp(location.clients?.contact_phone || '', location.clients?.company_name || '')} className="h-7 text-xs">
                      <MessageCircle className="h-3 w-3 mr-1" />
                      WhatsApp
                    </Button>
                  </>}
              </div>

              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-7 text-xs">
                    Detail
                    <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-primary" />
                      {location.clients?.company_name || "Detail Lokasi"}
                    </DialogTitle>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    {/* Company Info */}
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Informasi Client</h4>
                      {location.clients?.contact_person && <p className="text-sm text-muted-foreground">
                          <strong>Contact Person:</strong> {location.clients.contact_person}
                        </p>}
                      {location.clients?.contact_phone && <p className="text-sm text-muted-foreground">
                          <strong>Phone:</strong> {location.clients.contact_phone}
                        </p>}
                    </div>

                    {/* Address */}
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Alamat Lengkap</h4>
                      <p className="text-sm text-muted-foreground">
                        {location.address || "Alamat belum diatur"}
                      </p>
                    </div>

                    {/* Schedule Info */}
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Jadwal Kunjungan</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                        <div>
                          <strong>Jam Mulai:</strong> {location.planned_start_time?.slice(0, 5) || '08:00'}
                        </div>
                        <div>
                          <strong>Jam Selesai:</strong> {location.planned_end_time?.slice(0, 5) || '17:00'}
                        </div>
                        <div>
                          <strong>Radius:</strong> {location.radius_meters}m
                        </div>
                        <div>
                          <strong>Status:</strong> Aktif
                        </div>
                      </div>
                    </div>

                    {location.notes && <div className="space-y-2">
                        <h4 className="font-medium text-sm">Catatan</h4>
                        <p className="text-sm text-muted-foreground">{location.notes}</p>
                      </div>}

                    {/* Action buttons in dialog */}
                    {location.clients?.contact_phone && <div className="flex gap-2 pt-4 border-t">
                        <Button onClick={() => handleCall(location.clients?.contact_phone || '')} className="flex-1">
                          <Phone className="h-4 w-4 mr-2" />
                          Telepon
                        </Button>
                        <Button variant="outline" onClick={() => handleWhatsApp(location.clients?.contact_phone || '', location.clients?.company_name || '')} className="flex-1">
                          <MessageCircle className="h-4 w-4 mr-2" />
                          WhatsApp
                        </Button>
                      </div>}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>)}
      </CardContent>
    </Card>;
};