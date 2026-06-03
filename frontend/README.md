# CyberLingo - Học Tiếng Anh Phong Cách Cyberpunk Futuristic

CyberLingo là nền tảng học tiếng Anh toàn diện, được thiết kế với giao diện UI/UX Cyberpunk Futuristic chuẩn Production-Ready. Ứng dụng tích hợp AI Chatbot, Game-based Learning, Real-time Leaderboard và hệ thống âm thanh/nhận diện giọng nói tiên tiến.

## 🚀 Tính năng nổi bật (Features)
- **Hệ thống Auth**: Đăng ký, đăng nhập bảo mật bằng JWT.
- **Học Từ Vựng 3D**: Flashcard sử dụng mô hình 3D lật trang bằng Framer Motion, có tích hợp phát âm chuẩn (Text-to-Speech).
- **Trắc Nghiệm Nhận Thức (Quiz)**: Kho câu hỏi tự động lấy từ DB, tính giờ và tính điểm thực tế.
- **Trợ Lý AI Độc Lập**: Chatbot sử dụng Gemini API để mô phỏng giáo viên ngôn ngữ bản địa, kết hợp hiệu ứng gõ phím chân thực.
- **Dashboard Thống Kê**: Trực quan hóa dữ liệu học tập bằng biểu đồ (Recharts).
- **Thiết kế Kính mờ (Glassmorphism)**: Giao diện Neon bắt mắt, Dark Mode chủ đạo, không sử dụng UI/UX nhàm chán.

## 🛠 Tech Stack Bắt Buộc
- **Frontend**: ReactJS, Vite, TailwindCSS v4, Framer Motion, Axios, React Router DOM, Recharts, Socket.io-client.
- **Backend**: NodeJS, ExpressJS, Socket.io.
- **Cơ sở dữ liệu**: MongoDB (Mongoose), hỗ trợ MongoMemoryServer khi không có mạng.
- **AI/API**: Google Generative AI (Gemini), Web Speech API.

## 📂 Cấu trúc dự án (Folder Structure)

### Frontend (`frontend/src`)
```
src/
 ├── animations/       # Các hiệu ứng chuyển động Framer Motion
 ├── assets/           # Tài nguyên hình ảnh, âm thanh
 ├── components/       # Các thành phần tái sử dụng (Navbar, Cards)
 ├── context/          # React Context (AuthContext)
 ├── hooks/            # Custom Hooks (useTimer)
 ├── layouts/          # Giao diện khung (MainLayout)
 ├── pages/            # Các trang chính (Home, Auth, Quiz, Vocabulary, Dashboard)
 ├── routes/           # (Sắp cập nhật) Cấu hình routing độc lập
 ├── services/         # Tầng giao tiếp API bằng Axios (auth, quiz, vocab...)
 ├── styles/           # Tailwind config / Base CSS
 └── utils/            # (Sắp cập nhật) Helper functions
```

### Backend (`backend/`)
```
backend/
 ├── controllers/      # (Sắp cập nhật) Logic xử lý nghiệp vụ
 ├── middleware/       # Middleware xác thực JWT & Error Handling
 ├── models/           # Mongoose Schemas (User, Quiz, Vocabulary...)
 ├── routes/           # Định tuyến API
 ├── services/         # (Sắp cập nhật) Giao tiếp API bên ngoài (AI, Dịch)
 ├── sockets/          # (Sắp cập nhật) Xử lý Socket.io Realtime
 ├── config/           # (Sắp cập nhật) Thiết lập CSDL
 └── utils/            # (Sắp cập nhật) Các hàm hỗ trợ
```

## ⚙️ Hướng dẫn cài đặt (Installation Guide)

1. **Clone repository và cài đặt Dependencies**
   ```bash
   # Mở terminal ở thư mục gốc
   cd frontend
   npm install
   
   cd ../backend
   npm install
   ```

2. **Cấu hình Biến Môi Trường (Environment Variables)**
   Tạo file `backend/.env`:
   ```env
   PORT=5000
   MONGO_URI=mongodb://127.0.0.1:27017/cyberlingo
   JWT_SECRET=super-secret-cyber-key-2026
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

3. **Seed Dữ Liệu (Tùy chọn)**
   ```bash
   Invoke-RestMethod -Uri http://localhost:5000/api/seed -Method POST
   ```

4. **Khởi chạy hệ thống**
   - **Backend**: `npm start` (Chạy ở cổng 5000)
   - **Frontend**: `npm run dev` (Chạy ở cổng 5173)

## 🌐 Hướng dẫn Deploy (Deployment Guide)
- **Frontend (Vercel)**: Connect Git Repo với Vercel, cài đặt Build Command `npm run build` và Root Directory `frontend`.
- **Backend (Render / Railway)**: Thêm các biến môi trường vào Dashboard của nền tảng, thiết lập Start Command `node server.js` ở Root Directory `backend`. Chú ý cập nhật CORS để cho phép Domain của Frontend gọi API.
- **Database (MongoDB Atlas)**: Tạo Cluster miễn phí, lấy chuỗi Connection String và thay thế vào `MONGO_URI` trên biến môi trường của nền tảng Deploy Backend.

## 🔒 Security Best Practices
- Password luôn được Hash trước khi lưu bằng `bcryptjs`.
- JWT Token không chứa thông tin nhạy cảm (như password).
- Chặn lỗi rò rỉ stack trace ở môi trường Production thông qua Global Error Handler.

---
*Dự án liên tục được nâng cấp kiến trúc bởi Senior Architect AI.*
