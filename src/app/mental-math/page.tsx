import Link from "next/link";

export default function MentalMathMenu() {
  // Danh sách 4 trò chơi con
  const games = [
    {
      id: "flash-anzan",
      name: "Flash Anzan",
      vnName: "Cộng Số Siêu Tốc",
      desc: "Các con số xuất hiện chớp nhoáng trên màn hình. Bạn cần cộng tổng chúng lại.",
      difficulty: "Kinh Điển",
      color: "border-cyan-500 shadow-cyan-500/20",
      btnColor: "bg-cyan-600 hover:bg-cyan-500",
      link: "/mental-math/flash-anzan" 
    },
    {
      id: "multi-complex",
      name: "Complex Calculation",
      vnName: "Nhân Chia Đa Chữ Số",
      desc: "Thực hiện phép nhân/chia các số lớn (7-10 chữ số) trong thời gian giới hạn.",
      difficulty: "Khó",
      color: "border-blue-500 shadow-blue-500/20",
      btnColor: "bg-blue-600 hover:bg-blue-500",
      link: "/mental-math/complex-calc"
    },
    {
      id: "double-arithmetic",
      name: "Double Arithmetic",
      vnName: "Tính Nhẩm Song Hành",
      desc: "Vừa nhìn màn hình cộng số, vừa nghe đọc số để thực hiện phép tính thứ hai.",
      difficulty: "Cực Khó",
      color: "border-indigo-500 shadow-indigo-500/20",
      btnColor: "bg-indigo-600 hover:bg-indigo-500",
      link: "/mental-math/double-task"
    },
    {
      id: "root-extraction",
      name: "Root Extraction",
      vnName: "Khai Căn Bậc Cao",
      desc: "Tìm căn bậc 12, 13... của một số có hàng chục chữ số.",
      difficulty: "Siêu Trí Tuệ",
      color: "border-sky-500 shadow-sky-500/20",
      btnColor: "bg-sky-600 hover:bg-sky-500",
      link: "/mental-math/root-extraction"
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans p-8">
      {/* --- THANH ĐIỀU HƯỚNG (Back Button) --- */}
      <div className="max-w-5xl mx-auto mb-12">
        <Link 
          href="/" 
          className="inline-flex items-center text-slate-400 hover:text-cyan-400 transition-colors mb-6 group"
        >
          <span className="mr-2 text-xl group-hover:-translate-x-1 transition-transform">←</span> 
          Quay lại Trang Chủ
        </Link>
        
        <h1 className="text-4xl font-bold">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
            Tính Nhẩm Siêu Tốc
          </span>
        </h1>
        <p className="text-slate-400 mt-2 text-lg">
          Mental Arithmetic • Chọn thử thách của bạn
        </p>
      </div>

      {/* --- DANH SÁCH GAME --- */}
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
        {games.map((game) => (
          <div 
            key={game.id}
            className={`relative bg-slate-900 rounded-2xl p-8 border ${game.color} border-opacity-50 hover:border-opacity-100 transition-all duration-300 shadow-lg hover:shadow-xl flex flex-col justify-between h-full`}
          >
             {/* Độ khó Badge */}
            <div className="absolute top-4 right-4 bg-slate-800 text-xs text-slate-300 px-3 py-1 rounded-full border border-slate-700">
              {game.difficulty}
            </div>

            <div>
              <h3 className="text-2xl font-bold text-white mb-1">{game.name}</h3>
              <h4 className="text-cyan-400 text-sm font-semibold uppercase tracking-wider mb-4">
                {game.vnName}
              </h4>
              <p className="text-slate-400 mb-8 leading-relaxed">
                {game.desc}
              </p>
            </div>

            {/* Nút Chơi Ngay */}
            <Link 
              href={game.link}
              className={`block w-full text-center py-3 rounded-xl font-bold text-white transition-all transform hover:scale-[1.02] active:scale-[0.98] ${game.btnColor}`}
            >
              Bắt Đầu Thử Thách
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}