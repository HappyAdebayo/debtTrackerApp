import AsyncStorage from "@react-native-async-storage/async-storage";

const USERS_KEY = "dt_users";
const SESSION_KEY = "dt_session";
const LAST_USER_KEY = "dt_last_user_id";

export type User = {
  id: string;
  businessName: string;
  email: string;
  password?: string;
  isVerified?: boolean;
  verificationCode?: string;
  token?: string | null;
};

export async function getUsers(): Promise<User[]> {
  const raw = await AsyncStorage.getItem(USERS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function saveUsers(users: User[]) {
  await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export async function setSession(user: User & { business_name?: string }, token?: string | null, refreshToken?: string | null) {
  await AsyncStorage.setItem(
    SESSION_KEY,
    JSON.stringify({
      userId: user.id.toString(),
      email: user.email,
      businessName: user.businessName || user.business_name || "",
      token: token || user.token || null,
      refreshToken: refreshToken || null,
    })
  );
}

export async function getSession(): Promise<{
  userId: string;
  email: string;
  businessName?: string;
  token?: string | null;
  refreshToken?: string | null;
} | null> {
  const raw = await AsyncStorage.getItem(SESSION_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function clearSession() {
  await AsyncStorage.removeItem(SESSION_KEY);
}

/** Returns the userId of whoever last successfully logged in, or null. */
export async function getLastUserId(): Promise<string | null> {
  return await AsyncStorage.getItem(LAST_USER_KEY);
}

/** Persists the userId of the user who just logged in. */
export async function setLastUserId(userId: string): Promise<void> {
  await AsyncStorage.setItem(LAST_USER_KEY, userId);
}
