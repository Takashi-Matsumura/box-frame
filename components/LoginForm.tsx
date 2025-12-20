"use client";

import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";

const translations = {
  en: {
    username: "Username",
    password: "Password",
    usernamePlaceholder: "LDAP username",
    passwordPlaceholder: "Password",
    signInButton: "Sign In with LDAP",
    signingIn: "Signing in...",
    loginError: "Login failed. Please check your username or password.",
    systemError: "An error occurred during login.",
  },
  ja: {
    username: "ユーザ名",
    password: "パスワード",
    usernamePlaceholder: "LDAPユーザ名",
    passwordPlaceholder: "パスワード",
    signInButton: "LDAPでサインイン",
    signingIn: "ログイン中...",
    loginError:
      "ログインに失敗しました。ユーザ名またはパスワードを確認してください。",
    systemError: "ログイン中にエラーが発生しました。",
  },
} as const;

interface LoginFormProps {
  language?: "en" | "ja";
}

export function LoginForm({ language = "ja" }: LoginFormProps) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const t = translations[language];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await signIn("ldap", {
        username,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(t.loginError);
      } else if (result?.ok) {
        router.push("/");
        router.refresh();
      }
    } catch (err) {
      console.error("Login error:", err);
      setError(t.systemError);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div>
        <label
          htmlFor="username"
          className="block text-sm font-medium text-foreground mb-2"
        >
          {t.username}
        </label>
        <input
          id="username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          className="w-full px-4 py-3 border border-input rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          placeholder={t.usernamePlaceholder}
          disabled={isLoading}
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-foreground mb-2"
        >
          {t.password}
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full px-4 py-3 border border-input rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          placeholder={t.passwordPlaceholder}
          disabled={isLoading}
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-lg hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
      >
        {isLoading ? t.signingIn : t.signInButton}
      </button>
    </form>
  );
}
