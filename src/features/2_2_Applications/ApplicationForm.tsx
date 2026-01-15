
import { useState } from 'react';
import { useApplicationSubmission } from './components/application-form/useApplicationSubmission';
import { CVUploadSection } from './components/application-form/CVUploadSection';
import { ApplicationSuccess } from './components/application-form/ApplicationSuccess';
import { JobApplicationSkillsInput } from './JobApplicationSkillsInput';
import { JobApplicationSkill } from '@/features/2_2_job-openings/hooks/recruitmentSkillsTypes';
import { ApplicationFormData, ApplicationFormProps } from './components/application-form/types';
import { useToast } from '@/features/ui/use-toast';

export function ApplicationForm({
  jobId,
  jobTitle,
  companyName,
  onClose,
  recruitmentLinkId,
  recruitmentToken,
  requiredSkills = []
}: ApplicationFormProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<ApplicationFormData>({
    // Personal Information
    applicantName: '',
    applicantEmail: '',
    applicantPhone: '',
    birth_date: '',
    gender: '',
    nik: '',
    religion: '',
    marital_status: '',
    nationality: '',
    blood_type: '',
    
    // Address Information
    birth_place: '',
    address: '',
    citizen_address: '',
    postal_code: '',
    
    // Employment Information (read-only)
    department_id: '',
    job_position_id: '',
    job_level_id: '',
    branch_id: '',
    employee_status_id: '',
    join_date: '',
    hire_date: '',
    employment_status: 'pending',
    
    // Application specific
    coverLetter: '',
    experienceYears: '',
    expectedSalary: ''
  });

  const [cvFile, setCvFile] = useState<File | null>(null);
  const [skills, setSkills] = useState<JobApplicationSkill[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [profileLink, setProfileLink] = useState<string>('');

  const { submitting, submitApplication } = useApplicationSubmission();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('🎯 Form submitted with data:', {
      formData,
      cvFile: cvFile?.name,
      skills,
      jobId,
      recruitmentLinkId,
      recruitmentToken
    });

    // Enhanced client-side validation
    const errors: string[] = [];

    if (!formData.applicantName.trim()) {
      errors.push('Full name is required');
    }

    if (!formData.applicantEmail.trim()) {
      errors.push('Email address is required');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.applicantEmail)) {
      errors.push('Please enter a valid email address');
    }

    if (!formData.applicantPhone.trim()) {
      errors.push('Phone number is required');
    }

    // Check required skills
    if (requiredSkills.length > 0) {
      const requiredSkillsToCheck = requiredSkills.filter(skill => skill.is_required);
      const providedSkillTitles = skills.map(skill => skill.title.toLowerCase());
      
      const missingRequiredSkills = requiredSkillsToCheck.filter(requiredSkill => 
        !providedSkillTitles.includes(requiredSkill.title.toLowerCase())
      );

      if (missingRequiredSkills.length > 0) {
        errors.push(`Missing required skills: ${missingRequiredSkills.map(s => s.title).join(', ')}`);
      }
    }

    if (errors.length > 0) {
      toast({
        title: "Validation Error",
        description: errors.join('. '),
        variant: "destructive"
      });
      return;
    }

    await submitApplication({
      formData,
      cvFile,
      skills,
      jobId,
      recruitmentLinkId,
      requiredSkills,
      recruitmentToken,
      onSuccess: (generatedProfileLink) => {
        console.log('✅ Application successful, profile link:', generatedProfileLink);
        if (generatedProfileLink) {
          setProfileLink(generatedProfileLink);
          setShowSuccess(true);
        }
      }
    });
  };

  const handleCloseSuccess = () => {
    setShowSuccess(false);
    onClose();
  };

  if (showSuccess && profileLink) {
    return (
      <ApplicationSuccess
        profileLink={profileLink}
        applicantName={formData.applicantName}
        onClose={handleCloseSuccess}
      />
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border max-h-[90vh] overflow-y-auto">
      {/* Header */}
      <div className="border-b px-6 py-4 sticky top-0 bg-white z-10">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Complete Your Application</h2>
            <p className="text-sm text-gray-600 mt-1">
              {jobTitle} at {companyName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={submitting}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Personal Information */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="applicantName" className="block text-sm font-medium text-gray-700 mb-2">
                Full Name *
              </label>
              <input
                type="text"
                id="applicantName"
                value={formData.applicantName}
                onChange={(e) => setFormData(prev => ({ ...prev, applicantName: e.target.value }))}
                required
                disabled={submitting}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="Enter your full name"
              />
            </div>

            <div>
              <label htmlFor="applicantEmail" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address *
              </label>
              <input
                type="email"
                id="applicantEmail"
                value={formData.applicantEmail}
                onChange={(e) => setFormData(prev => ({ ...prev, applicantEmail: e.target.value }))}
                required
                disabled={submitting}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="Enter your email address"
              />
            </div>

            <div>
              <label htmlFor="applicantPhone" className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number *
              </label>
              <input
                type="tel"
                id="applicantPhone"
                value={formData.applicantPhone}
                onChange={(e) => setFormData(prev => ({ ...prev, applicantPhone: e.target.value }))}
                required
                disabled={submitting}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="Enter your phone number"
              />
            </div>

            <div>
              <label htmlFor="birth_date" className="block text-sm font-medium text-gray-700 mb-2">
                Birth Date
              </label>
              <input
                type="date"
                id="birth_date"
                value={formData.birth_date}
                onChange={(e) => setFormData(prev => ({ ...prev, birth_date: e.target.value }))}
                disabled={submitting}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-2">
                Gender
              </label>
              <select
                id="gender"
                value={formData.gender}
                onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value }))}
                disabled={submitting}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>

            <div>
              <label htmlFor="nik" className="block text-sm font-medium text-gray-700 mb-2">
                NIK (ID Number)
              </label>
              <input
                type="text"
                id="nik"
                value={formData.nik}
                onChange={(e) => setFormData(prev => ({ ...prev, nik: e.target.value }))}
                disabled={submitting}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="Enter your NIK"
              />
            </div>
          </div>
        </div>

        <CVUploadSection
          cvFile={cvFile}
          onFileChange={setCvFile}
          disabled={submitting}
        />

        <JobApplicationSkillsInput
          skills={skills}
          onChange={setSkills}
          requiredSkills={requiredSkills}
          disabled={submitting}
        />

        {/* Cover Letter */}
        <div>
          <label htmlFor="coverLetter" className="block text-sm font-medium text-gray-700 mb-2">
            Cover Letter (Optional)
          </label>
          <textarea
            id="coverLetter"
            value={formData.coverLetter}
            onChange={(e) => setFormData(prev => ({ ...prev, coverLetter: e.target.value }))}
            rows={4}
            disabled={submitting}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            placeholder="Tell us why you're interested in this position..."
          />
        </div>

        {/* Experience and Salary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="experienceYears" className="block text-sm font-medium text-gray-700 mb-2">
              Years of Experience (Optional)
            </label>
            <input
              type="text"
              id="experienceYears"
              value={formData.experienceYears}
              onChange={(e) => setFormData(prev => ({ ...prev, experienceYears: e.target.value }))}
              disabled={submitting}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="e.g., 2-3 years"
            />
          </div>

          <div>
            <label htmlFor="expectedSalary" className="block text-sm font-medium text-gray-700 mb-2">
              Expected Salary (Optional)
            </label>
            <input
              type="text"
              id="expectedSalary"
              value={formData.expectedSalary}
              onChange={(e) => setFormData(prev => ({ ...prev, expectedSalary: e.target.value }))}
              disabled={submitting}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="e.g., Rp 8,000,000"
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end space-x-4 pt-4 border-t">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Submitting...
              </>
            ) : (
              'Submit Application'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
