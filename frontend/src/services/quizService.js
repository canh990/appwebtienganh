import api from './api';

export const getRandomQuiz = async ({ limit = 10, type = 'all' } = {}) => {
  const params = new URLSearchParams({ limit });
  if (type && type !== 'all') params.append('type', type);
  const response = await api.get(`/quiz/random?${params}`);
  return response.data;
};

export const submitQuiz = async (score, total, streak = 0) => {
  const response = await api.post('/quiz/submit', { score, total, streak });
  return response.data;
};
