/** Friendly text for every error code the API can return. */
export const ERROR_TEXT: Record<string, string> = {
  invalid_input: "Add at least one book you've read or are reading first.",
  ai_unavailable: "The AI helper isn't set up on this deployment yet.",
  rate_limited: "That's a lot of requests in a short time. Try again in a few minutes.",
  ai_busy: "Google's AI is busy right now. Try again in a minute.",
  ai_timeout: "The AI took too long to answer. Give it another try.",
  ai_failed: "Couldn't find good suggestions this time. Try again, or pick a different mood.",
  network: "Network problem. Check your connection and try again.",
  not_found: "Couldn't find this book on Open Library.",
  text_failed: "Couldn't load the book's text just now. Try again in a moment.",
  too_large: "This book is too large to open here.",
  search_failed: "Open Library didn't answer just now. Try again in a moment.",
};

export function errorText(code: string | undefined): string {
  return ERROR_TEXT[code ?? "ai_failed"] ?? ERROR_TEXT.ai_failed;
}
