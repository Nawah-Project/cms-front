import { useAuth } from "../store/authStore";
export function useMe() { const { user, loading, authenticated, refresh } = useAuth(); return { user, loading, authenticated, refresh }; }
