# Billable

**The fastest way to invoice freelance clients and collect payment.**

Invoice clients in 60 seconds. Get paid via Stripe. No projects. No timesheets. No bullshit.

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase and Stripe keys

# Run database migrations
# Open Supabase Dashboard > SQL Editor
# Run: supabase/migrations/*.sql (in order)

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

---

## 📚 Documentation

### Essential Docs

- **[VISION.md](VISION.md)** - Product vision and roadmap
- **[CLAUDE.md](CLAUDE.md)** - Architecture overview and AI assistant instructions
- **[PROGRESS.md](PROGRESS.md)** - Current sprint status and development tracking

### Setup Guides (`/docs/setup`)

- **[Invoice & Email Setup](docs/setup/INVOICE_EMAIL_SETUP.md)** - Configure invoice emails with client portal links
- **[Stripe Setup](docs/setup/STRIPE_SETUP.md)** - Complete Stripe Connect payment integration
- **[Resend Setup](docs/setup/RESEND_SETUP.md)** - Email service configuration

### Database Migrations (`/docs/migrations`)

- **[Tickets to Tasks Migration](docs/migrations/TICKETS_TO_TASKS_MIGRATION.md)** - Rename database tables
- **[Constraint Rename Guide](docs/migrations/RUN_CONSTRAINT_RENAME.md)** - Update foreign key constraints

### All Documentation

See **[docs/INDEX.md](docs/INDEX.md)** for complete documentation index

---

## ✨ Features

### Invoicing (Core)

- ✅ **60-Second Invoicing** - Create and send professional invoices in under a minute
- ✅ **Stripe Integration** - Payments go directly to your Stripe account (no middleman)
- ✅ **Payment Reminders** - One-click reminders for unpaid invoices
- ✅ **PDF Export** - Professional invoice PDFs with custom branding
- ✅ **Client Portal** - Clients view invoices and pay with one click

### Time Tracking (Optional)

- ✅ **Simple Time Logging** - Log hours for clients (no tasks/projects required)
- ✅ **Built-in Timer** - Track time as you work
- ✅ **Invoice from Time** - Turn logged hours into invoices instantly
- ✅ **Billable/Non-billable** - Track internal vs. billable work

### Client Management

- ✅ **Client Database** - Store client info and hourly rates
- ✅ **Multi-tenant SaaS** - Secure tenant isolation with Row Level Security
- ✅ **Client History** - View all invoices and time for each client

### Dashboard & Analytics

- ✅ **Revenue Dashboard** - See monthly revenue, pending invoices, billable hours
- ✅ **Invoice Status** - Track sent, paid, overdue invoices at a glance
- ✅ **CSV Exports** - Export data for accounting software
- ✅ **Real-time Updates** - Payments update instantly via Stripe webhooks

### User Experience

- ✅ **Mobile Responsive** - Works on all devices
- ✅ **Keyboard Shortcuts** - Navigate fast with keyboard
- ✅ **Email Notifications** - Automated alerts for invoice events
- ✅ **Clean Interface** - No clutter, just what you need

---

## 🛠 Tech Stack

### Frontend

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS 4
- **Components:** Radix UI primitives
- **State:** Zustand stores
- **Forms:** React Hook Form + Zod validation
- **Icons:** Lucide React

### Backend

- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth with middleware
- **Payments:** Stripe
- **API:** Next.js API Routes
- **Real-time:** Supabase Realtime (ready to use)

### DevOps

- **Hosting:** Vercel (recommended)
- **Database:** Supabase Cloud
- **Payments:** Stripe
- **Email:** Resend (optional)
- **Testing:** Jest + React Testing Library

---

## 📁 Project Structure

```
src/
├── app/
│   ├── api/                      # API routes
│   │   ├── invoices/            # Invoice generation & PDF
│   │   ├── notifications/       # Email notifications
│   │   └── payments/            # Stripe checkout & webhooks
│   ├── dashboard/               # Main app pages
│   │   ├── clients/            # Client management
│   │   ├── time-entries/       # Time tracking (optional)
│   │   ├── invoices/           # Invoice management
│   │   ├── reports/            # Analytics & reports
│   │   └── notifications/      # Notification center
│   ├── client-portal/          # Client-facing invoice portal
│   └── auth/                   # Authentication pages
├── components/
│   ├── ui/                     # Reusable UI components
│   ├── modals/                 # Feature-specific modals
│   ├── home/                   # Landing page sections
│   └── *.tsx                   # Feature components
├── lib/
│   ├── supabase.ts            # Browser Supabase client
│   ├── supabase-server.ts     # Server Supabase client
│   ├── stripe.ts              # Stripe configuration
│   ├── types.ts               # TypeScript interfaces
│   └── utils.ts               # Utility functions
└── stores/
    ├── auth.ts                # Authentication state
    ├── clients.ts             # Client management
    ├── time-entries.ts        # Time tracking (optional)
    └── invoices.ts            # Invoice generation

supabase/
├── migrations/                # Database migrations
│   ├── 20250923000001_initial_schema.sql
│   ├── 20250923000006_production_aligned_migration.sql
│   ├── 20250927223301_sprint_4_business_automation.sql
│   └── 20251002000001_add_payments_table.sql
├── config.toml               # Supabase local config
└── seed.sql                  # Sample data (optional)
```

---

## 🔧 Environment Variables

Create a `.env.local` file with the following variables:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
STRIPE_SECRET_KEY=sk_test_your_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

See [.env.example](.env.example) for complete reference.

---

## 🗄 Database Setup

### Option 1: Supabase CLI (Recommended)

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

### Option 2: Manual Migration

1. Go to Supabase Dashboard > SQL Editor
2. Run each migration file in `supabase/migrations/` in order
3. Verify tables are created

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

See [TESTING.md](TESTING.md) for testing best practices.

---

## 📦 Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm test             # Run Jest tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Generate coverage report
```

---

## 🚀 Deployment

### Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/trybillable)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Set environment variables in Vercel Dashboard
# Add production Stripe webhook: https://yourdomain.com/api/payments/webhook
```

### Production Checklist

- [ ] Set all environment variables in Vercel
- [ ] Run database migrations on production Supabase
- [ ] Configure production Stripe webhook
- [ ] Set up custom domain (trybillable.com)
- [ ] Enable Vercel Analytics
- [ ] Test payment flow with real card ($1 test)

---

## 📊 Current Status

**Version:** 1.0.0-beta
**Status:** 95% Complete - Ready for Beta Launch
**Last Updated:** October 2, 2025

### Completed Sprints

- ✅ Sprint 1: Security & Foundation
- ✅ Sprint 2: Core Features
- ✅ Sprint 3: UX & Performance
- ✅ Sprint 4: Business Automation

### Remaining for Launch

- [ ] Stripe keys configuration
- [ ] User onboarding flow
- [ ] Email service integration
- [ ] Legal pages (Terms, Privacy)

See [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md) for detailed next steps.

---

## 🎯 Roadmap

### Phase 1: Beta Launch (Now - Week 4)

- Complete Stripe setup
- Launch to 50 beta users
- Collect feedback and testimonials

### Phase 2: Public Launch (Months 2-3)

- Payment improvements (ACH, recurring)
- Integrations (QuickBooks, Zapier)
- Advanced reporting
- Team collaboration features

### Phase 3: Growth (Months 4-12)

- Mobile apps (iOS/Android)
- Chrome extension
- AI-powered features
- International expansion

See [VISION.md](VISION.md) for full product roadmap.

---

## 🤝 Contributing

This is currently a solo project, but contributions are welcome!

1. Fork the repository
2. Create a feature branch
3. Run tests and linting
4. Submit a pull request

---

## 📄 License

Proprietary - All Rights Reserved

---

## 📞 Support

- **Website:** https://trybillable.com
- **Email:** support@trybillable.com
- **Documentation:** [docs.trybillable.com](https://docs.trybillable.com)

---

## 🙏 Acknowledgments

Built with:

- [Next.js](https://nextjs.org)
- [Supabase](https://supabase.com)
- [Stripe](https://stripe.com)
- [Tailwind CSS](https://tailwindcss.com)
- [Radix UI](https://radix-ui.com)

---

**Ready to get billable?** 💪

Start tracking time, sending invoices, and collecting payments today.

```bash
npm run dev
```
