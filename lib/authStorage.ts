import AsyncStorage from "@react-native-async-storage/async-storage";

const USERS_KEY = "dt_users";
const SESSION_KEY = "dt_session";

export type User = {
  id: string;
  businessName: string;
  email: string;
  password: string;
};

export async function getUsers(): Promise<User[]> {
  const raw = await AsyncStorage.getItem(USERS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function saveUsers(users: User[]) {
  await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export async function setSession(user: User) {
  await AsyncStorage.setItem(
    SESSION_KEY,
    JSON.stringify({
      userId: user.id,
      email: user.email,
    })
  );
}

export async function getSession(): Promise<{
  userId: string;
  email: string;
} | null> {
  const raw = await AsyncStorage.getItem(SESSION_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function clearSession() {
  await AsyncStorage.removeItem(SESSION_KEY);
}