# CampusPulse (School Management SaaS)

A production-grade, multi-tenant School Management SaaS application designed for K-12 academic institutions, administrators, educators, students, and parents. CampusPulse operates as a modular monolith providing rigorous tenant data isolation, granular role-based access control (RBAC), academic configuration, student admission lifecycles, faculty allocation, daily attendance tracking, examination and marks publishing workflows, and auditable fee/finance operations.

---

## 1. Project Name & Purpose

**CampusPulse** provides a unified administrative backbone for schools operating in a SaaS environment. The platform offers:

- Multi-tenant school isolation with database-level tenant filtering.
- Public customer onboarding, email verification, and platform administrator provisioning.
- Academic lifecycle management (sessions, classes, sections, and subjects).
- Comprehensive student directory, parent-student relationships, admissions, and session enrollments.
- Faculty profiles, employment status tracking, and class/subject teaching allocations.
- Daily student attendance register workflows (drafting, submission, locked registers, audited corrections, and attendance analytics).
- Examination scheduling, marks entry, review, approval, publishing, and audited post-publication corrections.
- Transactional fees and finance management with decimal precision, immutable invoices, receipt numbering, audited fee concessions, cancellations, payment reversals, and refunds.

---

## 2. Current Features & Module Overview

The application is structured into 8 cohesive domain modules:

| Module                     | Location                   | Primary Responsibilities                                                                                                                                                                    |
| :------------------------- | :------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Onboarding & Schools**   | `src/modules/onboarding`   | Public registration, email verification, super-admin review/approval, school provisioning, staff/parent invitation lifecycles, and step-by-step school readiness checklist.                 |
| **Authentication & RBAC**  | `src/modules/auth`         | JWT session cookies (`jose`), bcrypt password hashing, canonical 6-role permission matrix, cross-tenant isolation enforcement, and assignment-scoped checks.                                |
| **Academics**              | `src/modules/academics`    | Academic years/sessions, current session markers, class definitions, section capacities, curriculum subjects, and setup prerequisite validation.                                            |
| **Students & Enrollments** | `src/modules/students`     | Student profiles (APAAR ID, admission number, DOB, gender), primary/secondary guardian linkages, session-based section enrollments, soft-delete, and restoration.                           |
| **Staff & Faculty**        | `src/modules/staff`        | Teacher profiles (employee ID, qualifications, specialization, department), class teacher assignments (mentorship), and subject teacher assignments (weekly workload).                      |
| **Attendance**             | `src/modules/attendance`   | Daily section attendance registers, present/absent/late/excused tallies, register state machine (`DRAFT` → `SUBMITTED`), audited correction audit trail, and percentage calculations.       |
| **Examinations**           | `src/modules/examinations` | Exam creation, grading scales, subject configs, marks entry by assigned subject teachers, approval/return by class teachers/admins, publication to students/parents, and correction audits. |
| **Fees & Finance**         | `src/modules/fees`         | Fee heads, fee structures, immutable invoice generation, offline payment receipts (Cash, Bank Transfer, Cheque, DD), fee adjustments/concessions, payment reversals, and refunds.           |

---

## 3. Technology Stack

- **Framework**: [Next.js 16.4.2](https://nextjs.org/) (App Router, Turbopack, React Server Components & Server Actions)
- **UI & Runtime**: [React 19.3.0](https://react.dev/), [TypeScript 5](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/) with Lucide React icons
- **Database & ORM**: [PostgreSQL](https://www.postgresql.org/) with [Prisma ORM 7.10.1](https://www.prisma.io/) (`@prisma/client`, `@prisma/adapter-pg`)
- **Caching & Ephemeral State**: [Redis](https://redis.io/) via `ioredis 6.0.0`
- **Security & Crypto**: `jose` (JWT), `bcryptjs` (password hashing)
- **Validation**: [Zod 4.6.7](https://zod.dev/)
- **Logging**: [Pino 10.4.0](https://getpino.io/) structured JSON logging with `pino-pretty`

---

## 4. Prerequisites

Before running the application locally or in production, ensure your environment provides:

- **Node.js**: Version `20.x` or `22.x` (LTS recommended)
- **PostgreSQL**: Version `15+` or `16+` database instance
- **Redis**: Version `6+` or `7+` server instance
- **Docker & Docker Compose** (Optional, for running local PostgreSQL & Redis containers)

---

## 5. Installation & Local Development

1. **Clone the repository**:

   ```bash
   git clone https://github.com/Harshit-Maurya838/school-hub.git
   cd school-hub
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Start local backing services (PostgreSQL & Redis)**:

   ```bash
   docker-compose up -d
   ```

4. **Initialize database schema & migrations**:

   ```bash
   npx prisma migrate deploy
   ```

5. **Bootstrap initial seed data**:

   ```bash
   # Option A: Seed realistic multi-tenant demo data
   npm run db:seed

   # Option B: Bootstrap dedicated platform super admin
   npm run bootstrap:admin

   # Option C: Provision a fresh tenant school
   npm run bootstrap:school
   ```

6. **Start local development server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 6. Environment Variable Setup

Copy the template file:

```bash
cp .env.example .env
```

Ensure all variables are populated with safe local values:

```env
# Application Environment
NODE_ENV=development
PORT=3000

# PostgreSQL Connection String
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/atenea_db?schema=public"

# Redis Connection String
REDIS_URL="redis://localhost:6379"

# Application Secret Key (must be at least 32 characters long)
APP_SECRET="replace-with-a-secure-random-secret-at-least-32-chars-long"

# Optional Bootstrap Configuration (for bootstrap:* scripts)
BOOTSTRAP_ADMIN_NAME="Platform Super Administrator"
BOOTSTRAP_ADMIN_EMAIL="superadmin@atenea.local"
BOOTSTRAP_ADMIN_PASSWORD="AdminSecurePass123!"
```

> [!CAUTION]
> Never commit real production credentials, connection strings, or `APP_SECRET` keys into version control.

---

## 7. Database Setup & Safe Migration Commands

CampusPulse uses Prisma with versioned, immutable SQL migrations under `prisma/migrations/`.

- **Validate schema**:
  ```bash
  npx prisma validate
  ```
- **Apply migrations in development**:
  ```bash
  npx prisma migrate dev
  ```
- **Apply migrations in staging/production**:
  ```bash
  npx prisma migrate deploy
  ```
- **Inspect database with Prisma Studio**:
  ```bash
  npx prisma studio
  ```

> [!WARNING]
> Do NOT use `npx prisma db push` or `prisma migrate reset` in production or staging environments as it bypasses migration history and may cause irreversible data loss.

---

## 8. Development, Test, Lint, Formatting & Build Commands

All operational tasks use official npm scripts defined in `package.json`:

```bash
# Start Next.js development server with Turbopack
npm run dev

# Run comprehensive automated test suite (Node.js test runner with tsx)
npm test

# Run TypeScript compilation and strict type check
npx tsc --noEmit

# Run ESLint check
npm run lint

# Verify Prettier code style
npm run format

# Automatically format all files with Prettier
npm run format:fix

# Create production build
npm run build

# Start production server
npm run start
```

---

## 9. Repository & Folder Structure

```
SchoolManagement/
├── prisma/                          # Database schema and immutable migrations
│   ├── migrations/                  # Historical timestamped SQL migration folders
│   └── schema.prisma                # Canonical Prisma schema
├── scripts/                         # Reusable operations and bootstrap scripts
│   ├── bootstrap-super-admin.ts     # Platform super administrator setup
│   ├── bootstrap-first-school.ts    # First tenant school provisioner
│   └── seed-mock-data.ts            # Realistic multi-tenant mock data seeder
├── src/
│   ├── app/                         # Next.js App Router (Pages, Layouts, Route Handlers)
│   │   ├── (auth)/                  # Public auth pages (/login, /forget-password)
│   │   ├── accept-invitation/       # Tokenized invitation acceptance UI
│   │   ├── api/v1/                  # Tenant-scoped and platform REST API routes
│   │   ├── platform/                # Super-admin SaaS management console
│   │   ├── register-school/         # Public customer onboarding flow
│   │   ├── school/[schoolSlug]/     # Tenant school portal (Dashboard, Academics, Staff, Students, Fees, etc.)
│   │   ├── layout.tsx               # Root application layout
│   │   └── page.tsx                 # Root landing page
│   ├── components/                  # Truly shared UI components & layouts
│   │   ├── common/                  # Reusable UI widgets (Badge, Modal, StatCard)
│   │   ├── dashboard/               # School dashboard aggregate components
│   │   └── layout/                  # Navigation Header, Sidebar, SchoolLayoutClient
│   ├── lib/                         # Shared infrastructure & cross-cutting utilities
│   │   ├── api-handler.ts           # Standardized API route wrapper
│   │   ├── api-response.ts          # JSON response formatters
│   │   ├── audit.ts                 # Audit logging engine (tenant & public events)
│   │   ├── email.ts                 # Transactional email dispatcher
│   │   ├── env.ts                   # Zod-validated environment config
│   │   ├── errors.ts                # Structured AppError hierarchy
│   │   ├── logger.ts                # Pino structured logging
│   │   ├── prisma.ts                # Global Prisma client singleton
│   │   ├── redis.ts                 # Redis connection client
│   │   ├── tenant-prisma.ts         # Multi-tenant Prisma client extension
│   │   └── utils.ts                 # Styling utilities (clsx, twMerge)
│   ├── modules/                     # Domain-specific modular monolith packages
│   │   ├── onboarding/              # School registration, provisioning, invitations, readiness
│   │   ├── auth/                    # Auth tokens, passwords, RBAC permissions, role UI
│   │   ├── academics/               # Academic sessions, classes, sections, subjects
│   │   ├── students/                # Students, guardians, enrollments, admissions
│   │   ├── staff/                   # Teacher profiles, class & subject assignments
│   │   ├── attendance/              # Daily registers, submissions, corrections, reports
│   │   ├── examinations/            # Exams, grading, marks entry, review, publication
│   │   └── fees/                    # Fee heads, structures, invoices, payments, refunds
│   └── proxy.ts                     # Next.js edge route proxy and auth redirection
├── tests/                           # Integration test matrix covering all domains
├── docker-compose.yml               # PostgreSQL & Redis container definitions
├── package.json                     # Project manifest and scripts
├── tsconfig.json                    # TypeScript compiler configuration
├── AGENTS.md                        # Architectural guidelines for AI coding agents
└── README.md                        # Canonical developer setup and overview
```

---

## 10. Authentication, Roles & Multi-Tenant Architecture

### Tenant Isolation Model

Every database record containing tenant-specific data stores a mandatory `schoolId` foreign key. The custom `createTenantPrisma(schoolId)` extension enforces strict automatic scoping:

- Queries automatically filter by `schoolId`.
- Mutations prevent cross-tenant record linking.
- Platform administrators (`SUPER_ADMIN`) have `schoolId = null` and access platform-level consoles only; they cannot perform routine school actions without explicit tenant authorization.

### Role-Based Access Control (RBAC) Matrix

1. **`SUPER_ADMIN`**: SaaS platform operator. Manages pending registrations, provisions schools, monitors system health.
2. **`SCHOOL_ADMIN`**: School principal / owner. Full administrative rights within their tenant school (academics, staff, students, fees, attendance, exam publication).
3. **`ACCOUNTANT`**: Dedicated finance officer. Authorized for fee structures, invoices, payment collection, adjustments, cancellations, and refunds. Restricted from curriculum changes.
4. **`TEACHER`**: Faculty member. Restricted to assigned classes and subjects. Enters marks only for assigned subjects; marks attendance only for assigned class sections.
5. **`PARENT`**: Guardian. Read-only access restricted strictly to their linked children's attendance, report cards, and fee invoices.
6. **`STUDENT`**: Student. Read-only access restricted strictly to their own enrollment, attendance, marks, and invoices.

---

## 11. Main Application Routes & API Conventions

### Key Application Pages

- `/` — Marketing landing page and login portal selector.
- `/login` — Unified login page with role-based redirection.
- `/register-school` — Public application page for prospective school customers.
- `/register-school/verify` — Public tokenized email confirmation.
- `/accept-invitation` — One-time setup password activation for invited staff/parents.
- `/platform` — Platform administrator console (School registrations & provisioning).
- `/school/[schoolSlug]/dashboard` — School administrative overview and KPI cards.
- `/school/[schoolSlug]/academics` — Academic sessions, classes, sections, and subjects.
- `/school/[schoolSlug]/staff` — Faculty directory, profiles, and teaching allocations.
- `/school/[schoolSlug]/students` — Student admissions, directory, and student detail profiles.
- `/school/[schoolSlug]/attendance` — Daily attendance registers and monthly reports.
- `/school/[schoolSlug]/exams` — Examination schedules, marks entry, review, and publication.
- `/school/[schoolSlug]/fees` — Fee heads, structures, student ledgers, collections, and refunds.
- `/school/[schoolSlug]/settings` — School profile settings and readiness checklist.

### REST API Route Conventions

All internal and client APIs reside under `/api/v1/`:

- Public: `/api/v1/public/...` (Rate-limited, unauthenticated).
- Auth: `/api/v1/auth/...` (Login, logout, session verification, invitation acceptance).
- Platform: `/api/v1/platform/...` (Strictly `SUPER_ADMIN` scoped).
- Tenant: `/api/v1/school/[schoolSlug]/...` (Scoped to the authenticated user's tenant).

All JSON API responses conform to standard structures:

```json
// Success
{ "data": { ... } }

// Error
{ "error": { "code": "bad_request", "message": "Explanation of failure" } }
```

---

## 12. Test Organization & How to Add Tests

Tests are executed using Node.js's native test runner (`node --test`) with TypeScript loader (`tsx`).

### Test Coverage Matrix

- `tests/public-registration.test.ts` — Registration, email verification, approve/reject.
- `tests/provisioning.test.ts` — School provisioning, admin account generation.
- `tests/invitations.test.ts` — Token hashing, expiration, acceptance, revocation.
- `tests/parent-student-onboarding.test.ts` — Guardian linkage and boundary restrictions.
- `tests/setup-prerequisites.test.ts` — Academic readiness dependency ordering.
- `tests/auth.test.ts` — Password hashing, JWT creation, cookie attributes.
- `tests/api-auth.test.ts` — Login endpoint, session renewal, invalid credentials.
- `tests/rbac.test.ts` — Canonical role permissions and access assertions.
- `tests/authorization.test.ts` — Comprehensive 16-scenario permission matrix.
- `tests/tenant-isolation.test.ts` — Multi-tenant data segregation and foreign tenant block.
- `tests/academic-setup.test.ts` — Sessions, classes, sections, subjects, cascade checks.
- `tests/student-management.test.ts` — Admissions, enrollments, student editing, soft-delete.
- `tests/teaching-assignments.test.ts` — Teacher profiles, class/subject assignments.
- `tests/attendance.test.ts` — Attendance registers, lock state, correction audits.
- `tests/exams.test.ts` — Examination lifecycles, marks entry, review, publication.
- `tests/fees.test.ts` — Invoices, Decimal math, collections, reversals, refunds.

### Adding New Tests

Create a new file in `tests/<feature>.test.ts`:

```ts
import { describe, it } from "node:test";
import assert from "node:assert";
import { prisma } from "../src/lib/prisma";

describe("New Feature Domain", () => {
  it("should enforce business rules", async () => {
    assert.strictEqual(1 + 1, 2);
  });
});
```

Execute with:

```bash
npm test
```

---

## 13. Deployment & Production Migration Guidance

1. **Build Container / Application**:
   ```bash
   npm run build
   ```
2. **Apply Migrations Safely Before Traffic Switching**:
   ```bash
   npx prisma migrate deploy
   ```
3. **Run Production Server**:
   ```bash
   npm run start
   ```

### Recommended Production Checklist

- Configure `DATABASE_URL` with connection pooling enabled (e.g. PgBouncer or Supabase transaction pooler).
- Set a strong, randomly generated `APP_SECRET` (at least 64 characters hex or base64).
- Ensure `NODE_ENV=production` is set.
- Enable HTTPS termination at the reverse proxy (Nginx, Cloudflare, or Vercel Edge).
- Configure SMTP or transactional email provider in `src/lib/email.ts`.

---

## 14. Troubleshooting Common Setup Errors

- **Database Connection Refused (`ECONNREFUSED 127.0.0.1:5432`)**:
  Ensure PostgreSQL is running via `docker-compose up -d` or your local PostgreSQL service.
- **Invalid Environment Variables Error**:
  Ensure `.env` exists and contains valid values for `DATABASE_URL`, `REDIS_URL`, and `APP_SECRET`.
- **Database Deadlock During Concurrent Tests**:
  Always use `npm test` which includes `--test-concurrency=1` to run tests sequentially against the shared test database.
- **Prisma Client Desynchronized**:
  Run `npx prisma generate` to rebuild TypeScript types from `prisma/schema.prisma`.

---

## 15. Known Limitations & Out-of-Scope Functionality

- **Payment Gateway Integration**: Online payment gateway webhooks (Stripe, Razorpay) are not yet integrated; currently, offline collections (Cash, Cheque, Bank Transfer, DD) are supported with receipt numbers and audit logs.
- **SMS Notifications**: Automated SMS gateways for attendance alerts are queued for future releases; audit logs and email dispatch are implemented.
- **Transportation & Hostel Modules**: Fleet tracking, bus routes, and dormitory allotments are planned for future modular expansions.
