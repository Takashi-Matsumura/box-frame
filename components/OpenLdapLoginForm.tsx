"use client";

import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { RiShieldUserLine } from "react-icons/ri";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const translations = {
  en: {
    username: "Username",
    password: "Password",
    usernamePlaceholder: "OpenLDAP username",
    passwordPlaceholder: "Password",
    signInButton: "Sign In with OpenLDAP",
    signingIn: "Signing in...",
    loginError: "Login failed. Please check your username or password.",
    systemError: "An error occurred during login.",
  },
  ja: {
    username: "ユーザ名",
    password: "パスワード",
    usernamePlaceholder: "OpenLDAPユーザ名",
    passwordPlaceholder: "パスワード",
    signInButton: "OpenLDAPでサインイン",
    signingIn: "ログイン中...",
    loginError:
      "ログインに失敗しました。ユーザ名またはパスワードを確認してください。",
    systemError: "ログイン中にエラーが発生しました。",
  },
} as const;

interface OpenLdapLoginFormProps {
  language?: "en" | "ja";
}

export function OpenLdapLoginForm({ language = "ja" }: OpenLdapLoginFormProps) {
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
      const result = await signIn("openldap", {
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
      console.error("OpenLDAP login error:", err);
      setError(t.systemError);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="openldap-username">{t.username}</Label>
        <Input
          id="openldap-username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          placeholder={t.usernamePlaceholder}
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="openldap-password">{t.password}</Label>
        <Input
          id="openldap-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          placeholder={t.passwordPlaceholder}
          disabled={isLoading}
        />
      </div>

      <Button
        type="submit"
        size="lg"
        className="w-full gap-2"
        disabled={isLoading}
        loading={isLoading}
      >
        <RiShieldUserLine className="w-5 h-5" />
        {isLoading ? t.signingIn : t.signInButton}
      </Button>
    </form>
  );
}
