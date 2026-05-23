
// Deployed backend API URL
export const API_BASE_URL = "https://debtwise-backend-t2cs.onrender.com/api";

export async function apiRequest(
  endpoint: string,
  options: {
    method?: "GET" | "POST" | "PUT" | "DELETE";
    body?: any;
    token?: string | null;
  } = {}
) {
  const { method = "GET", body, token } = options;
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL}${endpoint}`;
  console.log(`[API Request] ${method} ${url}`, body ? JSON.stringify(body) : "");

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const text = await response.text();
    let json: any = {};
    if (text) {
      try {
        json = JSON.parse(text);
      } catch (e) {
        throw new Error(`Invalid response format from server: ${text}`);
      }
    }

    if (!response.ok) {
      console.error(`[API Error Response] ${method} ${endpoint}:`, {
        status: response.status,
        body: text,
        json: json
      });
      const errorMessage = json.message || `HTTP ${response.status} Error`;
      throw {
        status: response.status,
        message: errorMessage,
        errors: json.errors || null,
        fullError: json,
      };
    }

    return json;
  } catch (error: any) {
    console.error(`[API Error] ${method} ${endpoint}:`, error);
    throw error;
  }
}

// Authentication endpoints
export async function apiSignup(businessName: string, email: string, password: string) {
  return apiRequest("/auth", {
    method: "POST",
    body: {
      user_name: businessName,
      email,
      password,
    },
  });
}

export async function apiVerifyOtp(email: string, code: string) {
  return apiRequest("/auth/verify", {
    method: "POST",
    body: {
      email,
      otp_code: code,
    },
  });
}

export async function apiResendOtp(email: string) {
  return apiRequest("/auth/send_otp", {
    method: "POST",
    body: {
      email,
    },
  });
}

export async function apiLogin(email: string, password: string) {
  return apiRequest("/auth/login", {
    method: "POST",
    body: {
      email,
      password,
    },
  });
}

export async function apiRefreshToken(token: string, refreshToken: string) {
  return apiRequest("/auth/refresh", {
    method: "POST",
    token,
    body: {
      refreshToken,
    },
  });
}

// Backup & Sync endpoints
export async function apiCreateBackup(token: string, backupData: any) {
  return apiRequest("/backup", {
    method: "POST",
    token,
    body: {
      data: backupData,
    },
  });
}

export async function apiRestoreBackup(token: string) {
  return apiRequest("/backup", {
    method: "GET",
    token,
  });
}
