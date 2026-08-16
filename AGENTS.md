# Inventario Pro — AI Development Rules

## Project

Professional inventory management system for businesses.

## Main Stack

- Next.js

- TypeScript

- Tailwind CSS

- shadcn/ui

- Supabase

- PostgreSQL

- Supabase Auth

- Vercel

- GitHub

- n8n

## Source of Truth

Before making architectural or implementation decisions, read the relevant files inside `/docs`.

Important documents:

- `/docs/requirements.md`

- `/docs/architecture.md`

- `/docs/ux-ui.md`

- `/docs/database.md`

- `/docs/backend.md`

- `/docs/roadmap.md`

- `/docs/testing.md`

- `/docs/security.md`

- `/docs/automations.md`

Do not contradict established architectural decisions unless there is a serious technical or security problem.

If a change to the architecture is necessary, explain the problem before changing it.

## Development Rules

Work incrementally.

Do NOT attempt to build the entire application in one operation.

Implement one feature or phase at a time.

After completing a phase:

1. Verify that the app builds.

2. Verify that existing functionality still works.

3. Explain what changed.

4. Explain how the user can test it.

5. Stop and wait before starting the next major phase.

## Frontend

The user must be able to continuously inspect the application at:

[http://localhost:3000](http://localhost:3000)

Never intentionally leave the application in a broken state.

Use:

- reusable components

- responsive design

- loading states

- empty states

- error states

- accessible forms

- clear navigation

Avoid giant components.

Separate business logic from UI whenever possible.

## TypeScript

Use strict TypeScript.

Avoid `any` unless absolutely necessary.

Use clear interfaces/types.

## Backend

Never trust authorization, prices, inventory quantities, roles or other sensitive information coming from the browser.

Sensitive operations must be validated server-side.

## Inventory

Inventory must have full traceability.

Do not rely solely on changing a `products.stock` value.

Inventory changes must generate inventory movement records.

Examples:

- purchases

- sales

- returns

- adjustments

- damaged products

- transfers

Inventory must never become negative because of race conditions or invalid operations.

Critical inventory operations should use PostgreSQL transactions where appropriate.

## Database

Use proper:

- primary keys

- foreign keys

- constraints

- indexes

- RLS policies

- transactions

Design for data integrity before convenience.

## Authentication and Authorization

Use Supabase Auth.

Roles and permissions must be enforced server-side and with database policies where appropriate.

Initial roles:

- Admin

- Employee

Architecture should allow granular permissions later.

## Security

Never expose:

- service role keys

- database passwords

- private secrets

Never commit `.env.local`.

## Automation

n8n is an automation layer.

n8n must NOT become the source of truth for inventory.

Critical inventory mutations must go through secure application APIs, server functions or database functions.

## Git

Create logical commits after stable milestones.

Do not commit secrets.

## Quality

Before production:

- code review

- functional testing

- permission testing

- inventory consistency testing

- security review

- production build verification