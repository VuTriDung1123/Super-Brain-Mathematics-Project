import Link from "next/link";

export default function SudokuLogicMenu() {
  const games = [
    {
      id: "blind-sudoku",
      name: "Blind Sudoku",
      vnName: "Sudoku Mù",
      desc: "Thử thách trí nhớ ngắn hạn. Ghi nhớ bảng số trong vài giây rồi điền lại vào bảng trắng.",
      difficulty: "Trí Nhớ",
      color: "border-purple-500 shadow-purple-500/20",
      btnColor: "bg-purple-600 hover:bg-purple-500",
      link: "/sudoku-logic/blind"
    },
    {
      id: "cube-sudoku",
      name: "Cube Sudoku",
      vnName: "Sudoku Lập Phương",
      desc: "Giải Sudoku trên 6 mặt của một khối lập phương xoay 3D. Kiểm tra tư duy không gian.",
      difficulty: "Không Gian",
      color: "border-fuchsia-500 shadow-fuchsia-500/20",
      btnColor: "bg-fuchsia-600 hover:bg-fuchsia-500",
      link: "/sudoku-logic/cube"
    },
    {
      // --- ĐÃ CẬP NHẬT TỪ JIGSAW SANG CHROMATIC ---
      id: "chromatic-sudoku",
      name: "Chromatic Sudoku",
      vnName: "Sudoku Sắc Màu",
      desc: "Thử thách kép: Vừa giải Sudoku theo số, vừa giải theo màu sắc trên cùng một bàn cờ.",
      difficulty: "Tư Duy Kép",
      color: "border-cyan-500 shadow-cyan-500/20", // Đổi màu sang Cyan cho hợp theme
      btnColor: "bg-cyan-600 hover:bg-cyan-500",
      link: "/sudoku-logic/chromatic" // Đường dẫn mới
    },
    {
      id: "number-maze",
      name: "Number Maze",
      vnName: "Mê Cung Số",
      desc: "Tìm đường đi ngắn nhất trong ma trận số học, tuân theo các quy luật logic đặc biệt.",
      difficulty: "Logic",
      color: "border-rose-500 shadow-rose-500/20",
      btnColor: "bg-rose-600 hover:bg-rose-500",
      link: "/sudoku-logic/maze"
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans p-8 selection:bg-purple-500 selection:text-white">
      {/* --- HEADER --- */}
      <div className="max-w-6xl mx-auto mb-12">
        <Link 
          href="/" 
          className="inline-flex items-center text-slate-400 hover:text-purple-400 transition-colors mb-6 group"
        >
          <span className="mr-2 text-xl group-hover:-translate-x-1 transition-transform">←</span> 
          Quay lại Trang Chủ
        </Link>
        
        <h1 className="text-4xl md:text-6xl font-black mb-4">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-cyan-500">
            Sudoku & Logic
          </span>
        </h1>
        <p className="text-slate-400 text-lg max-w-2xl leading-relaxed">
          Chào mừng đến với đấu trường của những con số và quy luật. Nơi tư duy logic, trí nhớ và khả năng quan sát không gian được đẩy lên giới hạn cao nhất.
        </p>
      </div>

      {/* --- GAME GRID --- */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
        {games.map((game) => (
          <div 
            key={game.id}
            className={`relative group bg-slate-900 rounded-3xl p-8 border ${game.color} border-opacity-40 hover:border-opacity-100 transition-all duration-300 shadow-xl hover:shadow-2xl hover:-translate-y-1 flex flex-col justify-between h-full overflow-hidden`}
          >
             {/* Background Glow */}
             <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-white to-transparent opacity-[0.03] rounded-full blur-3xl -mr-10 -mt-10 group-hover:opacity-[0.08] transition-opacity" />

             {/* Badge Độ Khó */}
            <div className="absolute top-6 right-6 bg-slate-800/80 backdrop-blur text-[10px] uppercase font-bold text-slate-300 px-3 py-1 rounded-full border border-slate-700 tracking-wider">
              {game.difficulty}
            </div>

            <div className="relative z-10 mb-8">
              <h3 className="text-3xl font-black text-white mb-1 font-mono tracking-tighter">{game.name}</h3>
              <h4 className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-4">
                {game.vnName}
              </h4>
              <p className="text-slate-400 leading-relaxed text-sm">
                {game.desc}
              </p>
            </div>

            {/* Button */}
            <Link 
              href={game.link}
              className={`relative z-10 block w-full text-center py-4 rounded-xl font-bold text-white transition-all transform active:scale-[0.98] shadow-lg ${game.btnColor}`}
            >
              CHƠI NGAY
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}