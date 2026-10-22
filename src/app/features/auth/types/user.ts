export interface User {
  id: string;
  name: string;
  email: string;
  role?: "USER" | "ADMIN";
  emailVerified?: boolean;
}

export interface Credentials {
  email: string;
  password: string;
}
export interface RegistrationInput extends Credentials {
  name: string;
}
