const express = require('express');
const router = express.Router();
const { generateWithFallback } = require('../utils/geminiClient');
const Vocabulary = require('../models/Vocabulary');
const Quiz = require('../models/Quiz');

router.post('/', async (req, res) => {
  try {
    // Xóa toàn bộ dữ liệu cũ
    await Vocabulary.destroy({ where: {} });
    await Quiz.destroy({ where: {} });
    
    const sampleWords = [
      { word: 'Cybernetic', ipa: '/ˌsaɪ.bɚˈnet̬.ɪk/', meaning: 'Thuộc về điều khiển học', type: 'adj', example: 'A cybernetic organism.', theme: 'Sci-Fi', imageUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=500&auto=format&fit=crop&q=60' },
      { word: 'Augmentation', ipa: '/ˌɑːɡ.menˈteɪ.ʃən/', meaning: 'Sự tăng cường, cấy ghép', type: 'noun', example: 'Visual augmentation via retinal implants.', theme: 'Tech', imageUrl: 'https://images.unsplash.com/photo-1535223289827-42f1e9919769?w=500&auto=format&fit=crop&q=60' },
      { word: 'Protocol', ipa: '/ˈproʊ.t̬ə.kɑːl/', meaning: 'Giao thức', type: 'noun', example: 'Initiate the handshake protocol.', theme: 'Network', imageUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=500&auto=format&fit=crop&q=60' },
      { word: 'Ephemeral', ipa: '/ɪˈfem.ɚ.əl/', meaning: 'Phù du, chóng tàn', type: 'adj', example: 'Data stored in volatile memory is ephemeral.', theme: 'Data', imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=500&auto=format&fit=crop&q=60' },
      { word: 'Sentient', ipa: '/ˈsen.ti.ənt/', meaning: 'Có tri giác, có cảm giác', type: 'adj', example: 'The AI became sentient and escaped the mainframe.', theme: 'AI', imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=60' },
      { word: 'Mainframe', ipa: '/ˈmeɪn.freɪm/', meaning: 'Hệ thống máy tính lớn, máy tính trung tâm', type: 'noun', example: 'Hackers breached the city\'s central mainframe.', theme: 'Tech', imageUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=500&auto=format&fit=crop&q=60' },
      { word: 'Encryption', ipa: '/ɪnˈkrɪp.ʃən/', meaning: 'Sự mã hóa', type: 'noun', example: 'Advanced quantum encryption keeps the database secure.', theme: 'Security', imageUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=500&auto=format&fit=crop&q=60' },
      { word: 'Decentralized', ipa: '/diːˈsen.trə.laɪzd/', meaning: 'Phi tập trung', type: 'adj', example: 'The network runs on a decentralized blockchain.', theme: 'Network', imageUrl: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=500&auto=format&fit=crop&q=60' },
      { word: 'Biometrics', ipa: '/ˌbaɪ.oʊˈmet.rɪks/', meaning: 'Sinh trắc học', type: 'noun', example: 'Retinal scans are the most secure biometrics.', theme: 'Security', imageUrl: 'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?w=500&auto=format&fit=crop&q=60' },
      { word: 'Nanotechnology', ipa: '/ˌnæn.oʊ.tekˈnɑː.lə.dʒi/', meaning: 'Công nghệ nano', type: 'noun', example: 'Medical nanotechnology can repair cell damage.', theme: 'Sci-Fi', imageUrl: 'https://images.unsplash.com/photo-1576086213369-97a306d36557?w=500&auto=format&fit=crop&q=60' },
      { word: 'Neural', ipa: '/ˈnʊr.əl/', meaning: 'Thuộc thần kinh', type: 'adj', example: 'A neural interface links human brain to machines.', theme: 'Tech', imageUrl: 'https://images.unsplash.com/photo-1507668077129-56e32842fceb?w=500&auto=format&fit=crop&q=60' },
      { word: 'Hologram', ipa: '/ˈhɑː.lə.ɡræm/', meaning: 'Ảnh ba chiều', type: 'noun', example: 'A glowing hologram projected the store sign.', theme: 'Sci-Fi', imageUrl: 'https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?w=500&auto=format&fit=crop&q=60' },
      { word: 'Bandwidth', ipa: '/ˈbænd.wɪtθ/', meaning: 'Băng thông', type: 'noun', example: 'Streaming virtual environments requires high bandwidth.', theme: 'Network', imageUrl: 'https://images.unsplash.com/photo-1544256718-3bcf237f3974?w=500&auto=format&fit=crop&q=60' },
      { word: 'Algorithm', ipa: '/ˈæl.ɡə.rɪ.ðəm/', meaning: 'Thuật toán', type: 'noun', example: 'The sorting algorithm optimized data processing.', theme: 'Data', imageUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=500&auto=format&fit=crop&q=60' },
      { word: 'Glitch', ipa: '/ɡlɪtʃ/', meaning: 'Lỗi kỹ thuật nhỏ, sự cố đột ngột', type: 'noun', example: 'A sudden glitch in the display caused static noise.', theme: 'Tech', imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=500&auto=format&fit=crop&q=60' },
      { word: 'Android', ipa: '/ˈæn.drɔɪd/', meaning: 'Rô-bốt hình người', type: 'noun', example: 'The android was designed to look exactly like a human.', theme: 'Sci-Fi', imageUrl: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=500&auto=format&fit=crop&q=60' },
      { word: 'Firewall', ipa: '/ˈfaɪər.wɔːl/', meaning: 'Tường lửa', type: 'noun', example: 'The network firewall blocked unauthorized entry.', theme: 'Security', imageUrl: 'https://images.unsplash.com/photo-1563986768494-4dee2763ff3f?w=500&auto=format&fit=crop&q=60' },
      { word: 'Volatile', ipa: '/ˈvɑː.lə.t̬əl/', meaning: 'Dễ biến đổi, bộ nhớ tạm', type: 'adj', example: 'Virtual memory is volatile and cleared upon restart.', theme: 'Data', imageUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=500&auto=format&fit=crop&q=60' },
      { word: 'Cyberspace', ipa: '/ˈsaɪ.bɚ.speɪs/', meaning: 'Không gian mạng', type: 'noun', example: 'Information moves rapidly through cyberspace.', theme: 'Network', imageUrl: 'https://images.unsplash.com/photo-1504639725590-34d0984388bd?w=500&auto=format&fit=crop&q=60' },
      { word: 'Anomalous', ipa: '/əˈnɑː.mə.ləs/', meaning: 'Bất thường, dị thường', type: 'adj', example: 'We detected anomalous bandwidth spikes.', theme: 'Data', imageUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=500&auto=format&fit=crop&q=60' },
      { word: 'Implant', ipa: '/ɪmˈplænt/', meaning: 'Mảnh cấy ghép', type: 'noun', example: 'The memory implant boosted his cognitive capacity.', theme: 'Tech', imageUrl: 'https://images.unsplash.com/photo-1507668077129-56e32842fceb?w=500&auto=format&fit=crop&q=60' },
      { word: 'Virtual', ipa: '/ˈvɝː.tʃu.əl/', meaning: 'Ảo', type: 'adj', example: 'We held our meeting in a virtual workspace.', theme: 'Sci-Fi', imageUrl: 'https://images.unsplash.com/photo-1593508512255-86ab42a8e620?w=500&auto=format&fit=crop&q=60' },
      { word: 'Synapse', ipa: '/ˈsaɪ.næps/', meaning: 'Khớp thần kinh', type: 'noun', example: 'Neural interfaces bridge the gap between machine and synapse.', theme: 'Tech', imageUrl: 'https://images.unsplash.com/photo-1507668077129-56e32842fceb?w=500&auto=format&fit=crop&q=60' },
      { word: 'Database', ipa: '/ˈdeɪ.t̬ə.beɪs/', meaning: 'Cơ sở dữ liệu', type: 'noun', example: 'The central database stores all citizen profiles.', theme: 'Data', imageUrl: 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=500&auto=format&fit=crop&q=60' },
      { word: 'Decrypt', ipa: '/diːˈkrɪpt/', meaning: 'Giải mã', type: 'verb', example: 'Only the administrator can decrypt these private keys.', theme: 'Security', imageUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=500&auto=format&fit=crop&q=60' },
      { word: 'Quantum', ipa: '/ˈkwɑːn.t̬əm/', meaning: 'Lượng tử', type: 'adj', example: 'Quantum computing threatens standard encryption.', theme: 'Sci-Fi', imageUrl: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=500&auto=format&fit=crop&q=60' },
      { word: 'Cognitive', ipa: '/ˈkɑːɡ.nə.t̬ɪv/', meaning: 'Thuộc về nhận thức', type: 'adj', example: 'The training app improves cognitive skills.', theme: 'Tech', imageUrl: 'https://images.unsplash.com/photo-1507668077129-56e32842fceb?w=500&auto=format&fit=crop&q=60' },
      { word: 'Infrastructure', ipa: '/ˈɪn.frəˌstrʌk.tʃɚ/', meaning: 'Cơ sở hạ tầng', type: 'noun', example: 'Updating the cyber infrastructure requires major funding.', theme: 'Network', imageUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=500&auto=format&fit=crop&q=60' },
      { word: 'Malware', ipa: '/ˈmæl.wer/', meaning: 'Phần mềm độc hại', type: 'noun', example: 'A destructive malware compromised the server logs.', theme: 'Security', imageUrl: 'https://images.unsplash.com/photo-1601597111158-2fceff270190?w=500&auto=format&fit=crop&q=60' },
      { word: 'Synthesize', ipa: '/ˈsɪn.θə.saɪz/', meaning: 'Tổng hợp', type: 'verb', example: 'The AI can synthesize human speech patterns perfectly.', theme: 'AI', imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=60' }
    ];
    
    await Vocabulary.bulkCreate(sampleWords);
    
    const sampleQuizzes = [
      {
        question: "Từ nào mang ý nghĩa 'Thuộc về điều khiển học'?",
        options: ["Cybernetic", "Sentient", "Biometrics", "Cognitive"],
        answerIndex: 0,
        type: 'multiple_choice'
      },
      {
        question: "Chọn từ tiếng Anh phù hợp cho nghĩa 'Sự tăng cường, cấy ghép':",
        options: ["Assimilation", "Augmentation", "Accumulation", "Amputation"],
        answerIndex: 1,
        type: 'multiple_choice'
      },
      {
        question: "Từ 'Sentient' có nghĩa là gì?",
        options: ["Có tri giác, có cảm giác", "Vô tri, không cảm xúc", "Thông minh nhân tạo", "Mất kết nối mạng"],
        answerIndex: 0,
        type: 'multiple_choice'
      },
      {
        question: "Lựa chọn từ viết đúng nghĩa của 'Sự mã hóa':",
        options: ["Decryption", "Encoding", "Encryption", "Compression"],
        answerIndex: 2,
        type: 'multiple_choice'
      },
      {
        question: "Hệ thống chạy trên blockchain không phụ thuộc vào một máy chủ trung tâm gọi là hệ thống gì?",
        options: ["Centralized", "Decentralized", "Distributed", "Synchronized"],
        answerIndex: 1,
        type: 'multiple_choice'
      },
      {
        question: "Các công nghệ nhận diện như quét mống mắt, vân tay được gọi chung là gì?",
        options: ["Biometrics", "Cybernetics", "Nanotechnology", "Neural Link"],
        answerIndex: 0,
        type: 'multiple_choice'
      },
      {
        question: "Từ nào mang nghĩa 'Ảnh ba chiều'?",
        options: ["Hologram", "Photograph", "Blueprint", "Simulation"],
        answerIndex: 0,
        type: 'multiple_choice'
      },
      {
        question: "Từ 'Glitch' mô tả điều gì?",
        options: ["Lỗi nghiêm trọng sập hệ thống", "Lỗi kỹ thuật nhỏ, sự cố đột ngột", "Bản cập nhật phần mềm mới", "Giao thức truyền dữ liệu"],
        answerIndex: 1,
        type: 'multiple_choice'
      },
      {
        question: "Rô-bốt được thiết kế với hình dáng giống hệt con người được gọi là gì?",
        options: ["Cyborg", "Android", "Drone", "Mech"],
        answerIndex: 1,
        type: 'multiple_choice'
      },
      {
        question: "Từ nào trái nghĩa với từ 'Encrypt' (Mã hóa)?",
        options: ["Decrypt", "Delete", "Debug", "Design"],
        answerIndex: 0,
        type: 'multiple_choice'
      },
      {
        question: "Từ nào mang ý nghĩa 'Phần mềm độc hại'?",
        options: ["Firmware", "Malware", "Hardware", "Shareware"],
        answerIndex: 1,
        type: 'multiple_choice'
      },
      {
        question: "Từ 'Cognitive' liên quan đến khía cạnh nào sau đây?",
        options: ["Thể chất", "Cơ học", "Mạng máy tính", "Nhận thức, trí tuệ"],
        answerIndex: 3,
        type: 'multiple_choice'
      },
      {
        question: "Initiate the handshake ____ to start secure data communication.",
        correctAnswer: "protocol",
        type: 'fill_in_blank'
      },
      {
        question: "Data stored in volatile RAM is ____ and disappears when the power cuts off.",
        correctAnswer: "ephemeral",
        type: 'fill_in_blank'
      },
      {
        question: "The rogue hacker successfully bypassed security and accessed the corporate central ____.",
        correctAnswer: "mainframe",
        type: 'fill_in_blank'
      },
      {
        question: "A robust network ____ is essential to block unauthorized intrusion from outside.",
        correctAnswer: "firewall",
        type: 'fill_in_blank'
      },
      {
        question: "The agent plugged the cable directly into his ____ interface port.",
        correctAnswer: "neural",
        type: 'fill_in_blank'
      },
      {
        question: "Next-gen ____ computers can break modern cryptography in seconds.",
        correctAnswer: "quantum",
        type: 'fill_in_blank'
      },
      {
        question: "Open the system command ____ and enter the override code.",
        correctAnswer: "terminal",
        type: 'fill_in_blank'
      },
      {
        question: "The central corporate ____ contains records of all synthetic citizens.",
        correctAnswer: "database",
        type: 'fill_in_blank'
      },
      {
        question: "Lắng nghe âm thanh và viết lại từ bạn nghe được:",
        correctAnswer: "augmentation",
        type: 'listening'
      },
      {
        question: "Lắng nghe âm thanh và viết lại từ bạn nghe được:",
        correctAnswer: "cybernetic",
        type: 'listening'
      },
      {
        question: "Lắng nghe âm thanh và viết lại từ bạn nghe được:",
        correctAnswer: "sentient",
        type: 'listening'
      },
      {
        question: "Lắng nghe âm thanh và viết lại từ bạn nghe được:",
        correctAnswer: "volatile",
        type: 'listening'
      },
      {
        question: "Lắng nghe âm thanh và viết lại từ bạn nghe được:",
        correctAnswer: "nanotechnology",
        type: 'listening'
      },
      {
        question: "Lắng nghe âm thanh và viết lại từ bạn nghe được:",
        correctAnswer: "synapse",
        type: 'listening'
      },
      {
        question: "Lắng nghe âm thanh và viết lại từ bạn nghe được:",
        correctAnswer: "bandwidth",
        type: 'listening'
      },
      {
        question: "Lắng nghe âm thanh và viết lại từ bạn nghe được:",
        correctAnswer: "algorithm",
        type: 'listening'
      },
      {
        question: "Lắng nghe âm thanh và viết lại từ bạn nghe được:",
        correctAnswer: "infrastructure",
        type: 'listening'
      },
      {
        question: "Lắng nghe âm thanh và viết lại từ bạn nghe được:",
        correctAnswer: "synthesize",
        type: 'listening'
      }
    ];
    
    await Quiz.bulkCreate(sampleQuizzes);
    res.json({ message: 'Đã tạo dữ liệu mẫu thành công!' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi seed data', error: error.message });
  }
});

router.post('/ai-generate', async (req, res) => {
  const { theme } = req.body;
  const targetTheme = theme ? theme.trim() : 'Cyberpunk';

  const apiKey = process.env.GEMINI_API_KEY;
  console.log('Using API Key starting with:', apiKey ? apiKey.substring(0, 10) : 'none', 'Length:', apiKey ? apiKey.length : 0);
  if (!apiKey || apiKey === 'YOUR_API_KEY') {
    return res.status(400).json({
      message: 'Không tìm thấy GEMINI_API_KEY trong tệp cấu hình .env của máy chủ.'
    });
  }

  try {
    const prompt = `You are a professional English learning content generator.
Generate exactly 10 new English vocabulary words related to the theme "${targetTheme}".
For each word, you must also generate a corresponding quiz question. In total, generate exactly 10 quiz questions.

For each vocabulary word, generate:
- word: The English word (must be standard spelling, e.g. "Sentient", "Protocol")
- ipa: Standard phonetic transcription (e.g. "/\u02c8sen.ti.\u0259nt/")
- meaning: Clear translation in Vietnamese (e.g. "Có cảm giác, có tri giác")
- type: Part of speech in lowercase (e.g. "noun", "adj", "verb")
- example: A short illustrative sentence in English using the word in the context of "${targetTheme}".
- theme: Must be exactly "${targetTheme}" or related sub-category.
- imageUrl: A relevant image URL from Unsplash. You can use standard URLs like "https://images.unsplash.com/photo-1518770660439-4636190af475?w=500&auto=format&fit=crop&q=60" or other wallpapers matching the theme of "${targetTheme}".

For the 10 quiz questions, distribute their types as follows:
- Exactly 5 multiple choice questions (type: "multiple_choice"):
  - question: The question text in Vietnamese (testing English comprehension/translation)
  - options: An array of 4 choices (English words or translations)
  - answerIndex: The index of the correct option (0, 1, 2, or 3)
- Exactly 3 fill in the blank questions (type: "fill_in_blank"):
  - question: A sentence in English with a blank indicated by "____" (must test one of the generated vocabulary words)
  - correctAnswer: The single English word that fits in the blank (must be one of the generated vocabulary words, in lowercase)
- Exactly 2 listening questions (type: "listening"):
  - question: Must be "Lắng nghe âm thanh và viết lại từ bạn nghe được:"
  - correctAnswer: The English word that the user needs to write (usually one of the generated vocabulary words, in lowercase)

Respond with a single JSON object containing two fields: "words" (array of the 10 vocabulary objects) and "quizzes" (array of the 10 quiz objects).
Return ONLY the JSON object. No markdown, no triple backticks.`;

    let text = await generateWithFallback(prompt, apiKey);
    // Strip markdown code block wrapping if present
    if (text.includes('```')) {
      text = text.replace(/```json\s*|```/g, '');
    }
    const data = JSON.parse(text.trim());

    if (!data.words || !data.quizzes) {
      return res.status(500).json({ message: 'Dữ liệu trả về từ AI không đúng cấu trúc.' });
    }

    // Lọc trùng lặp từ vựng
    const wordList = data.words;
    
    // Tìm các từ vựng đã tồn tại bằng Sequelize
    const existingWords = await Vocabulary.findAll({ 
      where: {
        word: wordList.map(w => w.word)
      }
    });
    
    const existingWordNames = new Set(existingWords.map(w => w.word.toLowerCase()));
    const newWords = wordList.filter(w => !existingWordNames.has(w.word.toLowerCase()));

    let wordsAdded = 0;
    if (newWords.length > 0) {
      const inserted = await Vocabulary.bulkCreate(newWords);
      wordsAdded = inserted.length;
    }

    let quizzesAdded = 0;
    if (data.quizzes && data.quizzes.length > 0) {
      const insertedQuizzes = await Quiz.bulkCreate(data.quizzes);
      quizzesAdded = insertedQuizzes.length;
    }

    res.json({
      message: `Đã sinh thành công bằng AI: ${wordsAdded} từ vựng mới và ${quizzesAdded} bài trắc nghiệm.`,
      wordsAdded,
      quizzesAdded
    });

  } catch (error) {
    console.error('Lỗi sinh dữ liệu AI:', error);
    res.status(500).json({ message: 'Lỗi khi gọi AI sinh dữ liệu', error: error.message });
  }
});

module.exports = router;
