import {
  type RouteConfig,
  index,
  layout,
  route,
} from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("sign-in/*", "routes/sign-in.tsx"),
  route("sign-up/*", "routes/sign-up.tsx"),
  route("success", "routes/success.tsx"),
  route("leaderboard", "routes/leaderboard.tsx"),
  route("marketplace", "routes/marketplace.tsx"),
  route("stocks", "routes/stocks.tsx"),
  route("stock/:companyId", "routes/stock.$companyId.tsx"),
  layout("routes/dashboard/layout.tsx", [
    route("dashboard", "routes/dashboard/index.tsx"),
    route("accounts", "routes/dashboard/accounts.tsx"),
    route("transfers", "routes/dashboard/transfers.tsx"),
    route("transactions", "routes/dashboard/transactions.tsx"),
    route("loans", "routes/dashboard/loans.tsx"),
    route("companies", "routes/dashboard/companies.tsx"),
    route("company/:companyId", "routes/dashboard/company.$companyId.tsx"),
  ]),
] satisfies RouteConfig;
