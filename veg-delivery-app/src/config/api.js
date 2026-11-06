const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();
const apiBaseUrl = (
  configuredApiUrl ||
  (import.meta.env.DEV ? "http://localhost:5000" : "")
).replace(/\/+$/, "");

export const apiUrl = (path) => {
  if (!apiBaseUrl) {
    const message =
      "VITE_API_URL is not configured. Set it to the deployed backend URL in the frontend hosting environment.";
    console.error(message);
    throw new Error(message);
  }

  return `${apiBaseUrl}/${path.replace(/^\/+/, "")}`;
};
