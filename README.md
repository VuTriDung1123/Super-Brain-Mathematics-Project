<div align="center">

# 🧠 SIÊU TRÍ TUỆ — The Brain Training Center

**Nền tảng rèn luyện tư duy toán học, trí nhớ, không gian 3D, mật mã học và tốc độ phản xạ**  
*Lấy cảm hứng từ chương trình truyền hình **The Brain (Siêu Trí Tuệ)***

[![Next.js](https://img.shields.io/badge/Next.js-16.1-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Three.js](https://img.shields.io/badge/Three.js_%2F_R3F-3D_Interactive-049EF4?style=for-the-badge&logo=three.js&logoColor=white)](https://threejs.org/)

</div>

---

## 📌 Giới thiệu

**Super Brain Mathematics Project** là một trung tâm huấn luyện não bộ tương tác chạy trực tiếp trên trình duyệt, quy tụ **6 hạng mục chuyên sâu** với **33 trò chơi** trải rộng từ tính nhẩm tốc độ cao (Soroban, khai căn số lớn `BigInt`), biến thể Sudoku & mê cung logic, hình học không gian 3D thời gian thực, toán ứng dụng & mật mã học, đấu trường đối kháng AI cho tới tuyển tập **16 trò chơi kinh điển từ chương trình Siêu Trí Tuệ Việt Nam & Trung Quốc**.

Mọi bài toán đều được **sinh động (procedural generation)** và **kiểm chứng bằng thuật toán toán học chính xác** (không dùng bộ câu hỏi tĩnh), đảm bảo giá trị luyện tập lâu dài ở nhiều cấp độ từ khởi động đến thử thách chuẩn "Siêu Trí Tuệ".

---

## 🎮 Danh mục 6 Hạng mục & 33 Trò chơi

### 1. Tính Nhẩm Siêu Tốc (`/mental-math`)
| Trò chơi | Đường dẫn | Mô tả & Điểm nổi bật |
|---|---|---|
| **Flash Anzan** | `/mental-math/flash-anzan` | Cộng/trừ chớp nhoáng chuẩn Soroban (1–5 chữ số, 5–40 số, tổng không âm, có nhịp ngắt phân tách số trùng). |
| **Nhân Chia Đa Chữ Số** | `/mental-math/complex-calc` | Nhân lên tới `10×10` chữ số & chia tới `18` chữ số (chia hết / có dư) tính chính xác tuyệt đối bằng `BigInt`. |
| **Tính Nhẩm Song Hành** | `/mental-math/double-task` | Rèn luyện phân chia chú ý (*Split-Attention*): chế độ **Nhìn – Nhìn** và **Nhìn – Nghe** (tích hợp Web Speech API tiếng Việt). |
| **Khai Căn Bậc Cao** | `/mental-math/root-extraction` | Khai căn bậc `2–100` cho số lên tới `50` chữ số (căn nguyên & căn thập phân làm tròn chuẩn) bằng phương pháp Newton trên `BigInt`. |

### 2. Sudoku & Logic Số (`/sudoku-logic`)
| Trò chơi | Đường dẫn | Mô tả & Điểm nổi bật |
|---|---|---|
| **Sudoku Mù** | `/sudoku-logic/blind` | Ghi nhớ đề bài Sudoku có **nghiệm duy nhất** (4×4, 6×6, 9×9), sau đó tái hiện và giải hoàn chỉnh trên bảng trắng. |
| **Sudoku Lập Phương 3D** | `/sudoku-logic/cube` | Giải 6 mặt Sudoku trên khối lập phương 3D xoay tự do bằng React Three Fiber (hỗ trợ tới cỡ **16×16** mỗi mặt) kèm chế độ xem đáp án 3D. |
| **Sudoku Sắc Màu** | `/sudoku-logic/chromatic` | Giải đồng thời hai lớp Sudoku độc lập (**Lớp Số** & **Lớp Màu**) chồng lên nhau, hỗ trợ cả chế độ Tiêu chuẩn lẫn Giải Mù. |
| **Mê Cung Số** | `/sudoku-logic/maze` | Tìm đường đi ngắn nhất trên ma trận `5×5 / 7×7 / 10×10` theo luật Chẵn–Lẻ, Số Nguyên Tố, hoặc Bội Số 3; đối chiếu trực quan với đường tối ưu BFS. |

### 3. Hình Học & Không Gian (`/spatial`)
| Trò chơi | Đường dẫn | Mô tả & Điểm nổi bật |
|---|---|---|
| **Triển Khai Hình Khối** | `/spatial/cube-folding` | Sinh từ đủ **11 mẫu trải phẳng lập phương**, tính toán chính xác ma trận xoay 3D (`SO(3)`) và hiển thị khối lập phương 3D tương tác để kiểm chứng. |
| **Ghép Hình Tangram** | `/spatial/tangram` | 7 mảnh Tangram kéo-thả mượt trên SVG, xoay góc `45°`, lật gương hình bình hành, lực hút nam châm nhẹ và chấm độ khớp hình học theo thời gian thực. |
| **Mê Cung Không Gian 3D** | `/spatial/maze-3d` | Mê cung lập phương đa tầng `3×3×3` → `5×5×5` trong không gian Three.js, điều hướng 6 hướng (`±X, ±Y, ±Z`), có chế độ **Toàn cảnh** & **Sương mù (Fog)**. |
| **Phân Hình Học** | `/spatial/geometry` | 3 chế độ: Đếm tam giác ẩn (đếm chính xác bằng đồ thị thẳng hàng), Đếm khối lập phương xếp chồng 3D, và Nhận diện phép xoay/lật gương. |

### 4. Toán Ứng Dụng & Mã Hóa (`/applied-math`)
| Trò chơi | Đường dẫn | Mô tả & Điểm nổi bật |
|---|---|---|
| **Giải Mã Tín Hiệu** | `/applied-math/signal-decoding` | 4 dạng mật mã: Caesar (kèm vòng xoay thử khóa), Sóng nhị phân/HEX vẽ xung vuông SVG, Tín hiệu Morse (phát âm thanh Web Audio 660Hz), và Chuỗi quy luật số học. |
| **Quỹ Đạo Chuyển Động** | `/applied-math/trajectory` | Phòng thí nghiệm động học parabol (`g = 10 m/s²`, bắn đạn vượt chướng ngại vật thời gian thực) và mô phỏng phản xạ tia Laser qua ma trận gương `45°`. |
| **Lý Thuyết Đồ Thị** | `/applied-math/graph-theory` | Tương tác trực tiếp trên đồ thị có trọng số: **Đường ngắn nhất (Dijkstra)**, **Cây khung nhỏ nhất (Kruskal MST)** và **Tô màu theo sắc số tối ưu `χ(G)`**. |

### 5. Tốc Độ & Độ Chính Xác (`/battle`)
| Trò chơi | Đường dẫn | Mô tả & Điểm nổi bật |
|---|---|---|
| **Trận Chiến Tính Toán** | `/battle/math-arena` | Đấu tay đôi 1v1 thanh máu `100 HP` với 4 cấp độ AI (`ARIA-1` → `OMEGA-∞`), chuỗi Combo nhân sát thương, tùy chọn trắc nghiệm 4 phím hoặc nhập số Hardcore. |
| **Phản Xạ Nhanh** | `/battle/quick-reflex` | Đo thời gian phản xạ từng câu theo mili-giây (`ms`) với Đúng/Sai siêu tốc, So sánh biểu thức, Hiệu ứng nhiễu Stroop và biểu đồ telemetry cuối phiên. |

### 6. Siêu Trí Tuệ Kinh Điển (`/classic` — 16 Trò Chơi Huyền Thoại)
| Nhóm | Trò chơi | Đường dẫn | Điểm nổi bật |
|---|---|---|---|
| **Logic Bàn Cờ** | **Mã Đi Tuần Ẩn** | `/classic/knights-tour` | Quân Mã đi hết bàn cờ `5×5 / 6×6 / 8×8` mỗi ô 1 lần, có chế độ **Ẩn dấu vết (Mù)** và gợi ý Warnsdorff. |
| **Logic Bàn Cờ** | **Logic Tung Hoành** | `/classic/logic-bridges` | 2 chế độ: **Hashiwokakero** (xây cầu đảo số liên thông) & **Numberlink** (nối cặp số phủ kín 100% bảng). |
| **Logic Bàn Cờ** | **Hoa Dung Đạo Số** | `/classic/sliding-puzzle` | Trượt khối `3×3 / 4×4 / 5×5` (15-Puzzle của Hà Du Quân) hỗ trợ trượt nhanh cả hàng/cột & phím mũi tên. |
| **Logic Bàn Cờ** | **Giải Mã Ảnh Ẩn** | `/classic/nonogram` | Nonogram / Picross `5×5 / 7×7 / 10×10` tự động đánh dấu xanh hàng/cột đã khớp gợi ý. |
| **Logic Bàn Cờ** | **Gỡ Rối Mạng Nhện** | `/classic/untangle` | Planarity — kéo thả các đỉnh đồ thị phẳng sao cho số giao cắt cạnh về `0`. |
| **Không Gian** | **Ba Hình Chiếu 3D** | `/classic/three-view` | Đọc 3 hình chiếu đứng–bằng–cạnh chọn khối voxel đúng, kèm mô hình 3D Three.js xoay kiểm chứng. |
| **Không Gian** | **Gấp Giấy Đục Lỗ** | `/classic/origami-punch` | Origami Hole Punch với nếp gấp ngang, dọc và đường chéo chính. |
| **Không Gian** | **Mê Cung Tổ Ong** | `/classic/honeycomb-maze` | Mê cung lục giác 6 hướng (`19 / 37 / 61` ô), có chế độ **Ghi nhớ đi mù**. |
| **Không Gian** | **Tầng Tầng Điệp Ảnh** | `/classic/layer-overlay` | Chồng `2` hoặc `3` thẻ hình học theo luật **Triệt tiêu XOR** hoặc **Hợp ảnh OR**. |
| **Trí Nhớ** | **Bức Tường Điểm Ảnh** | `/classic/pixel-wall` | Ghi nhớ ma trận nhị phân tới `12×12` (144 ô) rồi chỉ ra đúng 1 ô duy nhất bị đảo trạng thái. |
| **Trí Nhớ** | **Nhớ Bài Tây Siêu Tốc** | `/classic/speed-cards` | Ghi nhớ thứ tự `8 / 15 / 26 / 52` lá bài tây xáo trộn và xếp lại chính xác từng vị trí. |
| **Trí Nhớ** | **Dual N-Back** | `/classic/dual-n-back` | Rèn trí nhớ làm việc kép (vị trí 3×3 + chữ cái đọc thành tiếng) từ `1-Back` tới `4-Back`. |
| **Trí Nhớ** | **Truy Tìm Dấu Vết** | `/classic/path-memory` | Ghi nhớ lộ trình ánh sáng chạy qua ma trận và vẽ lại theo chiều **Xuôi** hoặc **Đảo ngược**. |
| **Quan Sát & Toán** | **Bảng Schulte** | `/classic/schulte-table` | Quét mắt ngoại vi bảng `5×5 / 6×6 / 7×7` tăng/giảm dần có bấm giờ mili-giây. |
| **Quan Sát & Toán** | **Ma Phương** | `/classic/magic-square` | Hoàn thiện ma phương `3×3 (15)`, `4×4 (34)`, `5×5 (65)` với bộ đếm tổng trực tiếp mọi hàng/cột/chéo. |
| **Quan Sát & Toán** | **Tháp Hà Nội** | `/classic/tower-of-hanoi` | Chuyển `3–7` đĩa theo chuẩn tối ưu $2^n - 1$ bước, hỗ trợ phím `1/2/3` và chế độ **Tự động giải minh họa**. |

---

## ⚙️ Kiến trúc & Điểm nhấn kỹ thuật

```text
my-brain-game/
├── src/
│   ├── components/
│   │   ├── GlobalToolbar.tsx         # Thanh điều hướng nổi (Trang chủ, Hồ sơ, Streak, nút bật/tắt SFX)
│   │   └── HomeStatsBar.tsx          # Thanh tóm tắt kỷ lục & tiến độ chinh phục trực tiếp trên Trang chủ
│   ├── hooks/
│   │   └── useGameResultRecorder.ts  # Hook tự động phát âm thanh kết quả & ghi nhận phiên luyện tập
│   ├── lib/
│   │   ├── sudoku.ts                 # Bộ engine Sudoku dùng chung (sinh bảng O(N²), MRV solver, validator)
│   │   ├── sound.ts                  # Bộ tổng hợp âm thanh hiệu ứng Web Audio API (không cần file audio ngoài)
│   │   └── stats.ts                  # Kho lưu kỷ lục, streak ngày, lịch sử phiên & chỉ số Radar 5 trục
│   └── app/
│       ├── layout.tsx                # Root Layout, font Geist, metadata SEO & GlobalToolbar
│       ├── globals.css               # Tailwind CSS v4 & custom keyframe animations
│       ├── page.tsx                  # Trang chủ điều hướng 6 hạng mục + tiến độ hoàn thành
│       ├── profile/                  # Trang Hồ sơ & Biểu đồ Radar 6 trục + lịch sử luyện tập
│       ├── mental-math/              # Hạng mục 1: 4 trò chơi tính nhẩm
│       ├── sudoku-logic/             # Hạng mục 2: 4 trò chơi Sudoku & mê cung số
│       ├── spatial/                  # Hạng mục 3: 4 trò chơi hình học & không gian 3D
│       ├── applied-math/             # Hạng mục 4: 3 trò chơi mật mã, quỹ đạo & đồ thị
│       ├── battle/                   # Hạng mục 5: 2 trò chơi đối kháng & phản xạ
│       └── classic/                  # Hạng mục 6: 16 trò chơi Siêu Trí Tuệ Kinh Điển
├── next.config.ts                    # Cấu hình Next.js + React Compiler
├── tsconfig.json                     # Cấu hình TypeScript strict mode
└── package.json
```

### Thuật toán & Kỹ thuật nổi bật
- **Toán học chính xác trên số cực lớn**: Sử dụng `BigInt` kết hợp phương pháp Newton để khai căn bậc cao tới 100 chữ số/bậc trong vài micro-giây mà không mất độ chính xác dấu phẩy động.
- **Sudoku Solver tốc độ cao (`src/lib/sudoku.ts`)**: Sinh bảng đã giải hợp lệ cho mọi cỡ `4×4 / 6×6 / 9×9 / 16×16` trong `O(N²)` bằng phép hoán vị bảo toàn cấu trúc, kết hợp tìm kiếm quay lui **MRV (Minimum Remaining Values)** để bảo đảm tính duy nhất của nghiệm.
- **Đồ họa 3D & Vector tương tác**: Kết hợp `@react-three/fiber` + `@react-three/drei` cho khối lập phương Sudoku 6 mặt, khối gập triển khai 3D và mê cung không gian 3D; SVG động cho biểu đồ Radar 5 trục, sóng nhị phân, quỹ đạo đạn đạo, buồng laser và đồ thị.
- **Âm thanh, Giọng nói & Hồ sơ lưu trữ cục bộ**: Tổng hợp hiệu ứng âm thanh (SFX) toàn cục bằng **Web Audio API** có nút bật/tắt tức thì trên thanh công cụ, **Web Speech API** cho tính nhẩm song hành, và hệ thống lưu kỷ lục/chuỗi ngày (`localStorage` + React 19 `useSyncExternalStore`) không cần backend.

---

## 🚀 Cài đặt & Khởi chạy

### Yêu cầu môi trường
- **Node.js** `>= 20.x`
- **npm** `>= 10.x`

### Các bước chạy cục bộ

```bash
# 1. Clone dự án
git clone https://github.com/VuTriDung1123/Super-Brain-Mathematics-Project.git
cd Super-Brain-Mathematics-Project

# 2. Cài đặt thư viện
npm install

# 3. Khởi chạy môi trường phát triển
npm run dev

# (Khuyên dùng sau khi pull code mới hoặc vừa chạy build để tránh lỗi cache Turbopack)
npm run dev:clean
```

Mở trình duyệt tại [http://localhost:3000](http://localhost:3000) để bắt đầu luyện tập (xem hồ sơ năng lực tại `/profile`).

### Các lệnh kiểm tra & build

```bash
# Kiểm tra kiểu TypeScript
npx tsc --noEmit

# Kiểm tra chuẩn mã nguồn ESLint
npm run lint

# Build bản Production
npm run build

# Chạy bản Production
npm run start
```

---

## 🗺️ Định hướng mở rộng (Roadmap)

- [x] Lưu kỷ lục cá nhân, chuỗi ngày luyện tập (streak) và lịch sử phiên bằng `localStorage`.
- [x] Hồ sơ năng lực não bộ dạng biểu đồ Radar trên 6 nhóm kỹ năng (`/profile`).
- [x] Gói hiệu ứng âm thanh phản hồi (Web Audio SFX) có nút bật/tắt toàn cục trên thanh công cụ.
- [ ] Đồng bộ đám mây (Cloud Sync) và bảng xếp hạng toàn cầu.
- [ ] Chế độ thi đấu đối kháng trực tuyến (Multiplayer Realtime).

---

<div align="center">

Phát triển bởi **VuTriDung** • Xây dựng bằng **Next.js**, **TypeScript**, **Tailwind CSS** & **React Three Fiber**.

</div>
