# TimeLex: Enterprise AI-Automated Legal Time Capture Engine

[![Framework](https://img.shields.io/badge/Framework-Next.js%2014-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![Database](https://img.shields.io/badge/Database-PostgreSQL-blue?style=flat-square&logo=postgresql)](https://www.postgresql.org/)
[![ORM](https://img.shields.io/badge/ORM-Prisma-darkblue?style=flat-square&logo=prisma)](https://www.prisma.io/)
[![Deployment](https://img.shields.io/badge/Deployment-Vercel-black?style=flat-square&logo=vercel)](https://vercel.com)

TimeLex is a production-grade, multi-tenant B2B SaaS middleware application engineered to eliminate billable time leakage in mid-to-large tier law firms. By functioning as an automated background intelligence layer on top of legacy practice management platforms—specifically **Ghost Practice**—TimeLex captures, structures, and serializes digital activity directly into compliant billable metrics without manual time reconstruction.

## ⚖️ The Problem We Solve
Legal practitioners lose an estimated **30% to 40% of their billable capacity** to manual time reconstruction traps. Attorneys routinely spend hours at the end of every week parsing sent emails, calendar schedules, and communication logs to retroactively draft fee entries. 
* **Revenue Leakage:** Short, high-frequency actions (e.g., brief client emails, quick follow-up calls) are often forgotten entirely.
* **Operational Inefficiency:** Manual data retyping into older desktop ledgers costs valuable legal minds days of actual output every month.
* **Compliance Overheads:** Unstructured narratives lead to invoice disputes and compliance bottlenecks under regional frameworks like POPIA.

TimeLex turns the billing model upside down: **Auto-detect, don't reconstruct. Review, don't retype.**

---

## 🚀 Key Platform Features

### 1. Unified Multi-Tenant Architecture
Built from the ground up to support secure, isolated organizational boundaries. Multiple distinct law firms can access the platform concurrently, keeping internal records, staff parameters, and billing rates entirely segregated at the database level.

### 2. Autonomous Activity Capture & Validation Pipeline
Monitors background communication vectors (simulated via Microsoft Graph APIs) to curate a real-time feed of unbilled events. Attorneys interact with a streamlined validation queue to match entries with matters, adjust automated narrative wording, and push them to production ledgers instantly.

### 3. Smart Narrative Engine
Transforms raw data metadata (e.g., "Email to client_id regarding discovery documents") into highly polished, industry-standard legal descriptions ready for executive invoicing, minimizing the need for manual corrections.

### 4. Deterministic Ledger Sync-Lock
Once a billing record is successfully processed and flagged as synced to the main practice database, the platform enforces an immutable data state. This mitigates accounting discrepancies and prevents compliance breaches from duplicate ledger adjustments.

### 5. Pro-Forma Financial Analytics
Provides self-service oversight for fee earners to review active ledger status per matter, track monthly metrics against custom financial targets, and instantly generate transparent invoice drafts including local tax calculations (15% VAT).

---

## 🛠️ The Production Architecture Stack

```text
       ┌────────────────────────────────────────────────────────┐
       │                TimeLex Web Application                 │
       │     (Next.js App Router • React • Tailwind CSS)        │
       └───────────────────────────┬────────────────────────────┘
                                   │
                    Secure REST / Edge API Requests
                                   │
       ┌───────────────────────────▼────────────────────────────┐
       │             Next.js Serverless Middleware              │
       │        (Auth.js Identity / Multi-Tenant Guards)        │
       └───────────────────────────┬────────────────────────────┘
                                   │
                     Data Mapping & Schema Queries
                                   │
       ┌───────────────────────────▼────────────────────────────┐
       │           Prisma ORM Layer (Type-Safe Query)           │
       └───────────────────────────┬────────────────────────────┘
                                   │
       ┌───────────────────────────▼────────────────────────────┐
       │              PostgreSQL Cloud Database                 │
       │           (Tenant-Isolated Data Clusters)              │
       └────────────────────────────────────────────────────────┘
