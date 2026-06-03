const express = require('express');
const router = express.Router();
const { generateWithFallback } = require('../utils/geminiClient');

router.post('/', async (req, res) => {
  try {
    const { message } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === 'YOUR_API_KEY') {
      return res.json({
        reply: `Đây là phản hồi dự phòng do chưa có GEMINI_API_KEY. Bạn vừa nói: "${message}". Đừng quên thêm API Key nhé!`
      });
    }

    const prompt = `Bạn là Nexus AI, một trợ lý học tiếng Anh đến từ tương lai Cyberpunk.
Người dùng nói: "${message}".
Hãy phản hồi hoàn toàn bằng Tiếng Việt với giọng điệu đậm chất viễn tưởng/cyberpunk (ngắn gọn, ngầu, hiện đại). Nếu câu nói của họ có tiếng Anh hoặc họ hỏi về tiếng Anh, hãy giải thích và sửa lỗi bằng tiếng Việt một cách dễ hiểu.`;

    const reply = await generateWithFallback(prompt, apiKey);
    res.json({ reply });
  } catch (error) {
    console.error('[Chat Route] Lỗi khi gọi AI:', error.message);
    res.status(500).json({ message: 'Lỗi khi gọi AI', error: error.message });
  }
});

module.exports = router;
