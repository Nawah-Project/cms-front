import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { useI18n } from "../../i18n";
import { useAuth } from "../auth/store/authStore";
import { read } from "./api";
export function ConsultingInvite({ compact = false }: { compact?: boolean }) {
  const { user } = useAuth();
  const { locale } = useI18n();
  const q = useQuery({
    queryKey: ["consulting-availability", user?.id],
    queryFn: () =>
      read<{ available: boolean }>("/career-consulting/availability"),
    enabled: user?.role === "USER" && user.emailVerified === true,
    staleTime: 60000,
    retry: false,
  });
  if (!q.data?.available) return null;
  return (
    <Link
      to="/career-consulting"
      className={
        compact
          ? "flex items-center gap-2 rounded-xl px-4 py-3 text-white hover:bg-white/10"
          : "block rounded-xl border border-emerald-700 bg-emerald-50 p-4 text-emerald-950"
      }
    >
      {locale === "ar" ? "استشارتي المهنية" : "My career consultation"}
      {!compact && (
        <small className="block mt-1">
          {locale === "ar"
            ? "افتح دعوتك أو عملك المشترك. لا يلزم CV أو استكمال ملف البرنامج."
            : "Open your invitation or shared work. No CV or completed programme profile required."}
        </small>
      )}
    </Link>
  );
}
