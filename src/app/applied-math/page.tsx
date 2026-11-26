import Link from 'next/link';

export default function AppliedMathMenu() {
  const games = [
    {
      id: 'signal-decoding',
      kanji: '暗',
      name: 'Signal & Cipher Lab',
      vnName: 'Giải Mã Tín Hiệu',
      desc: 'Phá giải mật mã Caesar, sóng nhị phân/HEX, tín hiệu Morse có âm thanh và chuỗi quy luật số học.',
      difficulty: 'Mật Mã Học',
      ribbon: 'from-[#3b7a57] to-[#9ed1b5]',
      btnColor: 'bg-gradient-to-r from-[#2e6346] to-[#4b8c68] hover:brightness-110',
      link: '/applied-math/signal-decoding',
    },
    {
      id: 'trajectory',
      kanji: '軌',
      name: 'Trajectory & Optics',
      vnName: 'Quỹ Đạo Chuyển Động',
      desc: 'Tính toán góc bắn, vận tốc đạn đạo parabol và dự đoán đường đi phản xạ tia laser trong buồng gương kín.',
      difficulty: 'Vật Lý Toán',
      ribbon: 'from-[#2e6f73] to-[#d9b56c]',
      btnColor: 'bg-gradient-to-r from-[#265c61] to-[#3f868c] hover:brightness-110',
      link: '/applied-math/trajectory',
    },
    {
      id: 'graph-theory',
      kanji: '網',
      name: 'Graph Theory Arena',
      vnName: 'Lý Thuyết Đồ Thị',
      desc: 'Tương tác trực tiếp trên đồ thị có trọng số: đường ngắn nhất (Dijkstra), cây khung nhỏ nhất (MST) và tô màu.',
      difficulty: 'Tối Ưu Hóa',
      ribbon: 'from-[#4d7c4f] to-[#a8d6bc]',
      btnColor: 'bg-gradient-to-r from-[#3a633d] to-[#5a8f5e] hover:brightness-110',
      link: '/applied-math/graph-theory',
    },
  ];

  return (
    <div className="min-h-screen text-[#f6efe4] font-sans pt-20 pb-20 px-6 md:px-8">
      <div className="max-w-6xl mx-auto mb-12 animate-fade-in">
        <Link
          href="/"
          className="inline-flex items-center text-[#c7b2b5] hover:text-[#f4b8c8] transition-colors mb-6 group text-sm"
        >
          <span className="mr-2 text-lg group-hover:-translate-x-1 transition-transform">←</span>
          Quay lại Đạo Quán
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <span className="jp-hanko px-2.5 py-0.5 rounded text-xs font-bold tracking-widest">
            暗号
          </span>
          <span className="text-xs font-bold uppercase tracking-[0.25em] text-[#d9b56c]">
            暗号数理 • APPLIED MATHEMATICS
          </span>
        </div>

        <h1 className="text-4xl md:text-6xl font-black mb-3 text-transparent bg-clip-text bg-gradient-to-r from-[#a8d6bc] via-[#f6efe4] to-[#e6c173]">
          Toán Ứng Dụng &amp; Mã Hóa
        </h1>
        <p className="text-[#c7b2b5] text-base md:text-lg max-w-2xl leading-relaxed">
          Kết hợp mật mã học cổ điển, cơ học quỹ đạo, quang học phản xạ và thuật toán tối ưu hóa trên đồ thị.
        </p>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        {games.map((game) => (
          <div
            key={game.id}
            className="relative group jp-lacquer-card rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between"
          >
            <div className={`h-1.5 w-full bg-gradient-to-r ${game.ribbon}`} />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-2 -bottom-4 text-[110px] leading-none font-bold text-[#84b89a] opacity-[0.06] group-hover:opacity-[0.12] transition-opacity select-none"
              style={{ fontFamily: 'var(--font-jp)' }}
            >
              {game.kanji}
            </div>

            <div className="p-7 flex-1 flex flex-col justify-between relative z-10">
              <div className="mb-8">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[#a8d6bc] text-xs font-bold uppercase tracking-widest">
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
