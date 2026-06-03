import api from './api';

export const getRandomQuiz = async () => {
  const response = await api.get('/quiz/random');
  return response.data;
};

export const submitQuiz = async (score, total) => {
  const response = await api.post('/quiz/submit', { score, total });
  return response.data;
};
