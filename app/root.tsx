import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import { ClerkProvider, useAuth } from "@clerk/react-router";
import { rootAuthLoader } from "@clerk/react-router/ssr.server";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import type { Route } from "./+types/root";
import "./app.css";
import { Analytics } from "@vercel/analytics/react";
import { GlobalAlertBanner } from "./components/global-alert-banner";
import { CompanyOfferNotifications } from "./components/company-offer-notifications";
import * as Sentry from "@sentry/react";
import { initializeSentryClient } from "./lib/sentry.client";
import { useEffect } from "react";
import { Toaster } from "sonner";
import "number-flow";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

export async function loader(args: Route.LoaderArgs) {
  return rootAuthLoader(args);
}
export const links: Route.LinksFunction = () => [
  // DNS prefetch for external services
  { rel: "dns-prefetch", href: "https://fonts.googleapis.com" },
  { rel: "dns-prefetch", href: "https://fonts.gstatic.com" },
  { rel: "dns-prefetch", href: "https://api.convex.dev" },
  { rel: "dns-prefetch", href: "https://clerk.dev" },

  // Preconnect to font services
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },

  // Font with display=swap for performance
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },

  // Preload critical assets
  {
    rel: "preload",
    href: "/rsk.png",
    as: "image",
    type: "image/png",
  },
  {
    rel: "preload",
    href: "/favicon.png",
    as: "image",
    type: "image/png",
  },
  // Preload brand logos for light/dark to avoid layout shift
  {
    rel: "preload",
    href: "/betav1-light.png",
    as: "image",
    type: "image/png",
  },
  {
    rel: "preload",
    href: "/betav1-dark.png",
    as: "image",
    type: "image/png",
  },

  // Icon
  {
    rel: "icon",
    type: "image/png",
    href: "/favicon.png",
  },
];

export const meta: Route.MetaFunction = () => [
  { title: "Quickbuck — Play the markets" },
  {
    name: "description",
    content:
      "Compete on leaderboards, trade stocks and crypto, and grow your portfolio in Quickbuck.",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
        {/* Set initial theme before paint to prevent FOUC */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var t=localStorage.getItem('theme');var m=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches;var d=(t==='dark'||(!t&&m));var c=document.documentElement.classList;c.toggle('dark',d);}catch(e){}})();",
          }}
        />
        <script
          src="//unpkg.com/react-grab/dist/index.global.js"
          crossOrigin="anonymous"
          data-enabled="true"
        ></script>
      </head>
      <body>
        <Analytics />
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

function AppContent({ loaderData }: Route.ComponentProps) {
  // Initialize Sentry on client-side only
  useEffect(() => {
    // Only run on client side
    if (typeof window !== "undefined") {
      initializeSentryClient();
    }
  }, []);

  return (
    <ClerkProvider
      loaderData={loaderData}
      signUpFallbackRedirectUrl="/"
      signInFallbackRedirectUrl="/"
    >
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <GlobalAlertBanner />
        <CompanyOfferNotifications />
        <Toaster />
        <Outlet />
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}

export default Sentry.withErrorBoundary(AppContent, {
  fallback: (
    <main className="pt-16 p-4 container mx-auto">
      <h1>Application Error</h1>
      <p>
        We're sorry, but something went wrong. Our team has been notified and
        will investigate.
      </p>
    </main>
  ),
});

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
