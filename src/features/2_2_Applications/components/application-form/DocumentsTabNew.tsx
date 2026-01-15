import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/features/ui/card';
import { Button } from '@/features/ui/button';
import { Badge } from '@/features/ui/badge';
import { FileText, Upload, Eye, Trash2, Download, CheckCircle, AlertCircle, Edit, Save, X } from 'lucide-react';
import { useToast } from '@/features/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Document {
  id?: string;
  file_name: string;
  file_path: string;
  document_type: string;
  mime_type?: string;
  file_size?: number;
  uploaded_at?: string;
}

interface DocumentsTabProps {
  candidate?: any;
  onUpdate?: (data: any) => void;
  isReadOnly?: boolean;
  candidateProfileId?: string;
  onDocumentsChange?: () => void;
}

export const DocumentsTabNew = ({ 
  candidate, 
  onUpdate, 
  isReadOnly = false, 
  candidateProfileId,
  onDocumentsChange 
}: DocumentsTabProps) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<{ [key: string]: boolean }>({});
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();

  const documentTypes = [
    { value: 'cv', label: 'CV/Resume', required: true },
    { value: 'ktp', label: 'KTP/ID Card', required: true },
    { value: 'ijazah', label: 'Ijazah/Certificate', required: true },
    { value: 'transcript', label: 'Transkrip Nilai', required: false },
    { value: 'portfolio', label: 'Portfolio', required: false },
    { value: 'other', label: 'Lainnya', required: false }
  ];

  useEffect(() => {
    if (candidateProfileId) {
      fetchDocuments();
    } else {
      setLoading(false);
    }
  }, [candidateProfileId]);

  const fetchDocuments = async () => {
    if (!candidateProfileId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('candidate_documents')
        .select('*')
        .eq('candidate_profile_id', candidateProfileId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const transformedDocuments = (data || []).map(doc => ({
        id: doc.id,
        file_name: doc.file_name,
        file_path: doc.file_path,
        document_type: doc.document_type,
        mime_type: doc.mime_type,
        file_size: doc.file_size,
        uploaded_at: doc.created_at
      }));
      
      setDocuments(transformedDocuments);
      
      if (onDocumentsChange) {
        onDocumentsChange();
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast({
        title: "Error",
        description: "Gagal memuat dokumen",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, documentType: string) => {
    const file = event.target.files?.[0];
    if (!file || !candidateProfileId) return;

    // Validate file size (max 2MB - reduced from 5MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "Ukuran file terlalu besar. Maksimal 2MB.",
        variant: "destructive"
      });
      return;
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf', 
      'image/jpeg', 
      'image/png', 
      'image/jpg', 
      'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Error",
        description: "Tipe file tidak didukung. Gunakan PDF, DOC, DOCX, atau gambar (JPG, PNG).",
        variant: "destructive"
      });
      return;
    }

    // Check if document type already exists and delete if necessary
    const existingDoc = documents.find(doc => doc.document_type === documentType);
    if (existingDoc) {
      try {
        await supabase
          .from('candidate_documents')
          .delete()
          .eq('id', existingDoc.id);
        
        await supabase.storage
          .from('recruitment-files')
          .remove([existingDoc.file_path]);
      } catch (error) {
        console.warn('Error deleting existing document:', error);
      }
    }

    setUploading(prev => ({ ...prev, [documentType]: true }));
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${candidateProfileId}/${documentType}_${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('recruitment-files')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: dbData, error: dbError } = await supabase
        .from('candidate_documents')
        .insert({
          candidate_profile_id: candidateProfileId,
          file_name: file.name,
          file_path: uploadData.path,
          mime_type: file.type,
          file_size: file.size,
          document_type: documentType
        })
        .select()
        .single();

      if (dbError) {
        await supabase.storage
          .from('recruitment-files')
          .remove([uploadData.path]);
        throw dbError;
      }

      await fetchDocuments();
      
      toast({
        title: "Berhasil Upload!",
        description: `${documentTypes.find(dt => dt.value === documentType)?.label} berhasil disimpan.`,
      });

      event.target.value = '';
      
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Gagal Upload",
        description: `Gagal menyimpan ${documentTypes.find(dt => dt.value === documentType)?.label}.`,
        variant: "destructive"
      });
    } finally {
      setUploading(prev => ({ ...prev, [documentType]: false }));
    }
  };

  const handleDeleteDocument = async (documentId: string, filePath: string) => {
    try {
      const { error: dbError } = await supabase
        .from('candidate_documents')
        .delete()
        .eq('id', documentId);

      if (dbError) throw dbError;

      const { error: storageError } = await supabase.storage
        .from('recruitment-files')
        .remove([filePath]);

      if (storageError) {
        console.warn('Warning: Failed to delete file from storage:', storageError);
      }

      await fetchDocuments();
      
      if (selectedDocument?.id === documentId) {
        setSelectedDocument(null);
        setPreviewUrl(null);
      }
      
      toast({
        title: "Berhasil",
        description: "Dokumen berhasil dihapus"
      });
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        title: "Error",
        description: "Gagal menghapus dokumen",
        variant: "destructive"
      });
    }
  };

  const handleViewDocument = async (document: Document) => {
    setSelectedDocument(document);
    
    try {
      const { data, error } = await supabase.storage
        .from('recruitment-files')
        .createSignedUrl(document.file_path, 3600);

      if (error) throw error;
      setPreviewUrl(data.signedUrl);
    } catch (error) {
      console.error('Error creating signed URL:', error);
      setPreviewUrl(null);
    }
  };

  const handleDownloadDocument = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('recruitment-files')
        .download(filePath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Document downloaded successfully."
      });
    } catch (error) {
      console.error('Error downloading file:', error);
      toast({
        title: "Error",
        description: "Failed to download document.",
        variant: "destructive"
      });
    }
  };

  const getDocumentByType = (type: string) => {
    return documents.find(doc => doc.document_type === type);
  };

  const getMissingRequiredDocuments = () => {
    const requiredTypes = documentTypes.filter(dt => dt.required).map(dt => dt.value);
    const uploadedTypes = documents.map(doc => doc.document_type);
    return requiredTypes.filter(type => !uploadedTypes.includes(type));
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = () => {
    setIsEditing(false);
    toast({
      title: "Success",
      description: "Document changes saved successfully"
    });
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Dokumen Pendukung</span>
          </div>
          <div className="flex items-center space-x-2">
            {!isReadOnly && (
              <>
                {!isEditing ? (
                  <Button onClick={handleEdit} size="sm" variant="outline">
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                ) : (
                  <div className="flex space-x-2">
                    <Button onClick={handleCancel} size="sm" variant="outline">
                      <X className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                    <Button onClick={handleSave} size="sm">
                      <Save className="h-4 w-4 mr-1" />
                      Save
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-6 h-[600px]">
          {/* Left Panel - Document Types */}
          <div className="w-80 space-y-4 overflow-y-auto flex-shrink-0">
            {documentTypes.map((docType) => {
              const existingDoc = getDocumentByType(docType.value);
              const isUploading = uploading[docType.value];
              
              return (
                <div key={docType.value} className="p-4 border border-gray-200 rounded-lg bg-white">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900">{docType.label}</h3>
                      {docType.required && <span className="text-red-500">*</span>}
                      {existingDoc && (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      )}
                    </div>
                  </div>
                  
                  {existingDoc ? (
                    <div className="space-y-3">
                      <div 
                        className="p-3 bg-green-50 border border-green-200 rounded-lg cursor-pointer hover:bg-green-100 transition-colors"
                        onClick={() => handleViewDocument(existingDoc)}
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium text-green-800 flex-1 truncate">
                            {existingDoc.file_name}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewDocument(existingDoc)}
                          className="flex-1"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Lihat
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownloadDocument(existingDoc.file_path, existingDoc.file_name)}
                          className="flex-1"
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Unduh
                        </Button>
                        {(isEditing || !isReadOnly) && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => existingDoc.id && handleDeleteDocument(existingDoc.id, existingDoc.file_path)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      
                      {(isEditing || !isReadOnly) && (
                        <div>
                          <input
                            type="file"
                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                            onChange={(e) => handleFileUpload(e, docType.value)}
                            className="hidden"
                            id={`replace-${docType.value}`}
                            disabled={isUploading}
                          />
                          <label
                            htmlFor={`replace-${docType.value}`}
                            className="flex items-center gap-2 px-3 py-2 text-sm border border-dashed border-gray-300 rounded cursor-pointer hover:border-blue-500 transition-colors justify-center"
                          >
                            <Upload className="h-3 w-3" />
                            <span>Ganti File</span>
                          </label>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      {(isEditing || !isReadOnly) ? (
                        <>
                          <input
                            type="file"
                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                            onChange={(e) => handleFileUpload(e, docType.value)}
                            className="hidden"
                            id={`upload-${docType.value}`}
                            disabled={isUploading}
                          />
                          <label
                            htmlFor={`upload-${docType.value}`}
                            className={`flex items-center gap-2 px-4 py-3 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                              isUploading 
                                ? 'border-blue-500 bg-blue-50 cursor-not-allowed' 
                                : docType.required 
                                  ? 'border-red-300 hover:border-red-500' 
                                  : 'border-gray-300 hover:border-blue-500'
                            }`}
                          >
                            {isUploading ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                                <span className="text-sm">Mengupload...</span>
                              </>
                            ) : (
                              <>
                                <Upload className="h-4 w-4" />
                                <span className="text-sm">Upload File</span>
                              </>
                            )}
                          </label>
                        </>
                      ) : (
                        <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-center">
                          <span className="text-sm text-gray-500">No file uploaded</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Right Panel - Document Preview */}
          <div className="flex-1 border border-gray-200 rounded-lg bg-gray-50 overflow-hidden">
            {selectedDocument && previewUrl ? (
              <div className="h-full flex flex-col">
                <div className="p-4 bg-white border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">{selectedDocument.file_name}</h3>
                      <p className="text-sm text-gray-500">
                        {documentTypes.find(t => t.value === selectedDocument.document_type)?.label}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(previewUrl, '_blank')}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Open
                    </Button>
                  </div>
                </div>
                <div className="flex-1">
                  <iframe
                    src={previewUrl}
                    className="w-full h-full border-0"
                    title={selectedDocument.file_name}
                  />
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">No document selected</p>
                  <p className="text-sm">Click on a document to preview it here</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Status Upload Dokumen */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-800 mb-2">
                Status Upload Dokumen:
              </p>
              {getMissingRequiredDocuments().length === 0 ? (
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">Semua dokumen wajib sudah diupload!</span>
                </div>
              ) : (
                <div className="p-3 bg-red-50 border border-red-200 rounded">
                  <p className="text-sm font-medium text-red-800 mb-2">
                    Dokumen wajib yang belum diupload:
                  </p>
                  <ul className="text-sm text-red-700 space-y-1">
                    {getMissingRequiredDocuments().map(type => (
                      <li key={type}>• {documentTypes.find(dt => dt.value === type)?.label}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              <div className="mt-3 text-sm text-blue-700 space-y-1">
                <p>• Format yang didukung: PDF, DOC, DOCX, JPG, PNG</p>
                <p>• Maksimal ukuran file: 2MB per dokumen</p>
                <p>• File akan tersimpan otomatis setelah upload</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
