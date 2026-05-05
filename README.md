# Student Registration Reconciliation

This project is a Next.js App Router application for reconciling system-generated semester registration data against paper registration forms.

## What The App Does

- Uploads a semester intersection workbook in Excel format.
- Creates a saved workspace for each uploaded sheet and restores it from local storage after refresh.
- Lets an operator search students by ID or name with debounced search.
- Displays every semester course for the selected student so the operator can mirror the paper form with checkboxes.
- Compares paper selections against the system workbook and tracks `Pending`, `Match`, and `Conflict` states.
- Exports an Excel reconciliation report with student identity, status, and course mismatches.

## Stack

- Next.js App Router
- React 18
- Tailwind CSS
- Web Worker based Excel parsing with `xlsx`
- Client-side workspace persistence with local storage

## Keyboard Workflow

- `Arrow Up / Arrow Down`: move through the visible student queue.
- `Enter`: open the highlighted student and focus the course checklist.
- `Tab`: move between course checkboxes.
- `Space`: toggle the focused course checkbox.
- `Ctrl+S` / `Cmd+S`: save the current student review and focus the search field.

## Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Quality Checks

```bash
npm run lint
npm run build
```

## Production Build

```bash
npm run build
npm run start
```

## Deploy To Vercel

1. Push the repository to GitHub, GitLab, or Bitbucket.
2. Import the repository in Vercel.
3. Keep the detected framework preset as `Next.js`.
4. Leave the default build command as `npm run build`.
5. Deploy.

The app is fully client-side for parsing, review state, and export, so no external database or custom Vercel configuration is required.