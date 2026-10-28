export interface User {
  id: string;
  name: string;
  email: string;
  role?: "USER" | "ADMIN";
  emailVerified?: boolean;
  verificationDelivery?: 'SENT'|'FAILED';
  targetJobTitle?: string | null;
  adminAccess?: {
    isRoot: boolean;
    fullAccess: boolean;
    canManageAdmins: boolean;
    permissions: Partial<
      Record<
        | "OVERVIEW"
        | "COMMUNITY"
        | "MENTORING"
        | "JOURNEY"
        | "REPORTS"
        | "UX_LAB"
        | "OPERATIONS",
        "READ" | "WRITE"
      >
    >;
  };
}

export interface Credentials {
  email: string;
  password: string;
}
export interface RegistrationInput extends Credentials {
  name: string;
}
