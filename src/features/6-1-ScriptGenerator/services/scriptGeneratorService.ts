export interface ScriptGeneratorRequest {
  content_type?: string;
  service_name?: string;
  sub_service_name?: string;
  content_pillar?: string;
  duration_minutes?: number; // Keep for backward compatibility
  slide?: number; // For Post/Carousel
  duration_value?: number; // For Reel/Story/Youtube
  duration_unit?: 'menit' | 'detik'; // For Reel/Story/Youtube
  target_market?: string;
  gender?: string;
  age?: string;
  buying_roles?: string;
  keinginan?: string;
  kebutuhan?: string;
  hidden_needs_1?: string;
  hidden_needs_2?: string;
  problem_1?: string;
  problem_2?: string;
  impact_1?: string;
  impact_2?: string;
  solution?: string;
  style_name?: string; // Style name selected from dropdown
  style_instruksi?: string; // Style description/instruction
  structure?: string;
}

export interface ScriptGeneratorResponse {
  script?: string;
  success: boolean;
  error?: string;
}

export const generateScript = async (
  request: ScriptGeneratorRequest
): Promise<ScriptGeneratorResponse> => {
  try {
    // Validate required fields
    if (!request.service_name && !request.content_type) {
      return {
        success: false,
        error: 'Minimal perlu mengisi Service atau Content Type untuk generate prompt'
      };
    }

    // Build ChatGPT prompt
    const prompt = buildChatGPTPrompt(request);

    return {
      script: prompt.trim(),
      success: true
    };
  } catch (error) {
    console.error('Error generating prompt:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// Helper function to clean duplicated labels from value
function cleanLabelDuplication(text: string | null | undefined, label: string): string {
  if (!text) return '';
  let cleaned = text.trim();
  // Remove duplicated label at the beginning (e.g., "Hidden Needs 1: ..." -> "...")
  const labelPattern = new RegExp(`^${label}:\\s*`, 'i');
  cleaned = cleaned.replace(labelPattern, '');
  return cleaned;
}

// Build a comprehensive prompt for ChatGPT
function buildChatGPTPrompt(request: ScriptGeneratorRequest): string {
  const promptParts: string[] = [];
  
  // Opening
  promptParts.push('Buatkan script konten digital marketing dengan detail sebagai berikut:\n');
  
  // Content Type & Format
  promptParts.push('## Format Konten');
  if (request.content_type) {
    promptParts.push(`- **Jenis Konten:** ${request.content_type}`);
  }
  
  // Duration/Slide
  if (request.slide) {
    promptParts.push(`- **Jumlah Slide:** ${request.slide} slide`);
  } else if (request.duration_value !== undefined) {
    const unit = request.duration_unit || 'menit';
    promptParts.push(`- **Durasi:** ${request.duration_value} ${unit}`);
  } else if (request.duration_minutes) {
    promptParts.push(`- **Durasi:** ${request.duration_minutes} menit`);
  }
  promptParts.push('');
  
  // Service Information
  if (request.service_name || request.sub_service_name) {
    promptParts.push('## Informasi Produk/Layanan');
    if (request.service_name) {
      promptParts.push(`- **Service:** ${request.service_name}`);
    }
    if (request.sub_service_name) {
      promptParts.push(`- **Sub Service:** ${request.sub_service_name}`);
    }
    promptParts.push('');
  }
  
  // Content Pillar
  if (request.content_pillar) {
    promptParts.push(`## Content Pillar\n- **Pillar:** ${request.content_pillar}\n`);
    
    // Add specific guidance based on Content Pillar type
    const pillarLower = request.content_pillar.toLowerCase();
    if (pillarLower.includes('compar') || pillarLower.includes('banding')) {
      promptParts.push('**⚠️ PENTING untuk Content Pillar ini:**');
      promptParts.push('- Script HARUS menampilkan perbandingan yang jelas dan konkret antara metode/platform/pendekatan LAMA vs BARU');
      promptParts.push('- Bandingkan secara spesifik dalam hal: fitur, hasil, biaya, atau manfaat');
      promptParts.push('- Tunjukkan perbedaan yang jelas dengan visual comparison (side-by-side, before-after)');
      promptParts.push('- Pastikan perbandingan relevan dengan konteks produk/layanan yang ditawarkan');
      promptParts.push('');
    } else if (pillarLower.includes('q&a') || pillarLower.includes('qa') || pillarLower.includes('tanya') || pillarLower.includes('jawab') || pillarLower.includes('product')) {
      // Check if it's Q&A Product specifically
      if (pillarLower.includes('q&a') || pillarLower.includes('qa') || pillarLower.includes('tanya') || pillarLower.includes('jawab')) {
        promptParts.push('**⚠️ PENTING untuk Content Pillar ini:**');
        promptParts.push('- Script HARUS menggunakan format Q&A (Tanya-Jawab) secara konsisten sepanjang konten');
        promptParts.push('- Mulai dengan pertanyaan yang relevan dan menarik di hook/intro');
        promptParts.push('- Struktur script harus mengikuti pola: Pertanyaan → Penjelasan/Jawaban → Insight/Nilai');
        promptParts.push('- Setiap section bisa dimulai dengan pertanyaan atau mengarah ke pertanyaan berikutnya');
        promptParts.push('- Format Q&A harus natural dan conversational, tidak terlalu kaku');
        promptParts.push('- Gunakan pertanyaan yang mencerminkan pain point atau curiosity target audience');
        promptParts.push('- Jangan hanya menggunakan format Q&A di awal, tapi konsisten sepanjang script');
        promptParts.push('');
      }
    }
  }
  
  // Target Audience
  if (request.target_market || request.gender || request.age || request.buying_roles) {
    promptParts.push('## Target Audience');
    if (request.target_market) {
      promptParts.push(`- **Target Market:** ${request.target_market}`);
    }
    if (request.gender) {
      promptParts.push(`- **Gender:** ${request.gender}`);
    }
    if (request.age) {
      promptParts.push(`- **Usia:** ${request.age}`);
    }
    if (request.buying_roles) {
      promptParts.push(`- **Buying Roles:** ${request.buying_roles}`);
    }
    promptParts.push('');
  }
  
  // Customer Insights
  if (request.keinginan || request.kebutuhan || request.hidden_needs_1 || request.hidden_needs_2) {
    promptParts.push('## Insights Pelanggan');
    if (request.keinginan) {
      promptParts.push(`- **Keinginan (Wants):** ${request.keinginan}`);
    }
    if (request.kebutuhan) {
      promptParts.push(`- **Kebutuhan (Needs):** ${request.kebutuhan}`);
    }
    // Clean duplicated labels
    if (request.hidden_needs_1) {
      const cleaned1 = cleanLabelDuplication(request.hidden_needs_1, 'Hidden Needs 1');
      promptParts.push(`- **Hidden Needs 1:** ${cleaned1}`);
    }
    if (request.hidden_needs_2) {
      const cleaned2 = cleanLabelDuplication(request.hidden_needs_2, 'Hidden Needs 2');
      promptParts.push(`- **Hidden Needs 2:** ${cleaned2}`);
    }
    promptParts.push('');
  }
  
  // Problems - Clean duplicated labels
  if (request.problem_1 || request.problem_2) {
    promptParts.push('## Masalah yang Dihadapi');
    if (request.problem_1) {
      const cleaned1 = cleanLabelDuplication(request.problem_1, 'Masalah 1');
      promptParts.push(`- **Problem 1:** ${cleaned1}`);
    }
    if (request.problem_2) {
      const cleaned2 = cleanLabelDuplication(request.problem_2, 'Masalah 2');
      promptParts.push(`- **Problem 2:** ${cleaned2}`);
    }
    promptParts.push('');
  }
  
  // Impact - Clean duplicated labels
  if (request.impact_1 || request.impact_2) {
    promptParts.push('## Dampak dari Masalah');
    if (request.impact_1) {
      const cleaned1 = cleanLabelDuplication(request.impact_1, 'Impact 1');
      promptParts.push(`- **Impact 1:** ${cleaned1}`);
    }
    if (request.impact_2) {
      const cleaned2 = cleanLabelDuplication(request.impact_2, 'Impact 2');
      promptParts.push(`- **Impact 2:** ${cleaned2}`);
    }
    promptParts.push('');
  }
  
  // Solution
  if (request.solution) {
    promptParts.push(`## Solusi`);
    promptParts.push(`${request.solution}`);
    promptParts.push('');
    promptParts.push('**⚠️ PENTING:** Dalam script, solusi harus dijelaskan secara spesifik dan konkret. Tunjukkan fitur, keunggulan, atau metode yang jelas dari produk/layanan. Hindari penjelasan yang terlalu generic.');
    promptParts.push('');
  }
  
  // Style & Structure
  if (request.style_instruksi || request.structure || request.style_name) {
    promptParts.push('## Style & Struktur');
    if (request.style_instruksi) {
      promptParts.push(`- **Style Instruksi:** ${request.style_instruksi}`);
    }
    if (request.structure) {
      // Combine style_name and structure if both exist
      if (request.style_name) {
        promptParts.push(`- **Struktur Script:** ${request.style_name} - ${request.structure}`);
      } else {
        promptParts.push(`- **Struktur Script:** ${request.structure}`);
      }
    } else if (request.style_name) {
      // If only style_name exists without structure
      promptParts.push(`- **Struktur Script:** ${request.style_name}`);
    }
    promptParts.push('');
  }
  
  // Instructions for ChatGPT - More focused and concise
  promptParts.push('## Instruksi');
  promptParts.push('Berdasarkan informasi di atas, buatkan script konten digital marketing yang:');
  promptParts.push('1. Menarik perhatian di awal (hook yang kuat dan relevan)');
  promptParts.push('2. Menjelaskan masalah dengan jelas sesuai konteks target audience');
  promptParts.push('3. Menunjukkan dampak konkret dari masalah tersebut');
  promptParts.push('4. Menawarkan solusi yang relevan dan menarik');
  promptParts.push('5. Menjelaskan benefit dan value proposition dengan jelas');
  promptParts.push('6. Memiliki call-to-action yang jelas, persuasif, dan actionable');
  promptParts.push('');
  promptParts.push('**⚠️ WAJIB DIPENUHI:**');
  promptParts.push('- Semua field yang diisi HARUS muncul dan dieksplorasi dalam script (Keinginan, Kebutuhan, Hidden Needs, Problem, Impact, Solution)');
  if (request.kebutuhan) {
    promptParts.push(`- Pastikan "Kebutuhan (Needs)" jelas ter-explore dan dijelaskan bagaimana solusi memenuhi kebutuhan ini: ${request.kebutuhan}`);
    promptParts.push('  - Jangan hanya menyebutkan kebutuhan, tapi jelaskan secara spesifik bagaimana produk/layanan mengatasi kebutuhan tersebut');
    promptParts.push('  - Tunjukkan fitur atau metode konkret yang menjawab kebutuhan tersebut');
  }
  if (request.hidden_needs_1 || request.hidden_needs_2) {
    promptParts.push('- Hidden Needs harus dijelaskan dan dihubungkan dengan solusi yang ditawarkan');
    promptParts.push('  - Jelaskan bagaimana solusi secara spesifik mengatasi Hidden Needs tersebut');
    promptParts.push('  - Tunjukkan koneksi yang jelas antara hidden needs dan benefit dari solusi');
    if (request.hidden_needs_1) {
      promptParts.push(`  - Hidden Needs 1: ${cleanLabelDuplication(request.hidden_needs_1, 'Hidden Needs 1')}`);
    }
    if (request.hidden_needs_2) {
      promptParts.push(`  - Hidden Needs 2: ${cleanLabelDuplication(request.hidden_needs_2, 'Hidden Needs 2')}`);
    }
  }
  if (request.content_pillar) {
    const pillarLower = request.content_pillar.toLowerCase();
    if (pillarLower.includes('compar') || pillarLower.includes('banding')) {
      promptParts.push(`- Content Pillar "${request.content_pillar}" HARUS dieksplorasi dengan perbandingan yang jelas dan konkret`);
    } else if (pillarLower.includes('q&a') || pillarLower.includes('qa') || pillarLower.includes('tanya') || pillarLower.includes('jawab')) {
      promptParts.push(`- Content Pillar "${request.content_pillar}" HARUS menggunakan format Q&A (Tanya-Jawab) secara konsisten sepanjang script`);
      promptParts.push('  - Format Q&A harus terlihat jelas di setiap section, bukan hanya di awal');
    }
  }
  promptParts.push('- Solution harus spesifik dan konkret, tidak generic. Jelaskan fitur, platform, atau keunggulan yang jelas dari produk/layanan.');
  promptParts.push('  - Sebutkan nama platform, fitur spesifik, atau metode yang konkret, bukan hanya konsep umum');
  promptParts.push('  - Berikan detail yang bisa diukur atau divisualisasikan (contoh: "jangkauan 1 juta pengguna", "targeting ke audience X", dll)');
  promptParts.push('');
  
  // Use style_name for instruction 7 - keep it short, details already in Style & Struktur section
  if (request.style_name) {
    promptParts.push(`7. Menggunakan style: ${request.style_name} (lihat detail di bagian Style & Struktur)`);
  } else if (request.style_instruksi) {
    promptParts.push(`7. Menggunakan style sesuai instruksi di bagian Style & Struktur`);
  }
  
  // Keep structure reference short
  if (request.structure) {
    const instructionNumber = (request.style_name || request.style_instruksi) ? '8' : '7';
    promptParts.push(`${instructionNumber}. Mengikuti struktur yang telah dijelaskan di bagian Style & Struktur`);
  }
  
  promptParts.push('');
  promptParts.push('## Format Output Script');
  
  // Format output berdasarkan content type
  const contentTypeLower = (request.content_type || '').toLowerCase();
  
  if (contentTypeLower === 'carousel' || contentTypeLower === 'post') {
    if (request.slide) {
      promptParts.push(`Untuk format ${request.content_type} dengan ${request.slide} slide, berikan output dalam format berikut:`);
      promptParts.push('');
      promptParts.push('1. **Judul Script** (singkat dan menarik)');
      promptParts.push('2. **Format & Style** (format konten dan tone)');
      promptParts.push(`3. **Breakdown per Slide** (untuk setiap slide dari ${request.slide} slide, berikan:`);
      promptParts.push('   - **Visual Suggestion:** Deskripsi singkat visual/gambar yang sesuai');
      promptParts.push('   - **Copy:** Teks/konten yang akan ditampilkan di slide tersebut');
      promptParts.push('   - **Element tambahan:** (jika ada) seperti hashtag, CTA, dll');
      promptParts.push('');
      promptParts.push('Pastikan setiap slide memiliki alur yang jelas dan saling terhubung.');
    } else {
      promptParts.push(`Untuk format ${request.content_type}, berikan output dalam format:`);
      promptParts.push('');
      promptParts.push('- **Judul Script**');
      promptParts.push('- **Visual Suggestion** (deskripsi singkat visual)');
      promptParts.push('- **Copy/Konten** (teks lengkap untuk konten)');
    }
  } else if (contentTypeLower === 'reel' || contentTypeLower === 'story' || contentTypeLower === 'youtube') {
    const duration = request.duration_value ? `${request.duration_value} ${request.duration_unit || 'menit'}` : 
                     request.duration_minutes ? `${request.duration_minutes} menit` : 'sesuai durasi';
    
    // Calculate total seconds
    let totalSeconds = 60; // default 60 seconds
    if (request.duration_value) {
      totalSeconds = request.duration_unit === 'detik' 
        ? request.duration_value 
        : request.duration_value * 60;
    } else if (request.duration_minutes) {
      totalSeconds = request.duration_minutes * 60;
    }
    
    promptParts.push(`Untuk format ${request.content_type} dengan durasi ${duration} (total ${totalSeconds} detik), berikan output dalam format berikut:`);
    promptParts.push('');
    promptParts.push('1. **Judul Script** (singkat dan menarik)');
    promptParts.push('2. **Format & Style** (format konten dan tone)');
    promptParts.push('3. **Breakdown Script dengan Timing (HARUS SESUAI TOTAL DURASI):**');
    promptParts.push('');
    
    // Adjust timing suggestions based on total duration
    if (totalSeconds <= 60) {
      // For 1 minute or less - very condensed
      promptParts.push('   - **Hook (0-5 detik):** Opening yang sangat kuat dan menarik');
      promptParts.push('   - **Introduction/Context (5-15 detik):** Konteks singkat');
      promptParts.push('   - **Problem Statement (15-30 detik):** Masalah utama');
      promptParts.push('   - **Impact (30-40 detik):** Dampak dari masalah');
      promptParts.push('   - **Solution (40-50 detik):** Solusi yang ditawarkan');
      promptParts.push('   - **Benefits/Value (50-55 detik):** Benefit utama');
      promptParts.push('   - **CTA (55-' + totalSeconds + ' detik):** Call to action yang jelas dan singkat');
      promptParts.push('');
      promptParts.push('   **⚠️ PENTING:** Total durasi SEMUA bagian HARUS tepat ' + totalSeconds + ' detik. Setiap bagian harus sangat ringkas dan impactful. Prioritaskan kejelasan daripada panjang penjelasan.');
    } else if (totalSeconds <= 120) {
      // For 1-2 minutes
      promptParts.push('   - **Hook (0-10 detik):** Opening yang menarik');
      promptParts.push('   - **Introduction/Context (10-20 detik):** Konteks');
      promptParts.push('   - **Problem Statement (20-45 detik):** Masalah utama');
      promptParts.push('   - **Impact (45-65 detik):** Dampak dari masalah');
      promptParts.push('   - **Solution (65-90 detik):** Solusi yang ditawarkan');
      promptParts.push('   - **Benefits/Value (90-105 detik):** Benefit utama');
      promptParts.push('   - **CTA (105-' + totalSeconds + ' detik):** Call to action');
      promptParts.push('');
      promptParts.push('   **⚠️ PENTING:** Total durasi SEMUA bagian HARUS tepat ' + totalSeconds + ' detik.');
    } else if (totalSeconds <= 180) {
      // For 2-3 minutes
      promptParts.push('   - **Hook (0-15 detik):** Opening yang menarik');
      promptParts.push('   - **Introduction/Context (15-30 detik):** Konteks');
      promptParts.push('   - **Problem Statement (30-60 detik):** Masalah utama');
      promptParts.push('   - **Impact (60-90 detik):** Dampak dari masalah');
      promptParts.push('   - **Solution (90-130 detik):** Solusi yang ditawarkan');
      promptParts.push('   - **Benefits/Value (130-160 detik):** Benefit utama');
      promptParts.push('   - **CTA (160-' + totalSeconds + ' detik):** Call to action');
      promptParts.push('');
      promptParts.push('   **⚠️ PENTING:** Total durasi SEMUA bagian HARUS tepat ' + totalSeconds + ' detik.');
    } else {
      // For longer videos
      promptParts.push('   - Bagian Hook, Introduction, Problem Statement, Impact, Solution, Benefits/Value, dan CTA');
      promptParts.push('   - **⚠️ PENTING:** Distribusikan waktu secara proporsional dengan total durasi ' + totalSeconds + ' detik');
    }
    
    promptParts.push('');
    promptParts.push('4. **Visual Suggestions:** Untuk setiap bagian, berikan deskripsi visual/adegan yang spesifik, termasuk:');
    promptParts.push('   - Jenis visual/graphic yang ditampilkan');
    promptParts.push('   - Text overlay yang diperlukan');
    promptParts.push('   - Transisi antar bagian');
    promptParts.push('   - Ekspresi/gesture host (jika menggunakan host)');
    promptParts.push('');
    
    if (totalSeconds <= 60) {
      promptParts.push('5. **Hook Priority:** Untuk video pendek (' + totalSeconds + ' detik), hook HARUS sangat menarik di 3-5 detik pertama agar viewer tidak scroll. Setiap detik sangat berharga.');
    } else {
      promptParts.push('5. **Hook Priority:** Prioritaskan hook yang menarik di 5 detik pertama');
    }
    
    promptParts.push('');
    promptParts.push('**PANDUAN TIMING:**');
    promptParts.push('- ⚠️ **KRITIS:** Total durasi SEMUA bagian HARUS tepat ' + totalSeconds + ' detik, tidak lebih tidak kurang');
    if (totalSeconds <= 60) {
      promptParts.push('- Untuk video pendek (≤60 detik), setiap section harus sangat ringkas dan impactful');
      promptParts.push('- Jangan membuat section terlalu panjang, prioritaskan kejelasan dan impact');
    }
    promptParts.push('- CTA harus jelas dan actionable, tidak perlu terlalu panjang');
    promptParts.push('- Jika perlu mengurangi durasi suatu bagian, prioritaskan untuk mempertahankan hook dan CTA yang kuat');
  } else {
    promptParts.push('Berikan output script dalam format yang jelas dan terstruktur, dengan breakdown per bagian/section.');
  }
  
  promptParts.push('');
  promptParts.push('**Catatan Penting:**');
  promptParts.push('- Pastikan script mudah dipahami, engaging, dan sesuai dengan target audience');
  promptParts.push('- Gunakan bahasa yang natural dan conversational');
  promptParts.push('- Panjang script harus sesuai dengan durasi/format yang ditentukan');
  promptParts.push('- Visual suggestion harus relevan dan membantu visualisasi konten');
  promptParts.push('- Copy harus mudah dibaca dan dipahami, tidak terlalu panjang per slide/section');
  
  return promptParts.join('\n');
}

