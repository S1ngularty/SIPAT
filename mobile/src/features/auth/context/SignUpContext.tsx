import React, { createContext, useContext, useState, ReactNode } from "react";

interface UserCredentials {
  first_name: string;
  last_name: string;
  role: "user";
  username?: string;
  email: string;
  password: string;
}

interface SignUpContextType {
  credentials: UserCredentials;
  setCredentials: React.Dispatch<React.SetStateAction<UserCredentials>>;
}

const SignUpContext = createContext<SignUpContextType | undefined>(undefined);

const initialCredentials: UserCredentials = {
  first_name: "",
  last_name: "",
  role: "user",
  username: "",
  email: "",
  password: "",
};

export function SignUpProvider({ children }: { children: ReactNode }) {
  const [credentials, setCredentials] =
    useState<UserCredentials>(initialCredentials);

  return (
    <SignUpContext.Provider value={{ credentials, setCredentials }}>
      {children}
    </SignUpContext.Provider>
  );
}

export function useSignUpContext() {
  const context = useContext(SignUpContext);

  if (!context) {
    throw new Error("useSignUpContext must be used inside SignUpProvider");
  }

  return context;
}
