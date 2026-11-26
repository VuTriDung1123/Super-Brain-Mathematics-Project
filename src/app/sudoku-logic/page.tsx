import Link from 'next/link';

export default function SudokuLogicMenu() {
  const games = [
    {
      id: 'blind-sudoku',
      kanji: '盲',
      name: 'Blind Sudoku',
      vnName: 'Sudoku Mù',
      desc: 'Ghi nhớ bảng số trong khoảnh khắc rồi tái hiện và giải hoàn chỉnh trên bảng trắng.',
      difficulty: 'Trí Nhớ',
      ribbon: 'from-[#7d5296] to-[#c8a2d6]',
      btnColor: 'bg-gradient-to-r from-[#67417d] to-[#8f5ca8] hover:brightness-110',
      link: '/sudoku-logic/blind',
    },
    {
      id: 'cube-sudoku',
      kanji: '立',
      name: 'Cube Sudoku',
      vnName: 'Sudoku Lập Phương 3D',
      desc: 'Giải đồng thời 6 mặt Sudoku trên khối lập phương 3D xoay tự do — hỗ trợ tới cỡ 16×16.',
      difficulty: 'Không Gian',
      ribbon: 'from-[#9e4770] to-[#f4b8c8]',
      btnColor: 'bg-gradient-to-r from-[#8c385f] to-[#b8537f] hover:brightness-110',
      link: '/sudoku-logic/cube',
    },
    {
      id: 'chromatic-sudoku',
      kanji: '彩',
      name: 'Chromatic Sudoku',
      vnName: 'Sudoku Sắc Màu',
      desc: 'Thử thách lưỡng tính: vừa giải Sudoku theo số, vừa giải theo màu sắc chồng trên cùng một bàn cờ.',
      difficulty: 'Tư Duy Kép',
      ribbon: 'from-[#3b6998] to-[#f4b8c8]',
      btnColor: 'bg-gradient-to-r from-[#36608a] to-[#5788b5] hover:brightness-110',
      link: '/sudoku-logic/chromatic',
    },
    {
      id: 'number-maze',
      kanji: '迷',
      name: 'Number Maze',
      vnName: 'Mê Cung Số',
      desc: 'Tìm đường đi ngắn nhất xuyên qua ma trận số học theo luật Chẵn/Lẻ, Nguyên Tố hoặc Bội Số 3.',
      difficulty: 'Logic',
      ribbon: 'from-[#b8322c] to-[#e6c173]',
      btnColor: 'bg-gradient-to-r from-[#9e2b26] to-[#c8463e] hover:brightness-110',
      link: '/sudoku-logic/maze',
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
            数独
          </span>
          <span className="text-xs font-bold uppercase tracking-[0.25em] text-[#d9b56c]">
            数独論理 • LOGIC VARIANTS
          </span>
        </div>

        <h1 className="text-4xl md:text-6xl font-black mb-3 text-transparent bg-clip-text bg-gradient-to-r from-[#dfc2eb] via-[#f4b8c8] to-[#e6c173]">
          Sudoku &amp; Logic Số
        </h1>
        <p className="text-[#c7b2b5] text-base md:text-lg max-w-2xl leading-relaxed">
          Đấu trường của những con số và quy luật tổ hợp — nơi suy luận chặt chẽ, trí nhớ ảnh và tư duy 3D được đẩy tới cực hạn.
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
              className="pointer-events-none absolute -right-2 -bottom-4 text-[110px] leading-none font-bold text-[#c8a2d6] opacity-[0.06] group-hover:opacity-[0.12] transition-opacity select-none"
              style={{ fontFamily: 'var(--font-jp)' }}
            >
              {game.kanji}
            </div>

            <div className="p-7 flex-1 flex flex-col justify-between relative z-10">
              <div className="mb-8">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[#dfc2eb] text-xs font-bold uppercase tracking-widest">
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
                Chơi Ngay →
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
