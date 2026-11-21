# Company web application stack

These are Uwchlan's agreed technology choices for new web applications. Use each service where its capability is needed; this is not a requirement to add billing, email, or file storage to every product. Existing projects adopt changes deliberately rather than automatically migrating when this document changes.

| Area | Standard |
| --- | --- |
| Language | TypeScript with strict checking |
| Tooling | Node.js and npm; npm workspaces when the project has multiple packages |
| Hosting | Cloudflare Workers; Node is the development/tooling runtime, not the deployed Workers runtime |
| Infrastructure | Alchemy |
| Frontend | React SPA built with Vite |
| Routing | TanStack Router for navigation and URL state |
| Application state/data | Effect Atom; do not add TanStack Query as a parallel data layer by default |
| Application logic | Effect |
| Contracts and validation | Effect Schema; do not introduce Zod for application-owned validation |
| HTTP API | Hono as a thin transport layer around Effect application logic |
| UI | Tailwind CSS, shadcn/ui, Radix primitives, Lucide icons |
| Authentication | Better Auth, with Organizations where organizational membership is needed |
| Relational data | Neon PostgreSQL through Cloudflare Hyperdrive, accessed with Drizzle |
| File storage | Cloudflare R2 |
| Transactional email | Resend |
| Payments | Stripe |
| Linting and formatting | Oxlint and Oxfmt |
| Tests | Vitest and Playwright |

Prefer the Effect ecosystem where it meets the need. Other dependencies should provide a distinct capability rather than duplicate Effect's state, validation, or application-logic facilities. Third-party internal dependencies are not application migration targets.

Select compatible supported package versions when creating a project and commit the npm lockfile. Do not copy old versions or project-specific dependency patches from a reference application by default. Alchemy and the application may require different compatible Effect versions; keep tooling dependencies isolated when needed.

Record an approved project exception beside the local copy of these standards, with its reason. Surface a concrete incompatibility before substituting technology. This document selects the stack; yook and project instructions govern engineering workflows, verification, and delivery authority.
