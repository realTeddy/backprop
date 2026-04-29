# Backprop PWA installability design

## Problem

Backprop should be installable as a Progressive Web App without taking on offline-first scope. The installed experience should expose a visible install promotion on the homepage and reopen the learner's last in-app route when they launch the installed app again.

## Goals

- Make Backprop installable on browsers that support manifest-based PWA installation.
- Add a visible install surface on the public homepage.
- Support manual install guidance on iPhone and iPad.
- Reopen the last signed-in app route on installed launches when a safe route is available.

## Non-goals

- Offline caching or offline-first behavior.
- Background sync, push notifications, or app shortcuts.
- Restoring arbitrary in-memory UI state beyond the route and data the app already persists.

## Recommended approach

Use Next.js App Router's native metadata and manifest support instead of a PWA plugin. Add a lightweight homepage install card, generated app icons, and a dedicated launch-resume route. Keep the implementation narrowly focused on installability and launch behavior.

## Implementation refinements

The implementation refined a few details during review without changing the core scope:

- expose both `192x192` and `512x512` generated manifest icons and keep the manifest colors aligned with the dark Backprop theme.
- add early `beforeinstallprompt` capture, persistent dismissal state, and modern iPadOS detection so the homepage install card behaves consistently across reloads and platforms.
- protect `/launch` with the same graceful missing-Supabase-config behavior as the rest of the authenticated app.

## Architecture

### PWA metadata

- Add `app/manifest.ts` with the install metadata:
  - `name` and `short_name` for Backprop.
  - `description` matching the existing product copy.
  - `start_url` pointing to a dedicated launch route.
  - `display: "standalone"`.
  - `theme_color` and `background_color`.
  - icon entries for install surfaces.
- Update `app/layout.tsx` metadata to include:
  - manifest linkage.
  - Apple web app metadata.
  - icon metadata aligned with the generated assets.

### Generated icons

- Add generated icon assets using Next.js metadata file conventions so the repo does not need hand-authored binary assets for this first pass.
- The icon should be a simple Backprop-branded mark suitable for 192px, 512px, and Apple install surfaces.

### Launch resume flow

- Set the manifest `start_url` to a dedicated launch route such as `/launch`.
- Add a small client-side tracker in the authenticated app shell that records the latest signed-in route in `localStorage`.
- On installed launch, the launch route reads the saved route and redirects to it when it is valid.
- Fall back to `/dashboard` when there is no saved route or the saved route is unsafe or stale.

## Components and data flow

### Homepage install card

Add a client component near the existing homepage call-to-action buttons.

The component should:

- listen for `beforeinstallprompt` in Chromium-class browsers.
- save the deferred prompt event until the user clicks the install button.
- hide itself when the app is already running in standalone mode.
- render manual "Add to Home Screen" guidance on iPhone and iPad.
- avoid rendering a dead install button when the browser has not exposed an install prompt.

### Last-route tracker

Add a small client helper under the signed-in app layout that watches navigation changes and records the current in-app path. The tracker should only store internal Backprop routes and should not persist external URLs.

### Launch route

Add a dedicated route that exists to resume the installed session launch. It should:

- redirect signed-out users through the existing auth flow.
- read the saved route on the client after hydration.
- validate that the saved route is an internal application route.
- navigate to the saved route or `/dashboard`.
- fall back to the normal post-login entry flow when the user was signed out before launch; preserving a pre-login resume target is out of scope for this pass.

## Platform behavior and error handling

- Chromium browsers should show a real install button only when `beforeinstallprompt` is available.
- Safari on iPhone and iPad should show manual installation instructions instead of a button because there is no programmable install prompt.
- A saved resume route must be treated as untrusted input and ignored when it is malformed, external, or otherwise unsupported.
- Existing protected-route redirects remain the source of truth for auth checks.
- Dismissing the install prompt should not break the page; the UI can fall back to neutral guidance until the browser offers the prompt again.

## Testing

- Add unit tests for route validation and fallback behavior in the launch-resume logic.
- Add component tests for the homepage install card states:
  - install prompt available.
  - iOS manual install guidance.
  - standalone/already installed mode hidden.
- Rely on the repository's existing lint, typecheck, build, and test commands for project-level validation.

## Notes

- Current browser guidance allows installability from manifest-based criteria; this design intentionally does not add a service worker because offline support is out of scope.
- Reopening the last route is not the same as restoring unsaved in-memory UI state. Backprop's existing persisted auth and tutor-history behavior continues to provide deeper resume behavior where that data already exists.
