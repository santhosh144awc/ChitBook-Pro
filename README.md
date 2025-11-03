# ChitBook Pro - Chit Fund Management Application

A complete chit fund management web application built with Next.js, Firebase, and Tailwind CSS.

## Features

- 👥 **Client Management**: Full CRUD operations for clients
- 🏢 **Group Management**: Create and manage chit fund groups
- 🔗 **Memberships**: Link clients to groups with chit counts
- 🔨 **Auctions**: Track monthly auctions with automatic calculations
- 💰 **Payments**: Manage payments with status tracking
- 💳 **Bulk Payments**: Efficient bulk payment processing
- 📈 **Reports**: Comprehensive reporting and analytics
- 🔐 **Authentication**: Secure user authentication with Firebase

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- Firebase account (free tier works)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up Firebase:
   - Create a new Firebase project at https://console.firebase.google.com
   - Enable Authentication (Email/Password)
   - Create a Firestore database
   - Copy your Firebase config values

3. Create `.env.local` file:
```bash
cp .env.local.example .env.local
```

4. Add your Firebase configuration to `.env.local`

5. Set up Firestore Security Rules:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

6. Run the development server:
```bash
npm run dev
```

7. Open [http://localhost:3000](http://localhost:3000) in your browser

## Build for Production

```bash
npm run build
```

This creates a static export in the `out` directory, ready for deployment to Hostinger or any static hosting service.

## Project Structure

```
chitbook-pro/
├── app/                    # Next.js app router pages
│   ├── (auth)/            # Authentication pages
│   └── (dashboard)/       # Protected dashboard pages
├── components/             # React components
│   ├── layout/           # Layout components
│   └── ui/               # Reusable UI components
├── contexts/              # React contexts
├── lib/                   # Utilities and Firebase config
├── types/                 # TypeScript interfaces
└── public/                # Static assets
```

## Technologies Used

- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe JavaScript
- **Firebase**: Authentication and Firestore database
- **Tailwind CSS**: Utility-first CSS framework
- **react-hot-toast**: Toast notifications
- **date-fns**: Date manipulation library

## License

MIT
