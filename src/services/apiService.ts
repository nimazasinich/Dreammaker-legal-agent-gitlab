import { ApiResponse, ValidationError } from '../types';

// API configuration
const API_BASE_URL = '/api';
const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
};

// Request timeout in milliseconds
const REQUEST_TIMEOUT = 30000;

// Error messages
const ERROR_MESSAGES = {
  NETWORK: 'Network error. Please check your connection.',
  TIMEOUT: 'Request timed out. Please try again.',
  SERVER: 'Server error occurred. Please try again later.',
  VALIDATION: 'Validation error. Please check your input.',
  UNAUTHORIZED: 'Unauthorized. Please log in again.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',
};

// Validation functions
export const validators = {
  required: (value: any): boolean => {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    return true;
  },
  
  email: (value: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  },
  
  minLength: (length: number) => (value: string): boolean => {
    return (value?.length || 0) >= length;
  },
  
  maxLength: (length: number) => (value: string): boolean => {
    return value.length <= length;
  },
  
  numeric: (value: string): boolean => {
    return /^\d+$/.test(value);
  },
  
  decimal: (value: string): boolean => {
    return /^\d+(\.\d+)?$/.test(value);
  }
};

// API request function with timeout
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout: number = REQUEST_TIMEOUT
): Promise<Response> {
  const controller = new AbortController();
  const { signal } = controller;
  
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, { ...options, signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      console.error(ERROR_MESSAGES.TIMEOUT);
    }
    throw error;
  }
}

// Process API response
async function processResponse<T>(response: Response): Promise<ApiResponse<T>> {
  try {
    const data = await response.json();
    
    if (!response.ok) {
      const errorMessage = data.error || getErrorMessageByStatus(response.status);
      return {
        success: false,
        error: errorMessage,
        timestamp: Date.now(),
      };
    }
    
    return {
      success: true,
      data: data as T,
      timestamp: Date.now(),
    };
  } catch (error) {
    return {
      success: false,
      error: ERROR_MESSAGES.SERVER,
      timestamp: Date.now(),
    };
  }
}

// Get error message by HTTP status code
function getErrorMessageByStatus(status: number): string {
  switch (status) {
    case 400: return ERROR_MESSAGES.VALIDATION;
    case 401: return ERROR_MESSAGES.UNAUTHORIZED;
    case 403: return ERROR_MESSAGES.FORBIDDEN;
    case 404: return ERROR_MESSAGES.NOT_FOUND;
    case 500: return ERROR_MESSAGES.SERVER;
    default: return `Error ${status}`;
  }
}

// API service
export const apiService = {
  // GET request
  async get<T>(endpoint: string, params?: Record<string, string>): Promise<ApiResponse<T>> {
    try {
      const url = new URL(`${API_BASE_URL}${endpoint}`, window.location.origin);
      
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          url.searchParams.append(key, value);
        });
      }
      
      const response = await fetchWithTimeout(
        url.toString(),
        {
          method: 'GET',
          headers: DEFAULT_HEADERS,
          credentials: 'include',
        }
      );
      
      return processResponse<T>(response);
    } catch (error) {
      return {
        success: false,
        error: ERROR_MESSAGES.NETWORK,
        timestamp: Date.now(),
      };
    }
  },
  
  // POST request
  async post<T>(endpoint: string, data: any): Promise<ApiResponse<T>> {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}${endpoint}`,
        {
          method: 'POST',
          headers: DEFAULT_HEADERS,
          credentials: 'include',
          body: JSON.stringify(data),
        }
      );
      
      return processResponse<T>(response);
    } catch (error) {
      return {
        success: false,
        error: ERROR_MESSAGES.NETWORK,
        timestamp: Date.now(),
      };
    }
  },
  
  // PUT request
  async put<T>(endpoint: string, data: any): Promise<ApiResponse<T>> {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}${endpoint}`,
        {
          method: 'PUT',
          headers: DEFAULT_HEADERS,
          credentials: 'include',
          body: JSON.stringify(data),
        }
      );
      
      return processResponse<T>(response);
    } catch (error) {
      return {
        success: false,
        error: ERROR_MESSAGES.NETWORK,
        timestamp: Date.now(),
      };
    }
  },
  
  // DELETE request
  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}${endpoint}`,
        {
          method: 'DELETE',
          headers: DEFAULT_HEADERS,
          credentials: 'include',
        }
      );
      
      return processResponse<T>(response);
    } catch (error) {
      return {
        success: false,
        error: ERROR_MESSAGES.NETWORK,
        timestamp: Date.now(),
      };
    }
  },
  
  // Validate data against schema
  validate(data: any, schema: Record<string, (value: any) => boolean | string>): ValidationError[] {
    const errors: ValidationError[] = [];
    
    Object.entries(schema).forEach(([field, validator]) => {
      const value = data[field];
      const result = validator(value);
      
      if (result !== true && typeof result === 'string') {
        errors.push({
          field,
          message: result,
        });
      } else if (result === false) {
        errors.push({
          field,
          message: `Invalid ${field}`,
        });
      }
    });
    
    return errors;
  }
};

export default apiService;