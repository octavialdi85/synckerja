import { StandardLayout } from '@/features/1-layouts/StandardLayout';

interface PlaceholderPageProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
}

export const PlaceholderPage = ({ 
  title, 
  description = "Fitur ini sedang dalam pengembangan...",
  icon
}: PlaceholderPageProps) => {
  return (
    <StandardLayout>
      <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
        <div className="flex flex-1 min-h-0">
          <div className="flex-1 flex flex-col min-h-0">
            <main className="flex-1 px-4 pt-16 pb-4 min-h-0">
              <div className="h-full flex flex-col overflow-hidden">
                <div className="flex-1 flex items-center justify-center">
                  <div className="max-w-md mx-auto text-center">
                    {icon && (
                      <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                        {icon}
                      </div>
                    )}
                    
                    <div className="bg-white rounded-lg shadow-sm border p-8">
                      <h1 className="text-2xl font-bold text-gray-900 mb-4">
                        {title}
                      </h1>
                      
                      <p className="text-gray-600 mb-6">
                        {description}
                      </p>
                      
                      <button 
                        onClick={() => window.history.back()} 
                        className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors font-medium"
                      >
                        Kembali
                      </button>
                    </div>
                    
                    <p className="text-sm text-gray-500 mt-4">
                      Hubungi administrator untuk informasi lebih lanjut
                    </p>
                  </div>
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>
    </StandardLayout>
  );
};
