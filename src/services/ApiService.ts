import axios, { type AxiosInstance, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';

class ApiService {
    private api: AxiosInstance;

    constructor() {
        // Base URL should ideally be an environment variable
        this.api = axios.create({
            baseURL: import.meta.env.VITE_API_URL || 'https://api.ongo237.com/api/',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            timeout: 15000
        });

        // Request Interceptor to add auth token
        this.api.interceptors.request.use(
            (config: InternalAxiosRequestConfig) => {
                const token = localStorage.getItem('token');
                if (token && config.headers) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
                return config;
            },
            (error) => Promise.reject(error)
        );

        // Response Interceptor for global error handling
        this.api.interceptors.response.use(
            (response: AxiosResponse) => response,
            (error) => {
                if (error.response?.status === 401) {
                    // Handle unauthorized (session expired)
                    localStorage.removeItem('token');
                    localStorage.removeItem('isAuthenticated');
                    // window.location.replace('/login');
                }
                return Promise.reject(error);
            }
        );
    }

    public async postData(url: string, data: any): Promise<AxiosResponse> {
        return this.api.post(url, data);
    }

    public async getData(url: string, params?: any): Promise<AxiosResponse> {
        return this.api.get(url, { params });
    }

    public async getDatawithPagination(url: string, isPag: boolean): Promise<AxiosResponse> {
        const fullUrl = isPag ? url : url; // If isPag is true, url is already absolute or includes query params
        // Based on source: const url = isPag ? route : baseShort + route;
        // In ondo-dashboard, we use baseURL, so we just need to append if not isPag
        return this.api.get(fullUrl);
    }

    public async updateData(url: string, data: any): Promise<AxiosResponse> {
        return this.api.put(url, data);
    }

    public async uploadImage(data: any, base: string | null = null): Promise<AxiosResponse> {
        const formData = new FormData();
        formData.append("file", data);
        const baseShort = base == null ? "api/" : base + "/";
        return this.api.post(baseShort + "v2/file-upload", formData, {
            headers: { "Content-Type": "multipart/form-data" },
        });
    }

    public async uploadPdf(data: any, base: string | null = null): Promise<AxiosResponse> {
        const formData = new FormData();
        formData.append("pdf", data);
        const baseShort = base == null ? "api/" : base + "/";
        return this.api.post(baseShort + "uploadPdf", formData, {
            headers: { "Content-Type": "multipart/form-data" },
        });
    }
}

export default ApiService;
