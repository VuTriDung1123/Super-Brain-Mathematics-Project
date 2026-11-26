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

**Super Brain Mathematics Project** là một trung tâm huấn luyện não bộ tương tác chạy trực tiếp trên trình duyệt, quy tụ **5 hạng mục chuyên sâu** với **17 trò chơi** trải rộng từ tính nhẩm tốc độ cao (Soroban, khai căn số lớn `BigInt`), biến thể Sudoku & mê cung logic, hình học không gian 3D thời gian thực, toán ứng dụng & mật mã học cho tới đấu trường đối kháng AI đo tốc độ mili-giây.

Mọi bài toán đều được **sinh động (procedural generation)** và **kiểm chứng bằng thuật toán toán học chính xác** (không dùng bộ câu hỏi tĩnh), đảm bảo giá trị luyện tập lâu dài ở nhiều cấp độ từ khởi động đến thử thách chuẩn "Siêu Trí Tuệ".

---

## 🎮 Danh mục 5 Hạng mục & 17 Trò chơi

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

---

## ⚙️ Kiến trúc & Điểm nhấn kỹ thuật

```text
my-brain-game/
├── src/
│   ├── lib/
│   │   └── sudoku.ts                 # Bộ engine Sudoku dùng chung (sinh bảng O(N²), MRV solver, validator)
│   └── app/
│       ├── layout.tsx                # Root Layout, font Geist & metadata SEO
│       ├── globals.css               # Tailwind CSS v4 & custom keyframe animations
│       ├── page.tsx                  # Trang chủ điều hướng 5 hạng mục
│       ├── mental-math/              # Hạng mục 1: 4 trò chơi tính nhẩm
│       ├── sudoku-logic/             # Hạng mục 2: 4 trò chơi Sudoku & mê cung số
│       ├── spatial/                  # Hạng mục 3: 4 trò chơi hình học & không gian 3D
│       ├── applied-math/             # Hạng mục 4: 3 trò chơi mật mã, quỹ đạo & đồ thị
│       └── battle/                   # Hạng mục 5: 2 trò chơi đối kháng & phản xạ
├── next.config.ts                    # Cấu hình Next.js + React Compiler
├── tsconfig.json                     # Cấu hình TypeScript strict mode
└── package.json
```

### Thuật toán & Kỹ thuật nổi bật
- **Toán học chính xác trên số cực lớn**: Sử dụng `BigInt` kết hợp phương pháp Newton để khai căn bậc cao tới 100 chữ số/bậc trong vài micro-giây mà không mất độ chính xác dấu phẩy động.
- **Sudoku Solver tốc độ cao (`src/lib/sudoku.ts`)**: Sinh bảng đã giải hợp lệ cho mọi cỡ `4×4 / 6×6 / 9×9 / 16×16` trong `O(N²)` bằng phép hoán vị bảo toàn cấu trúc, kết hợp tìm kiếm quay lui **MRV (Minimum Remaining Values)** để bảo đảm tính duy nhất của nghiệm.
- **Đồ họa 3D & Vector tương tác**: Kết hợp `@react-three/fiber` + `@react-three/drei` cho khối lập phương Sudoku 6 mặt, khối gập triển khai 3D và mê cung không gian 3D; SVG động cho sóng nhị phân, quỹ đạo đạn đạo, buồng laser và đồ thị.
- **Âm thanh & Giọng nói gốc trình duyệt**: Không cần tài nguyên audio ngoài — dùng **Web Speech API** cho tính nhẩm song hành và **Web Audio API** tổng hợp sóng sin cho tín hiệu Morse.

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
```

Mở trình duyệt tại [http://localhost:3000](http://localhost:3000) để bắt đầu luyện tập.

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

- [ ] Lưu kỷ lục cá nhân, chuỗi ngày luyện tập (streak) và biểu đồ tiến bộ bằng `localStorage` / cơ sở dữ liệu.
- [ ] Hồ sơ năng lực não bộ dạng biểu đồ Radar trên 5 nhóm kỹ năng.
- [ ] Chế độ thi đấu đối kháng trực tuyến (Multiplayer Realtime) và bảng xếp hạng toàn cầu.
- [ ] Gói hiệu ứng âm thanh phản hồi (SFX) có nút bật/tắt toàn cục.

---

<div align="center">

Phát triển bởi **VuTriDung** • Xây dựng bằng **Next.js**, **TypeScript**, **Tailwind CSS** & **React Three Fiber**.

</div>
