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

Configure the same four GitHub Actions repository secrets listed in
`cms-back/DEVELOPMENT.md` in this repository before merging a production
deployment: `PROD_SERVER_HOST`, `PROD_SERVER_USER`, `PROD_SSH_PRIVATE_KEY`, and
`PROD_SSH_KNOWN_HOSTS`. Production deployment uses SSH on port 22 and does not
remove server `.env` files or Docker volumes.
