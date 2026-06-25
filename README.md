# UniMarket MUT 🎓

A full-stack student marketplace for Mangosuthu University of Technology. Students can buy, sell, message each other, and leave reviews — with an NLP-powered chatbot to help find items.

---

## Tech Stack

- **Backend:** Node.js + Express
- **Database:** PostgreSQL
- **Frontend:** HTML, CSS, Vanilla JavaScript
- **AI Feature:** NLP-powered recommendation chatbot (keyword extraction + intent detection)
- **Auth:** Session-based authentication with bcrypt password hashing
- **File Uploads:** Multer

---

## Project Structure

```
unimarket/
├── server.js               # Main entry point
├── package.json
├── .env.example            # Environment variables template
├── config/
│   ├── db.js               # PostgreSQL connection
│   └── schema.sql          # Database schema + seed data
├── routes/
│   ├── auth.js             # Register / Login / Logout
│   ├── listings.js         # CRUD for listings
│   ├── messages.js         # Messaging between students
│   ├── reviews.js          # Ratings and reviews
│   ├── users.js            # User profiles
│   └── chatbot.js          # NLP chatbot API
├── middleware/
│   └── auth.js             # Session auth middleware
└── public/
    ├── css/style.css       # Global stylesheet
    ├── js/utils.js         # Shared frontend utilities
    ├── index.html          # Homepage
    ├── login.html          # Login page
    ├── register.html       # Registration page
    ├── listings.html       # Browse listings
    ├── listing-detail.html # Single listing view
    ├── sell.html           # Post a listing
    ├── messages.html       # Messaging
    ├── dashboard.html      # User dashboard
    └── 404.html            # 404 error page
```

---

## Setup Instructions

### 1. Prerequisites
- Node.js (v18+)
- PostgreSQL (v14+)

### 2. Clone and Install

```bash
git clone <your-repo-url>
cd unimarket
npm install
```

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your PostgreSQL credentials:

```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=unimarket
DB_USER=postgres
DB_PASSWORD=yourpassword
SESSION_SECRET=any_random_secret_string
PORT=3000
```

### 4. Set Up the Database

Open PostgreSQL and run:

```sql
CREATE DATABASE unimarket;
```

Then run the schema:

```bash
psql -U postgres -d unimarket -f config/schema.sql
```

### 5. Create Upload Directory

```bash
mkdir -p public/images/uploads
```

### 6. Start the Server

```bash
npm start
```

Or for development with auto-reload:

```bash
npm run dev
```

Open your browser at: **http://localhost:3000**

---

## Features

| Feature | Description |
|---|---|
| 🔐 Authentication | Register/Login with student number, email, and password |
| 📦 Listings | Post, browse, filter, and manage items for sale |
| 💬 Messaging | Real-time-style chat between buyers and sellers |
| ⭐ Reviews | Rate and review sellers after transactions |
| 🤖 NLP Chatbot | UniBot finds items based on natural language input |
| 🔍 Search & Filter | Filter by category, price, condition, and sort order |
| 📱 Responsive | Works on mobile, tablet, and desktop |
| 🛡 Security | Input validation, hashed passwords, session protection |

---

## API Endpoints

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | /api/auth/register | Register new student |
| POST | /api/auth/login | Login |
| POST | /api/auth/logout | Logout |

### Listings
| Method | Endpoint | Description |
|---|---|---|
| GET | /api/listings | Get all listings (with filters) |
| GET | /api/listings/:id | Get single listing |
| POST | /api/listings | Create listing (auth required) |
| PUT | /api/listings/:id | Update listing (owner only) |
| DELETE | /api/listings/:id | Delete listing (owner only) |

### Messages
| Method | Endpoint | Description |
|---|---|---|
| GET | /api/messages/conversations | Get all conversations |
| GET | /api/messages/:userId | Get messages with a user |
| POST | /api/messages | Send a message |
| GET | /api/messages/unread/count | Get unread count |

### Reviews
| Method | Endpoint | Description |
|---|---|---|
| GET | /api/reviews/:userId | Get user's reviews |
| POST | /api/reviews | Submit a review |

### Chatbot
| Method | Endpoint | Description |
|---|---|---|
| POST | /api/chatbot | Send message to NLP bot |

---

## Group Members

| Name | Student Number | Role |
|---|---|---|
| | | |
| | | |
| | | |

---

## Lecturer
Submit to GitHub and invite **xpiyose** as a collaborator.

---

*Built for ITNP300/ITPR300 — Internet Programming 2 · Mangosuthu University of Technology · 2025*
