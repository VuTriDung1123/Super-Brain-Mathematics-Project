import Link from 'next/link';

export default function SpatialMenu() {
  const games = [
    {
      id: 'cube-folding',
      kanji: '折',
      name: 'Cube Net Folding',
      vnName: 'Triển Khai Hình Khối',
      desc: 'Quan sát 11 mẫu trải phẳng 2D của khối lập phương và tưởng tượng trạng thái gấp thành khối 3D chính xác.',
      difficulty: 'Không Gian 3D',
      ribbon: 'from-[#b86f2c] to-[#f2d096]',
      btnColor: 'bg-gradient-to-r from-[#a65c1f] to-[#cc8436] hover:brightness-110',
      link: '/spatial/cube-folding',
    },
    {
      id: 'tangram',
      kanji: '巧',
      name: 'Tangram Studio',
      vnName: 'Ghép Hình Tangram',
      desc: 'Tái cấu trúc 7 mảnh hình học kinh điển (xoay 45°, lật gương, ghép khớp) để hoàn thiện các hình bóng.',
      difficulty: 'Tạo Hình',
      ribbon: 'from-[#c78f2e] to-[#f6d58e]',
      btnColor: 'bg-gradient-to-r from-[#9e6c1d] to-[#c99538] hover:brightness-110',
      link: '/spatial/tangram',
    },
    {
      id: 'maze-3d',
      kanji: '宙',
      name: 'Spatial 3D Maze',
      vnName: 'Mê Cung Không Gian 3D',
      desc: 'Điều hướng trong mạng lưới mê cung lập phương đa tầng 3D thực thụ với chế độ toàn cảnh hoặc sương mù.',
      difficulty: 'Định Hướng',
      ribbon: 'from-[#b88435] to-[#f4b8c8]',
      btnColor: 'bg-gradient-to-r from-[#8f6424] to-[#bd8838] hover:brightness-110',
      link: '/spatial/maze-3d',
    },
    {
      id: 'geometry',
      kanji: '形',
      name: 'Geometric Decomposition',
      vnName: 'Phân Hình Học',
      desc: 'Đếm tam giác ẩn trong cấu trúc phức hợp, tính số khối lập phương xếp chồng và nhận diện phép xoay.',
      difficulty: 'Thị Giác',
      ribbon: 'from-[#c83e37] to-[#e6b873]',
      btnColor: 'bg-gradient-to-r from-[#a62e29] to-[#c95343] hover:brightness-110',
      link: '/spatial/geometry',
    },
  ];

  return (
    <div className="min-h-screen text-[#f6efe4] font-sans pt-20 pb-20 px-6 md:px-8">
      <div className="max-w-5xl mx-auto mb-12 animate-fade-in">
        <Link
          href="/"
          className="inline-flex items-center text-[#c7b2b5] hover:text-[#f4b8c8] transition-colors mb-6 group text-sm"
        >
          <span className="mr-2 text-lg group-hover:-translate-x-1 transition-transform">←</span>
          Quay lại Đạo Quán
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <span className="jp-hanko px-2.5 py-0.5 rounded text-xs font-bold tracking-widest">
            空間
          </span>
          <span className="text-xs font-bold uppercase tracking-[0.25em] text-[#d9b56c]">
            空間幾何 • SPATIAL REASONING
          </span>
        </div>

        <h1 className="text-4xl md:text-6xl font-black mb-3 text-transparent bg-clip-text bg-gradient-to-r from-[#f6d58e] via-[#f2d096] to-[#f4b8c8]">
          Hình Học &amp; Không Gian
        </h1>
        <p className="text-[#c7b2b5] text-base md:text-lg max-w-2xl leading-relaxed">
          Rèn luyện năng lực xoay hình trong tâm trí, gập mở khối đa diện 3D, phân tách hình học và định hướng không gian đa chiều.
        </p>
      </div>

      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
        {games.map((game) => (
          <div
            key={game.id}
            className="relative group jp-lacquer-card rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between"
          >
            <div className={`h-1.5 w-full bg-gradient-to-r ${game.ribbon}`} />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-2 -bottom-4 text-[110px] leading-none font-bold text-[#e6b873] opacity-[0.06] group-hover:opacity-[0.12] transition-opacity select-none"
              style={{ fontFamily: 'var(--font-jp)' }}
            >
              {game.kanji}
            </div>

            <div className="p-7 flex-1 flex flex-col justify-between relative z-10">
              <div className="mb-8">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[#f2d096] text-xs font-bold uppercase tracking-widest">
                    {game.vnName}
                  </span>
                  <span className="bg-[#2b1d23] text-[10px] uppercase font-bold text-[#e6c173] px-3 py-1 rounded-full border border-[#d9b56c]/35">
                    {game.difficulty}
                  </span>
                </div>
                <h2 className="text-2xl font-black text-[#f6efe4] mb-3">{game.name}</h2>
                <p className="text-[#cfc0be] text-sm leading-relaxed">{game.desc}</p>
              </div>

              <Link
                href={game.link}
                className={`block w-full text-center py-3.5 rounded-xl font-bold text-[#fff8f3] border border-white/15 transition-all active:scale-[0.98] shadow-lg ${game.btnColor}`}
              >
                Bắt Đầu Thử Thách →
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
