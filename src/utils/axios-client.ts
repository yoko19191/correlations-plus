import axios from 'axios';

const axiosClient = axios.create({
    timeout: 60000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add response interceptor for error handling
axiosClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            console.error('API Error:', {
                status: error.response.status,
                data: error.response.data,
            });
        } else if (error.request) {
            // The request was made but no response was received
            console.error('No response received:', error.request);
        } else {
            // Something happened in setting up the request that triggered an Error
            console.error('Request setup error:', error.message);
        }
        return Promise.reject(error);
    }
);

export default axiosClient; 