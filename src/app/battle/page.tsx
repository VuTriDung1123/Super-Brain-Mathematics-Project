import Link from 'next/link';

export default function BattleMenu() {
  const games = [
    {
      id: 'math-arena',
      kanji: '剣',
      name: 'Math Battle Arena',
      vnName: 'Trận Chiến Tính Toán',
      desc: 'Đấu tay đôi tốc độ trực tiếp với 4 cấp AI Siêu Trí Tuệ theo thanh máu HP và chuỗi Combo sát thương.',
      difficulty: 'Đối Kháng AI',
      ribbon: 'from-[#a62626] to-[#f4b8c8]',
      btnColor: 'bg-gradient-to-r from-[#a62626] to-[#c9424b] hover:brightness-110',
      link: '/battle/math-arena',
    },
    {
      id: 'quick-reflex',
      kanji: '瞬',
      name: 'Hyper Reflex & Stroop',
      vnName: 'Phản Xạ Nhanh',
      desc: 'Thử thách tốc độ phản xạ tính bằng mili-giây: Đúng/Sai siêu tốc, So sánh biểu thức và Nhiễu nhận thức Stroop.',
      difficulty: 'Phản Xạ ms',
      ribbon: 'from-[#c83e37] to-[#e6c173]',
      btnColor: 'bg-gradient-to-r from-[#b8324c] to-[#d95975] hover:brightness-110',
      link: '/battle/quick-reflex',
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
            真剣
          </span>
          <span className="text-xs font-bold uppercase tracking-[0.25em] text-[#d9b56c]">
            真剣勝負 • SPEED &amp; ACCURACY ARENA
          </span>
        </div>

        <h1 className="text-4xl md:text-6xl font-black mb-3 text-transparent bg-clip-text bg-gradient-to-r from-[#f29bb0] via-[#f6d58e] to-[#d94848]">
          Tốc Độ &amp; Độ Chính Xác
        </h1>
        <p className="text-[#c7b2b5] text-base md:text-lg max-w-2xl leading-relaxed">
          Võ đài đối kháng sinh tử — nơi mỗi mili-giây ra đòn và sự chuẩn xác tuyệt đối quyết định thắng bại.
        </p>
      </div>

      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
        {games.map((game) => (
          <div
            key={game.id}
            className="relative group jp-lacquer-card rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between"
          >
            <div className={`h-1.5 w-full bg-gradient-to-r ${game.ribbon}`} />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-2 -bottom-4 text-[115px] leading-none font-bold text-[#e06a78] opacity-[0.07] group-hover:opacity-[0.14] transition-opacity select-none"
              style={{ fontFamily: 'var(--font-jp)' }}
            >
              {game.kanji}
            </div>

            <div className="p-8 flex-1 flex flex-col justify-between relative z-10">
              <div className="mb-8">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[#f29bb0] text-xs font-bold uppercase tracking-widest">
                    {game.vnName}
                  </span>
                  <span className="bg-[#2b1d23] text-[10px] uppercase font-bold text-[#e6c173] px-3 py-1 rounded-full border border-[#d9b56c]/35">
                    {game.difficulty}
                  </span>
                </div>
                <h2 className="text-3xl font-black text-[#f6efe4] mb-3">{game.name}</h2>
                <p className="text-[#cfc0be] text-sm leading-relaxed">{game.desc}</p>
              </div>

              <Link
                href={game.link}
                className={`block w-full text-center py-4 rounded-xl font-bold text-[#fff8f3] border border-white/15 transition-all active:scale-[0.98] shadow-lg ${game.btnColor}`}
              >
                Vào Đấu Trường →
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
