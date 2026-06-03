const CommunityMessage = require('../models/CommunityMessage');
const User = require('../models/User');

module.exports = (io) => {
  const communityNamespace = io.of('/community');

  communityNamespace.on('connection', (socket) => {
    console.log(`🌐 Nơ-ron cộng đồng mới: ${socket.id}`);

    // Khi một user vào phòng cộng đồng, họ có thể gửi userId để load history
    socket.on('join_community', async (data) => {
      try {
        // Tải 100 tin nhắn gần nhất
        const history = await CommunityMessage.findAll({
          limit: 100,
          order: [['timestamp', 'DESC']],
          include: [{
            model: User,
            attributes: ['id', 'username', 'avatar', 'level']
          }]
        });

        // Sequelize trả về tin nhắn mới nhất trước tiên (DESC), 
        // cần đảo ngược lại để frontend hiển thị đúng thứ tự thời gian
        const messages = history.reverse().map(msg => ({
          id: msg.id,
          text: msg.text,
          timestamp: msg.timestamp,
          user: msg.User ? {
            id: msg.User.id,
            username: msg.User.username,
            avatar: msg.User.avatar,
            level: msg.User.level
          } : { username: 'Unknown' }
        }));

        socket.emit('community_history', { messages });
      } catch (err) {
        console.error('[CommunitySocket] Lỗi load history:', err.message);
      }
    });

    socket.on('send_message_community', async (data) => {
      const { text, userId } = data;
      
      if (!text || !userId) return;

      try {
        const user = await User.findByPk(userId, {
          attributes: ['id', 'username', 'avatar', 'level']
        });

        if (!user) return;

        // Lưu tin nhắn vào DB
        const newMsg = await CommunityMessage.create({
          userId: user.id,
          text: text
        });

        // Broadcast cho tất cả user trong namespace
        const messagePayload = {
          id: newMsg.id,
          text: newMsg.text,
          timestamp: newMsg.timestamp,
          user: {
            id: user.id,
            username: user.username,
            avatar: user.avatar,
            level: user.level
          }
        };

        communityNamespace.emit('new_community_message', messagePayload);

      } catch (err) {
        console.error('[CommunitySocket] Lỗi gửi tin nhắn cộng đồng:', err.message);
      }
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Nơ-ron cộng đồng ngắt kết nối: ${socket.id}`);
    });
  });
};
