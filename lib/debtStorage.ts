import AsyncStorage from "@react-native-async-storage/async-storage";

const DEBTS_KEY = "dt_debts";

export type Debt = {
  id: string;
  userId: string;
  name: string; 
  amount:
    {
      id:string,
      amount:number,
      description?:string,  
      image?:string 
    }[];
};

export async function getDebts(): Promise<Debt[]> {
  const raw = await AsyncStorage.getItem(DEBTS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function getUserDebts(): Promise<Debt[]> {
  const sessionRaw = await AsyncStorage.getItem("dt_session");
  if (!sessionRaw) return [];

  const session = JSON.parse(sessionRaw);

  const debts = await getDebts();

  return debts.filter(d => d.userId === session.userId);
}

export async function addDebt( data: Omit<Debt, "id" | "userId"> ) {
  const sessionRaw = await AsyncStorage.getItem("dt_session");
  if (!sessionRaw) throw new Error("No session");

  const session = JSON.parse(sessionRaw);

  const debts = await getDebts();

  const newDebt: Debt = {
    id: Date.now().toString(),
    userId: session.userId,
    ...data,
  };

  debts.push(newDebt);
  await saveDebts(debts);
}

export async function saveDebts(debts: Debt[]) {
  await AsyncStorage.setItem(DEBTS_KEY, JSON.stringify(debts));
}