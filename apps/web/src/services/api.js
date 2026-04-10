import axios from "axios";
import toast from "react-hot-toast";

const api = axios.create({
  baseURL: "http://localhost:4000/api",
  timeout: 60000,
  headers: {
    "Content-Type": "application/json",
  },
});

const unwrapResultPayload = (payload) => {
  if (
    payload &&
    typeof payload === "object" &&
    typeof payload.success === "boolean" &&
    Object.prototype.hasOwnProperty.call(payload, "data")
  ) {
    return payload.data;
  }

  return payload;
};

// Attach stored auth token on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers["Authorization"] = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    response.data = unwrapResultPayload(response.data);
    return response;
  },
  (error) => {
    const payload = error.response?.data;
    if (payload?.message && !payload.error) {
      payload.error = payload.message;
    }

    if (error.response?.status === 401) {
      // Session expired — clean up and redirect
      localStorage.removeItem("token");
      delete api.defaults.headers.common["Authorization"];
      toast.error("Session expired. Please sign in again.");
      // Only redirect if not already on auth pages
      const path = window.location.pathname;
      if (path !== "/signin" && path !== "/signup" && path !== "/") {
        window.location.href = `/signin?next=${encodeURIComponent(path)}`;
      }
    }
    console.error("API Error:", error.response?.data || error.message);
    return Promise.reject(error);
  },
);

export default api;
