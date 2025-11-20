
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "react-router-dom";
import BasicInfoFields from "./BasicInfoFields";
import AdditionalInfoFields from "./AdditionalInfoFields";
import { OrganizationFormData, initialFormData } from "./types";
import { useOrganizationCreation } from "@/hooks/organized/utils";

interface OrganizationFormProps {
  onSuccess?: () => void;
}

const OrganizationForm = ({ onSuccess }: OrganizationFormProps) => {
  const [formData, setFormData] = useState<OrganizationFormData>(initialFormData);
  const { loading, error, progress, createOrganization } = useOrganizationCreation();

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await createOrganization(formData);
    if (success && onSuccess) {
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <BasicInfoFields 
        formData={formData}
        onInputChange={handleInputChange}
        loading={loading}
      />

      <AdditionalInfoFields 
        formData={formData}
        onInputChange={handleInputChange}
        loading={loading}
      />

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-red-800 text-sm font-medium">Error:</div>
          <div className="text-red-700 text-sm mt-1">{error}</div>
        </div>
      )}

      {progress && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
            <div className="text-blue-800 text-sm font-medium">{progress}</div>
          </div>
        </div>
      )}

      <div className="flex items-center space-x-2 p-4 bg-muted/50 rounded-lg">
        <Checkbox 
          id="terms-accepted" 
          checked={formData.terms_accepted}
          onCheckedChange={(checked) => handleInputChange('terms_accepted', !!checked)}
        />
        <label htmlFor="terms-accepted" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          Saya menyetujui syarat dan ketentuan yang berlaku sesuai dengan Perjanjian Layanan platform ini.{" "}
          <Link 
            to="/terms-and-conditions" 
            className="text-primary hover:underline"
          >
            Baca syarat & ketentuan.
          </Link>
        </label>
      </div>

      <Button
        type="submit"
        className="w-full h-11 rounded-lg text-base font-semibold bg-[#181E29] hover:bg-[#222b3c]"
        disabled={loading || !formData.terms_accepted}
      >
        {loading ? (
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
            <span>Membuat Organisasi...</span>
          </div>
        ) : (
          "Buat Organisasi"
        )}
      </Button>
    </form>
  );
};

export default OrganizationForm;
