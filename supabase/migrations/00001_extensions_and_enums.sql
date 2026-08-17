-- 00001_extensions_and_enums.sql
-- Inventario Pro: extensions and enum types

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE app_role AS ENUM ('admin', 'employee');

CREATE TYPE product_status AS ENUM ('active', 'archived');

CREATE TYPE movement_type AS ENUM (
  'initial_stock',
  'purchase_receipt',
  'sale',
  'sale_return',
  'adjustment_increase',
  'adjustment_decrease',
  'damage',
  'loss',
  'transfer_in',
  'transfer_out'
);

CREATE TYPE purchase_order_status AS ENUM (
  'draft',
  'ordered',
  'partially_received',
  'received',
  'cancelled'
);

CREATE TYPE sale_status AS ENUM (
  'draft',
  'completed',
  'cancelled',
  'partially_returned',
  'fully_returned'
);

CREATE TYPE stock_adjustment_type AS ENUM (
  'initial_stock',
  'increase',
  'decrease',
  'damage',
  'loss'
);

CREATE TYPE document_kind AS ENUM (
  'sale',
  'purchase_order',
  'purchase_receipt',
  'return',
  'stock_adjustment'
);
