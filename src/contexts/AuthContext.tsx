import React, { createContext, useContext, useState, ReactNode } from "react";

interface User {
  id: string;
  username: string;
  role: "admin" | "user";
  pages: string[];
}

const SHEET_ID = "1dfxIrs_9r40U0j63QfT0LiPk7Y88SihJUt6-XiwhEj8"; // your file id
const LOGIN_SHEET_NAME = "LOGIN";

async function fetchLoginSheet(): Promise<
  Array<{ username: string; password: string; role?: string; pages?: string }>
> {
  const url = `https://script.google.com/macros/s/AKfycbxqx00B7oSgwGlyCgUb1ONM-lBc-xuQUb1ykUIfY_rdZIK8l1xDN_AnSA66gONNBSdH/exec?sheetId=${SHEET_ID}&sheetName=${LOGIN_SHEET_NAME}`;
  const res = await fetch(url, { method: "GET" });

  // The Apps Script returns JSON like:
  // { success: true, data: [ ['User Name','Pasword','Role',...], ['admin','admin123','',...], ... ] }
  const json = await res.json();

  if (!json?.success || !Array.isArray(json.data)) {
    throw new Error("Invalid response from login sheet");
  }

  // Skip header row
  const [, ...rows] = json.data as any[];

  // Columns: A=User Name, B=Pasword, C=Role (D is ignored)
  return rows
    .map((r: any[]) => ({
      username: String(r?.[0] ?? "").trim(),
      password: String(r?.[1] ?? "").trim(),
      role: String(r?.[2] ?? "")
        .trim()
        .toLowerCase(),
      pages: String(r?.[3] ?? "").trim(),
    }))
    .filter((r) => r.username && r.password);
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>; // <- async
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem("user");
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const login = async (
    username: string,
    password: string
  ): Promise<boolean> => {
    try {
      // console.log("Ram1");
      const rows = await fetchLoginSheet();
      // console.log("rows",rows);
      const match = rows.find(
        (r) =>
          r.username.toLowerCase() === username.toLowerCase() &&
          r.password === password
      );

      if (match) {
        const userData = {
          id: match.username,
          username: match.username,
          role: (match.role === "admin" ? "admin" : "user") as User["role"],
          pages: match.pages?.split(",").map((p) => p.trim()) || [],
        };
        setUser(userData);
        localStorage.setItem("user", JSON.stringify(userData));
        return true;
      }
      return false;
    } catch (e) {
      // If fetch fails, treat as invalid
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
  };

  const value: AuthContextType = {
    user,
    login,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
