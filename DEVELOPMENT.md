# Frontend development and production deployment

## Local development

Start the React Router development server in Docker:

```bash
docker compose -f compose.dev.yml up --build
```

Open `http://localhost:5173`. By default the browser API URL is
`http://localhost:3001`; start the API and isolated database with
`../cms-back/compose.dev.yml`. Override `DEV_VITE_API_URL` if the API uses a
different address.

The development stack uses separate container names and does not connect to
the production Docker network or volumes.

## Branch and deployment flow

- Push changes to `dev` for CI validation only.
- Merge `dev` into `main` after the workflow succeeds.
- A push to `main` syncs this repository to `/data/cms-front` and rebuilds only
  the `frontend` service using `/data/cms-back/compose.yml`.

Register an online self-hosted Linux x64 Actions runner for this repository or
for the GitHub organization. The runner account must be able to write to
`/data/cms-front`, run Docker Compose, and use `rsync`. CI validation runs on a
GitHub-hosted runner; only deployment runs on the production server runner.
Deployment does not remove the server `.env` file or Docker volumes.
