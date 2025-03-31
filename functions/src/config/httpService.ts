import axios from "axios";

const axiosInstance = axios.create({
  // Aqui você pode definir configurações padrão, como timeout, baseURL, etc.
  timeout: 10000,
});

export default axiosInstance;
