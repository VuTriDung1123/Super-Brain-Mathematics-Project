import Link from 'next/link';

export default function Home() {
  const categories = [
    {
      id: 1,
      title: "1. Tính nhẩm siêu tốc",
      subTitle: "Mental Arithmetic",
      desc: "Thách thức tốc độ xử lý con số của não bộ.",
      games: ["Flash Anzan", "Nhân chia đa chữ số", "Tính nhẩm song hành", "Khai căn"],
      color: "from-blue-500 to-cyan-500",
      link: "/mental-math",
    },
    {
      id: 2,
      title: "2. Sudoku & Logic Số",
      subTitle: "Logic Variants",
      desc: "Tư duy tổ hợp và suy luận logic.",
      games: ["Sudoku mù", "Sudoku lập phương", "Sudoku sắc màu", "Mê cung số"],
      color: "from-purple-500 to-pink-500",
      link: "/sudoku-logic",
    },
    {
      id: 3,
      title: "3. Hình học & Không gian",
      subTitle: "Spatial Reasoning",
      desc: "Tưởng tượng và tái cấu trúc không gian 3D.",
      games: ["Triển khai hình khối", "Ghép hình Tangram", "Mê cung không gian", "Phân hình học"],
      color: "from-orange-500 to-amber-500",
      link: "/spatial",
    },
    {
      id: 4,
      title: "4. Toán ứng dụng & Mã hóa",
      subTitle: "Applied Math",
      desc: "Giải mã tín hiệu, tính quỹ đạo và tối ưu đồ thị.",
      games: ["Giải mã tín hiệu", "Quỹ đạo chuyển động", "Lý thuyết đồ thị"],
      color: "from-emerald-500 to-green-500",
      link: "/applied-math",
    },
    {
      id: 5,
      title: "5. Tốc độ & Độ chính xác",
      subTitle: "Speed & Accuracy",
      desc: "Đối kháng tổng hợp các kỹ năng tính toán và phản xạ.",
      games: ["Trận chiến tính toán", "Phản xạ nhanh"],
      color: "from-red-500 to-rose-500",
      link: "/battle",
    },
  ];

  return (
    <main className="min-h-screen bg-slate-950 text-white p-8 font-sans">
      {/* --- HEADER --- */}
      <header className="max-w-6xl mx-auto text-center mb-16">
        <h1 className="text-5xl md:text-6xl font-extrabold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">
          SIÊU TRÍ TUỆ
        </h1>
        <p className="text-xl text-slate-400 uppercase tracking-widest">
          The Brain • Training Center
        </p>
      </header>

      {/* --- MENU GRID --- */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((cat) => (
          <Link
            key={cat.id}
            href={cat.link}
            className="group relative overflow-hidden rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-600 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 flex flex-col"
          >
            <div className={`h-2 w-full bg-gradient-to-r ${cat.color}`} />

            <div className="p-6 flex-1 flex flex-col justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-1 group-hover:text-blue-300 transition-colors">
                  {cat.title}
                </h2>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">
                  {cat.subTitle}
                </p>
                <p className="text-slate-300 mb-6 text-sm min-h-10">
                  {cat.desc}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {cat.games.map((game, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 text-xs font-medium bg-slate-800 text-slate-300 rounded border border-slate-700"
                  >
                    {game}
                  </span>
                ))}
              </div>
            </div>

            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-gradient-to-br from-white to-transparent opacity-5 rounded-full blur-xl group-hover:opacity-10 transition-opacity" />
          </Link>
        ))}
      </div>

      {/* --- FOOTER --- */}
      <footer className="mt-20 text-center text-slate-600 text-sm">
        <p>© 2026 The Brain Project. Built with Next.js &amp; React Three Fiber.</p>
      </footer>
    </main>
  );
}
