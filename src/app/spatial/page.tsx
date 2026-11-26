import Link from 'next/link';

export default function SpatialMenu() {
  const games = [
    {
      id: 'cube-folding',
      name: 'Cube Net Folding',
      vnName: 'Triển Khai Hình Khối',
      desc: 'Quan sát bản trải phẳng 2D của khối lập phương và tưởng tượng trạng thái gấp thành khối 3D chính xác.',
      difficulty: 'Không Gian 3D',
      color: 'border-orange-500 shadow-orange-500/20',
      btnColor: 'bg-orange-600 hover:bg-orange-500',
      link: '/spatial/cube-folding',
    },
    {
      id: 'tangram',
      name: 'Tangram Studio',
      vnName: 'Ghép Hình Tangram',
      desc: 'Tái cấu trúc 7 mảnh hình học kinh điển (xoay, lật, ghép khớp) để hoàn thiện các hình bóng phức tạp.',
      difficulty: 'Tạo Hình',
      color: 'border-amber-500 shadow-amber-500/20',
      btnColor: 'bg-amber-600 hover:bg-amber-500',
      link: '/spatial/tangram',
    },
    {
      id: 'maze-3d',
      name: 'Spatial 3D Maze',
      vnName: 'Mê Cung Không Gian',
      desc: 'Điều hướng trong mạng lưới mê cung lập phương đa tầng 3D thực thụ với chế độ quan sát hoặc sương mù.',
      difficulty: 'Định Hướng',
      color: 'border-yellow-500 shadow-yellow-500/20',
      btnColor: 'bg-yellow-600 hover:bg-yellow-500',
      link: '/spatial/maze-3d',
    },
    {
      id: 'geometry',
      name: 'Geometric Decomposition',
      vnName: 'Phân Hình Học',
      desc: 'Đếm hình ẩn trong cấu trúc phức hợp, tính số khối lập phương xếp chồng và nhận diện phép xoay không gian.',
      difficulty: 'Thị Giác',
      color: 'border-red-500 shadow-red-500/20',
      btnColor: 'bg-red-600 hover:bg-red-500',
      link: '/spatial/geometry',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans p-8 selection:bg-orange-500 selection:text-white">
      <div className="max-w-6xl mx-auto mb-12">
        <Link
          href="/"
          className="inline-flex items-center text-slate-400 hover:text-orange-400 transition-colors mb-6 group"
        >
          <span className="mr-2 text-xl group-hover:-translate-x-1 transition-transform">←</span>
          Quay lại Trang Chủ
        </Link>

        <h1 className="text-4xl md:text-6xl font-black mb-4">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-400">
            Hình Học &amp; Không Gian
          </span>
        </h1>
        <p className="text-slate-400 text-lg max-w-2xl leading-relaxed">
          Spatial Reasoning • Rèn luyện năng lực xoay hình trong tâm trí, gập mở khối đa diện 3D, phân tách hình học và định hướng không gian đa chiều.
        </p>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
        {games.map((game) => (
          <div
            key={game.id}
            className={`relative group bg-slate-900 rounded-3xl p-8 border ${game.color} border-opacity-40 hover:border-opacity-100 transition-all duration-300 shadow-xl hover:shadow-2xl hover:-translate-y-1 flex flex-col justify-between h-full overflow-hidden`}
          >
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-white to-transparent opacity-[0.03] rounded-full blur-3xl -mr-10 -mt-10 group-hover:opacity-[0.08] transition-opacity" />

            <div className="absolute top-6 right-6 bg-slate-800/80 backdrop-blur text-[10px] uppercase font-bold text-slate-300 px-3 py-1 rounded-full border border-slate-700 tracking-wider">
              {game.difficulty}
            </div>

            <div className="relative z-10 mb-8">
              <h3 className="text-3xl font-black text-white mb-1 font-mono tracking-tighter">
                {game.name}
              </h3>
              <h4 className="text-orange-400 text-xs font-bold uppercase tracking-widest mb-4">
                {game.vnName}
              </h4>
              <p className="text-slate-400 leading-relaxed text-sm">{game.desc}</p>
            </div>

            <Link
              href={game.link}
              className={`relative z-10 block w-full text-center py-4 rounded-xl font-bold text-white transition-all transform active:scale-[0.98] shadow-lg ${game.btnColor}`}
            >
              BẮT ĐẦU THỬ THÁCH
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
