import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";
import SignUp from "../features/auth/screens/SignUp";
import EmailVerificationScreen from "../features/auth/screens/VerifyEmail";
import SignInScreen from "../features/auth/screens/SignIn";
import { SignUpProvider } from "../features/auth/context/SignUpContext";

export type AuthStackParamList = {
  SignIn: undefined;
  SignUp: undefined;
  VerifyEmail:
    | {
        first_name: string;
        last_name: string;
        role: "user";
        username?: string;
        email: string;
        password: string;
      }
    | undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();

export default function AuthNavigator() {
  return (
   <SignUpProvider>
     <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen component={SignInScreen} name="SignIn" />
      <AuthStack.Screen component={SignUp} name="SignUp" />
      <AuthStack.Screen
        component={EmailVerificationScreen}
        name="VerifyEmail"
      />
    </AuthStack.Navigator>
   </SignUpProvider>
  );
}
