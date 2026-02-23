declare module '../../services/ApiService' {
  import { AxiosResponse } from 'axios';

  class ApiService {
    constructor();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    postData(url: string, data: Record<string, any>): Promise<AxiosResponse>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getData(url: string, params?: Record<string, any>): Promise<AxiosResponse>;
    getDatawithPagination(url: string, isPag: boolean): Promise<AxiosResponse>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    updateData(url: string, data: Record<string, any>): Promise<AxiosResponse>;
    uploadImage(data: File | Blob, base?: string | null): Promise<AxiosResponse>;
    uploadPdf(data: File | Blob, base?: string | null): Promise<AxiosResponse>;
  }

  export default ApiService;
}
