# Smart Roster Management System

A full-stack employee roster management application built for managing employee schedules across multiple brands, processes, and operational pods. It helps operations teams generate monthly rosters, manage employee availability, allocate resources, and identify scheduling conflicts.

## Overview

The Smart Roster Management System was developed as part of the DataStraw Tech Internship Assessment.

The application supports roster planning for a team of 30+ employees while considering brand-specific operational requirements, employee assignments, weekly offs, leaves, holidays, and availability.

The goal is to make monthly roster planning more structured, reduce manual scheduling effort, and help identify staffing gaps before they affect operations.

## Features

### Team & Resource Management
- Manage employees and their status.
- Organize employees into operational pods.
- Manage pod leads.
- Manage brands and operational processes.
- Configure employee assignments across brands and processes.

### Scheduling Configuration
- Configure operating rules for each brand-process combination.
- Define minimum staffing requirements.
- Manage employee weekly offs.
- Track employee availability.
- Manage planned leaves, sick leaves, and comp-offs.
- Configure public holidays.

### Monthly Roster Generation
- Generate monthly rosters for the team.
- Account for employee assignments and operational rules.
- Consider weekly offs, holidays, leave, and availability.
- Maintain roster versions.

### Roster Views
View schedules at different levels:
- Company-wide
- Pod-wise
- Brand-wise
- Process-wise
- Employee-wise

### Validation & Conflict Detection
- Identify insufficient staffing and coverage gaps.
- Detect scheduling conflicts.
- Validate roster changes.
- Revalidate schedules after manual allocation changes.

### Manual Editing & Management
- Edit employee process allocations.
- Validate the impact of allocation changes.
- Review detected conflicts.
- Filter and search roster data.
- Navigate roster records using pagination.

### Export
- Export roster data to CSV.

## Technology Stack

### Frontend
- React 19
- Vite
- JavaScript
- Tailwind CSS 4
- React Router
- Axios
- Lucide React

### Backend
- Node.js
- Express 5
- JavaScript
- REST API

### Database & ORM
- PostgreSQL
- Prisma ORM 6

### Development Tools
- Git & GitHub
- npm
- VS Code
  
## Project Structure

```text
smart-roster/
├── Client/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── pages/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   └── index.css
│   ├── package.json
│   └── vite.config.js
│
├── Server/
│   ├── prisma/
│   │   ├── migrations/
│   │   ├── schema.prisma
│   │   └── seed.js
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── app.js
│   │   └── server.js
│   ├── package.json
│   └── prisma.config.ts
│
└── .gitignore
```

## Getting Started

### Prerequisites

Install the following before running the project:

- Node.js
- npm
- PostgreSQL
- Git

### 1. Clone the repository

```bash
git clone https://github.com/manasiswami/smart-roster.git
cd smart-roster
```

### 2. Backend Setup

```bash
cd Server
npm install
```
Create a `.env` file inside the `Server` directory.

Configure your PostgreSQL connection:

```env
DATABASE_URL="postgresql://USERNAME:PASSWORD@localhost:5432/DATABASE_NAME"
```

Replace the placeholders with your local PostgreSQL credentials and database name.

### 3. Database Setup

Generate the Prisma client:
```bash
npx prisma generate
```

Apply database migrations:
```bash
npx prisma migrate dev
```
Seed the database with sample data:
```bash
node prisma/seed.js
node prisma/seed-operating-rules.js
node prisma/seed-weekly-offs.js
```

### 4. Start the Backend

```bash
npm run dev
```
The backend API runs at:

```text
http://localhost:5000
```
Health endpoint:

```text
http://localhost:5000/api/health
```

### 5. Frontend Setup

Open another terminal:

```bash
cd Client
npm install
```
Start the frontend:

```bash
npm run dev
```

Open the local URL displayed by Vite in your terminal.

## Scheduling Approach

The roster generation process uses rule-based scheduling logic.

The system considers:

- Employee status and assignments.
- Brand and process requirements.
- Operating rules and required staffing.
- Employee weekly offs.
- Approved leave.
- Employee availability.
- Public holidays.

After generating a roster, the validation logic evaluates staffing coverage and scheduling constraints to identify conflicts.

Roster allocation changes can be made manually and validated to evaluate their impact on the schedule.

## Sample Data

The project includes sample data to demonstrate roster management across multiple operational entities.

The seeded dataset includes:

- 30 employees.
- Multiple operational pods.
- Multiple brands and processes.
- Employee assignments.
- Operating rules.
- Weekly-off configurations.
- Availability records.
- Leave records.
- Public holidays.

The sample dataset is fictional and intended for demonstration and testing.

## Validation

The application has been manually tested against the seeded dataset, including:

- Monthly roster generation.
- Employee-day record validation.
- Weekly-off validation.
- Allocation validation.
- Roster views and filters.
- Pagination.
- CSV export.
- Manual allocation changes.
- Conflict detection and revalidation.

Frontend quality checks:

```bash
npm run lint
npm run build
```

Backend automated tests have not yet been implemented.

## Assumptions

- Employee and operational data are maintained by the operations team.
- Brand-process operating rules define the required coverage.
- Employee assignments determine which brands and processes an employee can work on.
- Scheduling configurations may vary between brands and processes.
- Sample employee and brand data are fictional.

## Future Improvements

- Automated backend test coverage.
- Roster publishing and approval workflow.
- Improved scheduling optimization and fair distribution.
- Backup employee recommendations.
- More detailed change-impact handling.
- Deployment and production configuration.
- Additional export formats.

## Author

**Manasi Swami**

Full Stack Developer | React | Node.js | Express | PostgreSQL | Prisma

GitHub: https://github.com/manasiswami

---

Developed as part of the DataStraw Tech Internship Assessment.
