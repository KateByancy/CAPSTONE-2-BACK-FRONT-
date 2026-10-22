This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

This repository contains separate frontend and backend packages. In Vercel's
project Settings > Build and Deployment, set **Root Directory** to `Frontend`
(case-sensitive), and choose the **Next.js** framework preset. Leave Output
Directory at its framework default. `Frontend/vercel.json` configures
`npm ci --include=dev` for installation and `npm run build` for the build.

If deployment reports **No Next.js version detected**, Vercel is looking at
the wrong package directory: the repository-root `package.json` is a command
wrapper, while `Frontend/package.json` declares Next.js `16.2.10`. Set Root
Directory to `Frontend`, save, and redeploy. Root Directory is a Vercel project
setting; it cannot be set in `vercel.json`. Only `Frontend/vercel.json` is
maintained for the frontend deployment.

Use these settings relative to `Frontend`:

| Setting | Value |
| --- | --- |
| Root Directory | `Frontend` |
| Framework Preset | Next.js |
| Install Command | `npm ci --include=dev` |
| Build Command | `npm run build` |
| Output Directory | Framework default (`.next`) |

Remove any saved command overrides containing `--prefix Frontend` or an output
override of `Frontend/.next`; those paths assume the repository root. The
frontend configuration already provides the appropriate install and build
commands.

The repository-root package forwards commands to Frontend. Its `postinstall`
script now installs Frontend's locked dependencies as well, so a root-level
`npm install` prepares the frontend build. Previously, installing at the root
left Next.js missing and could cause `next: command not found` (exit code 127).
Vercel must still use `Frontend` as its Root Directory for framework detection
and output handling. Commit and push the configuration changes,
correct the Root Directory, and deploy the latest commit without the existing
build cache. Do not use `npx next` or a global Next.js install to bypass this.

Before building, set `BACKEND_API_URL=https://YOUR-BACKEND-DOMAIN/api` in the
Vercel project's environment variables. Leave `NEXT_PUBLIC_API_URL` unset to
use the existing Next.js API proxy. Rebuild after changing the backend URL.
Never put PayMongo secret keys or database passwords in this frontend project.

For the current MCIDBMS Render service, the proxy setting is
`BACKEND_API_URL=https://api-marc.onrender.com/api`. Set it in Vercel for each
environment you deploy, then redeploy; the ignored local `.env.local` does not
configure Vercel. Production defaults to this public Render service; local
development defaults to `http://localhost:5000/api`. Remove or correct any
existing Vercel override pointing to localhost or another private address.
A production localhost override now stops the build with an actionable error.
If `NEXT_PUBLIC_API_URL` is set, it
overrides the browser's use of this proxy and must also include `/api`.
The existing authentication routes are `POST /api/auth/login` and
`POST /api/auth/register`. Check the deployed frontend's Network response for
these requests, and compare `GET /api/health` through the frontend with the
Render service directly. Text/HTML errors from a host or proxy are not
authentication validation errors; record their HTTP status before investigating
Vercel or Render logs.

The frontend is `https://marcinteriorbooking.vercel.app`. Its auth requests
were confirmed to return HTTP 404 text containing `DNS_HOSTNAME_RESOLVED_PRIVATE`
before this fix. That response comes from Vercel's external rewrite, before
Express is reached. Render also rejected this frontend's Origin with HTTP 403;
the backend's existing CORS allowlist now includes this exact Vercel origin.
Deploy the backend CORS change to Render and rebuild/redeploy the frontend to
Vercel. When configuring `FRONTEND_URL` on Render, retain any needed local and
custom-domain origins as a comma-separated list and include the HTTPS Vercel
origin. These changes do not depend on the custom domain's maintenance ending.

This deploys the frontend only. The Express backend and database must also be
hosted and reachable for login, bookings, and payments to work. The PayMongo
webhook is `https://YOUR-BACKEND-DOMAIN/api/payment/webhook`; publishing the
frontend does not create that backend endpoint. Until the backend is hosted,
the landing page can deploy, but API-dependent features will not work.
See [the payment deployment guide](../Backend/PAYMENT_DEPLOYMENT.md).

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
