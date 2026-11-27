export async function authFetch(url: string) {
  await fetch("/api/auth/session");
  return fetch(url);
}

export async function login(email?: string, password?: string) {
  return fetch("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}
