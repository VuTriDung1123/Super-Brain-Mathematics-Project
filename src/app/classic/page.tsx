'use client';

import { useState } from 'react';
import Link from 'next/link';

type ClassicGroup = 'all' | 'board' | 'spatial' | 'memory' | 'observe';

interface ClassicGameCard {
  id: string;
  kanji: string;
  name: string;
  vnName: string;
  desc: string;
  badge: string;
  group: Exclude<ClassicGroup, 'all'>;
  ribbon: string;
  btnColor: string;
  link: string;
}

const CLASSIC_GAMES: ClassicGameCard[] = [
  // 1. Logic Bàn Cờ & Tổ Hợp (5)
  {
    id: 'knights-tour',
    kanji: '桂',
    name: "Blind Knight's Tour",
    vnName: 'Mã Đi Tuần Ẩn',
    desc: 'Di chuyển quân Mã qua toàn bộ bàn cờ mỗi ô đúng 1 lần — hỗ trợ chế độ Tiêu chuẩn và Chế độ Mù ẩn dấu vết.',
    badge: 'Logic Bàn Cờ',
    group: 'board',
    ribbon: 'from-[#7d5296] to-[#f4b8c8]',
    btnColor: 'bg-gradient-to-r from-[#67417d] to-[#8f5ca8] hover:brightness-110',
    link: '/classic/knights-tour',
  },
  {
    id: 'logic-bridges',
    kanji: '橋',
    name: 'Logic Tung Hoành',
    vnName: 'Logic Tung Hoành (Numberlink & Hashi)',
    desc: 'Hai chế độ kinh điển: Nối cặp số phủ kín bảng không cắt nhau (Numberlink) và Xây cầu đảo số (Hashiwokakero).',
    badge: 'Logic Bàn Cờ',
    group: 'board',
    ribbon: 'from-[#3b6998] to-[#c8a2d6]',
    btnColor: 'bg-gradient-to-r from-[#345978] to-[#567c99] hover:brightness-110',
    link: '/classic/logic-bridges',
  },
  {
    id: 'sliding-puzzle',
    kanji: '滑',
    name: 'Huarong Dao / 15-Puzzle',
    vnName: 'Hoa Dung Đạo Số',
    desc: 'Trượt các khối số 3×3, 4×4, 5×5 về đúng thứ tự chuẩn với tốc độ kỷ lục (thử thách kinh điển của Hà Du Quân).',
    badge: 'Logic Bàn Cờ',
    group: 'board',
    ribbon: 'from-[#2e5d87] to-[#e6c173]',
    btnColor: 'bg-gradient-to-r from-[#2c527a] to-[#4a7ba8] hover:brightness-110',
    link: '/classic/sliding-puzzle',
  },
  {
    id: 'nonogram',
    kanji: '画',
    name: 'Nonogram Picross',
    vnName: 'Giải Mã Ảnh Ẩn',
    desc: 'Suy luận từ các dãy số gợi ý đầu hàng và cột để tô chính xác bức tranh pixel bị ẩn giấu.',
    badge: 'Logic Bàn Cờ',
    group: 'board',
    ribbon: 'from-[#8c4a7d] to-[#f4b8c8]',
    btnColor: 'bg-gradient-to-r from-[#783c6a] to-[#a3588f] hover:brightness-110',
    link: '/classic/nonogram',
  },
  {
    id: 'untangle',
    kanji: '解',
    name: 'Planarity Untangle',
    vnName: 'Gỡ Rối Mạng Nhện',
    desc: 'Kéo thả các đỉnh của một đồ thị phẳng bị xoắn rối sao cho không còn bất kỳ hai cạnh nào cắt nhau.',
    badge: 'Logic Bàn Cờ',
    group: 'board',
    ribbon: 'from-[#9e4770] to-[#e6c173]',
    btnColor: 'bg-gradient-to-r from-[#85385c] to-[#b3527d] hover:brightness-110',
    link: '/classic/untangle',
  },

  // 2. Không Gian & Hình Học (4)
  {
    id: 'three-view',
    kanji: '影',
    name: '3-View Projection',
    vnName: 'Ba Hình Chiếu 3D',
    desc: 'Từ 3 hình chiếu phẳng Chính diện – Bằng – Cạnh, tưởng tượng và chọn đúng khối 3D duy nhất khớp hoàn toàn.',
    badge: 'Không Gian',
    group: 'spatial',
    ribbon: 'from-[#b86f2c] to-[#f2d096]',
    btnColor: 'bg-gradient-to-r from-[#9e5c21] to-[#c98138] hover:brightness-110',
    link: '/classic/three-view',
  },
  {
    id: 'origami-punch',
    kanji: '鶴',
    name: 'Origami Hole Punch',
    vnName: 'Gấp Giấy Đục Lỗ',
    desc: 'Theo dõi quá trình gấp giấy Origami nhiều bước rồi đục lỗ; suy luận toàn bộ tọa độ lỗ khi mở phẳng tờ giấy.',
    badge: 'Không Gian',
    group: 'spatial',
    ribbon: 'from-[#c78f2e] to-[#f6d58e]',
    btnColor: 'bg-gradient-to-r from-[#9e6c1d] to-[#c99538] hover:brightness-110',
    link: '/classic/origami-punch',
  },
  {
    id: 'honeycomb-maze',
    kanji: '蜂',
    name: 'Honeycomb Maze',
    vnName: 'Mê Cung Tổ Ong',
    desc: 'Mê cung lưới lục giác 6 hướng di chuyển — hỗ trợ cả chế độ Toàn cảnh và Chế độ Ghi nhớ đi mù.',
    badge: 'Không Gian',
    group: 'spatial',
    ribbon: 'from-[#b88435] to-[#f4b8c8]',
    btnColor: 'bg-gradient-to-r from-[#8f6424] to-[#bd8838] hover:brightness-110',
    link: '/classic/honeycomb-maze',
  },
  {
    id: 'layer-overlay',
    kanji: '重',
    name: 'Layer Overlay XOR',
    vnName: 'Tầng Tầng Điệp Ảnh',
    desc: 'Tìm bộ 2 hoặc 3 tấm thẻ hình học trong suốt chồng lên nhau (luật Hợp OR hoặc Triệt tiêu XOR) tạo ảnh đích.',
    badge: 'Không Gian',
    group: 'spatial',
    ribbon: 'from-[#2e6f73] to-[#f4b8c8]',
    btnColor: 'bg-gradient-to-r from-[#265c61] to-[#3f868c] hover:brightness-110',
    link: '/classic/layer-overlay',
  },

  // 3. Trí Nhớ Siêu Phàm (4)
  {
    id: 'pixel-wall',
    kanji: '壁',
    name: 'Pixel Wall Memory',
    vnName: 'Bức Tường Điểm Ảnh',
    desc: 'Ghi nhớ ma trận nhị phân lớn trong vài giây, sau đó chỉ ra đúng 1 điểm ảnh duy nhất vừa bị thay đổi.',
    badge: 'Trí Nhớ',
    group: 'memory',
    ribbon: 'from-[#c83e60] to-[#f4b8c8]',
    btnColor: 'bg-gradient-to-r from-[#a62d4d] to-[#cf5172] hover:brightness-110',
    link: '/classic/pixel-wall',
  },
  {
    id: 'speed-cards',
    kanji: '札',
    name: 'Speed Cards',
    vnName: 'Nhớ Bài Tây Siêu Tốc',
    desc: 'Ghi nhớ chính xác thứ tự từ 8 đến 52 lá bài tây xáo trộn ngẫu nhiên và tái hiện lại từng lá.',
    badge: 'Trí Nhớ',
    group: 'memory',
    ribbon: 'from-[#b8322c] to-[#f29bb0]',
    btnColor: 'bg-gradient-to-r from-[#9e2b26] to-[#c94741] hover:brightness-110',
    link: '/classic/speed-cards',
  },
  {
    id: 'dual-n-back',
    kanji: '記',
    name: 'Dual N-Back',
    vnName: 'Dual N-Back (Trí Nhớ Kép)',
    desc: 'Bài tập chuẩn khoa học thần kinh: theo dõi đồng thời vị trí ô sáng và âm thanh chữ cái cách đó N bước.',
    badge: 'Trí Nhớ',
    group: 'memory',
    ribbon: 'from-[#3b6998] to-[#a3c7e3]',
    btnColor: 'bg-gradient-to-r from-[#2f5880] to-[#4e80b0] hover:brightness-110',
    link: '/classic/dual-n-back',
  },
  {
    id: 'path-memory',
    kanji: '跡',
    name: 'Path Memory Trace',
    vnName: 'Truy Tìm Dấu Vết',
    desc: 'Ghi nhớ lộ trình ngoằn ngoèo của chấm sáng chạy qua ma trận và vẽ lại theo chiều xuôi hoặc đảo ngược.',
    badge: 'Trí Nhớ',
    group: 'memory',
    ribbon: 'from-[#2e6f63] to-[#9ed1b5]',
    btnColor: 'bg-gradient-to-r from-[#255c52] to-[#3f8a7c] hover:brightness-110',
    link: '/classic/path-memory',
  },

  // 4. Quan Sát & Toán Học (3)
  {
    id: 'schulte-table',
    kanji: '眼',
    name: 'Schulte Table',
    vnName: 'Bảng Schulte',
    desc: 'Luyện tầm nhìn ngoại vi và tốc độ quét mắt: bấm liên tiếp các số 1 → N trên bảng 5×5, 6×6, 7×7 nhanh nhất có thể.',
    badge: 'Quan Sát',
    group: 'observe',
    ribbon: 'from-[#3b7a57] to-[#e6c173]',
    btnColor: 'bg-gradient-to-r from-[#2e6346] to-[#4b8c68] hover:brightness-110',
    link: '/classic/schulte-table',
  },
  {
    id: 'magic-square',
    kanji: '陣',
    name: 'Magic Square',
    vnName: 'Ma Phương',
    desc: 'Hoàn thiện bảng số 3×3, 4×4, 5×5 sao cho tổng mọi hàng, cột và hai đường chéo chính đều bằng hằng số ma phương.',
    badge: 'Toán Học',
    group: 'observe',
    ribbon: 'from-[#4d7c4f] to-[#d9b56c]',
    btnColor: 'bg-gradient-to-r from-[#3a633d] to-[#5a8f5e] hover:brightness-110',
    link: '/classic/magic-square',
  },
  {
    id: 'tower-of-hanoi',
    kanji: '塔',
    name: 'Tower of Hanoi',
    vnName: 'Tháp Hà Nội',
    desc: 'Chuyển toàn bộ chồng đĩa từ cọc nguồn sang cọc đích tuân thủ luật đĩa nhỏ trên đĩa lớn với số bước tối ưu 2ⁿ − 1.',
    badge: 'Toán Học',
    group: 'observe',
    ribbon: 'from-[#c83e37] to-[#e6b873]',
    btnColor: 'bg-gradient-to-r from-[#a62e29] to-[#c95343] hover:brightness-110',
    link: '/classic/tower-of-hanoi',
  },
];

const GROUP_TABS: { id: ClassicGroup; label: string; count: number }[] = [
  { id: 'all', label: '❀ Tất Cả', count: 16 },
  { id: 'board', label: '♟️ Logic Bàn Cờ', count: 5 },
  { id: 'spatial', label: '🧊 Không Gian & Hình Học', count: 4 },
  { id: 'memory', label: '🧠 Trí Nhớ Siêu Phàm', count: 4 },
  { id: 'observe', label: '👁️ Quan Sát & Toán Học', count: 3 },
];

export default function ClassicSuperBrainMenu() {
  const [activeGroup, setActiveGroup] = useState<ClassicGroup>('all');

  const visibleGames =
    activeGroup === 'all'
      ? CLASSIC_GAMES
      : CLASSIC_GAMES.filter((g) => g.group === activeGroup);

  return (
    <div className="min-h-screen text-[#f6efe4] font-sans pt-20 pb-20 px-6 md:px-8">
      <div className="max-w-7xl mx-auto mb-10 animate-fade-in">
        <Link
          href="/"
          className="inline-flex items-center text-[#c7b2b5] hover:text-[#f4b8c8] transition-colors mb-6 group text-sm"
        >
          <span className="mr-2 text-lg group-hover:-translate-x-1 transition-transform">←</span>
          Quay lại Đạo Quán
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <span className="jp-hanko px-2.5 py-0.5 rounded text-xs font-bold tracking-widest">
            秘伝
          </span>
          <span className="text-xs font-bold uppercase tracking-[0.25em] text-[#d9b56c]">
            秘伝十六選 • THE BRAIN CLASSICS
          </span>
        </div>

        <h1 className="text-4xl md:text-6xl font-black mb-4 text-transparent bg-clip-text bg-gradient-to-r from-[#f6d58e] via-[#f4b8c8] to-[#e06a78]">
          Siêu Trí Tuệ Kinh Điển
        </h1>
        <p className="text-[#c7b2b5] text-base md:text-lg max-w-3xl leading-relaxed">
          Tuyển tập 16 thử thách huyền thoại từ chương trình Siêu Trí Tuệ Việt Nam &amp; Trung Quốc — hội tụ đầy đủ Logic bàn cờ, Không gian 3D, Trí nhớ siêu phàm và Tốc độ quan sát.
        </p>

        {/* Traditional Lacquer Filter Tabs */}
        <div className="flex flex-wrap gap-2 mt-8">
          {GROUP_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveGroup(tab.id)}
              className={`px-4 py-2 rounded-full text-sm font-bold border transition-all cursor-pointer ${
                activeGroup === tab.id
                  ? 'bg-gradient-to-r from-[#b8322c] to-[#d9596d] border-[#f4b8c8]/50 text-[#fff8f3] shadow-lg shadow-[#c83e37]/25'
                  : 'bg-[#1d1418]/90 border-[#d9b56c]/25 text-[#c7b2b5] hover:text-[#f6efe4] hover:border-[#f4b8c8]/50'
              }`}
            >
              {tab.label}{' '}
              <span className="ml-1 text-xs opacity-80 font-mono">({tab.count})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Game Grid */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {visibleGames.map((game) => (
          <div
            key={game.id}
            className="relative group jp-lacquer-card rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between"
          >
            <div className={`h-1.5 w-full bg-gradient-to-r ${game.ribbon}`} />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-2 -bottom-4 text-[110px] leading-none font-bold text-[#f4b8c8] opacity-[0.06] group-hover:opacity-[0.13] transition-opacity select-none"
              style={{ fontFamily: 'var(--font-jp)' }}
            >
              {game.kanji}
            </div>

            <div className="p-6 flex-1 flex flex-col justify-between relative z-10">
              <div className="mb-7">
                <div className="flex justify-between items-center gap-2 mb-3">
                  <span className="text-[#f4b8c8] text-xs font-bold uppercase tracking-wider truncate">
                    {game.vnName}
                  </span>
                  <span className="shrink-0 bg-[#2b1d23] text-[10px] uppercase font-bold text-[#e6c173] px-2.5 py-0.5 rounded-full border border-[#d9b56c]/35">
                    {game.badge}
                  </span>
                </div>
                <h2 className="text-2xl font-black text-[#f6efe4] mb-2">{game.name}</h2>
                <p className="text-[#cfc0be] leading-relaxed text-sm">{game.desc}</p>
              </div>

              <Link
                href={game.link}
                className={`block w-full text-center py-3.5 rounded-xl font-bold text-[#fff8f3] border border-white/15 transition-all active:scale-[0.98] shadow-lg ${game.btnColor}`}
              >
                Thử Thách Ngay →
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
