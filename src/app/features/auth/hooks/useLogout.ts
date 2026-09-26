import { useAuth } from "../store/authStore";
export function useLogout() { const { signOut } = useAuth(); return signOut; }
