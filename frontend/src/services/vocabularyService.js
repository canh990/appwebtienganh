import api from './api';

export const getVocabulary = async (page = 1, limit = 10, theme = '', search = '') => {
  const params = new URLSearchParams({ page, limit });
  if (theme)  params.append('theme',  theme);
  if (search) params.append('search', search);
  const response = await api.get(`/vocabulary?${params}`);
  return response.data;
};

export const getThemes = async () => {
  const response = await api.get('/vocabulary/themes');
  return response.data; // [{ theme, count }, ...]
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
