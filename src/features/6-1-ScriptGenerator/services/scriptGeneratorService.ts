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
  hook_name?: string; // Hook name selected from dropdown
  hook_description?: string; // Hook description (read-only)
  hook_content?: string; // Hook content (read-only)
  style_name?: string; // Style name selected from dropdown
  style_instruksi?: string; // Style description/instruction
  structure?: string;
  judul?: string; // Title template selected from dropdown
  judul_custom?: string; // Custom title if user wants to edit the template
  selling_approach?: 'Tanpa Produk' | 'Soft Selling' | 'Hard Selling'; // Selling approach: no product, soft selling, or hard selling
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
  
  // Opening - Simple and clear
  promptParts.push('Anda adalah ahli copywriter digital marketing. Buatkan script konten digital marketing berdasarkan informasi detail di bawah ini.');
  promptParts.push('=================================================================================================================================');
  promptParts.push('');
  promptParts.push('PENTING:');
  promptParts.push('1. Baca SEMUA informasi dengan teliti sebelum membuat script');
  promptParts.push('2. Buat Caption setelah script selesai');
  promptParts.push('3. Pastikan output mudah dibaca dengan struktur yang jelas');
  promptParts.push('');
  promptParts.push('INFORMASI DETAIL UNTUK SCRIPT');
  promptParts.push('==============================');
  promptParts.push('');
  
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
      promptParts.push('- Bandingkan secara spesifik dengan DATA dan ANGKA yang terukur dalam hal: fitur, hasil, biaya, waktu, atau manfaat');
      promptParts.push('- Setiap poin perbandingan HARUS disertai dengan angka konkret (contoh: "50x lebih luas", "hemat 70%", "hemat 35 jam per minggu")');
      promptParts.push('- Format perbandingan: "Metode Lama: [angka/kondisi] → Solusi: [angka/kondisi] (perbandingan: [Xx lebih baik/hemat Y%])"');
      promptParts.push('- Tunjukkan perbedaan yang jelas dengan visual comparison (side-by-side, before-after) yang detail dan spesifik');
      promptParts.push('- Pastikan perbandingan relevan dengan konteks produk/layanan dan target audience yang sudah ditentukan');
      promptParts.push('- Jangan hanya menyebutkan perbedaan secara umum, tapi berikan detail spesifik dan terukur untuk setiap aspek yang dibandingkan');
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
    promptParts.push('=====================');
    promptParts.push('');
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
    promptParts.push('=========================');
    promptParts.push('');
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
    promptParts.push('=======================');
    promptParts.push('');
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
    promptParts.push('=========');
    promptParts.push(`${request.solution}`);
    promptParts.push('');
    promptParts.push('**⚠️ PENTING:** Dalam script, solusi harus dijelaskan secara spesifik dan konkret. Tunjukkan fitur, keunggulan, atau metode yang jelas dari produk/layanan. Hindari penjelasan yang terlalu generic.');
    promptParts.push('');
  }
  
  // Selling Approach
  if (request.selling_approach) {
    promptParts.push('## Pendekatan Penjualan');
    promptParts.push('===================');
    promptParts.push('');
    if (request.selling_approach === 'Tanpa Produk') {
      promptParts.push('- **Pendekatan:** Tanpa Produk');
      promptParts.push('- **Instruksi:** Script TIDAK BOLEH membahas produk/layanan sama sekali. Fokus pada edukasi, informasi umum, atau konten yang memberikan value dan experience tanpa menyebutkan produk/layanan spesifik.');
      promptParts.push('  - Jangan menyebutkan nama produk, layanan, fitur, atau keunggulan produk');
      promptParts.push('  - Fokus pada memberikan insight, tips, atau informasi yang bermanfaat untuk audience');
      promptParts.push('  - Jika perlu menyebutkan solusi, gunakan solusi umum atau konsep, bukan produk spesifik');
      promptParts.push('  - Script harus memberikan value tanpa ada unsur promosi produk');
    } else if (request.selling_approach === 'Soft Selling') {
      promptParts.push('- **Pendekatan:** Soft Selling');
      promptParts.push('- **Instruksi:** Script boleh membahas produk/layanan tetapi dengan pendekatan yang sangat soft dan tidak agresif.');
      promptParts.push('  - Sebutkan produk/layanan secara subtle dan natural, tidak terlalu menonjol');
      promptParts.push('  - Fokus pada Experience, value dan benefit untuk audience, bukan pada fitur produk secara detail');
      promptParts.push('  - Gunakan bahasa yang lebih edukatif dan informatif daripada promosi');
      promptParts.push('  - Hindari hard sell, pressure, atau urgency yang berlebihan');
      promptParts.push('  - Produk/layanan disebutkan sebagai bagian dari solusi, bukan sebagai fokus utama');
      promptParts.push('  - Gunakan pendekatan storytelling atau edukasi yang mengarah ke produk secara halus');
    } else if (request.selling_approach === 'Hard Selling') {
      promptParts.push('- **Pendekatan:** Hard Selling');
      promptParts.push('- **Instruksi:** Script harus 100% fokus pada produk/layanan, keunggulan, dan fitur-fitur spesifik.');
      promptParts.push('  - Sebutkan produk/layanan dengan jelas dan menonjol');
      promptParts.push('  - Jelaskan fitur-fitur spesifik produk/layanan secara detail dan konkret');
      promptParts.push('  - Tunjukkan keunggulan kompetitif dan value proposition yang jelas');
      promptParts.push('  - Gunakan bahasa yang persuasif dan menunjukkan urgency jika relevan');
      promptParts.push('  - Fokus pada bagaimana produk/layanan mengatasi masalah dan memberikan benefit spesifik');
      promptParts.push('  - Jelaskan cara kerja fitur-fitur utama dengan detail');
      promptParts.push('  - Bandingkan dengan alternatif lain jika relevan untuk menunjukkan keunggulan');
      promptParts.push('  - CTA harus jelas dan langsung mengarah ke produk/layanan');
    }
    promptParts.push('');
  }
  
  // Hook Information
  if (request.hook_name || request.hook_content) {
    promptParts.push('## Hook untuk Script');
    promptParts.push('=====================');
    promptParts.push('');
    if (request.hook_name) {
      promptParts.push(`- **Nama Hook:** ${request.hook_name}`);
    }
    if (request.hook_description) {
      promptParts.push(`- **Deskripsi Hook:** ${request.hook_description}`);
    }
    if (request.hook_content) {
      promptParts.push(`- **Konten Hook:** ${request.hook_content}`);
      promptParts.push('');
      promptParts.push('**⚠️ PENTING untuk Hook:**');
      promptParts.push('========================');
      promptParts.push('');
      promptParts.push('- Gunakan konten hook di atas sebagai referensi untuk membuat opening/hook yang menarik di awal script');
      promptParts.push('- Hook HARUS sangat RINGKAS dan IMPACTFUL - maksimal 1-2 kalimat untuk video (3-5 detik) atau 1 kalimat untuk post/carousel');
      promptParts.push('- Susun ulang konten hook dengan bahasa yang lebih natural, mudah dipahami, dan engaging - jangan copy-paste langsung');
      promptParts.push('- Jika hook content berisi template seperti "Inilah alasan kenapa [X] dari pada [Y]", adaptasi dengan konteks produk/layanan yang spesifik');
      promptParts.push('- Hook harus langsung menarik perhatian dalam 3-5 detik pertama (untuk video) atau di baris pertama (untuk post/carousel)');
      promptParts.push('- Pastikan hook relevan dengan konteks produk/layanan dan target audience yang sudah ditentukan');
      promptParts.push('- Jika hook content berisi poin-poin, ubah menjadi kalimat yang mengalir dan conversational');
      promptParts.push('- Hook harus memicu curiosity atau menunjukkan value proposition dengan jelas');
      promptParts.push('- Gunakan pause efektif setelah hook (1-2 detik) untuk membangun tension sebelum melanjutkan');
    }
    promptParts.push('');
  }
  
  // Style & Structure
  if (request.style_instruksi || request.structure || request.style_name) {
    promptParts.push('## Style & Struktur');
    promptParts.push('====================');
    promptParts.push('');
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
      
      // Add specific instructions for "Tarik-Tahan-Tembak" structure
      const structureLower = request.structure.toLowerCase();
      if (structureLower.includes('tarik') && structureLower.includes('tahan') && structureLower.includes('tembak')) {
        promptParts.push('');
        promptParts.push('**⚠️ PENTING untuk Struktur "Tarik-Tahan-Tembak":**');
        promptParts.push('- **TARIK (Bagian Awal):** Buka dengan pertanyaan/statement yang memicu curiosity, lalu PAUSE 2-3 detik untuk membangun tension');
        promptParts.push('- **TAHAN (Bagian Tengah):** Detail masalah dan dampak dengan intensitas yang meningkat, PAUSE 1-2 detik sebelum solusi');
        promptParts.push('- **TEMBAK (Bagian Akhir):** Solusi muncul dengan momentum kuat, langsung ke benefit dan CTA');
        promptParts.push('- Timing pause sangat penting: gunakan pause efektif untuk membangun anticipation, bukan hanya label "TARIK/TAHAN/TEMBAK"');
        promptParts.push('- Struktur ini harus terasa sebagai pola narasi yang natural, bukan sekadar label di script');
      }
    } else if (request.style_name) {
      // If only style_name exists without structure
      promptParts.push(`- **Struktur Script:** ${request.style_name}`);
    }
    promptParts.push('');
  }
  
  // Instructions for ChatGPT - More focused and concise
  promptParts.push('## Instruksi');
  promptParts.push('=============');
  promptParts.push('');
  promptParts.push('Berdasarkan informasi di atas, buatkan script konten digital marketing yang:');
  if (request.hook_content) {
    promptParts.push('1. Menggunakan hook yang sudah disediakan di bagian "Hook untuk Script" sebagai dasar, kemudian susun ulang dengan bahasa yang lebih natural, mudah dipahami, dan engaging untuk menarik perhatian di awal');
  } else {
    promptParts.push('1. Menarik perhatian di awal (hook yang kuat dan relevan)');
  }
  promptParts.push('2. Menjelaskan masalah dengan jelas sesuai konteks target audience');
  promptParts.push('3. Menunjukkan dampak konkret dari masalah tersebut');
  if (request.selling_approach === 'Tanpa Produk') {
    promptParts.push('4. Menawarkan solusi umum yang relevan dan menarik, TIDAK menyebutkan produk/layanan spesifik');
    promptParts.push('5. Menjelaskan benefit dan value dari solusi secara umum, tanpa promosi produk');
    promptParts.push('6. Memiliki call-to-action yang edukatif dan informatif, bukan promosi produk');
  } else if (request.selling_approach === 'Soft Selling') {
    promptParts.push('4. Menawarkan solusi yang relevan dan menarik dengan pendekatan soft, produk/layanan disebutkan secara subtle');
    promptParts.push('5. Menjelaskan benefit dan value proposition dengan fokus pada value untuk audience, bukan detail produk');
    promptParts.push('6. Memiliki call-to-action yang soft dan tidak agresif, lebih mengarah ke edukasi atau informasi');
  } else if (request.selling_approach === 'Hard Selling') {
    promptParts.push('4. Menawarkan solusi produk/layanan yang relevan dan menarik dengan fokus pada produk');
    promptParts.push('5. Menjelaskan benefit dan value proposition produk/layanan dengan jelas dan detail');
    promptParts.push('6. Memiliki call-to-action yang jelas, persuasif, dan langsung mengarah ke produk/layanan');
  } else {
    promptParts.push('4. Menawarkan solusi yang relevan dan menarik');
    promptParts.push('5. Menjelaskan benefit dan value proposition dengan jelas');
    promptParts.push('6. Memiliki call-to-action yang jelas, persuasif, dan actionable');
  }
  promptParts.push('');
  promptParts.push('');
  promptParts.push('**⚠️ WAJIB DIPENUHI:**');
  promptParts.push('====================');
  promptParts.push('');
  promptParts.push('- Semua field yang diisi HARUS muncul dan dieksplorasi dalam script (Keinginan, Kebutuhan, Hidden Needs, Problem, Impact, Solution)');
  if (request.kebutuhan) {
    promptParts.push(`- Pastikan "Kebutuhan (Needs)" jelas ter-explore dan dijelaskan bagaimana solusi memenuhi kebutuhan ini: ${request.kebutuhan}`);
    if (request.selling_approach === 'Tanpa Produk') {
      promptParts.push('  - Jelaskan bagaimana solusi umum atau konsep mengatasi kebutuhan tersebut, tanpa menyebutkan produk/layanan spesifik');
    } else if (request.selling_approach === 'Soft Selling') {
      promptParts.push('  - Jelaskan secara soft bagaimana solusi mengatasi kebutuhan tersebut, fokus pada benefit bukan detail teknis');
    } else {
      promptParts.push('  - Jangan hanya menyebutkan kebutuhan, tapi jelaskan secara spesifik bagaimana produk/layanan mengatasi kebutuhan tersebut');
      promptParts.push('  - Tunjukkan fitur atau metode konkret yang menjawab kebutuhan tersebut');
    }
  }
  if (request.hidden_needs_1 || request.hidden_needs_2) {
    promptParts.push('- Hidden Needs harus di jawab Dengan emosional Hook');
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
      promptParts.push(`- Content Pillar "${request.content_pillar}" HARUS dieksplorasi dengan perbandingan yang jelas dan konkret dengan DATA/ANGKA`);
      promptParts.push(`  - Setiap poin perbandingan HARUS disertai angka terukur (contoh: "50x lebih luas", "hemat 70%", "naik 50x lipat")`);
      promptParts.push(`  - Format perbandingan: "Metode Lama: [angka/kondisi] → Solusi: [angka/kondisi] (perbandingan: [Xx lebih baik/hemat Y%])"`);
    } else if (pillarLower.includes('q&a') || pillarLower.includes('qa') || pillarLower.includes('tanya') || pillarLower.includes('jawab')) {
      promptParts.push(`- Content Pillar "${request.content_pillar}" HARUS menggunakan format Q&A (Tanya-Jawab) secara konsisten sepanjang script`);
      promptParts.push('  - Format Q&A harus terlihat jelas di setiap section, bukan hanya di awal');
    }
  }
  // Check if content pillar is Story Telling or Motivational
  const pillarLowerForSolution = (request.content_pillar || '').toLowerCase();
  const isStoryOrMotivational = pillarLowerForSolution.includes('story') || pillarLowerForSolution.includes('motivational') || pillarLowerForSolution.includes('motivasi');
  
  // Adjust solution instructions based on selling approach
  if (request.selling_approach === 'Tanpa Produk') {
    promptParts.push('- Solution: Jelaskan solusi secara umum dan konseptual, TIDAK menyebutkan produk/layanan spesifik');
    promptParts.push('  - Fokus pada solusi umum, metode, atau pendekatan yang bisa diterapkan secara luas');
    promptParts.push('  - Hindari menyebutkan nama produk, platform, atau layanan spesifik');
    promptParts.push('  - Gunakan bahasa yang edukatif dan informatif tentang solusi secara umum');
  } else if (request.selling_approach === 'Soft Selling') {
    if (!isStoryOrMotivational) {
      promptParts.push('- Solution: Jelaskan solusi dengan pendekatan soft, fokus pada benefit dan value untuk audience');
      promptParts.push('  - Sebutkan produk/layanan secara subtle dan natural');
      promptParts.push('  - Fokus pada bagaimana solusi mengatasi masalah, bukan detail teknis fitur');
      promptParts.push('  - Gunakan bahasa yang lebih edukatif daripada promosi');
      promptParts.push('  - Hindari terlalu detail tentang spesifikasi teknis atau fitur-fitur spesifik');
    } else {
      promptParts.push('- Solution: Jelaskan solusi dengan cara yang sesuai dengan pillar Story Telling atau Motivational (tidak perlu detail fitur spesifik)');
    }
  } else if (request.selling_approach === 'Hard Selling') {
    if (!isStoryOrMotivational) {
      promptParts.push('- Solution HARUS sangat spesifik dan konkret, tidak generic. Jelaskan fitur, platform, atau keunggulan yang jelas dari produk/layanan.');
      promptParts.push('  - Sebutkan nama platform, fitur spesifik, atau metode yang konkret, bukan hanya konsep umum');
      promptParts.push('  - Untuk setiap fitur yang disebutkan, jelaskan CARA KERJANYA secara singkat (contoh: "Sistem otomatis match event dengan audience yang sesuai demografi" bukan hanya "Sistem matching")');
      promptParts.push('  - Berikan detail yang bisa diukur atau divisualisasikan (contoh: "jangkauan 1 juta pengguna", "targeting ke audience X", dll)');
      promptParts.push('  - Jika ada multiple fitur, jelaskan satu per satu dengan format: "Fitur #1: [nama] - Cara kerja: [penjelasan singkat]"');
      promptParts.push('  - Tunjukkan keunggulan kompetitif dan value proposition yang jelas');
    } else {
      promptParts.push('- Solution: Jelaskan solusi dengan cara yang sesuai dengan pillar Story Telling atau Motivational, tetapi tetap fokus pada produk/layanan dan keunggulannya');
    }
  } else {
    // Default behavior (no selling approach selected)
    if (!isStoryOrMotivational) {
      promptParts.push('- Solution HARUS sangat spesifik dan konkret, tidak generic. Jelaskan fitur, platform, atau keunggulan yang jelas dari produk/layanan. (Penjelasan Fitur spesifik dan lengkap Tidak Berlaku untuk pillar Story telling dan Pilar Motivational)');
      promptParts.push('  - Sebutkan nama platform, fitur spesifik, atau metode yang konkret, bukan hanya konsep umum (Penjelasan Fitur spesifik dan lengkap Tidak Berlaku untuk pillar Story telling dan Pilar Motivational)');
      promptParts.push('  - Untuk setiap fitur yang disebutkan, jelaskan CARA KERJANYA secara singkat (contoh: "Sistem otomatis match event dengan audience yang sesuai demografi" bukan hanya "Sistem matching") > (Penjelasan Fitur spesifik dan lengkap Tidak Berlaku untuk pillar Story telling dan Pilar Motivational)');
      promptParts.push('  - Berikan detail yang bisa diukur atau divisualisasikan (contoh: "jangkauan 1 juta pengguna", "targeting ke audience X", dll)');
      promptParts.push('  - Jika ada multiple fitur, jelaskan satu per satu dengan format: "Fitur #1: [nama] - Cara kerja: [penjelasan singkat]"');
    } else {
      promptParts.push('- Solution: Jelaskan solusi dengan cara yang sesuai dengan pillar Story Telling atau Motivational (tidak perlu detail fitur spesifik)');
    }
  }
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
    
    // Add reminder for Tarik-Tahan-Tembak structure
    const structureLower = request.structure.toLowerCase();
    if (structureLower.includes('tarik') && structureLower.includes('tahan') && structureLower.includes('tembak')) {
      promptParts.push('');
      promptParts.push('**⚠️ PENTING - Penerapan Struktur "Tarik-Tahan-Tembak":**');
      promptParts.push('- Struktur ini HARUS terasa sebagai pola narasi yang natural, bukan sekadar label');
      promptParts.push('- Gunakan PAUSE efektif untuk membangun tension: pause 2-3 detik setelah hook, pause 1-2 detik sebelum solusi');
      promptParts.push('- Timing pause sangat penting untuk membangun anticipation dan engagement');
    }
  }
  
  promptParts.push('');
  
  // Judul Information
  if (request.judul || request.judul_custom) {
    const judulToUse = request.judul_custom || request.judul || '';
    promptParts.push('## Judul Script');
    promptParts.push(`- **Template Judul:** ${judulToUse}`);
    promptParts.push('');
    promptParts.push('**⚠️ PENTING untuk Judul:**');
    promptParts.push('- Gunakan template judul di atas sebagai dasar untuk membuat judul script yang menarik');
    promptParts.push('- Ganti semua teks dalam kurung siku [ ] dengan konten yang relevan dengan produk/layanan, target audience, dan konteks script');
    promptParts.push('- Jika template berisi [#], ganti dengan angka konkret (contoh: "5 Tips", "10 Cara")');
    promptParts.push('- Jika template berisi [#%], ganti dengan persentase konkret (contoh: "90% Orang", "75% Pelanggan")');
    promptParts.push('- Jika template berisi [#Tanda], ganti dengan tanda/ikon yang relevan (contoh: "⚠️ Peringatan", "🚨 Alert")');
    promptParts.push('- Judul harus ringkas, menarik, dan sesuai dengan konten script yang akan dibuat');
    promptParts.push('- Pastikan judul relevan dengan target audience dan produk/layanan yang ditawarkan');
    promptParts.push('');
  }
  
  promptParts.push('## Format Output Script');
  
  // Format output berdasarkan content type
  const contentTypeLower = (request.content_type || '').toLowerCase();
  
  if (contentTypeLower === 'carousel' || contentTypeLower === 'post') {
    if (request.slide) {
      promptParts.push(`Untuk format ${request.content_type} dengan ${request.slide} slide, berikan output dalam format berikut:`);
      promptParts.push('');
      promptParts.push('**Gunakan garis pembatas untuk setiap section:**');
      promptParts.push('');
      if (request.judul || request.judul_custom) {
        promptParts.push('1. **Judul Script** (gunakan template judul yang sudah disediakan, ganti [ ] dengan konten yang relevan)');
      } else {
        promptParts.push('1. **Judul Script** (singkat dan menarik)');
      }
      promptParts.push('2. **Format & Style** (format konten dan tone)');
      promptParts.push(`3. **Breakdown per Slide** (untuk setiap slide dari ${request.slide} slide, berikan:`);
      promptParts.push('   - **Visual Suggestion:** Deskripsi singkat visual/gambar yang sesuai');
      promptParts.push('   - **Copy:** Teks/konten yang akan ditampilkan di slide tersebut');
      promptParts.push('   - **Element tambahan:** (jika ada) seperti hashtag, CTA, dll');
      promptParts.push('');
      promptParts.push('   **Gunakan sub-separator (───) di antara setiap slide untuk memudahkan pembacaan**');
      promptParts.push('');
      promptParts.push('Pastikan setiap slide memiliki alur yang jelas dan saling terhubung.');
    } else {
      promptParts.push(`Untuk format ${request.content_type}, berikan output dalam format:`);
      promptParts.push('');
      promptParts.push('**Gunakan garis pembatas untuk setiap section:**');
      promptParts.push('');
      if (request.judul || request.judul_custom) {
        promptParts.push('- **Judul Script** (gunakan template judul yang sudah disediakan, ganti [ ] dengan konten yang relevan)');
      } else {
        promptParts.push('- **Judul Script**');
      }
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
    if (request.judul || request.judul_custom) {
      promptParts.push('1. **Judul Script** (gunakan template judul yang sudah disediakan, ganti [ ] dengan konten yang relevan)');
    } else {
      promptParts.push('1. **Judul Script** (singkat dan menarik)');
    }
    promptParts.push('2. **Format & Style** (format konten dan tone)');
    promptParts.push('3. **Breakdown Script dengan Timing (HARUS SESUAI TOTAL DURASI):**');
    promptParts.push('4. Menggunakan Voice Over (VO)');
    promptParts.push('');
    promptParts.push('   **⚠️ PENTING:** Total durasi SEMUA bagian HARUS tepat ' + totalSeconds + ' detik. Setiap bagian harus sangat ringkas dan impactful. Prioritaskan kejelasan daripada panjang penjelasan.');
    
    promptParts.push('');
    promptParts.push('4. **Visual Suggestions:** Untuk setiap bagian, berikan deskripsi visual/adegan yang SANGAT SPESIFIK dan DETAIL, termasuk:');
    promptParts.push('   - **Frame-by-frame breakdown:** Untuk setiap detik/range waktu, jelaskan visual apa yang muncul');
    promptParts.push('   - **Jenis visual/graphic yang ditampilkan:** Spesifik (contoh: "Split screen dengan animasi smooth", "Grafik naik dengan efek particle", bukan hanya "grafik")');
    promptParts.push('   - **Text overlay yang diperlukan:** Font, ukuran, warna, posisi, dan animasi (contoh: "Font bold, warna kontras merah vs hijau, muncul dari bawah dengan fade-in")');
    promptParts.push('   - **Transisi antar bagian:** Jenis transisi spesifik (contoh: "Smooth fade", "Slide dari kiri", "Zoom in")');
    promptParts.push('   - **Ekspresi/gesture host:** Detail ekspresi dan gesture (contoh: "Ekspresi \'aku punya rahasia\', menunjuk ke perbandingan di belakang")');
    promptParts.push('   - **Background/Setting:** Detail latar belakang (contoh: "Background blur dengan logo di belakang", "Split screen dengan kontras jelas")');
    promptParts.push('   - **SFX/Music cues:** Kapan sound effect atau musik berubah (contoh: "SFX suspense sound + musik building tension di hook")');
    promptParts.push('');
    promptParts.push('**PANDUAN TIMING:**');
    promptParts.push('- ⚠️ **KRITIS:** Total durasi SEMUA bagian HARUS tepat ' + totalSeconds + ' detik, tidak lebih tidak kurang');
    if (totalSeconds <= 60) {
      promptParts.push('- Untuk video pendek (≤60 detik), setiap section harus sangat ringkas dan impactful');
      promptParts.push('- Jangan membuat section terlalu panjang, prioritaskan kejelasan dan impact');
    }
    promptParts.push('- **CTA HARUS sangat jelas, urgent, dan actionable:**');
    promptParts.push('  - Sebutkan benefit spesifik dari CTA (contoh: "FREE ROI Calculator", "FREE 30 menit strategy session")');
    promptParts.push('  - Tambahkan sense of urgency (contoh: "Cuma untuk 5 pertama", "Slot terbatas", "Hari ini saja")');
    promptParts.push('  - CTA harus spesifik dan mudah diikuti (contoh: "KOMEN \'COMPARE\' sekarang!" bukan hanya "Hubungi kami")');
    promptParts.push('  - Panjang CTA: untuk video ≤60 detik, maksimal 5 detik; untuk video lebih panjang, maksimal 10 detik');
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
  promptParts.push('');
  promptParts.push('CAPTION - WAJIB DIBUAT:');
  promptParts.push('');
  promptParts.push('Setelah script selesai, WAJIB buatkan CAPTION untuk postingan media sosial berdasarkan script yang sudah dibuat.');
  promptParts.push('');
  promptParts.push('1. CAPTION HARUS MENCERMINKAN SEMUA INFORMASI DARI FIELD YANG DIISI:');
  promptParts.push('   - Content Type, Service, Sub Service, Content Pillar');
  promptParts.push('   - Target Market, Gender, Age, Buying Roles');
  promptParts.push('   - Keinginan, Kebutuhan, Hidden Needs');
  promptParts.push('   - Problem, Impact, Solution');
  promptParts.push('   - Hook (jika ada), Style, Structure');
  promptParts.push('');
  promptParts.push('2. FORMAT CAPTION:');
  promptParts.push('   - Panjang: 150-300 kata (sesuai platform: Instagram, Facebook, LinkedIn, dll)');
  promptParts.push('   - Gunakan emoji yang relevan untuk meningkatkan engagement');
  promptParts.push('   - Sertakan call-to-action yang jelas di akhir caption');
  promptParts.push('   - Gunakan hashtag yang relevan (3-5 hashtag untuk Instagram, 1-2 untuk LinkedIn)');
  promptParts.push('   - Pastikan caption mudah dibaca dengan paragraf yang jelas');
  promptParts.push('');
  promptParts.push('3. STRUKTUR CAPTION:');
  promptParts.push('   - Opening/Hook: 1-2 kalimat menarik yang mencerminkan hook dari script');
  promptParts.push('   - Body: Ringkasan masalah, solusi, dan benefit (menggunakan informasi dari semua field)');
  promptParts.push('   - CTA: Call-to-action yang jelas dan actionable');
  promptParts.push('   - Hashtags: Relevan dengan konten dan target audience');
  promptParts.push('');
  promptParts.push('4. GUNAKAN GARIS PEMBATAS UNTUK MEMISAHKAN CAPTION DARI SCRIPT:');
  promptParts.push('   - Format: ═══════════════════════════════════════');
  promptParts.push('   - Letakkan di akhir script, sebelum section Caption');
  promptParts.push('   - Ini membuat Caption mudah dibedakan dari Script');
  promptParts.push('');
  promptParts.push('   [Opening/Hook yang menarik]');
  promptParts.push('');
  promptParts.push('   [Body: Ringkasan masalah, solusi, dan benefit]');
  promptParts.push('');
  promptParts.push('   [CTA yang jelas dan actionable]');
  promptParts.push('');
  promptParts.push('   #hashtag1 #hashtag2 #hashtag3');
  promptParts.push('');
  promptParts.push('5. PASTIKAN CAPTION:');
  promptParts.push('   - Menggunakan bahasa yang natural dan conversational');
  promptParts.push('   - Relevan dengan target audience yang sudah ditentukan');
  promptParts.push('   - Mencerminkan value proposition dari produk/layanan');
  promptParts.push('   - Memiliki tone yang sesuai dengan style yang dipilih');
  promptParts.push('');
  
  return promptParts.join('\n');
}

