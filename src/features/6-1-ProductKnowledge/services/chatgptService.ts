export interface GenerateContentRequest {
  feature_name?: string;
  service_name?: string;
  sub_service_name?: string;
  problems_solved?: string[];
  existing_description?: string;
  target_audience?: any;
}

export interface GenerateContentResponse {
  feature_description?: string;
  impact?: string;
  solusi?: string;
  competitive_advantage?: string[];
  success: boolean;
  error?: string;
}

export const generateProductKnowledgeContent = async (
  request: GenerateContentRequest,
  retryCount = 0
): Promise<GenerateContentResponse> => {
  const MAX_RETRIES = 5; // Increased from 3 to 5
  const RETRY_DELAY_BASE = 5000; // Increased from 2s to 5s base delay

  try {
    // Debug: Check all environment variables (only in dev)
    if (import.meta.env.DEV && retryCount === 0) {
      console.log('🔍 Environment variables check:', {
        hasViteOpenAIKey: !!import.meta.env.VITE_OPENAI_API_KEY,
        keyLength: import.meta.env.VITE_OPENAI_API_KEY?.length || 0,
        keyPrefix: import.meta.env.VITE_OPENAI_API_KEY?.substring(0, 10) || 'N/A',
        allEnvKeys: Object.keys(import.meta.env).filter(key => key.includes('OPENAI') || key.includes('API'))
      });
    }

    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    
    if (!apiKey || apiKey.trim() === '') {
      console.error('❌ OpenAI API Key Error:', {
        keyExists: !!apiKey,
        keyValue: apiKey ? '***' + apiKey.slice(-4) : 'undefined',
        envMode: import.meta.env.MODE,
        allEnvKeys: Object.keys(import.meta.env).filter(key => key.startsWith('VITE_'))
      });
      
      return {
        success: false,
        error: 'OpenAI API key tidak ditemukan. Pastikan VITE_OPENAI_API_KEY sudah diatur di file .env di root project dan restart dev server (npm run dev)'
      };
    }

    // Membuat prompt berdasarkan data yang ada
    const problemsText = request.problems_solved?.length 
      ? `Masalah yang diselesaikan: ${request.problems_solved.join(', ')}`
      : '';
    
    const serviceInfo = request.service_name 
      ? `${request.service_name}${request.sub_service_name ? ` - ${request.sub_service_name}` : ''}`
      : '';

    const prompt = `Sebagai ahli marketing digital, buatkan konten product knowledge yang profesional dalam Bahasa Indonesia untuk:

${request.feature_name ? `Fitur: ${request.feature_name}` : 'Fitur produk'}
${serviceInfo ? `Layanan: ${serviceInfo}` : ''}
${problemsText}

Berdasarkan informasi di atas, generate konten untuk:
1. Feature Description (Deskripsi fitur): Jelaskan fitur secara detail, menarik, dan mudah dipahami (max 200 kata)
2. Impact (Dampak): Jelaskan dampak positif yang diberikan fitur ini kepada pengguna atau bisnis (max 150 kata)
3. Solution (Solusi): Jelaskan bagaimana fitur ini menjadi solusi untuk masalah yang disebutkan (max 150 kata)
4. Competitive Advantage (Keunggulan kompetitif): List 3-5 poin keunggulan fitur ini dibanding kompetitor (format: array, setiap poin max 20 kata)

Format response harus JSON dengan struktur:
{
  "feature_description": "...",
  "impact": "...",
  "solusi": "...",
  "competitive_advantage": ["poin 1", "poin 2", "poin 3"]
}

Pastikan konten dalam Bahasa Indonesia, profesional, dan siap digunakan untuk marketing.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // atau 'gpt-3.5-turbo' jika ingin lebih murah
        messages: [
          {
            role: 'system',
            content: 'Anda adalah ahli marketing digital yang berpengalaman dalam membuat konten product knowledge yang menarik dan profesional dalam Bahasa Indonesia.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1500
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      // Handle rate limit with retry
      if (response.status === 429 && retryCount < MAX_RETRIES) {
        // Check for retry-after header first
        const retryAfterHeader = response.headers.get('retry-after');
        let delaySeconds: number;
        
        if (retryAfterHeader) {
          delaySeconds = parseInt(retryAfterHeader, 10);
          console.log(`📋 OpenAI retry-after header: ${delaySeconds}s`);
        } else {
          // Exponential backoff: 5s, 10s, 20s, 40s, 60s
          delaySeconds = Math.min(
            RETRY_DELAY_BASE * Math.pow(2, retryCount) / 1000,
            60 // Max 60 seconds
          );
        }
        
        const delayMs = delaySeconds * 1000;
        
        console.warn(`⏳ Rate limit hit. Retrying in ${delaySeconds}s... (Attempt ${retryCount + 1}/${MAX_RETRIES})`);
        console.warn(`💡 Tip: Jika masih gagal, akun OpenAI mungkin memiliki rate limit yang sangat rendah. Coba upgrade tier atau tunggu 1-2 menit.`);
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delayMs));
        
        // Retry with incremented count
        return generateProductKnowledgeContent(request, retryCount + 1);
      }
      
      // Handle specific error cases
      let errorMessage = errorData.error?.message || `API error: ${response.status} ${response.statusText}`;
      
      if (response.status === 429) {
        errorMessage = 'Rate limit OpenAI terlampaui. Akun Anda memiliki rate limit yang sangat rendah. Silakan tunggu 1-2 menit atau upgrade tier OpenAI di https://platform.openai.com/account/billing';
      } else if (errorData.error?.code === 'insufficient_quota' || errorMessage.includes('quota')) {
        errorMessage = 'Quota OpenAI sudah habis. Silakan cek billing dan top up di https://platform.openai.com/account/billing';
      } else if (response.status === 401) {
        errorMessage = 'API key tidak valid. Pastikan VITE_OPENAI_API_KEY di file .env sudah benar.';
      } else if (response.status === 500 || response.status >= 502) {
        errorMessage = 'OpenAI service sedang bermasalah. Silakan coba lagi beberapa saat.';
      }
      
      console.error('❌ OpenAI API Error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData.error,
        message: errorMessage,
        retryCount
      });
      
      return {
        success: false,
        error: errorMessage
      };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return {
        success: false,
        error: 'Tidak ada response dari ChatGPT'
      };
    }

    // Parse JSON response dari ChatGPT
    try {
      // Hapus markdown code block jika ada
      const cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleanedContent);

      return {
        feature_description: parsed.feature_description || '',
        impact: parsed.impact || '',
        solusi: parsed.solusi || '',
        competitive_advantage: Array.isArray(parsed.competitive_advantage) 
          ? parsed.competitive_advantage 
          : [],
        success: true
      };
    } catch (parseError) {
      // Fallback: jika bukan JSON, coba extract informasi secara manual
      console.warn('Failed to parse JSON, attempting manual extraction:', parseError);
      
      return {
        feature_description: content,
        impact: '',
        solusi: '',
        competitive_advantage: [],
        success: true
      };
    }
  } catch (error) {
    console.error('Error generating content:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};
