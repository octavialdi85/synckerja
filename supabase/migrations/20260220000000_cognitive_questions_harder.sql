-- Replace cognitive test questions with harder versions (verbal, numerical, logical).

DELETE FROM public.cognitive_questions
WHERE test_id = 'a1000000-0000-4000-8000-000000000002'::uuid;

INSERT INTO public.cognitive_questions (test_id, question_order, question_text, option_1_text, option_2_text, option_3_text, option_4_text, correct_option_index, category)
VALUES
  -- VERBAL (1-10): kosakata lanjut, analogi kompleks, inferensi
  ('a1000000-0000-4000-8000-000000000002'::uuid, 1, 'Sinonim "efisien" yang paling tepat dalam konteks bisnis adalah ...', 'Produktif', 'Hemat sumber daya', 'Cepat', 'Besar', 2, 'verbal'),
  ('a1000000-0000-4000-8000-000000000002'::uuid, 2, 'Antonim dari "abstrak" adalah ...', 'Teori', 'Konkret', 'Rumit', 'Sederhana', 2, 'verbal'),
  ('a1000000-0000-4000-8000-000000000002'::uuid, 3, 'Hakim : Pengadilan = Dokter : ...', 'Operasi', 'Rumah sakit', 'Pasien', 'Stetoskop', 2, 'verbal'),
  ('a1000000-0000-4000-8000-000000000002'::uuid, 4, 'Kata yang TIDAK sejenis dengan yang lain: Ephemeral, Sementara, Fana, Kekal.', 'Ephemeral', 'Sementara', 'Fana', 'Kekal', 4, 'verbal'),
  ('a1000000-0000-4000-8000-000000000002'::uuid, 5, '"Tidak ada peserta yang lulus tanpa mengerjakan semua soal." Implikasi yang benar:', 'Yang lulus pasti mengerjakan semua soal', 'Yang tidak lulus pasti tidak mengerjakan semua soal', 'Mengerjakan semua soal menjamin lulus', 'Soal yang tidak dikerjakan tidak mempengaruhi kelulusan', 1, 'verbal'),
  ('a1000000-0000-4000-8000-000000000002'::uuid, 6, 'Sinonim "ambiguitas" yang paling tepat adalah ...', 'Kejelasan', 'Keraguan', 'Ketidakjelasan makna', 'Kepastian', 3, 'verbal'),
  ('a1000000-0000-4000-8000-000000000002'::uuid, 7, 'Kritik : Saran = Hukuman : ...', 'Penjara', 'Rehabilitasi', 'Denda', 'Vonis', 2, 'verbal'),
  ('a1000000-0000-4000-8000-000000000002'::uuid, 8, 'Antonim "subjektif" adalah ...', 'Bias', 'Opini', 'Objektif', 'Netral', 3, 'verbal'),
  ('a1000000-0000-4000-8000-000000000002'::uuid, 9, 'Semua PNS berdisiplin. Beberapa PNS malas. Kesimpulan yang valid:', 'Tidak ada PNS yang malas', 'Beberapa yang malas bukan PNS', 'Ada PNS yang tidak berdisiplin', 'Semua yang berdisiplin adalah PNS', 3, 'verbal'),
  ('a1000000-0000-4000-8000-000000000002'::uuid, 10, 'Paradigma : Ilmu = Kerangka : ...', 'Gambar', 'Bangunan', 'Pemikiran', 'Analisis', 2, 'verbal'),
  -- NUMERICAL (11-20): multi-langkah, persen, rasio, deret
  ('a1000000-0000-4000-8000-000000000002'::uuid, 11, '(24 + 16 × 2) ÷ 4 = ...', '12', '14', '16', '20', 2, 'numerical'),
  ('a1000000-0000-4000-8000-000000000002'::uuid, 12, 'Lanjutkan deret: 2, 6, 12, 20, 30, ...', '38', '40', '42', '44', 3, 'numerical'),
  ('a1000000-0000-4000-8000-000000000002'::uuid, 13, 'Harga barang Rp 100.000 didiskon 20%, lalu dari harga setelah diskon diberi potongan 10%. Harga akhir (dalam ribuan)?', '70', '72', '75', '80', 2, 'numerical'),
  ('a1000000-0000-4000-8000-000000000002'::uuid, 14, 'Rasio A : B = 3 : 4 dan B : C = 2 : 5. Rasio A : C = ...', '3 : 5', '3 : 10', '6 : 20', '2 : 5', 2, 'numerical'),
  ('a1000000-0000-4000-8000-000000000002'::uuid, 15, '6 pekerja menyelesaikan proyek dalam 12 hari. Berapa hari jika hanya 4 pekerja (asumsi kerja sama sama)?', '16', '18', '20', '24', 2, 'numerical'),
  ('a1000000-0000-4000-8000-000000000002'::uuid, 16, '15% dari 240 = ...', '32', '34', '36', '38', 3, 'numerical'),
  ('a1000000-0000-4000-8000-000000000002'::uuid, 17, 'Lanjutkan: 1, 4, 9, 16, 25, ...', '30', '32', '36', '40', 3, 'numerical'),
  ('a1000000-0000-4000-8000-000000000002'::uuid, 18, 'Nilai 3/5 + 2/3 (dalam bentuk desimal terdekat) = ...', '1,20', '1,27', '1,33', '1,50', 2, 'numerical'),
  ('a1000000-0000-4000-8000-000000000002'::uuid, 19, 'Jumlah 5 bilangan bulat berurutan = 100. Bilangan terbesar = ...', '20', '21', '22', '23', 3, 'numerical'),
  ('a1000000-0000-4000-8000-000000000002'::uuid, 20, 'Sebuah angka dinaikkan 25% lalu hasilnya diturunkan 20%. Perubahan bersih dari angka awal (dalam %) = ...', '0', '5', '10', '15', 1, 'numerical'),
  -- LOGICAL (21-30): silogisme, deduksi, pola
  ('a1000000-0000-4000-8000-000000000002'::uuid, 21, 'Jika X maka Y. Jika Y maka Z. Diketahui X benar. Kesimpulan:', 'Z benar', 'Y salah', 'Z salah', 'Tidak bisa disimpulkan', 1, 'logical'),
  ('a1000000-0000-4000-8000-000000000002'::uuid, 22, 'Semua A adalah B. Beberapa B adalah C. Tentang hubungan A dan C dapat disimpulkan:', 'Semua A adalah C', 'Beberapa A adalah C', 'Tidak ada A yang C', 'Tidak dapat dipastikan', 4, 'logical'),
  ('a1000000-0000-4000-8000-000000000002'::uuid, 23, 'Lanjutkan deret: 2, 3, 5, 7, 11, ...', '12', '13', '14', '15', 2, 'logical'),
  ('a1000000-0000-4000-8000-000000000002'::uuid, 24, 'A lebih tinggi dari B. B lebih tinggi dari C. C lebih tinggi dari D. Urutan dari tertinggi ke terendah:', 'A, B, C, D', 'D, C, B, A', 'A, C, B, D', 'B, A, D, C', 1, 'logical'),
  ('a1000000-0000-4000-8000-000000000002'::uuid, 25, 'Jika tidak A maka B. Diketahui B salah. Kesimpulan:', 'A benar', 'A salah', 'Tidak bisa disimpulkan', 'A dan B sama-sama salah', 1, 'logical'),
  ('a1000000-0000-4000-8000-000000000002'::uuid, 26, 'Lanjutkan: 1, 3, 6, 10, 15, ...', '18', '20', '21', '22', 3, 'logical'),
  ('a1000000-0000-4000-8000-000000000002'::uuid, 27, 'Semua karyawan tetap ada di gedung A. Rina tidak ada di gedung A. Kesimpulan:', 'Rina bukan karyawan tetap', 'Rina karyawan tetap', 'Rina di gedung lain', 'Tidak bisa disimpulkan', 1, 'logical'),
  ('a1000000-0000-4000-8000-000000000002'::uuid, 28, 'Lanjutkan: 128, 64, 32, 16, ...', '10', '8', '6', '4', 2, 'logical'),
  ('a1000000-0000-4000-8000-000000000002'::uuid, 29, 'Pernyataan "Jika P maka Q" ekuivalen secara logika dengan:', 'Jika Q maka P', 'Jika tidak P maka tidak Q', 'Jika tidak Q maka tidak P', 'P dan Q selalu benar', 3, 'logical'),
  ('a1000000-0000-4000-8000-000000000002'::uuid, 30, 'Dalam lomba lari: Ana lebih cepat dari Budi. Cici paling lambat. Deni di antara Ana dan Budi. Urutan finish dari pertama ke terakhir:', 'Ana, Deni, Budi, Cici', 'Ana, Budi, Deni, Cici', 'Deni, Ana, Budi, Cici', 'Budi, Ana, Deni, Cici', 1, 'logical')
ON CONFLICT (test_id, question_order) DO UPDATE SET
  question_text = EXCLUDED.question_text,
  option_1_text = EXCLUDED.option_1_text,
  option_2_text = EXCLUDED.option_2_text,
  option_3_text = EXCLUDED.option_3_text,
  option_4_text = EXCLUDED.option_4_text,
  correct_option_index = EXCLUDED.correct_option_index,
  category = EXCLUDED.category,
  updated_at = NOW();
