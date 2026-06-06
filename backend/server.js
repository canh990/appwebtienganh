const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const sequelize = require('./config/database');

// Route imports
const authRoutes = require('./routes/auth');
const vocabularyRoutes = require('./routes/vocabulary');
const quizRoutes = require('./routes/quiz');
const chatRoutes = require('./routes/chat');
const seedRoutes = require('./routes/seed');
const statsRoutes = require('./routes/stats');

// Auto-seed helper
const autoSeedIfEmpty = require('./utils/autoSeed');

dotenv.config();
const app = express();

// CORS — cho phép cả local dev và Vercel production
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://fe2apptienganh.vercel.app',
  'https://frontend-rho-orpin-80.vercel.app',
  ...(process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',').map(u => u.trim()) : []),
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());

const PORT = process.env.PORT || 5000;

// Database Connection
const connectDB = async () => {
  try {
    // Tự động tạo cơ sở dữ liệu nếu chưa có
    await sequelize.ensureDatabaseExists();

    await sequelize.authenticate();
    console.log('✅ Kết nối cơ sở dữ liệu MySQL thành công!');
    
    // Define associations
    const User = require('./models/User');
    const CommunityMessage = require('./models/CommunityMessage');
    
    User.hasMany(CommunityMessage, { foreignKey: 'userId' });
    CommunityMessage.belongsTo(User, { foreignKey: 'userId' });

    // Sync models
    await sequelize.sync({ alter: true });
    console.log('⚡ Tất cả các bảng cơ sở dữ liệu đã được đồng bộ hóa.');

    // Tự động seed nếu bảng Quiz rỗng
    await autoSeedIfEmpty();
  } catch (err) {
    console.error('❌ Lỗi kết nối cơ sở dữ liệu MySQL:', err);
    process.exit(1);
  }
};
connectDB();

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/vocabulary', vocabularyRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/seed', seedRoutes);
app.use('/api/stats', statsRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack,
  });
});

const http = require('http');
const { Server } = require('socket.io');

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

require('./sockets/chatSocket')(io);
require('./sockets/communitySocket')(io);

server.listen(PORT, () => {
  console.log(`[CyberLingo] Server đang chạy ở port ${PORT} với Realtime Sockets`);
});
