import Link from 'next/link';

export default function AppliedMathMenu() {
  const games = [
    {
      id: 'signal-decoding',
      name: 'Signal & Cipher Lab',
      vnName: 'Giải Mã Tín Hiệu',
      desc: 'Phá giải mật mã Caesar, sóng nhị phân/thập lục phân, tín hiệu Morse có âm thanh và chuỗi quy luật số học.',
      difficulty: 'Mật Mã Học',
      color: 'border-emerald-500 shadow-emerald-500/20',
      btnColor: 'bg-emerald-600 hover:bg-emerald-500',
      link: '/applied-math/signal-decoding',
    },
    {
      id: 'trajectory',
      name: 'Trajectory & Optics',
      vnName: 'Quỹ Đạo Chuyển Động',
      desc: 'Tính toán góc bắn, vận tốc đạn đạo parabol và dự đoán đường đi phản xạ tia laser trong buồng gương kín.',
      difficulty: 'Vật Lý Toán',
      color: 'border-teal-500 shadow-teal-500/20',
      btnColor: 'bg-teal-600 hover:bg-teal-500',
      link: '/applied-math/trajectory',
    },
    {
      id: 'graph-theory',
      name: 'Graph Theory Arena',
      vnName: 'Lý Thuyết Đồ Thị',
      desc: 'Tương tác trực tiếp trên đồ thị có trọng số: tìm đường ngắn nhất (Dijkstra), cây khung nhỏ nhất (MST) và tô màu đồ thị.',
      difficulty: 'Tối Ưu Hóa',
      color: 'border-green-500 shadow-green-500/20',
      btnColor: 'bg-green-600 hover:bg-green-500',
      link: '/applied-math/graph-theory',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans p-8 selection:bg-emerald-500 selection:text-white">
      <div className="max-w-6xl mx-auto mb-12">
        <Link
          href="/"
          className="inline-flex items-center text-slate-400 hover:text-emerald-400 transition-colors mb-6 group"
        >
          <span className="mr-2 text-xl group-hover:-translate-x-1 transition-transform">←</span>
          Quay lại Trang Chủ
        </Link>

        <h1 className="text-4xl md:text-6xl font-black mb-4">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-400 to-green-400">
            Toán Ứng Dụng &amp; Mã Hóa
          </span>
        </h1>
        <p className="text-slate-400 text-lg max-w-2xl leading-relaxed">
          Applied Mathematics &amp; Cryptography • Kết hợp toán học rời rạc, mật mã học, cơ học quỹ đạo và thuật toán tối ưu hóa trên đồ thị.
        </p>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        {games.map((game) => (
          <div
            key={game.id}
            className={`relative group bg-slate-900 rounded-3xl p-8 border ${game.color} border-opacity-40 hover:border-opacity-100 transition-all duration-300 shadow-xl hover:shadow-2xl hover:-translate-y-1 flex flex-col justify-between h-full overflow-hidden`}
          >
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-white to-transparent opacity-[0.03] rounded-full blur-3xl -mr-10 -mt-10 group-hover:opacity-[0.08] transition-opacity" />

            <div className="absolute top-6 right-6 bg-slate-800/80 backdrop-blur text-[10px] uppercase font-bold text-slate-300 px-3 py-1 rounded-full border border-slate-700 tracking-wider">
              {game.difficulty}
            </div>

            <div className="relative z-10 mb-8 pt-6">
              <h3 className="text-2xl font-black text-white mb-1 font-mono tracking-tighter">
                {game.name}
              </h3>
              <h4 className="text-emerald-400 text-xs font-bold uppercase tracking-widest mb-4">
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
