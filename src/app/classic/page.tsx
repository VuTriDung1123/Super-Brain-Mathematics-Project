'use client';

import { useState } from 'react';
import Link from 'next/link';

type ClassicGroup = 'all' | 'board' | 'spatial' | 'memory' | 'observe';

interface ClassicGameCard {
  id: string;
  name: string;
  vnName: string;
  desc: string;
  badge: string;
  group: Exclude<ClassicGroup, 'all'>;
  color: string;
  btnColor: string;
  link: string;
}

const CLASSIC_GAMES: ClassicGameCard[] = [
  // 1. Logic Bàn Cờ & Tổ Hợp (5)
  {
    id: 'knights-tour',
    name: "Blind Knight's Tour",
    vnName: 'Mã Đi Tuần Ẩn',
    desc: 'Di chuyển quân Mã qua toàn bộ bàn cờ mỗi ô đúng 1 lần — hỗ trợ chế độ Tiêu chuẩn và Chế độ Mù ẩn dấu vết.',
    badge: 'Logic Bàn Cờ',
    group: 'board',
    color: 'border-violet-500 shadow-violet-500/20',
    btnColor: 'bg-violet-600 hover:bg-violet-500',
    link: '/classic/knights-tour',
  },
  {
    id: 'logic-bridges',
    name: 'Logic Tung Hoành',
    vnName: 'Logic Tung Hoành (Numberlink & Hashi)',
    desc: 'Hai chế độ kinh điển: Nối cặp số phủ kín bảng không cắt nhau (Numberlink) và Xây cầu đảo số (Hashiwokakero).',
    badge: 'Logic Bàn Cờ',
    group: 'board',
    color: 'border-indigo-500 shadow-indigo-500/20',
    btnColor: 'bg-indigo-600 hover:bg-indigo-500',
    link: '/classic/logic-bridges',
  },
  {
    id: 'sliding-puzzle',
    name: 'Huarong Dao / 15-Puzzle',
    vnName: 'Hoa Dung Đạo Số',
    desc: 'Trượt các khối số 3×3, 4×4, 5×5 về đúng thứ tự chuẩn với tốc độ kỷ lục (thử thách kinh điển của Hà Du Quân).',
    badge: 'Logic Bàn Cờ',
    group: 'board',
    color: 'border-blue-500 shadow-blue-500/20',
    btnColor: 'bg-blue-600 hover:bg-blue-500',
    link: '/classic/sliding-puzzle',
  },
  {
    id: 'nonogram',
    name: 'Nonogram Picross',
    vnName: 'Giải Mã Ảnh Ẩn',
    desc: 'Suy luận từ các dãy số gợi ý đầu hàng và cột để tô chính xác bức tranh pixel bị ẩn giấu.',
    badge: 'Logic Bàn Cờ',
    group: 'board',
    color: 'border-purple-500 shadow-purple-500/20',
    btnColor: 'bg-purple-600 hover:bg-purple-500',
    link: '/classic/nonogram',
  },
  {
    id: 'untangle',
    name: 'Planarity Untangle',
    vnName: 'Gỡ Rối Mạng Nhện',
    desc: 'Kéo thả các đỉnh của một đồ thị phẳng bị xoắn rối sao cho không còn bất kỳ hai cạnh nào cắt nhau.',
    badge: 'Logic Bàn Cờ',
    group: 'board',
    color: 'border-fuchsia-500 shadow-fuchsia-500/20',
    btnColor: 'bg-fuchsia-600 hover:bg-fuchsia-500',
    link: '/classic/untangle',
  },

  // 2. Không Gian & Hình Học (4)
  {
    id: 'three-view',
    name: '3-View Projection',
    vnName: 'Ba Hình Chiếu 3D',
    desc: 'Từ 3 hình chiếu phẳng Chính diện – Bằng – Cạnh, tưởng tượng và chọn (hoặc dựng) đúng khối 3D duy nhất khớp hoàn toàn.',
    badge: 'Không Gian',
    group: 'spatial',
    color: 'border-orange-500 shadow-orange-500/20',
    btnColor: 'bg-orange-600 hover:bg-orange-500',
    link: '/classic/three-view',
  },
  {
    id: 'origami-punch',
    name: 'Origami Hole Punch',
    vnName: 'Gấp Giấy Đục Lỗ',
    desc: 'Theo dõi quá trình gấp giấy nhiều bước rồi đục lỗ; suy luận toàn bộ tọa độ lỗ xuất hiện khi mở phẳng tờ giấy.',
    badge: 'Không Gian',
    group: 'spatial',
    color: 'border-amber-500 shadow-amber-500/20',
    btnColor: 'bg-amber-600 hover:bg-amber-500',
    link: '/classic/origami-punch',
  },
  {
    id: 'honeycomb-maze',
    name: 'Honeycomb Maze',
    vnName: 'Mê Cung Tổ Ong',
    desc: 'Mê cung lưới lục giác 6 hướng di chuyển — hỗ trợ cả chế độ Toàn cảnh và Chế độ Ghi nhớ đi mù.',
    badge: 'Không Gian',
    group: 'spatial',
    color: 'border-yellow-500 shadow-yellow-500/20',
    btnColor: 'bg-yellow-600 hover:bg-yellow-500',
    link: '/classic/honeycomb-maze',
  },
  {
    id: 'layer-overlay',
    name: 'Layer Overlay XOR',
    vnName: 'Tầng Tầng Điệp Ảnh',
    desc: 'Tìm bộ 2 hoặc 3 tấm thẻ hình học trong suốt chồng lên nhau (theo luật Hợp OR hoặc Triệt tiêu XOR) tạo thành ảnh đích.',
    badge: 'Không Gian',
    group: 'spatial',
    color: 'border-cyan-500 shadow-cyan-500/20',
    btnColor: 'bg-cyan-600 hover:bg-cyan-500',
    link: '/classic/layer-overlay',
  },

  // 3. Trí Nhớ Siêu Phàm (4)
  {
    id: 'pixel-wall',
    name: 'Pixel Wall Memory',
    vnName: 'Bức Tường Điểm Ảnh',
    desc: 'Ghi nhớ ma trận nhị phân lớn trong vài giây, sau đó chỉ ra đúng 1 điểm ảnh duy nhất vừa bị thay đổi.',
    badge: 'Trí Nhớ',
    group: 'memory',
    color: 'border-pink-500 shadow-pink-500/20',
    btnColor: 'bg-pink-600 hover:bg-pink-500',
    link: '/classic/pixel-wall',
  },
  {
    id: 'speed-cards',
    name: 'Speed Cards',
    vnName: 'Nhớ Bài Tây Siêu Tốc',
    desc: 'Ghi nhớ chính xác thứ tự từ 10 đến 52 lá bài tây xáo trộn ngẫu nhiên và tái hiện lại từng lá.',
    badge: 'Trí Nhớ',
    group: 'memory',
    color: 'border-rose-500 shadow-rose-500/20',
    btnColor: 'bg-rose-600 hover:bg-rose-500',
    link: '/classic/speed-cards',
  },
  {
    id: 'dual-n-back',
    name: 'Dual N-Back',
    vnName: 'Dual N-Back (Trí Nhớ Kép)',
    desc: 'Bài tập chuẩn khoa học thần kinh: theo dõi đồng thời vị trí ô sáng và âm thanh chữ cái cách đó N bước.',
    badge: 'Trí Nhớ',
    group: 'memory',
    color: 'border-sky-500 shadow-sky-500/20',
    btnColor: 'bg-sky-600 hover:bg-sky-500',
    link: '/classic/dual-n-back',
  },
  {
    id: 'path-memory',
    name: 'Path Memory Trace',
    vnName: 'Truy Tìm Dấu Vết',
    desc: 'Ghi nhớ lộ trình ngoằn ngoèo của chấm sáng chạy qua ma trận và vẽ lại theo chiều xuôi hoặc đảo ngược.',
    badge: 'Trí Nhớ',
    group: 'memory',
    color: 'border-teal-500 shadow-teal-500/20',
    btnColor: 'bg-teal-600 hover:bg-teal-500',
    link: '/classic/path-memory',
  },

  // 4. Quan Sát & Toán Học (3)
  {
    id: 'schulte-table',
    name: 'Schulte Table',
    vnName: 'Bảng Schulte',
    desc: 'Luyện tầm nhìn ngoại vi và tốc độ quét mắt: bấm liên tiếp các số 1 → N trên bảng 5×5, 6×6, 7×7 nhanh nhất có thể.',
    badge: 'Quan Sát',
    group: 'observe',
    color: 'border-emerald-500 shadow-emerald-500/20',
    btnColor: 'bg-emerald-600 hover:bg-emerald-500',
    link: '/classic/schulte-table',
  },
  {
    id: 'magic-square',
    name: 'Magic Square',
    vnName: 'Ma Phương',
    desc: 'Hoàn thiện bảng số 3×3, 4×4, 5×5 sao cho tổng mọi hàng, cột và hai đường chéo chính đều bằng hằng số ma phương.',
    badge: 'Toán Học',
    group: 'observe',
    color: 'border-green-500 shadow-green-500/20',
    btnColor: 'bg-green-600 hover:bg-green-500',
    link: '/classic/magic-square',
  },
  {
    id: 'tower-of-hanoi',
    name: 'Tower of Hanoi',
    vnName: 'Tháp Hà Nội',
    desc: 'Chuyển toàn bộ chồng đĩa từ cọc nguồn sang cọc đích tuân thủ luật đĩa nhỏ trên đĩa lớn với số bước tối ưu 2ⁿ − 1.',
    badge: 'Toán Học',
    group: 'observe',
    color: 'border-red-500 shadow-red-500/20',
    btnColor: 'bg-red-600 hover:bg-red-500',
    link: '/classic/tower-of-hanoi',
  },
];

const GROUP_TABS: { id: ClassicGroup; label: string; count: number }[] = [
  { id: 'all', label: 'Tất Cả', count: 16 },
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
    <div className="min-h-screen bg-slate-950 text-white font-sans pt-20 pb-20 px-6 md:px-8 selection:bg-violet-500 selection:text-white">
      <div className="max-w-7xl mx-auto mb-10">
        <Link
          href="/"
          className="inline-flex items-center text-slate-400 hover:text-violet-400 transition-colors mb-6 group"
        >
          <span className="mr-2 text-xl group-hover:-translate-x-1 transition-transform">←</span>
          Quay lại Trang Chủ
        </Link>

        <h1 className="text-4xl md:text-6xl font-black mb-4">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-violet-400 to-fuchsia-400">
            Siêu Trí Tuệ Kinh Điển
          </span>
        </h1>
        <p className="text-slate-400 text-lg max-w-3xl leading-relaxed">
          The Brain Classics • Tuyển tập 16 trò chơi biểu tượng từ chương trình Siêu Trí Tuệ Việt Nam &amp; Trung Quốc — hội tụ đầy đủ Logic bàn cờ, Không gian 3D, Trí nhớ siêu phàm và Tốc độ quan sát.
        </p>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2 mt-8">
          {GROUP_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveGroup(tab.id)}
              className={`px-4 py-2 rounded-full text-sm font-bold border transition-all cursor-pointer ${
                activeGroup === tab.id
                  ? 'bg-violet-600 border-violet-400 text-white shadow-lg shadow-violet-500/20'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-600'
              }`}
            >
              {tab.label}{' '}
              <span className="ml-1 text-xs opacity-75 font-mono">({tab.count})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Game Grid */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {visibleGames.map((game) => (
          <div
            key={game.id}
            className={`relative group bg-slate-900 rounded-3xl p-7 border ${game.color} border-opacity-40 hover:border-opacity-100 transition-all duration-300 shadow-xl hover:shadow-2xl hover:-translate-y-1 flex flex-col justify-between h-full overflow-hidden`}
          >
            <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-br from-white to-transparent opacity-[0.03] rounded-full blur-3xl -mr-8 -mt-8 group-hover:opacity-[0.08] transition-opacity" />

            <div className="absolute top-5 right-5 bg-slate-800/80 backdrop-blur text-[10px] uppercase font-bold text-slate-300 px-3 py-1 rounded-full border border-slate-700 tracking-wider">
              {game.badge}
            </div>

            <div className="relative z-10 mb-7 pt-5">
              <h3 className="text-2xl font-black text-white mb-1 font-mono tracking-tight">
                {game.name}
              </h3>
              <h4 className="text-violet-400 text-xs font-bold uppercase tracking-widest mb-3">
                {game.vnName}
              </h4>
              <p className="text-slate-400 leading-relaxed text-sm">{game.desc}</p>
            </div>

            <Link
              href={game.link}
              className={`relative z-10 block w-full text-center py-3.5 rounded-xl font-bold text-white transition-all transform active:scale-[0.98] shadow-lg ${game.btnColor}`}
            >
              THỬ THÁCH NGAY
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
