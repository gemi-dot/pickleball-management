# Pickleball Management Frontend

Next.js frontend for the pickleball management platform.

## Stack

- Next.js (App Router)
- TypeScript
- Tailwind CSS
- ESLint

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create local environment variables:

```bash
cp .env.example .env.local
```

3. Start the dev server:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

- `NEXT_PUBLIC_API_BASE_URL`: Base URL for your Django API.
	- Example: `http://127.0.0.1:8000/api`

## Quality Checks

```bash
npm run lint
npm run build
```

## Working With Django Backend

Run backend and frontend in separate terminals:

- Django backend: `http://127.0.0.1:8000`
- Next.js frontend: `http://localhost:3000`

If CORS is enabled in Django, allow requests from `http://localhost:3000`.
