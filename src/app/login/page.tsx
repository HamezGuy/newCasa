"use client";

import {
  Alert,
  Box,
  Button,
  PasswordInput,
  TextInput
} from "@mantine/core";
import { useForm } from "@mantine/form";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
  UserCredential,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore"; // Import Firestore functions
import { httpsCallable } from "firebase/functions";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { auth, db, functions, googleProvider } from "../../lib/firebase"; // Ensure Firestore is imported

interface AssignUserRoleResponse {
  success: boolean;
  message: string;
}

const Login = (): JSX.Element => {
  const router = useRouter();
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const assignUserRole = httpsCallable(functions, "assignUserRole");

  const form = useForm({
    initialValues: { name: "", email: "", password: "", role: "realtor" }, // Default role to "realtor"
    validate: {
      email: (value) => (/^\S+@\S+$/.test(value) ? null : "Invalid email"),
      password: (value) =>
        value.length >= 6 ? null : "Password must be at least 6 characters",
    },
  });

  const handleAuth = async (
    authPromise: Promise<UserCredential>,
    initialRole?: string // Modify to allow optional role
  ) => {
    setLoading(true);
    setError(null);

    try {
      const { user } = await authPromise;

      let role = initialRole || "realtor"; // Default role to "realtor"

      // If registering, assign the selected role and store it in Firestore
      if (isRegistering) {
        await updateProfile(user, { displayName: form.values.name });
        await assignUserRole({ uid: user.uid, role });

        setSuccess("Account created successfully!");
      } else {
        // On login, fetch the assigned role from Firestore
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          role = userDoc.data().role; // Use the role from Firestore
        }
      }

      // Navigate to the correct dashboard based on the user's role
      router.push(role === "realtor" ? "/realtor-dashboard" : "/user-dashboard");
    } catch (error: any) {
      setError(error.message || "Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    const userCredential = await signInWithPopup(auth, googleProvider);
    const { user } = userCredential;

    // Default role to "realtor"
    handleAuth(Promise.resolve(userCredential), "realtor");
  };

  const handleSubmit = (values: typeof form.values) => {
    const authPromise = isRegistering
      ? createUserWithEmailAndPassword(auth, values.email, values.password)
      : signInWithEmailAndPassword(auth, values.email, values.password);

    handleAuth(authPromise, "realtor"); // Default to "realtor"
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Box className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold text-center text-gray-800">
          {isRegistering ? "Create an Account" : "Login"}
        </h2>

        {error && <Alert color="red">{error}</Alert>}
        {success && <Alert color="green">{success}</Alert>}

        <form onSubmit={form.onSubmit(handleSubmit)} className="space-y-4">
          {isRegistering && (
            <TextInput
              label="Full Name"
              placeholder="Your Name"
              {...form.getInputProps("name")}
              classNames={{ input: "bg-gray-100 focus:ring focus:ring-blue-500" }}
            />
          )}

          <TextInput
            label="Email"
            placeholder="Email"
            {...form.getInputProps("email")}
            classNames={{ input: "bg-gray-100 focus:ring focus:ring-blue-500" }}
          />

          <PasswordInput
            label="Password"
            placeholder="Password"
            {...form.getInputProps("password")}
            classNames={{ input: "bg-gray-100 focus:ring focus:ring-blue-500" }}
          />

          <Button
            type="submit"
            fullWidth
            loading={loading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isRegistering ? "Register" : "Login"}
          </Button>

          <Button
            variant="outline"
            fullWidth
            onClick={handleGoogleLogin}
            className="hover:bg-gray-200"
            loading={loading}
          >
            {isRegistering ? "Register with Google" : "Login with Google"}
          </Button>
        </form>

        <p className="text-center text-gray-600 mt-4">
          {isRegistering ? "Already have an account? " : "Don't have an account? "}
          <Button
            variant="link"
            onClick={() => setIsRegistering(!isRegistering)}
          >
            {isRegistering ? "Login" : "Register"}
          </Button>
        </p>
      </Box>
    </div>
  );
};

export default Login;
