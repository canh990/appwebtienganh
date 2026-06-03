const { generateWithFallback } = require('../utils/geminiClient');
const ChatHistory = require('../models/ChatHistory');

module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log(`📡 Nơ-ron liên kết mới: ${socket.id}`);

    socket.on('user_message', async (data) => {
      const { message, userId } = data;

      try {
        socket.emit('bot_typing', true);

        let reply = '';
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey || apiKey === 'YOUR_API_KEY') {
          reply = '[OFFLINE MODE] Tín hiệu tới trung tâm bị nhiễu. Hãy kiểm tra lại GEMINI_API_KEY.';
          await new Promise((r) => setTimeout(r, 800));
        } else {
          try {
            const prompt = `Bạn là Nexus AI, một trợ lý học tiếng Anh đến từ tương lai Cyberpunk.
Người dùng nói: "${message}".
Hãy phản hồi hoàn toàn bằng Tiếng Việt với giọng điệu đậm chất viễn tưởng/cyberpunk (ngắn gọn, ngầu, hiện đại). Nếu câu nói của họ có tiếng Anh hoặc họ hỏi về tiếng Anh, hãy giải thích và sửa lỗi bằng tiếng Việt một cách dễ hiểu.`;

            reply = await generateWithFallback(prompt, apiKey);
          } catch (aiErr) {
            console.error('[Socket] Lỗi gọi Gemini (tất cả models đều thất bại):', aiErr.message);
            reply = '⚠️ Trung tâm AI đang quá tải. Vui lòng thử lại sau vài giây.';
          }
        }

        socket.emit('bot_typing', false);
        socket.emit('bot_reply', { text: reply });

        // Lưu vào ChatHistory DB nếu userId tồn tại
        if (userId) {
          try {
            let [history] = await ChatHistory.findOrCreate({
              where: { userId: parseInt(userId) || userId },
              defaults: { messages: [] }
            });

            let messages = history.messages || [];
            if (!Array.isArray(messages)) messages = [];

            messages.push({ role: 'user', text: message });
            messages.push({ role: 'ai', text: reply });

            history.messages = messages;
            history.changed('messages', true);
            await history.save();
          } catch (dbErr) {
            console.error('[Socket] Lỗi lưu ChatHistory:', dbErr.message);
          }
        }
      } catch (error) {
        console.error('[Socket] Lỗi Socket Chat:', error);
        socket.emit('bot_typing', false);
        socket.emit('bot_reply', { text: 'Mạch liên kết bị đứt đoạn. Vui lòng thử lại.' });
      }
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Nơ-ron ngắt kết nối: ${socket.id}`);
    });
  });
};
