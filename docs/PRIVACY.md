# Privacy Policy

_Last updated: 2026-04-26_

Backprop is a personal learning tool. The owner is currently the only user.
This policy describes what data Backprop collects and how it is handled.

## What we store

When you sign in with Google, Supabase records your email and a stable user
id (a UUID). We attach the following to that user id:

- **Profile**: display name (from your Google account) and account creation
  date.
- **Onboarding responses**: goals, time commitment, learning style,
  self-described pain points, and any prior-knowledge notes you provide.
- **Mastery scores**: a 0–100 score per curriculum topic plus the timestamp
  it was last practiced.
- **Assessments**: prompts and your responses for diagnostic questions and
  exercises.
- **Tutor sessions and messages**: each chat with the tutor. Messages are
  encrypted at rest with ChaCha20-Poly1305 using a key held only by the
  server; the database stores ciphertext + a per-message nonce.
- **Code submissions**: code you run inside the app, plus its result.

## What we do **not** store

- **API keys.** Your provider API key (OpenAI, Anthropic, Google, or
  GitHub Copilot) lives in your browser's `localStorage` only. The key is
  sent with each tutor request to a thin proxy on our server, which forwards
  it to the provider and then discards it. It is never written to our
  database, never logged, and never shared.
- **Provider responses outside the chat.** We do not log or persist anything
  beyond what is described above. The provider you choose has its own
  privacy policy that governs how it handles your prompts.

## Where data lives

- **Supabase** (Postgres + Auth) hosted in the region you selected when you
  created the project. Row-level security policies ensure each authenticated
  user can only read or write their own rows.
- The conversation-history encryption key is set as the
  `CONVERSATIONS_ENC_KEY` environment variable on the server. Operators
  should rotate it periodically; rotated keys make older messages
  un-decryptable, which is the intended security boundary.

## Your controls

- **Export.** `Settings → Your data → Download export` returns a single JSON
  file containing all of the above (with conversation messages decrypted).
- **Delete.** `Settings → Your data → Delete my account` deletes your
  Supabase auth user. All rows in our public schema cascade with that
  delete, including tutor history. The action is immediate and cannot be
  reversed.

## Cookies

Supabase Auth uses HTTP-only cookies to track your session. We do not set
any tracking or analytics cookies.

## Contact

This is a personal project. If you have a question about your data, email
the owner at the address listed in the GitHub repository.
