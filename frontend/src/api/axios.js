import axios from 'axios';

const api = axios.create({
    baseURL: '/api',
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true
});

// Add a request interceptor
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('access');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add a response interceptor
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // If the error is 401 and we haven't retried yet
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const refreshToken = localStorage.getItem('refresh');
                if (refreshToken) {
                    // Note: We use the relative path here too
                    const response = await axios.post('/api/token/refresh/', {
                        refresh: refreshToken
                    });

                    if (response.data.access) {
                        localStorage.setItem('access', response.data.access);
                        api.defaults.headers.common['Authorization'] = `Bearer ${response.data.access}`;
                        originalRequest.headers['Authorization'] = `Bearer ${response.data.access}`;
                        return api(originalRequest);
                    }
                }
            } catch (refreshError) {
                // If refresh fails, logout
                localStorage.removeItem('access');
                localStorage.removeItem('refresh');
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;
