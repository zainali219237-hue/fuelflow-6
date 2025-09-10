import { 
  users, stations, products, tanks, customers, suppliers, 
  salesTransactions, salesTransactionItems, purchaseOrders, purchaseOrderItems,
  expenses, payments, stockMovements, priceHistory,
  type User, type InsertUser, type Station, type InsertStation,
  type Product, type InsertProduct, type Tank, type InsertTank,
  type Customer, type InsertCustomer, type Supplier, type InsertSupplier,
  type SalesTransaction, type InsertSalesTransaction,
  type SalesTransactionItem, type InsertSalesTransactionItem,
  type PurchaseOrder, type InsertPurchaseOrder,
  type PurchaseOrderItem, type InsertPurchaseOrderItem,
  type Expense, type InsertExpense, type Payment, type InsertPayment,
  type StockMovement, type InsertStockMovement,
  type PriceHistory, type InsertPriceHistory
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, and, gte, lte, sum } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Stations
  getStation(id: string): Promise<Station | undefined>;
  getStations(): Promise<Station[]>;
  createStation(station: InsertStation): Promise<Station>;
  
  // Products
  getProducts(): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product>;
  
  // Tanks
  getTanksByStation(stationId: string): Promise<Tank[]>;
  getTank(id: string): Promise<Tank | undefined>;
  createTank(tank: InsertTank): Promise<Tank>;
  updateTankStock(id: string, currentStock: string): Promise<Tank>;
  
  // Customers
  getCustomers(): Promise<Customer[]>;
  getCustomer(id: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: string, customer: Partial<InsertCustomer>): Promise<Customer>;
  
  // Suppliers
  getSuppliers(): Promise<Supplier[]>;
  getSupplier(id: string): Promise<Supplier | undefined>;
  createSupplier(supplier: InsertSupplier): Promise<Supplier>;
  
  // Sales Transactions
  getSalesTransactions(stationId: string, limit?: number): Promise<SalesTransaction[]>;
  getSalesTransaction(id: string): Promise<SalesTransaction | undefined>;
  createSalesTransaction(transaction: InsertSalesTransaction): Promise<SalesTransaction>;
  
  // Sales Transaction Items
  createSalesTransactionItem(item: InsertSalesTransactionItem): Promise<SalesTransactionItem>;
  getSalesTransactionItems(transactionId: string): Promise<SalesTransactionItem[]>;
  
  // Purchase Orders
  getPurchaseOrders(stationId: string): Promise<PurchaseOrder[]>;
  createPurchaseOrder(order: InsertPurchaseOrder): Promise<PurchaseOrder>;
  
  // Purchase Order Items
  createPurchaseOrderItem(item: InsertPurchaseOrderItem): Promise<PurchaseOrderItem>;
  
  // Expenses
  getExpenses(stationId: string): Promise<Expense[]>;
  createExpense(expense: InsertExpense): Promise<Expense>;
  
  // Payments
  getPayments(stationId: string): Promise<Payment[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  
  // Stock Movements
  getStockMovements(tankId: string): Promise<StockMovement[]>;
  createStockMovement(movement: InsertStockMovement): Promise<StockMovement>;
  
  // Reports and Analytics
  getDashboardStats(stationId: string): Promise<any>;
  getSalesReport(stationId: string, startDate: Date, endDate: Date): Promise<any>;
  getFinancialReport(stationId: string, startDate: Date, endDate: Date): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getStation(id: string): Promise<Station | undefined> {
    const [station] = await db.select().from(stations).where(eq(stations.id, id));
    return station || undefined;
  }

  async getStations(): Promise<Station[]> {
    return await db.select().from(stations).where(eq(stations.isActive, true));
  }

  async createStation(insertStation: InsertStation): Promise<Station> {
    const [station] = await db.insert(stations).values(insertStation).returning();
    return station;
  }

  async getProducts(): Promise<Product[]> {
    return await db.select().from(products).where(eq(products.isActive, true));
  }

  async getProduct(id: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product || undefined;
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const [product] = await db.insert(products).values(insertProduct).returning();
    return product;
  }

  async updateProduct(id: string, productData: Partial<InsertProduct>): Promise<Product> {
    const [product] = await db.update(products)
      .set({ ...productData })
      .where(eq(products.id, id))
      .returning();
    return product;
  }

  async getTanksByStation(stationId: string): Promise<Tank[]> {
    return await db.select().from(tanks).where(eq(tanks.stationId, stationId));
  }

  async getTank(id: string): Promise<Tank | undefined> {
    const [tank] = await db.select().from(tanks).where(eq(tanks.id, id));
    return tank || undefined;
  }

  async createTank(insertTank: InsertTank): Promise<Tank> {
    const [tank] = await db.insert(tanks).values(insertTank).returning();
    return tank;
  }

  async updateTankStock(id: string, currentStock: string): Promise<Tank> {
    const [tank] = await db.update(tanks)
      .set({ currentStock })
      .where(eq(tanks.id, id))
      .returning();
    return tank;
  }

  async getCustomers(): Promise<Customer[]> {
    return await db.select().from(customers).where(eq(customers.isActive, true));
  }

  async getCustomer(id: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    return customer || undefined;
  }

  async createCustomer(insertCustomer: InsertCustomer): Promise<Customer> {
    const [customer] = await db.insert(customers).values(insertCustomer).returning();
    return customer;
  }

  async updateCustomer(id: string, customerData: Partial<InsertCustomer>): Promise<Customer> {
    const [customer] = await db.update(customers)
      .set(customerData)
      .where(eq(customers.id, id))
      .returning();
    return customer;
  }

  async getSuppliers(): Promise<Supplier[]> {
    return await db.select().from(suppliers).where(eq(suppliers.isActive, true));
  }

  async getSupplier(id: string): Promise<Supplier | undefined> {
    const [supplier] = await db.select().from(suppliers).where(eq(suppliers.id, id));
    return supplier || undefined;
  }

  async createSupplier(insertSupplier: InsertSupplier): Promise<Supplier> {
    const [supplier] = await db.insert(suppliers).values(insertSupplier).returning();
    return supplier;
  }

  async getSalesTransactions(stationId: string, limit = 50): Promise<SalesTransaction[]> {
    return await db.select()
      .from(salesTransactions)
      .where(eq(salesTransactions.stationId, stationId))
      .orderBy(desc(salesTransactions.transactionDate))
      .limit(limit);
  }

  async getSalesTransaction(id: string): Promise<SalesTransaction | undefined> {
    const [transaction] = await db.select().from(salesTransactions).where(eq(salesTransactions.id, id));
    return transaction || undefined;
  }

  async createSalesTransaction(insertTransaction: InsertSalesTransaction): Promise<SalesTransaction> {
    const [transaction] = await db.insert(salesTransactions).values(insertTransaction).returning();
    return transaction;
  }

  async createSalesTransactionItem(insertItem: InsertSalesTransactionItem): Promise<SalesTransactionItem> {
    const [item] = await db.insert(salesTransactionItems).values(insertItem).returning();
    return item;
  }

  async getSalesTransactionItems(transactionId: string): Promise<SalesTransactionItem[]> {
    return await db.select()
      .from(salesTransactionItems)
      .where(eq(salesTransactionItems.transactionId, transactionId));
  }

  async getPurchaseOrders(stationId: string): Promise<PurchaseOrder[]> {
    return await db.select()
      .from(purchaseOrders)
      .where(eq(purchaseOrders.stationId, stationId))
      .orderBy(desc(purchaseOrders.orderDate));
  }

  async createPurchaseOrder(insertOrder: InsertPurchaseOrder): Promise<PurchaseOrder> {
    const [order] = await db.insert(purchaseOrders).values(insertOrder).returning();
    return order;
  }

  async createPurchaseOrderItem(insertItem: InsertPurchaseOrderItem): Promise<PurchaseOrderItem> {
    const [item] = await db.insert(purchaseOrderItems).values(insertItem).returning();
    return item;
  }

  async getExpenses(stationId: string): Promise<Expense[]> {
    return await db.select()
      .from(expenses)
      .where(eq(expenses.stationId, stationId))
      .orderBy(desc(expenses.expenseDate));
  }

  async createExpense(insertExpense: InsertExpense): Promise<Expense> {
    const [expense] = await db.insert(expenses).values(insertExpense).returning();
    return expense;
  }

  async getPayments(stationId: string): Promise<Payment[]> {
    return await db.select()
      .from(payments)
      .where(eq(payments.stationId, stationId))
      .orderBy(desc(payments.paymentDate));
  }

  async createPayment(insertPayment: InsertPayment): Promise<Payment> {
    const [payment] = await db.insert(payments).values(insertPayment).returning();
    return payment;
  }

  async getStockMovements(tankId: string): Promise<StockMovement[]> {
    return await db.select()
      .from(stockMovements)
      .where(eq(stockMovements.tankId, tankId))
      .orderBy(desc(stockMovements.movementDate));
  }

  async createStockMovement(insertMovement: InsertStockMovement): Promise<StockMovement> {
    const [movement] = await db.insert(stockMovements).values(insertMovement).returning();
    return movement;
  }

  async getDashboardStats(stationId: string): Promise<any> {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Today's sales
    const todaysSales = await db
      .select({
        totalAmount: sum(salesTransactions.totalAmount),
        count: sql<number>`count(*)`,
      })
      .from(salesTransactions)
      .where(
        and(
          eq(salesTransactions.stationId, stationId),
          gte(salesTransactions.transactionDate, startOfDay)
        )
      );

    // Monthly sales
    const monthlySales = await db
      .select({
        totalAmount: sum(salesTransactions.totalAmount),
        count: sql<number>`count(*)`,
      })
      .from(salesTransactions)
      .where(
        and(
          eq(salesTransactions.stationId, stationId),
          gte(salesTransactions.transactionDate, startOfMonth)
        )
      );

    // Outstanding amount from customers
    const outstanding = await db
      .select({
        totalOutstanding: sum(customers.outstandingAmount),
      })
      .from(customers);

    return {
      todaysSales: todaysSales[0],
      monthlySales: monthlySales[0],
      outstanding: outstanding[0],
    };
  }

  async getSalesReport(stationId: string, startDate: Date, endDate: Date): Promise<any> {
    return await db
      .select({
        date: salesTransactions.transactionDate,
        totalAmount: sum(salesTransactions.totalAmount),
        transactionCount: sql<number>`count(*)`,
      })
      .from(salesTransactions)
      .where(
        and(
          eq(salesTransactions.stationId, stationId),
          gte(salesTransactions.transactionDate, startDate),
          lte(salesTransactions.transactionDate, endDate)
        )
      )
      .groupBy(salesTransactions.transactionDate)
      .orderBy(salesTransactions.transactionDate);
  }

  async getFinancialReport(stationId: string, startDate: Date, endDate: Date): Promise<any> {
    // Revenue
    const revenue = await db
      .select({
        totalRevenue: sum(salesTransactions.totalAmount),
      })
      .from(salesTransactions)
      .where(
        and(
          eq(salesTransactions.stationId, stationId),
          gte(salesTransactions.transactionDate, startDate),
          lte(salesTransactions.transactionDate, endDate)
        )
      );

    // Expenses
    const expenseData = await db
      .select({
        totalExpenses: sum(expenses.amount),
      })
      .from(expenses)
      .where(
        and(
          eq(expenses.stationId, stationId),
          gte(expenses.expenseDate, startDate),
          lte(expenses.expenseDate, endDate)
        )
      );

    return {
      revenue: revenue[0],
      expenses: expenseData[0],
    };
  }
}

export const storage = new DatabaseStorage();
