import Link from 'next/link';
import { HomeStatsBar, CategoryProgressBadge } from '@/components/HomeStatsBar';
import type { CategoryId } from '@/lib/stats';

export default function Home() {
  const categories: {
    id: number;
    categoryId: CategoryId;
    kanji: string;
    jpSub: string;
    title: string;
    subTitle: string;
    desc: string;
    games: string[];
    ribbonColor: string;
    kanjiColor: string;
    link: string;
  }[] = [
    {
      id: 1,
      categoryId: 'mental-math',
      kanji: '算',
      jpSub: '暗算道場',
      title: '1. Tính nhẩm siêu tốc',
      subTitle: 'Mental Arithmetic',
      desc: 'Rèn tốc độ tính nhẩm Soroban, nhân chia đa chữ số và khai căn số lớn.',
      games: ['Flash Anzan', 'Nhân chia đa chữ số', 'Tính nhẩm song hành', 'Khai căn'],
      ribbonColor: 'from-[#3b6998] via-[#6b9ec2] to-[#d9b56c]',
      kanjiColor: 'text-[#7da6c7]',
      link: '/mental-math',
    },
    {
      id: 2,
      categoryId: 'sudoku-logic',
      kanji: '数',
      jpSub: '数独論理',
      title: '2. Sudoku & Logic Số',
      subTitle: 'Logic Variants',
      desc: 'Tư duy tổ hợp và suy luận chặt chẽ qua Sudoku Mù, Lập Phương 3D và Sắc Màu.',
      games: ['Sudoku mù', 'Sudoku lập phương', 'Sudoku sắc màu', 'Mê cung số'],
      ribbonColor: 'from-[#7d5296] via-[#b884cc] to-[#f4b8c8]',
      kanjiColor: 'text-[#c8a2d6]',
      link: '/sudoku-logic',
    },
    {
      id: 3,
      categoryId: 'spatial',
      kanji: '空',
      jpSub: '空間幾何',
      title: '3. Hình học & Không gian',
      subTitle: 'Spatial Reasoning',
      desc: 'Tưởng tượng gập mở hình khối, ghép Tangram và định hướng mê cung 3 chiều.',
      games: ['Triển khai hình khối', 'Ghép hình Tangram', 'Mê cung không gian', 'Phân hình học'],
      ribbonColor: 'from-[#b86f2c] via-[#d9a054] to-[#f2d096]',
      kanjiColor: 'text-[#e6b873]',
      link: '/spatial',
    },
    {
      id: 4,
      categoryId: 'applied-math',
      kanji: '密',
      jpSub: '暗号数理',
      title: '4. Toán ứng dụng & Mã hóa',
      subTitle: 'Applied Math',
      desc: 'Giải mã tín hiệu cổ điển, tính toán quỹ đạo đạn đạo và tối ưu lý thuyết đồ thị.',
      games: ['Giải mã tín hiệu', 'Quỹ đạo chuyển động', 'Lý thuyết đồ thị'],
      ribbonColor: 'from-[#3b7a57] via-[#6ba683] to-[#d9b56c]',
      kanjiColor: 'text-[#84b89a]',
      link: '/applied-math',
    },
    {
      id: 5,
      categoryId: 'battle',
      kanji: '剣',
      jpSub: '真剣勝負',
      title: '5. Tốc độ & Độ chính xác',
      subTitle: 'Speed & Accuracy',
      desc: 'Đối kháng 1v1 trực diện cùng AI Siêu Trí Tuệ và đo tốc độ phản xạ từng mili-giây.',
      games: ['Trận chiến tính toán', 'Phản xạ nhanh'],
      ribbonColor: 'from-[#a62626] via-[#d94848] to-[#f4b8c8]',
      kanjiColor: 'text-[#e06a78]',
      link: '/battle',
    },
    {
      id: 6,
      categoryId: 'classic',
      kanji: '伝',
      jpSub: '秘伝十六選',
      title: '6. Siêu Trí Tuệ Kinh Điển',
      subTitle: 'The Brain Classics • 16 Games',
      desc: 'Tuyển tập 16 thử thách huyền thoại từ chương trình Siêu Trí Tuệ Việt Nam & Trung Quốc.',
      games: [
        'Mã đi tuần ẩn',
        'Logic tung hoành',
        'Hoa dung đạo số',
        'Tầng tầng điệp ảnh',
        'Bức tường điểm ảnh',
        '+11 bí kíp khác',
      ],
      ribbonColor: 'from-[#c83e37] via-[#f4b8c8] to-[#e6c173]',
      kanjiColor: 'text-[#f4b8c8]',
      link: '/classic',
    },
  ];

  return (
    <main className="min-h-screen pt-20 pb-16 px-6 md:px-8 font-sans">
      {/* --- HERO HEADER (KYOTO YOZAKURA DOJO) --- */}
      <header className="max-w-5xl mx-auto text-center mb-10 animate-fade-in">
        <div className="inline-flex items-center gap-3 mb-4">
          <span className="jp-hanko px-2.5 py-1 rounded text-sm font-bold tracking-[0.2em]">
            超頭脳
          </span>
          <span className="text-xs font-bold uppercase tracking-[0.28em] text-[#d9b56c]">
            THE BRAIN DOJO • ĐẠO QUÁN TƯ DUY
          </span>
        </div>

        <h1 className="text-5xl md:text-7xl font-black mb-4 text-transparent bg-clip-text bg-gradient-to-r from-[#f6d58e] via-[#f9d3dd] to-[#e67e96] drop-shadow-sm">
          SIÊU TRÍ TUỆ
        </h1>

        <p className="text-base md:text-lg text-[#d8c4c7] max-w-2xl mx-auto leading-relaxed">
          Rèn luyện trí óc giữa đêm hoa anh đào — nơi hội tụ <strong className="text-[#f6d58e]">6 đại môn phái</strong> và{' '}
          <strong className="text-[#f4b8c8]">33 thử thách</strong> toán học, trí nhớ &amp; không gian 3D.
        </p>

        {/* Traditional Sakura & Gold Hairline Divider */}
        <div className="flex items-center justify-center gap-4 mt-7 text-[#d9b56c]/70">
          <span className="h-px w-20 sm:w-32 bg-gradient-to-r from-transparent to-[#d9b56c]/60" />
          <span className="text-lg text-[#f4b8c8]">❀</span>
          <span className="text-xs tracking-[0.35em] font-serif text-[#d9b56c]">桜吹雪</span>
          <span className="text-lg text-[#f4b8c8]">❀</span>
          <span className="h-px w-20 sm:w-32 bg-gradient-to-l from-transparent to-[#d9b56c]/60" />
        </div>
      </header>

      {/* --- LIVE PERSONAL STATS SCROLL --- */}
      <HomeStatsBar />

      {/* --- 6 DOJO CATEGORY CARDS --- */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((cat) => (
          <Link
            key={cat.id}
            href={cat.link}
            className="group relative overflow-hidden rounded-2xl jp-lacquer-card transition-all duration-300 hover:-translate-y-1.5 flex flex-col"
          >
            {/* Traditional Lacquer Top Ribbon */}
            <div className={`h-1.5 w-full bg-gradient-to-r ${cat.ribbonColor}`} />

            {/* Subtle Kanji Crest Watermark */}
            <div
              aria-hidden="true"
              className={`pointer-events-none absolute -right-3 -bottom-5 text-[125px] leading-none font-bold opacity-[0.06] group-hover:opacity-[0.12] transition-opacity select-none ${cat.kanjiColor}`}
              style={{ fontFamily: 'var(--font-jp)' }}
            >
              {cat.kanji}
            </div>

            <div className="p-6 flex-1 flex flex-col justify-between relative z-10">
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-widest text-[#d9b56c]/90">
                    <span
                      className="w-6 h-6 rounded border border-[#c83e37]/70 bg-[#c83e37]/15 text-[#f4b8c8] flex items-center justify-center text-xs"
                      style={{ fontFamily: 'var(--font-jp)' }}
                    >
                      {cat.kanji}
                    </span>
                    <span style={{ fontFamily: 'var(--font-jp)' }}>{cat.jpSub}</span>
                  </span>
                  <CategoryProgressBadge category={cat.categoryId} />
                </div>

                <h2 className="text-2xl font-bold mb-1 text-[#f6efe4] group-hover:text-[#f6d58e] transition-colors">
                  {cat.title}
                </h2>
                <p className="text-[11px] font-semibold text-[#a88c93] uppercase tracking-widest mb-4">
                  {cat.subTitle}
                </p>
                <p className="text-[#d9c9c4] mb-6 text-sm leading-relaxed min-h-10">
                  {cat.desc}
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {cat.games.map((game, index) => (
                  <span
                    key={index}
                    className="px-2.5 py-1 text-[11px] font-medium bg-[#281b21]/90 text-[#e7d6d2] rounded-md border border-[#d9b56c]/20 group-hover:border-[#f4b8c8]/35 transition-colors"
                  >
                    {game}
                  </span>
                ))}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* --- FOOTER --- */}
      <footer className="mt-20 text-center text-[#8f747b] text-xs tracking-wider space-y-1">
        <p className="text-[#d9b56c]/70">❀ ─── 超頭脳道場 • THE BRAIN DOJO ─── ❀</p>
        <p>© 2026 Super Brain Mathematics Project • Built with Next.js &amp; React Three Fiber.</p>
      </footer>
    </main>
  );
}
