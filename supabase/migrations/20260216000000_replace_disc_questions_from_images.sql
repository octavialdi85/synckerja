-- Replace DISC test questions with content from user-provided images (Gambaran Diri blocks).
-- Each block has 4 options; dimensions D, I, S, C assigned per option.

DELETE FROM public.test_questions
WHERE test_id = 'a1000000-0000-4000-8000-000000000001'::uuid;

INSERT INTO public.test_questions (test_id, question_order, option_1_text, option_1_dimension, option_2_text, option_2_dimension, option_3_text, option_3_dimension, option_4_text, option_4_dimension)
VALUES
  ('a1000000-0000-4000-8000-000000000001'::uuid, 1,  'Menjadi frustrasi', 'D', 'Menyimpan perasaan saya', 'I', 'Menceritakan sisi saya', 'S', 'Siap beroposisi', 'C'),
  ('a1000000-0000-4000-8000-000000000001'::uuid, 2,  'Hidup, Suka bicara', 'D', 'Gerak cepat, Tekun', 'I', 'Usaha menjaga keseimbangan', 'S', 'Usaha mengikuti aturan', 'C'),
  ('a1000000-0000-4000-8000-000000000001'::uuid, 3,  'Kelola waktu secara efisien', 'D', 'Sering terburu-buru, Merasa tertekan', 'I', 'Masalah sosial itu penting', 'S', 'Suka selesaikan apa yang saya mulai', 'C'),
  ('a1000000-0000-4000-8000-000000000001'::uuid, 4,  'Tolak perubahan mendadak', 'D', 'Cenderung janji berlebihan', 'I', 'Tarik diri di tengah tekanan', 'S', 'Tidak takut bertempur', 'C'),
  ('a1000000-0000-4000-8000-000000000001'::uuid, 5,  'Penyemangat yang baik', 'D', 'Pendengar yang baik', 'I', 'Penganalisa yang baik', 'S', 'Delegator yang baik', 'C'),
  ('a1000000-0000-4000-8000-000000000001'::uuid, 6,  'Non-konfrontasi, Menyerah', 'D', 'Dipenuhi hal detail', 'I', 'Perubahan pada menit terakhir', 'S', 'Menuntut, Kasar', 'C'),
  ('a1000000-0000-4000-8000-000000000001'::uuid, 7,  'Ingin kemajuan', 'D', 'Puas dengan segalanya', 'I', 'Terbuka memperlihatkan perasaan', 'S', 'Rendah hati, Sederhana', 'C'),
  ('a1000000-0000-4000-8000-000000000001'::uuid, 8,  'Tenang, Pendiam', 'D', 'Bahagia, Tanpa beban', 'I', 'Menyenangkan, Baik hati', 'S', 'Tak gentar, Berani', 'C'),
  ('a1000000-0000-4000-8000-000000000001'::uuid, 9,  'Menggunakan waktu berkualitas dgn teman', 'D', 'Rencanakan masa depan, Bersiap', 'I', 'Bepergian demi petualangan baru', 'S', 'Menerima ganjaran atas tujuan yg dicapai', 'C'),
  ('a1000000-0000-4000-8000-000000000001'::uuid, 10, 'Aturan perlu dipertanyakan', 'D', 'Aturan membuat adil', 'I', 'Aturan membuat bosan', 'S', 'Aturan membuat aman', 'C'),
  ('a1000000-0000-4000-8000-000000000001'::uuid, 11, 'Saya akan pimpin mereka', 'D', 'Saya akan melaksanakan', 'I', 'Saya akan meyakinkan mereka', 'S', 'Saya dapatkan fakta', 'C'),
  ('a1000000-0000-4000-8000-000000000001'::uuid, 12, 'Memikirkan orang dahulu', 'D', 'Kompetitif, Suka tantangan', 'I', 'Optimis, Positif', 'S', 'Pemikir logis, Sistematik', 'C'),
  ('a1000000-0000-4000-8000-000000000001'::uuid, 13, 'Menyenangkan orang, Mudah setuju', 'D', 'Tertawa lepas, Hidup', 'I', 'Berani, Tak gentar', 'S', 'Tenang, Pendiam', 'C'),
  ('a1000000-0000-4000-8000-000000000001'::uuid, 14, 'Ingin otoritas lebih', 'D', 'Ingin kesempatan baru', 'I', 'Menghindari konflik', 'S', 'Ingin petunjuk yang jelas', 'C'),
  ('a1000000-0000-4000-8000-000000000001'::uuid, 15, 'Dapat diandalkan, Dapat dipercaya', 'D', 'Kreatif, Unik', 'I', 'Garis dasar, Orientasi hasil', 'S', 'Jalankan standar yang tinggi, Akurat', 'C');
