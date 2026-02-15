-- DISC: Replace all 24 questions to match user-provided images exactly (order and text).
-- Each row = 4 options with dimensions D, I, S, C. P (Paling seperti saya) = +1, K (Paling tidak seperti saya) = -1.

DELETE FROM public.test_questions
WHERE test_id = 'a1000000-0000-4000-8000-000000000001'::uuid;

INSERT INTO public.test_questions (test_id, question_order, option_1_text, option_1_dimension, option_2_text, option_2_dimension, option_3_text, option_3_dimension, option_4_text, option_4_dimension)
VALUES
  ('a1000000-0000-4000-8000-000000000001'::uuid, 1,  'Gampangan, Mudah setuju', 'I', 'Percaya, Mudah percaya pada orang', 'S', 'Petualang, Mengambil resiko', 'D', 'Toleran, Menghormati', 'C'),
  ('a1000000-0000-4000-8000-000000000001'::uuid, 2,  'Lembut suara, Pendiam', 'S', 'Optimistik, Visioner', 'D', 'Pusat Perhatian, Suka gaul', 'I', 'Pendamai, Membawa Harmoni', 'C'),
  ('a1000000-0000-4000-8000-000000000001'::uuid, 3,  'Menyemangati orang', 'I', 'Berusaha sempurna', 'C', 'Bagian dari kelompok', 'S', 'Ingin membuat tujuan', 'D'),
  ('a1000000-0000-4000-8000-000000000001'::uuid, 4,  'Menjadi frustrasi', 'D', 'Menyimpan perasaan saya', 'I', 'Menceritakan sisi saya', 'S', 'Siap beroposisi', 'C'),
  ('a1000000-0000-4000-8000-000000000001'::uuid, 5,  'Hidup, Suka bicara', 'I', 'Gerak cepat, Tekun', 'D', 'Usaha menjaga keseimbangan', 'S', 'Usaha mengikuti aturan', 'C'),
  ('a1000000-0000-4000-8000-000000000001'::uuid, 6,  'Kelola waktu secara efisien', 'C', 'Sering terburu-buru, Merasa tertekan', 'D', 'Masalah sosial itu penting', 'I', 'Suka selesaikan apa yang saya mulai', 'S'),
  ('a1000000-0000-4000-8000-000000000001'::uuid, 7,  'Tolak perubahan mendadak', 'S', 'Cenderung janji berlebihan', 'I', 'Tarik diri di tengah tekanan', 'C', 'Tidak takut bertempur', 'D'),
  ('a1000000-0000-4000-8000-000000000001'::uuid, 8,  'Penyemangat yang baik', 'I', 'Pendengar yang baik', 'S', 'Penganalisa yang baik', 'C', 'Delegator yang baik', 'D'),
  ('a1000000-0000-4000-8000-000000000001'::uuid, 9,  'Hasil adalah penting', 'D', 'Dibuat menyenangkan', 'I', 'Lingkungan stabil penting', 'S', 'Prosedur diikuti', 'C'),
  ('a1000000-0000-4000-8000-000000000001'::uuid, 10, 'Akan berjalan terus tanpa kontrol diri', 'I', 'Akan mengusahakan yang kuinginkan', 'D', 'Akan menunggu arahan', 'S', 'Akan memeriksa detail dulu', 'C'),
  ('a1000000-0000-4000-8000-000000000001'::uuid, 11, 'Aktif mengubah sesuatu', 'D', 'Ingin hal-hal yang pasti', 'C', 'Mengajak orang terlibat', 'I', 'Menjaga ritme tetap', 'S'),
  ('a1000000-0000-4000-8000-000000000001'::uuid, 12, 'Non-konfrontasi, Menyerah', 'S', 'Dipenuhi hal detail', 'C', 'Perubahan pada menit terakhir', 'I', 'Menuntut, Kasar', 'D'),
  ('a1000000-0000-4000-8000-000000000001'::uuid, 13, 'Ingin kemajuan', 'D', 'Puas dengan segalanya', 'S', 'Terbuka memperlihatkan perasaan', 'I', 'Rendah hati, Sederhana', 'C'),
  ('a1000000-0000-4000-8000-000000000001'::uuid, 14, 'Tenang, Pendiam', 'S', 'Bahagia, Tanpa beban', 'I', 'Menyenangkan, Baik hati', 'C', 'Tak gentar, Berani', 'D'),
  ('a1000000-0000-4000-8000-000000000001'::uuid, 15, 'Menggunakan waktu berkualitas dgn teman', 'I', 'Rencanakan masa depan, Bersiap', 'C', 'Bepergian demi petualangan baru', 'D', 'Menerima ganjaran atas tujuan yg dicapai', 'S'),
  ('a1000000-0000-4000-8000-000000000001'::uuid, 16, 'Aturan perlu dipertanyakan', 'D', 'Aturan membuat adil', 'I', 'Aturan membuat bosan', 'S', 'Aturan membuat aman', 'C'),
  ('a1000000-0000-4000-8000-000000000001'::uuid, 17, 'Prestasi, Ganjaran', 'D', 'Keselamatan, keamanan', 'S', 'Diterima oleh orang', 'I', 'Kualitas kerja', 'C'),
  ('a1000000-0000-4000-8000-000000000001'::uuid, 18, 'Memimpin, Pendekatan langsung', 'D', 'Suka bergaul, Antusias', 'I', 'Mendukung tim', 'S', 'Sesuai prosedur', 'C'),
  ('a1000000-0000-4000-8000-000000000001'::uuid, 19, 'Tidak mudah dikalahkan', 'D', 'Ingin segalanya teratur, Rapi', 'C', 'Disukai banyak orang', 'I', 'Bekerja dengan tenang', 'S'),
  ('a1000000-0000-4000-8000-000000000001'::uuid, 20, 'Saya akan pimpin mereka', 'D', 'Saya akan melaksanakan', 'S', 'Saya akan meyakinkan mereka', 'I', 'Saya dapatkan fakta', 'C'),
  ('a1000000-0000-4000-8000-000000000001'::uuid, 21, 'Memikirkan orang dahulu', 'S', 'Kompetitif, Suka tantangan', 'D', 'Optimis, Positif', 'I', 'Pemikir logis, Sistematik', 'C'),
  ('a1000000-0000-4000-8000-000000000001'::uuid, 22, 'Menyenangkan orang, Mudah setuju', 'I', 'Tertawa lepas, Hidup', 'S', 'Berani, Tak gentar', 'D', 'Tenang, Pendiam', 'C'),
  ('a1000000-0000-4000-8000-000000000001'::uuid, 23, 'Ingin otoritas lebih', 'D', 'Ingin kesempatan baru', 'I', 'Menghindari konflik', 'S', 'Ingin petunjuk yang jelas', 'C'),
  ('a1000000-0000-4000-8000-000000000001'::uuid, 24, 'Dapat diandalkan, Dapat dipercaya', 'S', 'Kreatif, Unik', 'I', 'Garis dasar, Orientasi hasil', 'D', 'Jalankan standar yang tinggi, Akurat', 'C');
