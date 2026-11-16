# MySphere — Personal Productivity & Friends Platform

> *Your space. Your goals. Your growth.*

MySphere is a full-stack React + TypeScript + Firebase personal productivity workspace and friends platform featuring a MacBook-inspired Liquid Glass interface, a Fernhollow bioluminescent atmosphere, real URL routing, and real-time Firestore & Firebase Storage persistence.

---

## Core Modules

- **Dashboard**: Real-time daily productivity score, weekly Recharts area trends, habit streak counter, and upcoming deadlines.
- **Tasks**: Priority & category task manager with due dates, times, and completion timestamps.
- **Goals**: Interactive checkbox action-step tracking with automatic progress percentage (`completed / total × 100`), status states, and celebration bursts.
- **Notebook (Notes)**: Rich-text editor with `H1`/`H2`/`H3` headings, text colors, interactive checklists, bullet/numbered lists, folders (`Personal`, `College`, `Projects`, `Ideas`, `Important`, `Other`), `#tags`, pins, last-edited timestamps, and instant autosave.
- **Habits & Focus Mode**: Daily/weekly habit tracking streaks, Pomodoro & custom focus timers, and personal calendar planning.
- **Visual Journal Studio**: Canva-style page editor with 9 ready-made templates, draggable/resizable/rotatable text boxes, shapes, stickers, Firebase Storage photo uploads, backgrounds, borders, layer ordering, Undo/Redo, Drafts, and **PNG / PDF export**.
- **Wishlist**: Product cards with Firebase Storage photo uploads, prices, external links, priority/category/status (`Want`, `Planning to Buy`, `Purchased`), and purchased history.
- **Expense Tracker**: Strictly private expense logging, editable monthly budget, today/weekly/monthly spend KPIs, and interactive Recharts visualizations.
- **Friends & Challenges**: Searchable unique usernames, friend requests, shared goals, and group productivity challenges.

---

## Local Development

1. **Install dependencies**
   ```bash
   npm install
   ```
2. **Environment variables** (optional override for local or custom Firebase projects; falls back to `firebase-applet-config.json`):
   Copy `.env.example` to `.env` and fill in your `VITE_FIREBASE_*` values.
3. **Run dev server**
   ```bash
   npm run dev
   ```
4. **Type-check & build**
   ```bash
   npm run lint
   npm run build
   ```

---

## Firebase Setup Checklist

1. **Authentication**: Enable **Email/Password** (and optionally **Google**) in Firebase Console -> Authentication -> Sign-in method.
2. **Firestore Database**: Deploy `firestore.rules` (`firebase deploy --only firestore:rules` or via Firebase Console).
3. **Firebase Storage**:
   - Enable Firebase Storage in Firebase Console (`Storage -> Get started`).
   - Deploy `storage.rules` (`firebase deploy --only storage`).
   - If exporting Journal pages with uploaded photos on a custom domain (such as Vercel), configure CORS on your Storage bucket via `gsutil cors set` so cross-origin `<img>` canvas exports succeed cleanly.
4. **Authorized Domains**: Add your deployed Vercel domain (`your-app.vercel.app` and any custom domain) in **Firebase Console -> Authentication -> Settings -> Authorized domains**.

---

## Deploying to Vercel (via GitHub)

1. Push this repository to GitHub (`.env*` is already gitignored).
2. Import the repository in [Vercel](https://vercel.com/new).
3. Keep the default **Vite** preset (`Build Command: npm run build`, `Output Directory: dist`). `vercel.json` is included so direct URLs like `/wishlist`, `/expenses`, `/notes`, and `/journal` work seamlessly on refresh.
4. Add the `VITE_FIREBASE_*` environment variables from `.env.example` in **Vercel Project Settings -> Environment Variables**.
5. Deploy!
