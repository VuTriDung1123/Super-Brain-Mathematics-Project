import Link from 'next/link';

export default function BattleMenu() {
  const games = [
    {
      id: 'math-arena',
      name: 'Math Battle Arena',
      vnName: 'Trận Chiến Tính Toán',
      desc: 'Đấu tay đôi tốc độ trực tiếp với AI Siêu Trí Tuệ theo thanh máu HP và chuỗi Combo sát thương toán học.',
      difficulty: 'Đối Kháng AI',
      color: 'border-red-500 shadow-red-500/20',
      btnColor: 'bg-red-600 hover:bg-red-500',
      link: '/battle/math-arena',
    },
    {
      id: 'quick-reflex',
      name: 'Hyper Reflex & Stroop',
      vnName: 'Phản Xạ Nhanh',
      desc: 'Thử thách tốc độ phản xạ tính bằng mili-giây: Đúng/Sai siêu tốc, So sánh biểu thức và Nhiễu nhận thức Stroop.',
      difficulty: 'Phản Xạ ms',
      color: 'border-rose-500 shadow-rose-500/20',
      btnColor: 'bg-rose-600 hover:bg-rose-500',
      link: '/battle/quick-reflex',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans p-8 selection:bg-red-500 selection:text-white">
      <div className="max-w-5xl mx-auto mb-12">
        <Link
          href="/"
          className="inline-flex items-center text-slate-400 hover:text-red-400 transition-colors mb-6 group"
        >
          <span className="mr-2 text-xl group-hover:-translate-x-1 transition-transform">←</span>
          Quay lại Trang Chủ
        </Link>

        <h1 className="text-4xl md:text-6xl font-black mb-4">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-rose-500 to-orange-500">
            Tốc Độ &amp; Độ Chính Xác
          </span>
        </h1>
        <p className="text-slate-400 text-lg max-w-2xl leading-relaxed">
          Speed &amp; Accuracy Arena • Đấu trường đối kháng tốc độ cao nơi mỗi mili-giây và độ chính xác tuyệt đối quyết định chiến thắng.
        </p>
      </div>

      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
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
              <h3 className="text-3xl font-black text-white mb-1 font-mono tracking-tighter">
                {game.name}
              </h3>
              <h4 className="text-red-400 text-xs font-bold uppercase tracking-widest mb-4">
                {game.vnName}
              </h4>
              <p className="text-slate-400 leading-relaxed text-sm">{game.desc}</p>
            </div>

            <Link
              href={game.link}
              className={`relative z-10 block w-full text-center py-4 rounded-xl font-bold text-white transition-all transform active:scale-[0.98] shadow-lg ${game.btnColor}`}
            >
              VÀO ĐẤU TRƯỜNG
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
