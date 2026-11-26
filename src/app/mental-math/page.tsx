import Link from 'next/link';

export default function MentalMathMenu() {
  const games = [
    {
      id: 'flash-anzan',
      kanji: '閃',
      name: 'Flash Anzan',
      vnName: 'Cộng Số Siêu Tốc',
      desc: 'Các con số xuất hiện chớp nhoáng trên màn hình chuẩn Soroban Nhật Bản. Cộng dồn chính xác tuyệt đối.',
      difficulty: 'Kinh Điển',
      ribbon: 'from-[#3b6998] to-[#7da6c7]',
      btnColor: 'bg-gradient-to-r from-[#2c527a] to-[#4a7ba8] hover:brightness-110',
      link: '/mental-math/flash-anzan',
    },
    {
      id: 'multi-complex',
      kanji: '乗',
      name: 'Complex Calculation',
      vnName: 'Nhân Chia Đa Chữ Số',
      desc: 'Thực hiện phép nhân/chia các số cực lớn (tới 18 chữ số) trong thời gian giới hạn với độ chính xác BigInt.',
      difficulty: 'Cao Cấp',
      ribbon: 'from-[#355c7d] to-[#d9b56c]',
      btnColor: 'bg-gradient-to-r from-[#345978] to-[#567c99] hover:brightness-110',
      link: '/mental-math/complex-calc',
    },
    {
      id: 'double-arithmetic',
      kanji: '双',
      name: 'Double Arithmetic',
      vnName: 'Tính Nhẩm Song Hành',
      desc: 'Vừa nhìn màn hình cộng số, vừa nghe giọng đọc tiếng Việt để xử lý song song hai luồng số học.',
      difficulty: 'Cực Khó',
      ribbon: 'from-[#5a4b81] to-[#f4b8c8]',
      btnColor: 'bg-gradient-to-r from-[#56437d] to-[#7b5fa3] hover:brightness-110',
      link: '/mental-math/double-task',
    },
    {
      id: 'root-extraction',
      kanji: '根',
      name: 'Root Extraction',
      vnName: 'Khai Căn Bậc Cao',
      desc: 'Tìm căn bậc 2 đến bậc 100 của một con số hàng chục chữ số bằng kỹ thuật ước lượng đỉnh cao.',
      difficulty: 'Siêu Trí Tuệ',
      ribbon: 'from-[#b88435] to-[#f2d096]',
      btnColor: 'bg-gradient-to-r from-[#9e6c24] to-[#c9923d] hover:brightness-110',
      link: '/mental-math/root-extraction',
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
            算術
          </span>
          <span className="text-xs font-bold uppercase tracking-[0.25em] text-[#d9b56c]">
            暗算道場 • MENTAL ARITHMETIC
          </span>
        </div>

        <h1 className="text-4xl md:text-6xl font-black mb-3 text-transparent bg-clip-text bg-gradient-to-r from-[#a3c7e3] via-[#f6efe4] to-[#e6c173]">
          Tính Nhẩm Siêu Tốc
        </h1>
        <p className="text-[#c7b2b5] text-base md:text-lg max-w-2xl leading-relaxed">
          Kế thừa tinh hoa bàn tính Soroban Nhật Bản — rèn luyện tốc độ xử lý con số và trí nhớ ngắn hạn ở cường độ tối đa.
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
              className="pointer-events-none absolute -right-2 -bottom-4 text-[110px] leading-none font-bold text-[#7da6c7] opacity-[0.06] group-hover:opacity-[0.12] transition-opacity select-none"
              style={{ fontFamily: 'var(--font-jp)' }}
            >
              {game.kanji}
            </div>

            <div className="p-7 flex-1 flex flex-col justify-between relative z-10">
              <div className="mb-8">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[#a3c7e3] text-xs font-bold uppercase tracking-widest">
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
