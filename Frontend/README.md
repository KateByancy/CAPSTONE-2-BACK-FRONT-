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

This deploys the frontend only. The Express backend and database must also be
hosted and reachable for login, bookings, and payments to work. The PayMongo
webhook is `https://YOUR-BACKEND-DOMAIN/api/payment/webhook`; publishing the
frontend does not create that backend endpoint. Until the backend is hosted,
the landing page can deploy, but API-dependent features will not work.
See [the payment deployment guide](../Backend/PAYMENT_DEPLOYMENT.md).

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
