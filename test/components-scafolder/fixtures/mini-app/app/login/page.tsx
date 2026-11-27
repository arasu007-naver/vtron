import { login } from "@/lib/auth-client";

export default function LoginPage() {
  const handleLogin = () => login("a@b.com", "pw");
  return <button type="button" onClick={handleLogin}>login</button>;
}
