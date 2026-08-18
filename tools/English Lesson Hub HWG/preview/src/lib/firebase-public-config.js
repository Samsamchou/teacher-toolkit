export const FIREBASE_RUNTIME_CONFIG_URL = "/__/firebase/init.json";

const REQUIRED_FIELDS = ["apiKey", "authDomain", "projectId", "appId"];

function normalizedConfig(value = {}) {
  return {
    apiKey: String(value.apiKey || "").trim(),
    authDomain: String(value.authDomain || "").trim(),
    projectId: String(value.projectId || "").trim(),
    storageBucket: String(value.storageBucket || "").trim(),
    messagingSenderId: String(value.messagingSenderId || "").trim(),
    appId: String(value.appId || "").trim()
  };
}

export function hasFirebasePublicConfig(value) {
  const config = normalizedConfig(value);
  return REQUIRED_FIELDS.every((field) => Boolean(config[field]));
}

export async function resolveFirebasePublicConfig({
  environmentConfig,
  expectedProjectId,
  fetchImplementation,
  runtimeUrl = FIREBASE_RUNTIME_CONFIG_URL
}) {
  const environment = normalizedConfig(environmentConfig);
  if (hasFirebasePublicConfig(environment)) return { config: environment, source: "environment" };
  if (typeof fetchImplementation !== "function") return { config: environment, source: "unavailable" };
  try {
    const response = await fetchImplementation(runtimeUrl, {
      cache: "no-store",
      headers: { Accept: "application/json" }
    });
    if (!response?.ok) return { config: environment, source: "runtime-unavailable" };
    const runtime = normalizedConfig(await response.json());
    if (expectedProjectId && runtime.projectId !== expectedProjectId) {
      return { config: environment, source: "project-mismatch" };
    }
    if (!hasFirebasePublicConfig(runtime)) return { config: environment, source: "runtime-incomplete" };
    return { config: runtime, source: "hosting-runtime" };
  } catch {
    return { config: environment, source: "runtime-unavailable" };
  }
}
