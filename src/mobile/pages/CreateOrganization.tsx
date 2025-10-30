import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/mobile/components/ui/button";
import { Input } from "@/mobile/components/ui/input";
import { Label } from "@/mobile/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/mobile/components/ui/card";
import { Textarea } from "@/mobile/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/mobile/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/features/ui/use-toast";
import { Loader2, Building2, Users, MapPin, Globe, Phone, Factory, ArrowLeft } from "lucide-react";
import { DesktopWarning } from "@/mobile/components/DesktopWarning";
import { Checkbox } from "@/mobile/components/ui/checkbox";
const industryOptions = ["Pertanian, Kehutanan, dan Perikanan", "Pertambangan dan Penggalian", "Industri Pengolahan", "Pengadaan Listrik dan Gas", "Pengadaan Air, Pengelolaan Sampah, Limbah dan Daur Ulang", "Konstruksi", "Perdagangan Besar dan Eceran; Reparasi Mobil dan Sepeda Motor", "Transportasi dan Pergudangan", "Penyediaan Akomodasi dan Makan Minum", "Informasi dan Komunikasi", "Jasa Keuangan dan Asuransi", "Real Estat", "Jasa Profesional, Ilmiah dan Teknis", "Jasa Persewaan dan Sewa Guna Usaha tanpa Hak Opsi, Ketenagakerjaan, Agen Perjalanan dan Penunjang Usaha Lainnya", "Administrasi Pemerintahan, Pertahanan dan Jaminan Sosial Wajib", "Jasa Pendidikan", "Jasa Kesehatan dan Kegiatan Sosial", "Kesenian, Hiburan dan Rekreasi", "Jasa lainnya", "Kegiatan Rumah Tangga sebagai Pemberi Kerja", "Kegiatan Badan Internasional dan Badan Ekstra Internasional Lainnya", "Teknologi dan Startup", "E-commerce", "Fintech", "Media dan Advertising", "Konsultasi Bisnis", "Logistik dan Supply Chain", "Otomotif", "Tekstil dan Fashion", "Makanan dan Minuman", "Farmasi dan Kesehatan", "Energi Terbarukan", "Beauty dan Personal Care", "Retail dan Consumer Goods", "Manufacturing", "Import Export", "Legal Services", "Accounting dan Finance", "Human Resources", "Marketing dan Public Relations", "Research dan Development", "Non-Profit Organization", "Government"];
const employeeCountOptions = ["1-10 karyawan", "11-50 karyawan", "51-100 karyawan", "101-500 karyawan", "501-1000 karyawan", "1000+ karyawan"];
const CreateOrganization = () => {
  const [organizationName, setOrganizationName] = useState("");
  const [industry, setIndustry] = useState("");
  const [employeeCount, setEmployeeCount] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [address, setAddress] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationName.trim()) {
      toast({
        title: "Error",
        description: "Nama perusahaan harus diisi",
        variant: "destructive"
      });
      return;
    }
    if (!industry) {
      toast({
        title: "Error",
        description: "Industri harus dipilih",
        variant: "destructive"
      });
      return;
    }
    if (!employeeCount) {
      toast({
        title: "Error",
        description: "Jumlah karyawan harus dipilih",
        variant: "destructive"
      });
      return;
    }
    if (!phoneNumber.trim()) {
      toast({
        title: "Error",
        description: "Nomor telepon harus diisi",
        variant: "destructive"
      });
      return;
    }
    if (!address.trim()) {
      toast({
        title: "Error",
        description: "Alamat perusahaan harus diisi",
        variant: "destructive"
      });
      return;
    }
    if (!termsAccepted) {
      toast({
        title: "Error",
        description: "Anda harus menyetujui syarat dan ketentuan",
        variant: "destructive"
      });
      return;
    }
    setIsLoading(true);
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }

      // 1. Create organization
      const {
        data: orgData,
        error: orgError
      } = await supabase.from('organizations').insert({
        company_name: organizationName.trim(),
        industry: industry,
        employee_count: employeeCount,
        phone_number: phoneNumber.trim(),
        address: address.trim(),
        website: website.trim() || null,
        description: description.trim() || null,
        user_id: user.id,
        terms_accepted: termsAccepted,
        created_at: new Date().toISOString()
      }).select().single();
      if (orgError) {
        throw orgError;
      }

      // 2. Create user_organizations entry (make the creator an active member first)
      const {
        error: userOrgError
      } = await supabase.from('user_organizations').insert({
        user_id: user.id,
        organization_id: orgData.id,
        is_active: true,
        joined_at: new Date().toISOString()
      });
      if (userOrgError) {
        throw userOrgError;
      }

      // 3. Create user_roles entry (owner)
      const {
        error: userRoleError
      } = await supabase.from('user_roles').insert({
        user_id: user.id,
        organization_id: orgData.id,
        role: 'owner'
      });
      if (userRoleError) {
        throw userRoleError;
      }

      // 4. Create default department using company name
      const {
        data: deptData,
        error: deptError
      } = await supabase.from('departments').insert({
        name: organizationName.trim(),
        organization_id: orgData.id,
        is_active: true,
        created_at: new Date().toISOString()
      }).select().single();
      if (deptError) {
        throw deptError;
      }

      // 5. Create employees entry
      const {
        error: employeeError
      } = await supabase.from('employees').insert({
        user_id: user.id,
        organization_id: orgData.id,
        department_id: deptData.id,
        full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Admin User',
        email: user.email,
        status: 'active',
        hire_date: new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString()
      });
      if (employeeError) {
        throw employeeError;
      }

      // 6. Update user profile to mark organization as created
      const {
        error: profileError
      } = await supabase.from('profiles').update({
        active_organization_id: orgData.id,
        organization_created: true
      }).eq('user_id', user.id);
      if (profileError) {
        throw profileError;
      }
      toast({
        title: "Organisasi Berhasil Dibuat",
        description: `Selamat! Organisasi "${organizationName}" telah berhasil dibuat`,
        className: "bg-success text-success-foreground"
      });

      // Redirect to employee welcome page
      navigate("/employee-welcome", {
        state: {
          fromCreateOrganization: true
        },
        replace: true
      });
    } catch (error: any) {
      console.error("Create organization error:", error);
      toast({
        title: "Gagal Membuat Organisasi",
        description: error.message || "Terjadi kesalahan saat membuat organisasi",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  return <DesktopWarning>
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl bg-card border-border shadow-card">
          <CardHeader className="space-y-1">
            <div className="flex items-center gap-4 mb-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="h-10 w-10">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl text-foreground">Buat Organisasi Pertama</CardTitle>
            <p className="text-muted-foreground">
              Lengkapi informasi organisasi Anda untuk mulai menggunakan ProfitLoop
            </p>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleCreateOrganization} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="organizationName" className="text-foreground">
                    Nama Perusahaan *
                  </Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="organizationName" type="text" placeholder="PT. Contoh Perusahaan" value={organizationName} onChange={e => setOrganizationName(e.target.value)} disabled={isLoading} className="pl-10 bg-input border-border text-foreground placeholder:text-muted-foreground" required />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="industry" className="text-foreground">
                    Industri *
                  </Label>
                  <div className="relative">
                    <Factory className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                    <Select value={industry} onValueChange={setIndustry} disabled={isLoading} required>
                      <SelectTrigger className="pl-10 bg-input border-border text-foreground">
                        <SelectValue placeholder="Pilih industri" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border max-h-60">
                        {industryOptions.map(option => <SelectItem key={option} value={option} className="text-popover-foreground">
                            {option}
                          </SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="employeeCount" className="text-foreground">
                    Jumlah Karyawan *
                  </Label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                    <Select value={employeeCount} onValueChange={setEmployeeCount} disabled={isLoading} required>
                      <SelectTrigger className="pl-10 bg-input border-border text-foreground">
                        <SelectValue placeholder="Pilih jumlah karyawan" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border">
                        {employeeCountOptions.map(option => <SelectItem key={option} value={option} className="text-popover-foreground">
                            {option}
                          </SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phoneNumber" className="text-foreground">
                    Nomor Telepon *
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="phoneNumber" type="tel" placeholder="+62 xxx-xxx-xxxx" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} disabled={isLoading} className="pl-10 bg-input border-border text-foreground placeholder:text-muted-foreground" required />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address" className="text-foreground">
                  Alamat Perusahaan *
                </Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Textarea id="address" placeholder="Jl. Contoh No. 123, Jakarta Selatan, DKI Jakarta" value={address} onChange={e => setAddress(e.target.value)} disabled={isLoading} className="pl-10 pt-3 bg-input border-border text-foreground placeholder:text-muted-foreground min-h-20" required />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="website" className="text-foreground">
                  Website (Opsional)
                </Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="website" type="url" placeholder="https://www.contohperusahaan.com" value={website} onChange={e => setWebsite(e.target.value)} disabled={isLoading} className="pl-10 bg-input border-border text-foreground placeholder:text-muted-foreground" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-foreground">
                  Deskripsi Perusahaan (Opsional)
                </Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Textarea id="description" placeholder="Ceritakan sedikit tentang perusahaan Anda..." value={description} onChange={e => setDescription(e.target.value)} disabled={isLoading} className="pl-10 pt-3 bg-input border-border text-foreground placeholder:text-muted-foreground min-h-24" />
                </div>
              </div>

              <div className="flex items-start space-x-3 p-4 bg-muted/50 rounded-lg border border-border">
                <Checkbox
                  id="terms"
                  checked={termsAccepted}
                  onCheckedChange={(checked) => setTermsAccepted(!!checked)}
                  disabled={isLoading}
                  className="mt-1"
                />
                <div className="space-y-1 flex-1">
                  <Label htmlFor="terms" className="text-sm text-foreground cursor-pointer">
                    Saya menyetujui{" "}
                    <a 
                      href="/terms" 
                      target="_blank" 
                      className="text-primary hover:underline"
                    >
                      syarat dan ketentuan
                    </a>{" "}
                    serta{" "}
                    <a 
                      href="/privacy" 
                      target="_blank" 
                      className="text-primary hover:underline"
                    >
                      kebijakan privasi
                    </a>{" "}
                    ProfitLoop
                  </Label>
                </div>
              </div>

              

              <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-12" disabled={isLoading || !termsAccepted}>
                {isLoading ? <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Membuat Organisasi...
                  </> : <>
                    <Building2 className="mr-2 h-4 w-4" />
                    Buat Organisasi
                  </>}
              </Button>

              <div className="text-center">
                <p className="text-xs text-muted-foreground">
                  * Wajib diisi
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DesktopWarning>;
};
export default CreateOrganization;