import api from './api';

export const getMyStats = async () => {
  const response = await api.get('/stats/me');
  return response.data;
};

export const getLeaderboard = async () => {
  const response = await api.get('/stats/leaderboard');
  return response.data;
};

export const updateStreak = async () => {
  const response = await api.post('/stats/update-streak');
  return response.data;
};
