import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool, schema });

// This function is used to migrate the database schema.
// It will create tables if they don't exist.
export async function migrate() {
  // Using a transaction to ensure all operations are atomic.
  await db.transaction(async (tx) => {
    const sql = (await import('drizzle-orm/sql')).sql;

    // Create tables if they don't exist
    await tx.execute(sql`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        full_name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'cashier',
        station_id VARCHAR,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await tx.execute(sql`
      CREATE TABLE IF NOT EXISTS stations (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        address TEXT,
        gst_number TEXT,
        license_number TEXT,
        contact_phone TEXT,
        contact_email TEXT,
        default_currency TEXT NOT NULL DEFAULT 'PKR',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await tx.execute(sql`
      CREATE TABLE IF NOT EXISTS products (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        unit TEXT NOT NULL DEFAULT 'litre',
        current_price DECIMAL(10,2) NOT NULL,
        density DECIMAL(5,3),
        hsn_code TEXT,
        tax_rate DECIMAL(5,2) DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await tx.execute(sql`
      CREATE TABLE IF NOT EXISTS tanks (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        station_id VARCHAR NOT NULL REFERENCES stations(id),
        name TEXT NOT NULL,
        product_id VARCHAR NOT NULL REFERENCES products(id),
        capacity DECIMAL(10,2) NOT NULL,
        current_stock DECIMAL(10,2) DEFAULT 0,
        minimum_level DECIMAL(10,2) DEFAULT 500,
        status TEXT DEFAULT 'normal',
        last_refill_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await tx.execute(sql`
      CREATE TABLE IF NOT EXISTS customers (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'walk-in',
        contact_phone TEXT,
        contact_email TEXT,
        address TEXT,
        gst_number TEXT,
        credit_limit DECIMAL(10,2) DEFAULT 0,
        outstanding_amount DECIMAL(10,2) DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await tx.execute(sql`
      CREATE TABLE IF NOT EXISTS suppliers (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        contact_person TEXT,
        contact_phone TEXT,
        contact_email TEXT,
        address TEXT,
        gst_number TEXT,
        payment_terms TEXT,
        outstanding_amount DECIMAL(10,2) DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await tx.execute(sql`
      CREATE TABLE IF NOT EXISTS sales_transactions (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        invoice_number TEXT NOT NULL UNIQUE,
        station_id VARCHAR NOT NULL REFERENCES stations(id),
        customer_id VARCHAR NOT NULL REFERENCES customers(id),
        user_id VARCHAR NOT NULL REFERENCES users(id),
        transaction_date TIMESTAMP DEFAULT NOW(),
        due_date TIMESTAMP,
        payment_method TEXT NOT NULL,
        currency_code TEXT NOT NULL DEFAULT 'PKR',
        subtotal DECIMAL(10,2) NOT NULL,
        tax_amount DECIMAL(10,2) DEFAULT 0,
        total_amount DECIMAL(10,2) NOT NULL,
        paid_amount DECIMAL(10,2) DEFAULT 0,
        outstanding_amount DECIMAL(10,2) DEFAULT 0,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await tx.execute(sql`
      CREATE TABLE IF NOT EXISTS sales_transaction_items (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        transaction_id VARCHAR NOT NULL REFERENCES sales_transactions(id),
        product_id VARCHAR NOT NULL REFERENCES products(id),
        tank_id VARCHAR REFERENCES tanks(id),
        quantity DECIMAL(10,3) NOT NULL,
        unit_price DECIMAL(10,2) NOT NULL,
        total_price DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await tx.execute(sql`
      CREATE TABLE IF NOT EXISTS purchase_orders (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        order_number TEXT NOT NULL UNIQUE,
        station_id VARCHAR NOT NULL REFERENCES stations(id),
        supplier_id VARCHAR NOT NULL REFERENCES suppliers(id),
        user_id VARCHAR NOT NULL REFERENCES users(id),
        order_date TIMESTAMP DEFAULT NOW(),
        due_date TIMESTAMP,
        expected_delivery_date TIMESTAMP,
        actual_delivery_date TIMESTAMP,
        status TEXT DEFAULT 'pending',
        currency_code TEXT NOT NULL DEFAULT 'PKR',
        subtotal DECIMAL(10,2) NOT NULL,
        tax_amount DECIMAL(10,2) DEFAULT 0,
        total_amount DECIMAL(10,2) NOT NULL,
        paid_amount DECIMAL(10,2) DEFAULT 0,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await tx.execute(sql`
      CREATE TABLE IF NOT EXISTS purchase_order_items (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id VARCHAR NOT NULL REFERENCES purchase_orders(id),
        product_id VARCHAR NOT NULL REFERENCES products(id),
        tank_id VARCHAR REFERENCES tanks(id),
        quantity DECIMAL(10,3) NOT NULL,
        unit_price DECIMAL(10,2) NOT NULL,
        total_price DECIMAL(10,2) NOT NULL,
        received_quantity DECIMAL(10,3) DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await tx.execute(sql`
      CREATE TABLE IF NOT EXISTS expenses (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        station_id VARCHAR NOT NULL REFERENCES stations(id),
        user_id VARCHAR NOT NULL REFERENCES users(id),
        category TEXT NOT NULL,
        description TEXT NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        currency_code TEXT NOT NULL DEFAULT 'PKR',
        expense_date TIMESTAMP DEFAULT NOW(),
        receipt_number TEXT,
        payment_method TEXT NOT NULL,
        vendor_name TEXT,
        is_recurring BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await tx.execute(sql`
      CREATE TABLE IF NOT EXISTS payments (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        station_id VARCHAR NOT NULL REFERENCES stations(id),
        user_id VARCHAR NOT NULL REFERENCES users(id),
        customer_id VARCHAR REFERENCES customers(id),
        supplier_id VARCHAR REFERENCES suppliers(id),
        amount DECIMAL(10,2) NOT NULL,
        currency_code TEXT NOT NULL DEFAULT 'PKR',
        payment_date TIMESTAMP DEFAULT NOW(),
        payment_method TEXT NOT NULL,
        reference_number TEXT,
        notes TEXT,
        type TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await tx.execute(sql`
      CREATE TABLE IF NOT EXISTS settings (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        station_id VARCHAR NOT NULL UNIQUE REFERENCES stations(id),
        tax_enabled BOOLEAN DEFAULT false,
        tax_rate DECIMAL(5,2) DEFAULT 0,
        currency_code TEXT NOT NULL DEFAULT 'PKR',
        company_name TEXT,
        company_address TEXT,
        company_phone TEXT,
        company_email TEXT,
        receipt_footer TEXT,
        updated_at TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create pumps table
    await tx.execute(sql`
      CREATE TABLE IF NOT EXISTS pumps (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        station_id VARCHAR NOT NULL REFERENCES stations(id),
        name TEXT NOT NULL,
        pump_number TEXT NOT NULL,
        product_id VARCHAR NOT NULL REFERENCES products(id),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create pump_readings table
    await tx.execute(sql`
      CREATE TABLE IF NOT EXISTS pump_readings (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        pump_id VARCHAR NOT NULL REFERENCES pumps(id),
        station_id VARCHAR NOT NULL REFERENCES stations(id),
        user_id VARCHAR NOT NULL REFERENCES users(id),
        product_id VARCHAR NOT NULL REFERENCES products(id),
        reading_date TIMESTAMP DEFAULT NOW(),
        opening_reading DECIMAL(10,3) NOT NULL,
        closing_reading DECIMAL(10,3) NOT NULL,
        total_sale DECIMAL(10,3) NOT NULL,
        shift_number TEXT NOT NULL,
        operator_name TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
  });
}