"use client";

import {
  Alert,
  Box,
  Button,
  Group,
  PasswordInput,
  Radio,
  TextInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, updateProfile, UserCredential } from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { auth, functions, googleProvider } from "../../lib/firebase";

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
    initialValues: { name: "", email: "", password: "", role: "user" },
    validate: {
      email: (value) => (/^\S+@\S+$/.test(value) ? null : "Invalid email"),
      password: (value) =>
        value.length >= 6 ? null : "Password must be at least 6 characters",
    },
  });

  const handleAuth = async (
    authPromise: Promise<UserCredential>,
    role: string
  ) => {
    setLoading(true);
    setError(null);
    try {
      const { user } = await authPromise;

      if (isRegistering) {
        await updateProfile(user, { displayName: form.values.name });
        await assignUserRole({ uid: user.uid, role });

        setSuccess("Account created successfully!");
      }

      router.push(role === "realtor" ? "/realtor-dashboard" : "/user-dashboard");
    } catch (error: any) {
      setError(error.message || "Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () =>
    handleAuth(signInWithPopup(auth, googleProvider), "user");

  const handleSubmit = (values: typeof form.values) => {
    const authPromise = isRegistering
      ? createUserWithEmailAndPassword(auth, values.email, values.password)
      : signInWithEmailAndPassword(auth, values.email, values.password);

    handleAuth(authPromise, values.role);
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

          {isRegistering && (
            <Radio.Group
              label="Select Role"
              {...form.getInputProps("role")}
              className="mt-4"
            >
              <Group mt="xs">
                <Radio value="user" label="User" />
                <Radio value="realtor" label="Realtor" />
              </Group>
            </Radio.Group>
          )}

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
