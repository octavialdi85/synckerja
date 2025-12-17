import { GoogleGenerativeAI } from '@google/generative-ai';

export interface GeminiResponse {
  content?: string;
  success: boolean;
  error?: string;
}

export const generateWithGemini = async (
  prompt: string
): Promise<GeminiResponse> => {
  try {
    // Gunakan import.meta.env untuk Vite
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    
    // Debug logging (only in development)
    if (import.meta.env.DEV) {
      console.log('Gemini API Key check:', {
        VITE_GEMINI_API_KEY: apiKey ? 'Found' : 'Not found',
        apiKeyExists: !!apiKey,
        apiKeyLength: apiKey ? apiKey.length : 0
      });
    }
    
    if (!apiKey || apiKey.trim() === '') {
      return {
        success: false,
        error: 'Gemini API key tidak ditemukan. Pastikan VITE_GEMINI_API_KEY sudah di-set di file .env di root project. Setelah menambahkan, restart dev server.'
      };
    }

    // Initialize Google Generative AI
    // Gunakan import.meta.env untuk Vite (bukan process.env)
    const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

    // Menggunakan model versi 2.0 dan 2.5 saja - TIDAK ada model lama (gemini-pro, 1.5, dll)
    // Model gemini-2.0-flash: ringan, cepat, jarang overload (503) - ideal untuk respon cepat
    // Hanya fallback ke 2.5-flash jika 2.0 tidak tersedia, untuk menghindari membuang waktu
    const modelConfigs = [
      { model: "gemini-2.0-flash" },        // Model utama - ringan dan cepat (mode Lite)
      { model: "models/gemini-2.0-flash" }, // Dengan prefix jika diperlukan
      { model: "gemini-2.5-flash" },        // Fallback jika 2.0 tidak tersedia
      { model: "models/gemini-2.5-flash" }  // Dengan prefix
    ];

    // Recursive retry function dengan exponential backoff
    const tryGenerate = async (modelConfig: { model: string }, attempt: number = 1): Promise<GeminiResponse> => {
      try {
        const model = genAI.getGenerativeModel(modelConfig);
        
        // Generate content
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        if (!text || text.trim() === '') {
          return {
            success: false,
            error: 'Tidak ada konten yang dihasilkan dari Gemini API'
          };
        }

        // Success - return the result
        if (import.meta.env.DEV) {
          console.log(`✅ Berhasil menggunakan model: ${modelConfig.model}`);
        }

        return {
          content: text,
          success: true
        };
      } catch (error: any) {
        const errorMessage = error?.message || error?.toString() || 'Unknown error';
        const errorStatus = error?.status || 
          (errorMessage.includes('503') ? 503 : null) ||
          (errorMessage.includes('429') ? 429 : null);
        
        const isServiceUnavailable = 
          errorStatus === 503 ||
          errorMessage.includes('503') || 
          errorMessage.includes('Service Unavailable') ||
          errorMessage.includes('service unavailable') ||
          errorMessage.includes('overloaded');
        
        const isQuotaExceeded = 
          errorStatus === 429 ||
          errorMessage.includes('429') ||
          errorMessage.includes('quota') ||
          errorMessage.includes('Quota exceeded') ||
          errorMessage.includes('exceeded your current quota');
        
        const isModelNotFound = 
          errorStatus === 404 ||
          errorMessage.includes('404') ||
          errorMessage.includes('not found') ||
          errorMessage.includes('is not found');

        // Jika Quota Exceeded (429), jangan retry karena perlu menunggu atau upgrade plan
        if (isQuotaExceeded) {
          // Extract retry delay dari error jika ada
          let retryDelay = 60; // Default 60 detik
          const retryMatch = errorMessage.match(/retry in ([\d.]+)s/i) || errorMessage.match(/retryDelay["\s:]+([\d.]+)/i);
          if (retryMatch) {
            retryDelay = Math.ceil(parseFloat(retryMatch[1]));
          }
          
          return {
            success: false,
            error: `Quota API telah habis. Silakan cek billing dan plan Anda di Google Cloud Console. Coba lagi dalam ${retryDelay} detik, atau upgrade ke plan berbayar untuk quota lebih besar.`
          };
        }

        // Jika Server Sibuk (503), coba lagi otomatis hingga 3 kali dengan exponential backoff
        if (isServiceUnavailable && attempt <= 3) {
          const delay = 2000 * attempt; // 2s, 4s, 6s
          
          if (import.meta.env.DEV) {
            console.warn(`⚠️ Server sibuk (503), mencoba lagi dalam ${delay}ms... (Attempt ${attempt}/3)`);
          }
          
          await new Promise(resolve => setTimeout(resolve, delay));
          return tryGenerate(modelConfig, attempt + 1);
        }

        // Jika model tidak ditemukan (404), coba model berikutnya (hanya untuk model versi 2.x)
        // Tidak akan mencoba model lama (gemini-pro, 1.5, dll) untuk menghindari membuang waktu
        if (isModelNotFound) {
          const currentIndex = modelConfigs.findIndex(m => m.model === modelConfig.model);
          if (currentIndex < modelConfigs.length - 1) {
            if (import.meta.env.DEV) {
              console.warn(`⚠️ Model ${modelConfig.model} tidak tersedia, mencoba model berikutnya...`);
            }
            return tryGenerate(modelConfigs[currentIndex + 1], 1);
          }
          
          // Jika semua model versi 2.x sudah dicoba dan tidak ada yang tersedia
          return {
            success: false,
            error: 'Model Gemini tidak tersedia. Pastikan API key Anda memiliki akses ke model Gemini 2.0 atau 2.5.'
          };
        }

        // Jika tetap gagal setelah retry atau semua model dicoba
        if (isServiceUnavailable) {
          return {
            success: false,
            error: 'Layanan AI sedang padat, silakan coba beberapa saat lagi.'
          };
        }

        return {
          success: false,
          error: errorMessage
        };
      }
    };

    // Mulai dengan model pertama
    return tryGenerate(modelConfigs[0], 1);
  } catch (error) {
    console.error('Detail Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Terjadi masalah koneksi ke AI. Coba cek terminal untuk detailnya.'
    };
  }
};

