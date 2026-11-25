# Ad-Agent frontend

React, TypeScript, and Vite power the local investigation console. The overview opens a real sample incident. The incident timeline, run inspector, and detector comparison use the Flask investigation API.

## Develop locally

Start the backend with `python backend/server.py` from the project root using the console environment. See the [project setup](../README.md). In a second terminal, run these commands from this frontend directory.

```sh
npm ci
npm run dev
```

Open the address Vite prints, normally [localhost:5173](http://localhost:5173/). Vite proxies `/api` to the investigation backend on port 8000. The older research screens use `VITE_API_BASE_URL` in development and default to the same backend port.

## Build and check

```sh
npm run build
npm run test:browser
```

Flask serves the production build and APIs together at [127.0.0.1:8000](http://127.0.0.1:8000/). The browser test starts a temporary API, worker, and database and drives the built app at desktop and mobile sizes. It requires the project Python environment and a Chromium executable. If the Playwright browser is missing, run `npx playwright-core install chromium`, or set `PLAYWRIGHT_EXECUTABLE_PATH` to an installed Chromium executable.
