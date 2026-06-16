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
  const response = await api.get('/quiz/themes');
  return response.data.filter(t => t.count > 0);
};

export const submitQuiz = async (score, total, streak = 0) => {
  const response = await api.post('/quiz/submit', { score, total, streak });
  return response.data;
};
