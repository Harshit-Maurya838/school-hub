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

| Module                     | Location                   | Primary Responsibilities                                                                                                                                                                                      |
| :------------------------- | :------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Onboarding & Schools**   | `src/modules/onboarding`   | Public registration, email verification, super-admin review/approval, school provisioning, staff/parent invitation lifecycles, step-by-step school readiness checklist, and the UDISE+ Master School Profile. |
| **Authentication & RBAC**  | `src/modules/auth`         | JWT session cookies (`jose`), bcrypt password hashing, canonical 6-role permission matrix, cross-tenant isolation enforcement, and assignment-scoped checks.                                                  |
| **Academics**              | `src/modules/academics`    | Academic years/sessions, current session markers, class definitions, section capacities, curriculum subjects, and setup prerequisite validation.                                                              |
| **Students & Enrollments** | `src/modules/students`     | Student profiles (APAAR ID, admission number, DOB, gender), primary/secondary guardian linkages, session-based section enrollments, soft-delete, and restoration.                                             |
| **Staff & Faculty**        | `src/modules/staff`        | Teacher profiles (employee ID, qualifications, specialization, department), class teacher assignments (mentorship), and subject teacher assignments (weekly workload).                                        |
| **Attendance**             | `src/modules/attendance`   | Daily section attendance registers, present/absent/late/excused tallies, register state machine (`DRAFT` → `SUBMITTED`), audited correction audit trail, and percentage calculations.                         |
| **Examinations**           | `src/modules/examinations` | Exam creation, grading scales, subject configs, marks entry by assigned subject teachers, approval/return by class teachers/admins, publication to students/parents, and correction audits.                   |
| **Fees & Finance**         | `src/modules/fees`         | Fee heads, fee structures, immutable invoice generation, offline payment receipts (Cash, Bank Transfer, Cheque, DD), fee adjustments/concessions, payment reversals, and refunds.                             |

---

## 3. Technology Stack

- **Framework**: [Next.js 16.4.2](https://nextjs.org/) (App Router, Turbopack, React Server Components & Server Actions)
- **UI & Runtime**: [React 19.3.0](https://react.dev/), [TypeScript 5](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/) with Lucide React icons; animated primitives from [Hairline UI](https://hairlineui.com/ui) (shadcn registry, MIT) in `src/components/hairline/`
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
│   │   ├── hairline/                # Hairline UI components installed via shadcn CLI (see components.json)
│   │   └── layout/                  # Full-width top bar (Header, PlatformHeader, topbar/ widgets), Sidebar below it, SchoolLayoutClient
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
- `/school/[schoolSlug]/settings` — Master School Profile wizard (Identity & Contact → Academic Setup → HOS & Leadership), readiness checklist and platform identifiers.
- `/print/school-profile/[schoolSlug]` — Printable Master School Profile (browser Print → Save as PDF). School admin or super admin only.

### REST API Route Conventions

All internal and client APIs reside under `/api/v1/`:

- Public: `/api/v1/public/...` (Rate-limited, unauthenticated).
- Auth: `/api/v1/auth/...` (Login, logout, session verification, invitation acceptance).
- Platform: `/api/v1/platform/...` (Strictly `SUPER_ADMIN` scoped).
- Tenant: `/api/v1/school/[schoolSlug]/...` (Scoped to the authenticated user's tenant).

#### Master School Profile API

| Method | Route                                                     | Access                                          | Notes                                                                                                                                                                                |
| :----- | :-------------------------------------------------------- | :---------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET`  | `/api/v1/school/[schoolSlug]/profile/master`              | School admin, teacher (own school), super admin | Full profile view with step completion and lock state.                                                                                                                               |
| `PUT`  | `/api/v1/school/[schoolSlug]/profile/master/steps/[step]` | School admin (own school)                       | `step` is `identity`, `academic` or `leadership`. Returns `409 SCHOOL_PROFILE_LOCKED` while locked, `409` for a U-DISE code already used by another school, `422` for invalid input. |
| `POST` | `/api/v1/school/[schoolSlug]/profile/master/lock`         | School admin (own school), super admin          | Body `{ "locked": boolean }`. Locking requires all three steps saved (`400 SETUP_PREREQUISITE_REQUIRED` otherwise). Lock and unlock are audited.                                     |

Saving the `academic` step also builds the class structure from the selected range (response field `provisioning`): every class it implies (Nursery/LKG/UKG when pre-primary is on, then `Class n`), each with Section A in the school's medium and the default subjects for its level. If the school has no session yet, the current April–March session is created first. It only adds: existing classes, sections and subjects are never renamed or removed, and classes with subjects keep their list. The template lives in `src/modules/onboarding/services/class-structure-template.ts`; the service is `provisionClassStructure` in `src/modules/academics/services/class-setup.ts`.

#### Classes & Subjects API

| Method | Route                                                       | Access                                | Notes                                                                                                                                  |
| :----- | :---------------------------------------------------------- | :------------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------- |
| `GET`  | `/api/v1/school/[schoolSlug]/academics/setup`               | School admin, teacher (own school)    | Per class: sections (medium, students, class teacher), subjects, fee plan (admins/accountants only), exam scheme, and what is missing. |
| `POST` | `/api/v1/school/[schoolSlug]/academics/setup`               | School admin (own school)             | Creates a class with `sections` (e.g. `["A","B"]`), an optional `medium`, and default subjects (`applySubjectTemplate`).               |
| `POST` | `/api/v1/school/[schoolSlug]/academics/setup/provision`     | School admin (own school)             | Re-runs the profile-driven class creation (the "Create from profile" button). `400` until the academic step is saved.                  |
| `POST` | `/api/v1/school/[schoolSlug]/academics/setup/copy-subjects` | School admin (own school)             | Body `{ fromClassId, toClassIds }`; copies subjects a target class does not already have. Both sides must be in the school.            |
| `GET`  | `/api/v1/school/[schoolSlug]/fees/class-plans/[classId]`    | School admin, accountant (own school) | The class's fee plan for the active session: `monthlyFee`, `admissionFee`, `additional` costs, and the school's fee heads.             |
| `PUT`  | `/api/v1/school/[schoolSlug]/fees/class-plans/[classId]`    | School admin (own school)             | Body `{ monthlyFee, admissionFee, additional: [{ feeHeadId \| newHeadName, amount, frequency }] }`; amounts are rupee strings.         |

The class fee plan (the "Set fees" dialog on Classes & Subjects) is stored as ordinary fee structures, one per frequency (`MONTHLY`, `TERM`, `ANNUAL`, `ONE_TIME`), named `<Class> · <kind>`. The monthly fee uses the `Tuition Fee` head (`TUIT`) and the admission fee the `Admission Fee` head (`ADMN`); both are created on first use. Re-saving updates those structures in place and retires a frequency that is emptied, so Fees management, invoicing and reports see the same data. `CUSTOM` structures are only edited in Fees management. Issued invoices keep their item snapshot. Service: `src/modules/fees/services/class-fee-plan.ts`.

Sections carry an optional `medium` (`ENGLISH`, `HINDI`, `BILINGUAL`, `URDU`); `null` means the school profile's medium. The Academics area's Classes & Subjects tab (`/school/[schoolSlug]/academics/classes`) replaces the separate Classes and Subjects tabs; `/academics/subjects` redirects there.

Validation rules (shared by the API and the wizard) live in `src/modules/onboarding/services/school-profile-rules.ts`: 11-digit U-DISE code, Indian mobile numbers normalised to `+91XXXXXXXXXX`, pre-primary and RTE only for class ranges starting at Class 1, RTE end class within the range, a state board name when the board is a state board, and streams required exactly when the range reaches Class 12.

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
- `tests/class-fee-plan.test.ts` — Class fee plan: monthly/admission/additional costs saved as one structure per frequency, in-place re-save, duplicate heads and invalid amounts, accountant read-only, teacher overview without fees, tenant isolation.
- `tests/class-setup.test.ts` — Class structure template, provisioning from the school profile (idempotent, additive), class creation with sections and medium, subject copying, setup overview, RBAC and tenant isolation.
- `tests/student-management.test.ts` — Admissions, enrollments, student editing, soft-delete.
- `tests/teaching-assignments.test.ts` — Teacher profiles, class/subject assignments.
- `tests/attendance.test.ts` — Attendance registers, lock state, correction audits.
- `tests/exams.test.ts` — Examination lifecycles, marks entry, review, publication.
- `tests/fees.test.ts` — Invoices, Decimal math, collections, reversals, refunds.
- `tests/school-profile.test.ts` — Master School Profile step saves, cross-field validation, U-DISE uniqueness, lock/unlock, audit events, tenant isolation.

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
- **School Logo Upload**: The Master School Profile does not yet store a school logo; there is no file storage service configured.
- **Server-Generated PDFs**: The profile export uses the browser's print dialog (Save as PDF) rather than a server-rendered PDF.
- **Transportation & Hostel Modules**: Fleet tracking, bus routes, and dormitory allotments are planned for future modular expansions.
