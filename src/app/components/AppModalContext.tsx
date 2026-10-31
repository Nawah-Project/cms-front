import { createContext, useContext } from "react";
import type { CreateApplicationInput } from "../types";

export interface AppContextType {
  openAddModal: (initialValues?: Partial<CreateApplicationInput>) => void;
}

export const AppContext = createContext<AppContextType>({
  openAddModal: () => {},
});

export function useAppModal() {
  return useContext(AppContext);
}

