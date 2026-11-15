import React, { useState, useRef, useEffect } from "react";
import { useAuth, useSignUp } from "@clerk/expo";
import { useNavigation } from "@react-navigation/native";
import showToast from "../../../helper/toast";
import { client } from "../../../api/apiClient";
import { AuthNavigationProp } from "../../scan/types/navigationTypes";
import { useSignUpContext } from "../context/SignUpContext";

interface UserCredentials {
  first_name: string;
  last_name: string;
  role: "user";
  username?: string;
  email: string;
  password: string;
}

export default function () {
  const { signUp } = useSignUp();
  const { getToken } = useAuth();
  const navigation = useNavigation<AuthNavigationProp>();

  const [loading, setLoading] = useState(false);
  // const [credentials, setCredentials] = useState<UserCredentials>({
  //   first_name: "",
  //   last_name: "",
  //   role: "user",
  //   username: "",
  //   email: "",
  //   password: "",
  // });

  const { credentials, setCredentials } = useSignUpContext();
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationStatus, setverificationStatus] = useState(false);
  const [error, setError] = useState("");

  const handleSignUp = async () => {
    if (
      // !credentials.first_name.trim() ||
      // !credentials.last_name.trim() ||
      !credentials.email ||
      !credentials.password
    ) {
      showToast("error", "Sign up error", "Please fill out the fields first.");
      return;
    }

    if (!signUp) return;

    setLoading(true);

    try {
      const { error } = await signUp.create({
        emailAddress: credentials.email,
        password: credentials.password,
      });

      if (signUp.unverifiedFields.includes("email_address")) {
        const { error: codeError } = await signUp.verifications.sendEmailCode();

        if (codeError) {
          console.error("Verification error:", codeError);
          showToast(
            "error",
            "Sign up verification",
            "Failed to send a verification code, please try again.",
          );

          return;
        }
      }

      showToast("success", "Sign up verification", "Verification code sent.");
      navigation.navigate("VerifyEmail");
    } catch (error) {
      console.error("Sign up error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async () => {
    if (!signUp) return;
    if (!verificationCode) return;
    setLoading(true);

    try {
      const attemptVerification = await signUp.verifications.verifyEmailCode({
        code: verificationCode,
      });
      if (attemptVerification.error)
        throw new Error(attemptVerification.error.message);

      if (signUp.status === "complete") {
        const { error: finalizeError } = await signUp.finalize();

        if (finalizeError) throw finalizeError;

        // The session is active now, so the request can carry a bearer token
        // and the backend can bind the record to the Clerk user.
        await storePersonalInfo();
        setverificationStatus(true);
      }
    } catch (error) {
      console.error("email verification error:", error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Persist the non-sensitive parts of the profile in our API/database.
   * The password never leaves Clerk and is deliberately not part of the body.
   */
  const storePersonalInfo = async (): Promise<void> => {
    try {
      const fullName = [credentials.first_name, credentials.last_name]
        .filter((part) => part.trim().length > 0)
        .map((part) => part.trim())
        .join(" ");

      const token = await getToken();

      await client.request(
        "/api/v1/signup",
        {
          method: "POST",
          body: JSON.stringify({
            email: credentials.email,
            role: credentials.role,
            ...(fullName ? { name: fullName } : {}),
          }),
        },
        { token },
      );
      return;
    } catch (error) {
      console.log("[sign up sync error] ", error);
      // setError(error);
      return;
    }
  };

  const handleResendCode = async () => {
    if (!signUp) return;
    setLoading(true);
    try {
      await signUp.verifications.sendEmailCode();
      console.log("New verification code sent!");
    } catch (error) {
      console.log("Failed to send verification code, Please try again.");
      console.error("Resend code error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInput = (fieldName: string, value: unknown): void => {
    setCredentials((prev) => ({ ...prev, [fieldName]: value }));
  };

  return {
    credentials,
    loading,
    navigation,
    verificationCode,
    verificationStatus,
    setCredentials,
    handleSignUp,
    setVerificationCode,
    handleVerifyEmail,
    handleResendCode,
    handleInput,
  };
}
