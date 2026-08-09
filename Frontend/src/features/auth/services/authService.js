import apiClient from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";

function logLoginDebug(stage, details) {
  if (!import.meta.env.DEV) return;
  // Never log password values.
  console.info("[auth-login]", stage, details);
}

export const userLogin = (data) =>
  apiClient.post(apiEndpoints.auth.login, {
    EmailOrMobile: data.emailOrMobile,
    emailOrMobile: data.emailOrMobile,
    password: data.password,
  });

export const loginUser = async (data) => {
  const enteredIdentity = String(data.emailOrMobile || "").trim();
  const enteredPassword = String(data.password || "").trim();

  logLoginDebug("request-prepared", {
    endpoint: apiEndpoints.auth.login,
    payload: { emailOrMobile: enteredIdentity, password: "***" },
  });

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
    return normalizeLoginResponse(userResponse.data, enteredIdentity);
  } catch (userError) {
    logLoginDebug("response-error", {
      endpoint: apiEndpoints.auth.login,
      httpStatus: userError?.response?.status,
      message: getBackendMessage(userError),
    });
    throw buildLoginError(userError);
  }
};

export const registerUser = (data) => apiClient.post(apiEndpoints.auth.register, data);
export const forgotPassword = (data) => apiClient.post(apiEndpoints.auth.forgotPassword, data);
export const verifyOtp = (data) => apiClient.post(apiEndpoints.auth.verifyOtp, data);
export const resetPassword = (data) => apiClient.post(apiEndpoints.auth.resetPassword, data);
export const getUsers = () => apiClient.get(apiEndpoints.auth.users);
export const getUserById = (id) => apiClient.get(apiEndpoints.auth.userById(id));

function normalizeLoginResponse(payload = {}, enteredEmail) {
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

  const rawRole = data.Role || data.role || payload.Role || payload.role || "student";
  const role = String(rawRole).trim().toLowerCase();
  const isAdmin = role === "admin";
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

function buildLoginError(error) {
  const statusCode = error?.response?.status;

  if (statusCode === 401) {
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


