-- SJT: seed 12 difficult situational judgment questions (hard scenarios, hard choices).
-- Test id: a1000000-0000-4000-8000-000000000003

INSERT INTO public.sjt_questions (test_id, question_order, scenario_text, option_1_text, option_2_text, option_3_text, option_4_text, best_option_index)
VALUES
  (
    'a1000000-0000-4000-8000-000000000003'::uuid,
    1,
    'Atasan meminta Anda menyiapkan data untuk presentasi besok. Satu sumber data belum diverifikasi; rekan yang bertanggung jawab atas verifikasi sedang cuti. Presentasi ini sangat penting bagi keputusan direksi.',
    'Siapkan data dengan catatan tertulis "perlu verifikasi" dan sampaikan secara lisan saat presentasi.',
    'Siapkan data tanpa catatan agar presentasi terlihat rapi; Anda akan follow-up verifikasi setelahnya.',
    'Tolak menyiapkan sampai data diverifikasi, meski risiko presentasi tertunda.',
    'Serahkan keputusan sepenuhnya ke atasan tanpa memberi rekomendasi tertulis.',
    1
  ),
  (
    'a1000000-0000-4000-8000-000000000003'::uuid,
    2,
    'Anda melihat rekan dekat mengisi form mundur (backdate) untuk klaim yang sebenarnya terlambat. Pelanggaran tidak membahayakan orang lain secara langsung, tetapi melanggar prosedur perusahaan.',
    'Bicara pribadi dengan rekan dan minta ia memperbaiki atau melaporkan sendiri ke atasan.',
    'Laporkan ke atasan tanpa memberi tahu rekan terlebih dahulu.',
    'Abaikan karena dampaknya kecil dan hubungan kerja penting.',
    'Diskusikan dengan rekan; jika ia tidak mau perbaiki, Anda laporkan ke atasan.',
    4
  ),
  (
    'a1000000-0000-4000-8000-000000000003'::uuid,
    3,
    'Anda mendapat dua permintaan mendesak: atasan langsung minta laporan selesai hari ini, sementara atasan dari divisi lain (lebih senior) minta bantuan untuk rapat besok pagi. Keduanya menganggap tugas mereka prioritas.',
    'Selesaikan laporan atasan langsung dulu, lalu sampaikan ke atasan divisi lain bahwa Anda tidak bisa penuh untuk rapat besok.',
    'Bantu atasan divisi lain dulu karena lebih senior, lalu kerjakan laporan semampunya.',
    'Jelaskan konflik prioritas ke kedua atasan dan minta mereka berkoordinasi menentukan urutan.',
    'Kerjakan keduanya paralel tanpa memberi tahu siapa pun agar tidak ada yang kecewa.',
    3
  ),
  (
    'a1000000-0000-4000-8000-000000000003'::uuid,
    4,
    'Rekan satu tim sering terlambat dan atasan belum menyadarinya. Rekan meminta Anda tidak melaporkan karena ia sedang ada masalah keluarga. Performa tim Anda dinilai berdasarkan ketepatan waktu.',
    'Setuju tidak melaporkan untuk sementara dan minta rekan berkomitmen perbaiki; jika tidak berubah, Anda akan laporkan.',
    'Laporkan ke atasan tanpa bicara ke rekan dulu, agar penilaian tim adil.',
    'Abaikan dan biarkan atasan yang menemukan sendiri.',
    'Minta rekan mengajukan cuti atau perpanjangan deadline resmi agar tidak merugikan tim.',
    1
  ),
  (
    'a1000000-0000-4000-8000-000000000003'::uuid,
    5,
    'Atasan meminta Anda memilih antara memenuhi target kuartal (dengan risiko kualitas sedikit turun) atau menjaga kualitas penuh dengan risiko target tidak tercapai. Kedua hasil akan memengaruhi penilaian kinerja Anda.',
    'Penuhi target kuartal dan dokumentasikan area yang dikompromi untuk perbaikan kuartal berikutnya.',
    'Jaga kualitas penuh dan siapkan penjelasan tertulis ke atasan mengapa target tidak tercapai.',
    'Sampaikan dilema ke atasan dengan opsi dan konsekuensi; minta keputusan prioritas secara tertulis.',
    'Usahakan keduanya dengan kerja lembur; jika tidak cukup, baru laporkan ke atasan.',
    3
  ),
  (
    'a1000000-0000-4000-8000-000000000003'::uuid,
    6,
    'Anda mengetahui bahwa rekan senior (yang dekat dengan manajemen) kadang mengambil cuti tanpa mengisi sistem; ia bilang "sudah izin lisan". Kebijakan perusahaan mewajibkan semua cuti tercatat di sistem.',
    'Laporkan ke HR atau atasan karena kebijakan harus berlaku untuk semua.',
    'Bicara ke rekan senior dan minta ia mencatat cuti di sistem agar konsisten.',
    'Abaikan karena bukan wewenang Anda dan bisa merusak hubungan.',
    'Tanyakan ke HR apakah izin lisan boleh dianggap sah; gunakan jawaban itu sebagai dasar tanpa menyebut nama.',
    2
  ),
  (
    'a1000000-0000-4000-8000-000000000003'::uuid,
    7,
    'Klien meminta informasi internal yang sebenarnya tidak boleh dibagikan. Memberi informasi bisa mempertahankan hubungan klien; menolak bisa membuat klien pindah ke kompetitor. Atasan tidak bisa dihubungi saat ini.',
    'Berikan informasi yang tidak sensitif saja dan hindari detail yang rahasia.',
    'Tolak dengan sopan dan jelaskan kebijakan; tawarkan alternatif yang boleh dibagikan.',
    'Tunda jawaban sampai atasan bisa dihubungi.',
    'Berikan informasi agar klien tidak pindah; laporkan ke atasan setelahnya.',
    2
  ),
  (
    'a1000000-0000-4000-8000-000000000003'::uuid,
    8,
    'Anda menemukan kesalahan dalam dokumen yang sudah ditandatangani atasan dan dikirim ke pihak eksternal. Memperbaiki berarti mengakui kesalahan internal; tidak memperbaiki bisa menyesatkan pihak eksternal.',
    'Perbaiki dengan pihak eksternal dan informasikan ke atasan secara internal; usulkan prosedur cek ulang.',
    'Laporkan ke atasan saja dan biarkan atasan yang putuskan apakah akan koreksi ke eksternal.',
    'Abaikan jika kesalahan kecil agar reputasi atasan tidak terganggu.',
    'Koreksi ke pihak eksternal tanpa memberitahu atasan agar tidak mempermalukan atasan.',
    1
  ),
  (
    'a1000000-0000-4000-8000-000000000003'::uuid,
    9,
    'Tim Anda harus memilih: mengerjakan proyek A (disukai atasan) atau proyek B (lebih berdampak untuk pelanggan). Sumber daya hanya cukup untuk satu; atasan belum tahu bahwa B lebih bernilai bagi pelanggan.',
    'Pilih proyek A agar selaras dengan atasan dan hindari konflik.',
    'Sajikan perbandingan dampak A vs B ke atasan dan rekomendasikan B dengan data; minta keputusan atasan.',
    'Pilih proyek B dan jelaskan ke atasan setelah keputusan diambil.',
    'Minta tim voting; ikuti hasil suara mayoritas.',
    2
  ),
  (
    'a1000000-0000-4000-8000-000000000003'::uuid,
    10,
    'Rekan meminjam dokumen rahasia dari meja Anda tanpa izin dan mengembalikannya setelah Anda tanya. Ia bilang butuh referensi cepat. Tidak ada kebocoran, tetapi prosedur jelas dilanggar.',
    'Laporkan ke atasan atau compliance agar tidak terulang.',
    'Bicara ke rekan bahwa hal itu tidak boleh terulang; simpan dokumen rahasia di tempat terkunci ke depan.',
    'Abaikan karena tidak ada dampak dan rekan sudah minta maaf.',
    'Minta rekan menulis permintaan maaf tertulis dan simpan sebagai bukti jika terulang.',
    2
  ),
  (
    'a1000000-0000-4000-8000-000000000003'::uuid,
    11,
    'Atasan meminta Anda menuliskan nama rekan dalam laporan insiden, padahal Anda tidak 100% yakin rekan itu satu-satunya yang bersalah. Rekan bisa kena sanksi berat; atasan ingin laporan selesai cepat.',
    'Tulis nama rekan dengan catatan "berdasarkan informasi saat ini; mungkin perlu investigasi lanjut".',
    'Tolak menulis nama sampai ada investigasi yang lebih jelas.',
    'Tulis nama seperti diminta atasan agar laporan selesai; Anda tidak ingin menghalangi atasan.',
    'Tulis laporan tanpa menyebut nama, hanya deskripsi peran/fakta; minta atasan yang putuskan nama.',
    4
  ),
  (
    'a1000000-0000-4000-8000-000000000003'::uuid,
    12,
    'Anda dijadwalkan presentasi penting besok. Malam ini atasan menelepon minta Anda menggantikannya di rapat lain besok pagi (jam bentrok). Menolak bisa membuat atasan kecewa; menerima berarti presentasi Anda terganggu.',
    'Terima permintaan atasan dan usahakan presentasi Anda digeser atau diringkas.',
    'Tolak dengan sopan dan jelaskan konflik jadwal; tawarkan alternatif (misalnya rekan lain atau catatan singkat).',
    'Terima dan kerjakan keduanya dengan mempersingkat presentasi Anda.',
    'Minta atasan memutuskan prioritas: presentasi Anda atau penggantian rapat.',
    4
  )
ON CONFLICT (test_id, question_order) DO UPDATE SET
  scenario_text = EXCLUDED.scenario_text,
  option_1_text = EXCLUDED.option_1_text,
  option_2_text = EXCLUDED.option_2_text,
  option_3_text = EXCLUDED.option_3_text,
  option_4_text = EXCLUDED.option_4_text,
  best_option_index = EXCLUDED.best_option_index,
  updated_at = NOW();
