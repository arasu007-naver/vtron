// @ts-nocheck
import { login } from "@/lib/auth-client";

export default function LoginPage() {
  const handleLogin = () => login();
  return <button type="button" onClick={handleLogin}>login</button>;
}
