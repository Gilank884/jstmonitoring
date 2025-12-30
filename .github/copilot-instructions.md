# Copilot / AI Agent Instructions

Purpose: Give an AI coding agent enough precise, actionable context to be productive in this codebase.

- **Project type & build**: React app scaffolded with Vite. Run locally with `npm run dev` (uses `vite`). Build with `npm run build` and preview with `npm run preview`. Lint with `npm run lint`.

- **Entry points**: App root is `src/main.jsx` which mounts `src/App.jsx`. Routing and protected routes are defined in `src/App.jsx`.

- **Routing & pages**: Pages live under `src/pages/` and are registered inside `src/App.jsx` as children of the `Layout` route. To add a page: create `src/pages/YourPage.jsx` and add a `<Route path="yourpath" element={<YourPage/>} />` inside the `Layout` routes.

- **Authentication convention**: Lightweight client-side auth stored in `sessionStorage` under the key `isAuthenticated` (string "true"). See `src/App.jsx` — `useEffect` reads `sessionStorage.getItem('isAuthenticated')` and `handleLogin`/`handleLogout` update it. Protected routes use the `ProtectedRoute` wrapper in `src/App.jsx`.

- **Supabase integration**: Supabase client is in `src/supabaseClient.js`. The same anon key is used inside `netlify/functions/file.js` for serverless operations. Important: the code currently contains a hard-coded anon key and URL — treat these as discoverable but sensitive; if you change auth behavior, update both client and serverless usages.

- **Netlify functions**: Serverless functions live under `netlify/functions/`. Example: `netlify/functions/file.js` creates signed URLs from the `workorder` storage bucket and returns a 302 redirect to the signed URL. When modifying storage behavior, update the `bucket` string and expiry logic there.

- **API / server expectations**: `vite.config.js` proxies requests under `/api` to `http://localhost:3000` — an Express backend is expected locally for server routes. See `package.json` dependencies: `express` is present but no server file in the client repo; running end-to-end locally may require a separate server process on port `3000` or starting a local express instance.

- **Styling & design system**: Tailwind is used (`tailwindcss` + `@tailwindcss/vite`). Global styles are in `src/index.css` and components rely on utility classes. Keep responsiveness and classes consistent with existing patterns in `src/components`.

- **Components & layout**: Reusable UI lives in `src/components/` (`Header.jsx`, `Layout.jsx`, `Sidebar.jsx`, `ChatBubble.jsx`). `Layout` composes the main app shell; new pages should be injected as children to `Layout` routes to preserve the sidebar/header behavior.

- **Client-side components to note**:
  - `ChatBubble.jsx` is conditionally rendered in `src/App.jsx` only when the user is authenticated.
  - `Layout.jsx` contains the primary navigation and outlets for child pages.

- **File download flow**: The UI triggers the Netlify function which calls Supabase `createSignedUrl(path, 60)` for the `workorder` bucket and returns a redirect. If you change the download flow, update both client invocation and `netlify/functions/file.js` behavior.

- **Common patterns to follow**:
  - Keep pages under `src/pages` and components under `src/components`.
  - Use `sessionStorage` for the simple auth state (existing code expects this exact key and value).
  - When adding routes, maintain the nested route structure under `Layout` in `src/App.jsx`.

- **Dev tips & commands**:
  - Start dev server: `npm run dev`
  - Run the build: `npm run build`
  - Preview build: `npm run preview`
  - Lint code: `npm run lint`
  - Vite dev proxy: backend expected at `http://localhost:3000` for `/api` routes.

- **Where to look for related behavior / examples**:
  - Protected routing & sessionStorage: `src/App.jsx`
  - Supabase client usage: `src/supabaseClient.js`
  - Serverless signed-URL flow: `netlify/functions/file.js`
  - Project scripts & deps: `package.json`
  - Vite proxy config: `vite.config.js`

- **Do not change without caution**:
  - The Supabase anon key and URL exist in two places (`src/supabaseClient.js` and `netlify/functions/file.js`). Rotating keys or migrating must update both.
  - `sessionStorage` key `isAuthenticated` is used synchronously in `src/App.jsx` — renaming it will break auth checks.

If anything here is unclear or you'd like more detail about a specific flow (download, routing, or deployment on Netlify), tell me which area to expand and I will iterate.
