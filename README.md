# Climbing Fail Collection

Standard Next.js app for Vercel.

## Vercel setup

1. Import this GitHub repository into Vercel with the **Next.js** framework preset.
2. In the Vercel project, create a **public Vercel Blob** store.
3. Add a Neon Postgres integration (or another Postgres database) and expose its pooled connection string as `DATABASE_URL`.
4. Confirm the Blob integration provides `BLOB_READ_WRITE_TOKEN`.
5. Deploy. The database tables are created automatically on the first request.

## Local development

Copy `.env.example` to `.env.local`, add a development Postgres URL and Blob token, then run:

```bash
npm install
npm run dev
```

Without environment variables, the original five GIFs still appear, but uploads, comments, and likes require Blob and Postgres.
