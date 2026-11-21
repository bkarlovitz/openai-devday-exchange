import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  Link,
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { RegistryProvider } from "@effect-atom/atom-react";
import { BrandMark } from "@council/ui";
import { SubmissionPage } from "./routes/index";
import { SavedSubmissionPage } from "./routes/runs.$runId";
import "./styles.css";
import "@council/ui/theme.css";

const rootRoute = createRootRoute({
  component: () => (
    <>
      <header className="site-header">
        <Link to="/" className="brand">
          <BrandMark /> Fact Check
        </Link>
      </header>
      <Outlet />
    </>
  ),
  notFoundComponent: () => (
    <main className="page">
      <h1>Page not found</h1>
      <Link to="/">New submission</Link>
    </main>
  ),
});
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: SubmissionPage,
});
const runRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/runs/$runId",
  component: SavedSubmissionPage,
});
const router = createRouter({ routeTree: rootRoute.addChildren([indexRoute, runRoute]) });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RegistryProvider>
      <RouterProvider router={router} />
    </RegistryProvider>
  </StrictMode>,
);
