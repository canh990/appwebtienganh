import api from './api';

export const getRandomQuiz = async ({ limit = 10, type = 'all', theme = '' } = {}) => {
  const params = new URLSearchParams({ limit });
  if (type && type !== 'all') params.append('type', type);
  if (theme && theme !== 'all') params.append('theme', theme);
  const response = await api.get(`/quiz/random?${params}`);
  if (Array.isArray(response.data)) {
    return response.data.filter(q => q.userId !== null);
  }
  return response.data;
};

export const getQuizThemes = async () => {
  try {
    // Để đảm bảo trang trắc nghiệm trống khi chưa tự tạo câu hỏi, ta tính toán theme trực tiếp từ các câu hỏi của người dùng
    const quizzes = await getRandomQuiz({ limit: 1000 });
    
    if (!Array.isArray(quizzes) || quizzes.length === 0) {
      return [];
    }
    
    const themeMap = {};
    let totalCount = 0;
    
    quizzes.forEach(q => {
      const t = q.theme || 'General';
      if (!themeMap[t]) {
        themeMap[t] = { theme: t, count: 0 };
      }
      themeMap[t].count += 1;
      totalCount += 1;
    });
    
    const list = Object.values(themeMap);
    if (list.length > 0) {
      list.unshift({ theme: 'Tất cả', count: totalCount });
    }
    
    return list;
  } catch (error) {
    console.error('Lỗi khi tính toán quiz themes ở frontend:', error);
    return [];
  }
};

export const submitQuiz = async (score, total, streak = 0) => {
  const response = await api.post('/quiz/submit', { score, total, streak });
  return response.data;
};
