# Expense Tracker

A modern expense tracking web app built with **React + Vite**, powered by **Firebase Authentication** and **Cloud Firestore**.  
Supports monthly budgets, multi-currency expenses with historical exchange rates, and optional push notifications.

---

## ✨ Features

- 🔐 Authentication
  - Email & password
  - Google Sign-In
  - Password reset email
  - Change password (email users only)

- 💸 Expenses
  - Add, edit, delete expenses
  - Category-based organization
  - Multi-currency support
  - Automatic conversion using the **exchange rate of the expense day**

- 📊 Dashboard
  - Monthly totals
  - Category breakdown with charts
  - Monthly budget with over/under tracking

- ⚙️ Settings
  - Base currency selection
  - Push notification management
  - Account info & password update

- 📱 UX
  - Keyboard shortcuts (Enter = save, Esc = cancel)
  - Mobile-friendly layout
  - Offline-aware UI

---

## 🧱 Tech Stack

- **Frontend**
  - React + TypeScript
  - Vite
  - CSS Modules
- **Backend / Services**
  - Firebase Authentication
  - Cloud Firestore
- **Optional**
  - Express + Web Push server for notifications
- **Hosting**
  - Firebase Hosting (free tier)

---

## 📦 Requirements

- Node.js **18+**
- Firebase project with:
  - Authentication enabled
  - Cloud Firestore enabled

---

## 🚀 Local Setup

### 1️⃣ Install dependencies
```bash
npm install
```

### 2️⃣ Environment variables

Create a .env file from the template:

```bash
cp .env.example .env
```

Fill in all required values.

```bash
VITE_FIREBASE_API_KEY=your_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXX

# Optional (push server)
VITE_PUSH_SERVER_BASE_URL=https://your-push-server.example.com
```

### 🧪 Run Locally

```bash
npm run dev
```

Open:

```bash
http://localhost:5173
```

### 🏗️ Build & Preview

```bash
npm run build
npm run preview
```

---

## ☁️ Deploy to Firebase Hosting

### 1️⃣ Login & initialize

```bash
firebase login
firebase init hosting
```

- Public directory: dist
- Configure as SPA: Yes

### 2️⃣ Build & deploy

```bash
npm run build
firebase deploy
```

Your app will be available at:

```cpp
https://<project-id>.web.app
```

---

## 🔐 Firestore Security Rules (Required)

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

    match /profiles/{uid} {
      allow read, write: if signedIn() && request.auth.uid == uid;
    }

    match /categories/{id} {
      allow create: if isOwnerOnCreate();
      allow read, update, delete: if isOwner();
    }

    match /expenses/{id} {
      allow create: if isOwnerOnCreate();
      allow read, update, delete: if isOwner();
    }

    match /budgets/{id} {
      allow create: if isOwnerOnCreate();
      allow read, update, delete: if isOwner();
    }
  }
}
```

---

## 🔔 Push Notifications (Optional)

The frontend can connect to an external Express + Web Push server.

If used:

- The push server must be deployed separately
- Uses VAPID keys
- Subscriptions are stored server-side per user

Example environment for push server:

```env
PORT=8080
VAPID_SUBJECT=mailto:you@example.com
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
```

---

## 📱 Mobile Support

- Responsive layout
- Optimized input sizes
- Touch-friendly buttons
- Works as a PWA when installed

--- 

## 🧾 Versioning

The app version is read from package.json and displayed in Settings.

---

## 📄 License

This project is licensed under the **MIT License**.  
See the [LICENSE](./LICENSE) file for details.

---

## 👤 Author

Alessandro Han

Computer Science, University of Pisa

LinkedIn: https://www.linkedin.com/in/alessandro-han-b87391223/
