import api from './api';

export const seedDatabase = async () => {
  const response = await api.post('/seed');
  return response.data;
};

export const generateAIWords = async (theme = '') => {
  const response = await api.post('/seed/ai-generate', { theme });
  return response.data;
};
