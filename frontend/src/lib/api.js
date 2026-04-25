import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: API,
  headers: { "Content-Type": "application/json" },
});

export const analyze = (payload) => api.post("/analyze", payload).then((r) => r.data);
export const listChecks = (favoritesOnly = false) =>
  api.get("/checks", { params: { favorites_only: favoritesOnly } }).then((r) => r.data);
export const getCheck = (id) => api.get(`/checks/${id}`).then((r) => r.data);
export const deleteCheck = (id) => api.delete(`/checks/${id}`).then((r) => r.data);
export const toggleFavorite = (id, isFavorite) =>
  api.patch(`/checks/${id}/favorite`, { is_favorite: isFavorite }).then((r) => r.data);
export const getStats = () => api.get("/stats").then((r) => r.data);
