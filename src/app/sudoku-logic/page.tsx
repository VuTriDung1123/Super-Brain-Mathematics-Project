import Link from "next/link";

export default function SudokuLogicMenu() {
  // Danh sách 4 trò chơi logic
  const games = [
    {
      id: "blind-sudoku",
      name: "Blind Sudoku",
      vnName: "Sudoku Mù",
      desc: "Thử thách trí nhớ đỉnh cao. Bạn chỉ được nhìn bảng số trong vài giây, sau đó bảng sẽ biến mất. Hãy giải nó trong đầu.",
      difficulty: "Siêu Khó",
      color: "border-purple-500 shadow-purple-500/20",
      btnColor: "bg-purple-600 hover:bg-purple-500",
      link: "/sudoku-logic/blind" 
    },
    {
      id: "cube-sudoku",
      name: "Cube Sudoku",
      vnName: "Sudoku Lập Phương",
      desc: "Giải Sudoku trên bề mặt của khối lập phương xoay 3D. Các con số liên kết với nhau qua các cạnh không gian.",
      difficulty: "Không Gian",
      color: "border-fuchsia-500 shadow-fuchsia-500/20",
      btnColor: "bg-fuchsia-600 hover:bg-fuchsia-500",
      link: "/sudoku-logic/cube"
    },
    {
      id: "jigsaw-sudoku",
      name: "Jigsaw Sudoku",
      vnName: "Sudoku Hình Thái",
      desc: "Không còn là ô vuông 3x3 nhàm chán. Các vùng điền số có hình dạng zíc-zắc, méo mó kì dị.",
      difficulty: "Trung Bình",
      color: "border-pink-500 shadow-pink-500/20",
      btnColor: "bg-pink-600 hover:bg-pink-500",
      link: "/sudoku-logic/jigsaw"
    },
    {
      id: "number-maze",
      name: "Number Maze",
      vnName: "Mê Cung Số",
      desc: "Tìm đường đi ngắn nhất trong mê cung ma trận, tuân theo các quy luật số học (chia hết, số nguyên tố...).",
      difficulty: "Logic",
      color: "border-rose-500 shadow-rose-500/20",
      btnColor: "bg-rose-600 hover:bg-rose-500",
      link: "/sudoku-logic/maze"
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans p-8 selection:bg-purple-500 selection:text-white">
      {/* --- THANH ĐIỀU HƯỚNG --- */}
      <div className="max-w-5xl mx-auto mb-12">
        <Link 
          href="/" 
          className="inline-flex items-center text-slate-400 hover:text-purple-400 transition-colors mb-6 group"
        >
          <span className="mr-2 text-xl group-hover:-translate-x-1 transition-transform">←</span> 
          Quay lại Trang Chủ
        </Link>
        
        <h1 className="text-4xl md:text-5xl font-black">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
            Sudoku & Logic Số
          </span>
        </h1>
        <p className="text-slate-400 mt-3 text-lg max-w-2xl">
          Nơi thử thách tư duy tổ hợp, khả năng suy luận và trí nhớ ngắn hạn. Không đòi hỏi tính toán nhanh, nhưng cần sự chính xác tuyệt đối.
        </p>
      </div>

      {/* --- DANH SÁCH GAME GRID --- */}
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
        {games.map((game) => (
          <div 
            key={game.id}
            className={`relative group bg-slate-900 rounded-3xl p-8 border ${game.color} border-opacity-50 hover:border-opacity-100 transition-all duration-300 shadow-xl hover:shadow-2xl hover:-translate-y-1 flex flex-col justify-between h-full overflow-hidden`}
          >
             {/* Background Decoration */}
             <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white to-transparent opacity-5 rounded-full blur-2xl -mr-10 -mt-10 group-hover:opacity-10 transition-opacity" />

             {/* Độ khó Badge */}
            <div className="absolute top-6 right-6 bg-slate-800/80 backdrop-blur text-xs font-bold text-slate-300 px-3 py-1 rounded-full border border-slate-700">
              {game.difficulty}
            </div>

            <div className="relative z-10">
              <h3 className="text-3xl font-bold text-white mb-1 font-mono">{game.name}</h3>
              <h4 className="text-purple-400 text-sm font-bold uppercase tracking-wider mb-6">
                {game.vnName}
              </h4>
              <p className="text-slate-400 mb-8 leading-relaxed text-sm md:text-base">
                {game.desc}
              </p>
            </div>

            {/* Nút Chơi Ngay */}
            <Link 
              href={game.link}
              className={`relative z-10 block w-full text-center py-4 rounded-2xl font-bold text-white transition-all transform active:scale-[0.98] shadow-lg ${game.btnColor}`}
            >
              Bước Vào Ma Trận
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}