const PLACEHOLDER_IMAGE = "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&auto=format&fit=crop";

/**
 * Resolves a given image URI, falling back to a default placeholder
 * if the URI is invalid, empty, or a dummy URL (e.g. example.com).
 */
export function resolveImageUri(uri?: string): string {
  if (!uri || typeof uri !== "string") {
    return PLACEHOLDER_IMAGE;
  }
  const trimmed = uri.trim();
  if (
    trimmed === "" ||
    trimmed.includes("example.com") ||
    trimmed.includes("placeholder")
  ) {
    return PLACEHOLDER_IMAGE;
  }
  return trimmed;
}
