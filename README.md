# Expense Tracker

A modern expense tracking web app built with **React + Vite**, powered by **Firebase Authentication** and **Cloud Firestore**.  
Supports monthly budgets, multi-currency expenses with historical exchange rates, and optional push notifications.

---

## Features

- Authentication
  - Email & password
  - Google Sign-In
  - Password reset email
  - Change password (email users only)

- Expenses
  - Add, edit, delete expenses
  - Category-based organization
  - Multi-currency support
  - Automatic conversion using the **exchange rate of the expense day**

- Dashboard
  - Monthly totals
  - Category breakdown with charts
  - Monthly budget with over/under tracking

- Settings
  - Base currency selection
  - Push notification management
  - Account info & password update

- UX
  - Keyboard shortcuts (Enter = save, Esc = cancel)
  - Mobile-friendly layout
  - Offline-aware UI

---

## Tech Stack

- **Frontend**
  - React + TypeScript
  - Vite
  - CSS Modules
- **Backend / Services**
  - Firebase Authentication
  - Cloud Firestore
  - Express + Web Push server for notifications
- **External APIs**
  - Frankfurter FX API (`https://api.frankfurter.dev/v1`) for exchange rates
- **Hosting**
  - Firebase Hosting (free tier)

---

## Repository Structure

This repository is organized as a small monorepo:

- `src/` contains the React frontend
- `server/` contains the Express + Web Push backend

The frontend also works without the push server, but push notifications require the backend to be running.

---

## Requirements

- Node.js **20.19+** (or **22.12+**)
- Firebase project with:
  - Authentication enabled
  - Cloud Firestore enabled
  - Email/password provider enabled
  - Google provider enabled if you want to use Google Sign-In

---

## Test Access

- Test account:
  - email: `test@test.test`
  - password: `123456`
- You can also create a new account directly from the Login page using email and password
- Sign-in with Google is also available
- Password reset and password change features require a valid email/password account

---

## Local Setup

### 1. Install frontend dependencies
```bash
npm install
```

### 2. Configure frontend environment

Create a `.env.local` file in the project root:

```bash
touch .env.local
```

Fill in all required values.

```bash
VITE_FIREBASE_API_KEY=your_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
```

### 3. Run the frontend

```bash
npm run dev
```

Open:

```bash
http://localhost:5173
```

### 4. Build and preview the frontend

```bash
npm run build
npm run preview
```

### 5. Run the push server for notifications

Install backend dependencies:

```bash
cd server
npm install
```

Create `server/.env`:

```env
PORT=8080
VAPID_SUBJECT=mailto:you@example.com
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
```

Run the backend:

```bash
npm run dev
```

The push server runs on:

```bash
http://localhost:8080
```

The frontend expects this URL in `src/features/notifications/push.service.ts`.

---

## Deploy to Firebase Hosting

### 1. Login and initialize

```bash
firebase login
firebase init hosting
```

- Public directory: dist
- Configure as SPA: Yes

### 2. Build and deploy

```bash
npm run build
firebase deploy
```

Your app will be available at:

```cpp
https://<project-id>.web.app
```

---

## Firestore Security Rules (Required)

Each document is owned by a user (userId field).

```js
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    function signedIn() {
      return request.auth != null;
    }

    function isOwner() {
      return signedIn() && request.auth.uid == resource.data.userId;
    }

    function isOwnerOnCreate() {
      return signedIn() && request.auth.uid == request.resource.data.userId;
    }

    function keepsSameOwner() {
      return request.resource.data.userId == resource.data.userId;
    }

    match /profiles/{uid} {
      allow read, write: if signedIn() && request.auth.uid == uid;
    }

    match /categories/{id} {
      allow create: if isOwnerOnCreate();
      allow read, delete: if isOwner();
      allow update: if isOwner() && keepsSameOwner();
    }

    match /expenses/{id} {
      allow create: if isOwnerOnCreate();
      allow read, delete: if isOwner();
      allow update: if isOwner() && keepsSameOwner();
    }

    match /budgets/{id} {
  		allow create: if isOwnerOnCreate()
    		&& id == request.auth.uid + '_' + request.resource.data.month;
  		allow read: if signedIn()
    		&& (id.matches('^' + request.auth.uid + '_.*$') || isOwner());
  		allow delete: if isOwner();
  		allow update: if isOwner() 
      	&& keepsSameOwner()
    		&& id == resource.data.userId + '_' + resource.data.month
    		&& id == request.resource.data.userId + '_' + request.resource.data.month;
		}
  }
}
```

---

## Push Notifications

Push notifications are handled by the Express + Web Push server in `server/`.
The rest of the app still works even if the backend is not running, but notification subscribe/test/alert features require it.

Note: the push server base URL is currently hardcoded in
`src/features/notifications/push.service.ts` as:

```ts
const PUSH_SERVER_URL = 'http://localhost:8080';
```

If you deploy the push server remotely, update that value accordingly.

If used:

- The push server must be deployed separately
- Uses VAPID keys
- Subscriptions are stored server-side per user
- The backend keeps subscriptions in memory, so restarting the server clears them
- After a push server restart, you may need to enable notifications again from Settings to re-sync the browser subscription

Example environment for push server:

```env
PORT=8080
VAPID_SUBJECT=mailto:you@example.com
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
```

---

## Mobile Support

- Basic responsive layout
- Input controls are usable on small screens
- Core pages are primarily optimized for desktop
- Works as a PWA when installed

--- 

## Versioning

The app version is read from package.json and displayed in Settings.

---

## License

This project is licensed under the **MIT License**.  
See the [LICENSE](./LICENSE) file for details.

---

## Author

Alessandro Han

Computer Science, University of Pisa

LinkedIn: https://www.linkedin.com/in/alessandro-han-b87391223/
