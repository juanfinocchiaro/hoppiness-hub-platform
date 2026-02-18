# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## App version badge (global)

The app includes a global badge (bottom-right) rendered from `src/App.tsx` that shows:

- `Version: <value>` from `import.meta.env.VITE_APP_VERSION`
- Fallback to `package.json` version when `VITE_APP_VERSION` is not defined
- Optional date from `import.meta.env.VITE_APP_BUILD_DATE`

### Deploy configuration

Set these environment variables in your deploy/build pipeline:

- `VITE_APP_VERSION` (recommended: git short hash)
- `VITE_APP_BUILD_DATE` (optional)

Example in CI/CD (Linux runner):

```sh
export VITE_APP_VERSION="$(git rev-parse --short HEAD)"
export VITE_APP_BUILD_DATE="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
npm ci
npm run build
```

Example in GitHub Actions:

```yaml
- name: Build
  run: npm run build
  env:
    VITE_APP_VERSION: ${{ github.sha }}
    VITE_APP_BUILD_DATE: ${{ github.run_started_at }}
```

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
