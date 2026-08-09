import apiClient from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";

const ADMIN_LOGIN_EMAIL = "admin@cms.com";

function logLoginDebug(stage, details) {
  if (!import.meta.env.DEV) return;
  // Never log password values.
  console.info("[auth-login]", stage, details);
}

export const adminLogin = (data) =>
  apiClient.post(apiEndpoints.admin.login, {
    email: data.email,
    password: data.password,
  });

export const userLogin = (data) =>
  apiClient.post(apiEndpoints.auth.login, {
    emailOrMobile: data.emailOrMobile,
    password: data.password,
  });

export const loginUser = async (data) => {
  const enteredIdentity = String(data.emailOrMobile || "").trim();
  const enteredPassword = String(data.password || "").trim();
  const identityForCheck = enteredIdentity.toLowerCase().replace(/\s+/g, "");
  const isAdminLogin = identityForCheck === ADMIN_LOGIN_EMAIL;

  logLoginDebug("request-prepared", {
    endpoint: isAdminLogin ? apiEndpoints.admin.login : apiEndpoints.auth.login,
    payload: isAdminLogin
      ? { email: enteredIdentity, password: "***" }
      : { emailOrMobile: enteredIdentity, password: "***" },
  });

  if (isAdminLogin) {
    try {
      const adminResponse = await adminLogin({ email: enteredIdentity, password: enteredPassword });
      logLoginDebug("response-received", {
        endpoint: apiEndpoints.admin.login,
        httpStatus: adminResponse?.status,
        responseStatus: adminResponse?.data?.status ?? adminResponse?.data?.Status,
      });
      return normalizeLoginResponse(adminResponse.data, enteredIdentity, "admin");
    } catch (adminError) {
      logLoginDebug("response-error", {
        endpoint: apiEndpoints.admin.login,
        httpStatus: adminError?.response?.status,
        message: getBackendMessage(adminError),
      });
      throw buildLoginError(adminError, "admin");
    }
  }

  try {
    const userResponse = await userLogin({
      emailOrMobile: enteredIdentity,
      password: enteredPassword,
    });
    logLoginDebug("response-received", {
      endpoint: apiEndpoints.auth.login,
      httpStatus: userResponse?.status,
      responseStatus: userResponse?.data?.status ?? userResponse?.data?.Status,
    });
    return normalizeLoginResponse(userResponse.data, enteredIdentity, "student");
  } catch (userError) {
    logLoginDebug("response-error", {
      endpoint: apiEndpoints.auth.login,
      httpStatus: userError?.response?.status,
      message: getBackendMessage(userError),
    });
    throw buildLoginError(userError, "user");
  }
};

export const registerUser = (data) => apiClient.post(apiEndpoints.auth.register, data);
export const forgotPassword = (data) => apiClient.post(apiEndpoints.auth.forgotPassword, data);
export const verifyOtp = (data) => apiClient.post(apiEndpoints.auth.verifyOtp, data);
export const resetPassword = (data) => apiClient.post(apiEndpoints.auth.resetPassword, data);
export const getUsers = () => apiClient.get(apiEndpoints.auth.users);
export const getUserById = (id) => apiClient.get(apiEndpoints.auth.userById(id));

function normalizeLoginResponse(payload = {}, enteredEmail, fallbackRole) {
  const data = payload.data || payload.Data || payload;
  const status = payload.status ?? payload.Status ?? data.status ?? data.Status;
  const message = payload.message || payload.Message || data.message || data.Message || "Login successful.";

  if (status === false) throw new Error(message || "Invalid login credentials.");

  const token =
    payload.AccessToken ||
    payload.accessToken ||
    payload.Token ||
    payload.token ||
    payload.jwt ||
    data.AccessToken ||
    data.accessToken ||
    data.Token ||
    data.token ||
    data.jwt;

  const role = fallbackRole === "admin" ? "admin" : data.Role || data.role || payload.Role || payload.role || "student";
  const isAdmin = role === "admin" || fallbackRole === "admin";
  const user = isAdmin
    ? {
        id: data.id || data.adminId || data.AdminId || data.UserId || payload.id || payload.UserId,
        name: "CMS Admin",
        email: enteredEmail,
        role: "admin",
        isAdmin: true,
      }
    : {
        id: data.UserId || data.userId || data.id || payload.UserId || payload.userId || payload.id,
        name: data.Name || data.name || data.fullName || payload.Name || payload.name || payload.fullName || "CMS User",
        email: data.email || data.Email || payload.email || payload.Email || enteredEmail,
        role,
        isAdmin: false,
      };

  return { token, user, roleType: isAdmin ? "admin" : "student", message };
}

function buildLoginError(error, loginType) {
  const statusCode = error?.response?.status;

  if (loginType === "admin" && statusCode === 500) {
    return new Error("Admin login API failed on server. Please check backend /api/Admin/login request body or server logs.");
  }

  if (loginType === "user" && statusCode === 401) {
    return new Error("Invalid email/mobile or password.");
  }

  const message = getBackendMessage(error) || "Invalid credentials or login failed.";
  return new Error(message);
}

function getBackendMessage(error) {
  const data = error?.response?.data;
  if (typeof data === "string") return data;
  return data?.Message || data?.message || data?.title || error?.message;
}


