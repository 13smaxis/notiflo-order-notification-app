---
schema: clarification-answers/v1
status: draft
generated_at: "2026-10-06T19:09:47.896Z"
scope: [frontend, backend, generic]
questions_file: clarification-questions.json
---

# Rearchitecture Clarification Answers

> DRAFT — the user has not submitted yet. Do NOT consume these answers.

## 🖥️ Frontend

- **F1** Which frontend framework and major version should this auth UI use? The project profile identifies React; confirm whether to retain its current major version or specify another target.
  - answer: React; preserve the current major version (exact major not supplied)
  - source: user
- **F2** Which component library should the signup/sign-in UI use? You can preserve the existing project UI/component approach or name a target library.
  - answer: Preserve the existing project UI/component approach
  - source: user
- **F3** Provide a screenshot, recording, or design URL for the in-scope account, checkout, and order-history auth UI, or state that no visual reference is required and the existing UI should be followed.
  - answer: no visual reference is required and the existing UI should be followed
  - source: user
- **F4** What design system or design-token source should govern the auth UI? Provide a link/path or confirm the default of matching the existing UI using its CSS custom properties.
  - answer: match the existing UI using its CSS custom properties
  - source: user
- **F5** Which accessibility standard should the auth flows target?
  - answer: WCAG 2.1 AA
  - source: user
- **F6** Which browser/runtime compatibility target should be used?
  - answer: modern evergreen (Chrome, Firefox, Safari, Edge — latest 2 major versions)
  - source: user
- **F7** What responsive strategy should the auth UI follow?
  - answer: mobile-first using existing breakpoints detected from codebase
  - source: user
- **F8** Which locales are in scope for the auth UI?
  - answer: preserve current locales; keep existing i18n library if present
  - source: user
- **F9** What client-side state-management approach should the auth flows use?
  - answer: preserve existing pattern if identifiable; otherwise recommend minimal (component state + server-state library)
  - source: user
- **F10** What routing approach should the auth flows use?
  - answer: use the de-facto router for the chosen target framework
  - source: user

## ⚙️ Backend

- **B1** Which backend framework and major runtime version should the auth API use? The project profile identifies Node.js/Express; confirm preserving the current versions or specify another target.
  - answer: Node.js/Express; exact major versions not supplied
  - source: user
- **B2** What API contract policy should apply while replacing OTP endpoints with password-auth endpoints?
  - answer: must preserve
  - source: user
- **B3** Which database migration approach should the trigger and profile changes use?
  - answer: in-place; replace public.handle_new_user while preserving the existing trigger
  - source: user
- **B4** Which authentication system should own credentials and which app-session behavior should be retained?
  - answer: Supabase Auth owns credentials; app issues signed sessions including customer_id
  - source: user
- **B5** What latency, throughput, or availability targets should the auth API meet?
  - answer: match current production baseline; no regression
  - source: default applied

## 📋 General

- **G1** What outcome and verification evidence define successful completion?
  - answer: Implement the approved cellphone/password signup and sign-in flows with trigger-owned customer/profile linking and customer-linked sessions; focused backend node:test coverage and frontend build must pass. Preserve other required behavior and do not access remote Supabase or expose secrets.
  - source: user
- **G2** Confirm the explicit scope exclusions and preservation constraints, or add any others.
  - answer: Exclude notiflo-order-notification-app; do not apply a remote Supabase migration, expose secrets, or leave a dev server running; preserve existing edits in CustomerHeader.tsx and HomePage.tsx.
  - source: user
- **G3** What must-pass policy applies to the existing tests and requested frontend build?
  - answer: Backend tests and frontend build are explicitly required to run
  - source: user
- **G5** List any additional requirements, exclusions, dependencies, compliance rules, or operational constraints not already captured above.
  - answer: None beyond the decisions listed in this specification.
  - source: user
