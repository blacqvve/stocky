export function getAuthHeader(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('stocky_auth');
}

export function setCredentials(user: string, pass: string) {
  sessionStorage.setItem('stocky_auth', 'Basic ' + btoa(`${user}:${pass}`));
}

export function clearCredentials() {
  sessionStorage.removeItem('stocky_auth');
}

export function isAuthenticated(): boolean {
  return !!getAuthHeader();
}
