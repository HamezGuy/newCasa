"use client";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
  UserCredential,
} from "firebase/auth";
import { doc, DocumentData, DocumentSnapshot, getDoc, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { ChangeEvent, MouseEvent, useState } from "react";
import { auth, db, googleProvider } from "../../config/firebase";

const Login = (): JSX.Element => {
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [role, setRole] = useState<string>("user"); // Default role to 'user'
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();

  // Handle Google login
  const handleGoogleLogin = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setLoading(true);
    try {
      const result: UserCredential = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const userRole = await getUserRole(user.uid);
      redirectBasedOnRole(userRole);
    } catch (error) {
      setError("Failed to sign in with Google. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle Email login
  const handleEmailLogin = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setLoading(true);
    try {
      const result: UserCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = result.user;
      const userRole = await getUserRole(user.uid);
      redirectBasedOnRole(userRole);
    } catch (error: any) {
      if (error.code === "auth/wrong-password") {
        setError("Incorrect password. Please try again.");
      } else if (error.code === "auth/user-not-found") {
        setError("No user found with this email. Please sign up first.");
      } else {
        setError("Failed to sign in. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle Registration with Role selection
  const handleRegister = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const result: UserCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = result.user;
      await updateProfile(user, { displayName: name });

      // Save role to Firestore
      await setDoc(doc(db, "users", user.uid), { role });

      setSuccess("Account created successfully!");
      setTimeout(() => {
        redirectBasedOnRole(role);
      }, 1000);
    } catch (error: any) {
      if (error?.code === "auth/email-already-in-use") {
        setError("This email is already in use. Please use a different email.");
      } else if (error?.code === "auth/weak-password") {
        setError("Password is too weak. Please use a stronger password.");
      } else {
        setError("Failed to create account. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Get user role from Firestore
  const getUserRole = async (uid: string): Promise<string | null> => {
    const userDoc: DocumentSnapshot<DocumentData> = await getDoc(doc(db, "users", uid));
    if (userDoc.exists()) {
      return userDoc.data()?.role ?? "user";
    }
    return "user";
  };

  // Redirect based on user role
  const redirectBasedOnRole = (role: string | null): void => {
    if (role === "realtor") {
      router.push("/realtor-dashboard");
    } else {
      router.push("/user-dashboard");
    }
  };

  // Handle input changes
  const handleInputChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = event.target;
    if (name === "email") setEmail(value);
    if (name === "password") setPassword(value);
    if (name === "name") setName(value);
  };

  // Handle role change
  const handleRoleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setRole(event.target.value);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold text-center text-gray-800">
          {isRegistering ? "Create an Account" : "Login"}
        </h2>

        {error && <p className="text-red-500 text-center">{error}</p>}
        {success && <p className="text-green-500 text-center">{success}</p>}

        {isRegistering && (
          <div className="space-y-4">
            <input
              type="text"
              name="name"
              placeholder="Full Name"
              value={name}
              onChange={handleInputChange}
              className="w-full px-4 py-2 text-gray-700 bg-gray-100 border rounded-md focus:outline-none focus:ring focus:ring-blue-500"
            />
            <div className="space-y-2">
              <label className="block text-gray-700">Select Role:</label>
              <div className="flex items-center">
                <input
                  type="radio"
                  id="user"
                  name="role"
                  value="user"
                  checked={role === "user"}
                  onChange={handleRoleChange}
                  className="mr-2"
                />
                <label htmlFor="user" className="mr-4">User</label>
                <input
                  type="radio"
                  id="realtor"
                  name="role"
                  value="realtor"
                  checked={role === "realtor"}
                  onChange={handleRoleChange}
                  className="mr-2"
                />
                <label htmlFor="realtor">Realtor</label>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={email}
            onChange={handleInputChange}
            className="w-full px-4 py-2 text-gray-700 bg-gray-100 border rounded-md focus:outline-none focus:ring focus:ring-blue-500"
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={password}
            onChange={handleInputChange}
            className="w-full px-4 py-2 text-gray-700 bg-gray-100 border rounded-md focus:outline-none focus:ring focus:ring-blue-500"
          />
        </div>

        <div className="space-y-4">
          <button
            onClick={isRegistering ? handleRegister : handleEmailLogin}
            disabled={loading}
            className={`w-full px-4 py-2 font-bold text-white bg-blue-600 rounded-md ${
              loading ? "opacity-50 cursor-not-allowed" : "hover:bg-blue-700"
            } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
          >
            {loading ? "Processing..." : isRegistering ? "Register" : "Login"}
          </button>

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className={`w-full px-4 py-2 font-bold text-white bg-red-500 rounded-md ${
              loading ? "opacity-50 cursor-not-allowed" : "hover:bg-red-600"
            } focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2`}
          >
            {loading
              ? "Processing..."
              : isRegistering
              ? "Register with Google"
              : "Login with Google"}
          </button>
        </div>

        <p className="text-center text-gray-600">
          {isRegistering
            ? "Already have an account? "
            : "Don't have an account? "}
          <button
            onClick={() => setIsRegistering(!isRegistering)}
            className="font-medium text-blue-600 hover:underline"
          >
            {isRegistering ? "Login" : "Register"}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Login;
