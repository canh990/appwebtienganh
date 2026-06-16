import api from './api';

export const getVocabulary = async (page = 1, limit = 10, theme = '', search = '') => {
  const params = new URLSearchParams({ page, limit });
  if (theme)  params.append('theme',  theme);
  if (search) params.append('search', search);
  const response = await api.get(`/vocabulary?${params}`);
  if (response.data && response.data.words) {
    response.data.words = response.data.words.filter(w => w.userId !== null);
  }
  return response.data;
};

export const getThemes = async () => {
  try {
    // Để đảm bảo trang trống khi chưa tự tạo từ vựng, ta tính toán theme trực tiếp từ từ vựng của người dùng
    const vocabData = await getVocabulary(1, 1000);
    const words = vocabData.words || [];
    
    const themeMap = {};
    words.forEach(w => {
      const t = w.theme || 'General';
      if (!themeMap[t]) {
        themeMap[t] = { theme: t, count: 0, learnedCount: 0 };
      }
      themeMap[t].count += 1;
    });
    
    return Object.values(themeMap);
  } catch (error) {
    console.error('Lỗi khi tính toán themes ở frontend:', error);
    return [];
  }
};

export const toggleFavoriteWord = async (wordId) => {
  const response = await api.post(`/vocabulary/favorite/${wordId}`);
  return response.data;
};

export const createVocabulary = async (wordData) => {
  const response = await api.post('/vocabulary', wordData);
  return response.data;
};

export const getFavoriteVocabulary = async () => {
  const response = await api.get('/vocabulary/favorites');
  return response.data;
};

export const getLearnedWordIds = async () => {
  const response = await api.get('/vocabulary/learned');
  return response.data.wordsLearned;
};

export const markWordLearned = async (wordId) => {
  const response = await api.post(`/vocabulary/learned/${wordId}`);
  return response.data;
};

export const updateVocabulary = async (wordId, wordData) => {
  const response = await api.put(`/vocabulary/${wordId}`, wordData);
  return response.data;
};

export const deleteVocabulary = async (wordId) => {
  const response = await api.delete(`/vocabulary/${wordId}`);
  return response.data;
};

export const deleteTheme = async (themeName) => {
  const response = await api.delete(`/vocabulary/theme/${encodeURIComponent(themeName)}`);
  return response.data;
};
