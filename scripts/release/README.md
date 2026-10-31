# Hosted builds and manual production approval

This repository builds on GitHub-hosted Ubuntu / Node 24. `dev` and pull requests verify only. A successful `main` run publishes the tested Docker image as an unapproved Release candidate. Production approval is a separate **Approve production** workflow: copy the build tag from the CI summary, choose `main`, and approve that existing candidate. Approval does not rebuild.

The production server checks approved releases every five minutes and downloads one changed component at a time, capped at 1 MiB/s. Frontend replacement never recreates the API or PostgreSQL services. No environment secrets or CV files are published with the image. The Docker build uses the public production API URL as a build argument; runtime secrets stay on the server.

`release.py` is identical to the backend's `scripts/deployment/release.py`; the complete server setup and rollback documentation is in the backend's `scripts/deployment/README.md`.
