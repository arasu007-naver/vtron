function helper() {
  return fetch("/api/things");
}

export function fetchThings() {
  return helper();
}
