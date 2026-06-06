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
            // Build conversation history context (last 6 messages for context)
            let historyContext = '';
            if (userId) {
              try {
                const history = await ChatHistory.findOne({ where: { userId: parseInt(userId) || userId } });
                if (history && Array.isArray(history.messages) && history.messages.length > 0) {
                  const recent = history.messages.slice(-6);
                  historyContext = '\n\nLịch sử hội thoại gần đây:\n' + recent.map(m =>
                    `${m.role === 'user' ? 'Người dùng' : 'Nexus AI'}: ${m.text.substring(0, 200)}`
                  ).join('\n');
                }
              } catch (histErr) {
                // Ignore history errors, continue without context
              }
            }

            let fullPrompt = message;
            if (!message.includes('Bạn là')) {
              fullPrompt = `Bạn là CyberLingo AI, một trợ lý học tiếng Anh thân thiện. Hãy phản hồi bằng Tiếng Việt với giọng điệu vui vẻ, hiện đại và ngắn gọn. Trả lời câu hỏi sau của người dùng: "${message}"`;
            }
            fullPrompt += historyContext;
            reply = await generateWithFallback(fullPrompt, apiKey);
          } catch (aiErr) {
            console.error('[Socket] Lỗi gọi Gemini (tất cả models đều thất bại):', aiErr.message);
            reply = '⚠️ Trung tâm AI đang quá tải. Vui lòng thử lại sau vài giây.';
          }
        }

        socket.emit('bot_typing', false);
        socket.emit('bot_reply', { text: reply });

        // Save to ChatHistory DB
        if (userId) {
          try {
            let [history] = await ChatHistory.findOrCreate({
              where: { userId: parseInt(userId) || userId },
              defaults: { messages: [] }
            });

            let messages = history.messages || [];
            if (!Array.isArray(messages)) messages = [];

            // Keep only last 50 messages to prevent DB bloat
            messages.push({ role: 'user', text: message });
            messages.push({ role: 'ai', text: reply });
            if (messages.length > 50) messages = messages.slice(-50);

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

    // Load chat history for user
    socket.on('load_history', async (data) => {
      const { userId } = data;
      if (!userId) return;
      try {
        const history = await ChatHistory.findOne({ where: { userId: parseInt(userId) || userId } });
        if (history && Array.isArray(history.messages)) {
          socket.emit('chat_history', { messages: history.messages.slice(-20) });
        }
      } catch (err) {
        console.error('[Socket] Lỗi load history:', err.message);
      }
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Nơ-ron ngắt kết nối: ${socket.id}`);
    });
  });
};
