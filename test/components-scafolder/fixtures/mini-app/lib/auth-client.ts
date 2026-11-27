// @ts-nocheck
export async function authFetch(url: string) {
  await fetch("/api/auth/session");
  return fetch(url);
}

export async function login() {
  return fetch("/api/auth/login", { method: "POST" });
}
