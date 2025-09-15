import { 
  users, stations, products, tanks, customers, suppliers, 
  salesTransactions, salesTransactionItems, purchaseOrders, purchaseOrderItems,
  expenses, payments, stockMovements, priceHistory, settings,
  type User, type InsertUser, type Station, type InsertStation,
  type Product, type InsertProduct, type Tank, type InsertTank,
  type Customer, type InsertCustomer, type Supplier, type InsertSupplier,
  type SalesTransaction, type InsertSalesTransaction,
  type SalesTransactionItem, type InsertSalesTransactionItem,
  type PurchaseOrder, type InsertPurchaseOrder,
  type PurchaseOrderItem, type InsertPurchaseOrderItem,
  type Expense, type InsertExpense, type Payment, type InsertPayment,
  type StockMovement, type InsertStockMovement,
  type PriceHistory, type InsertPriceHistory,
  type Settings, type InsertSettings
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
  getTanksByStation(stationId: string): Promise<(Tank & { product: Product })[]>;
  getTank(id: string): Promise<Tank | undefined>;
  createTank(tank: InsertTank): Promise<Tank>;
  updateTankStock(id: string, currentStock: number): Promise<Tank>;
  
  // Customers
  getCustomers(): Promise<Customer[]>;
  getCustomer(id: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: string, customer: Partial<InsertCustomer>): Promise<Customer>;
  updateCustomerOutstanding(customerId: string, additionalAmount: number): Promise<void>;
  
  // Suppliers
  getSuppliers(): Promise<Supplier[]>;
  getSupplier(id: string): Promise<Supplier | undefined>;
  createSupplier(supplier: InsertSupplier): Promise<Supplier>;
  updateSupplier(id: string, supplier: Partial<InsertSupplier>): Promise<Supplier>;
  updateSupplierOutstanding(supplierId: string, additionalAmount: number): Promise<void>;
  
  // Sales Transactions
  getSalesTransactions(stationId: string, limit?: number): Promise<SalesTransaction[]>;
  getSalesTransaction(id: string): Promise<SalesTransaction | undefined>;
  getSalesTransactionWithItems(id: string): Promise<(SalesTransaction & { items: (SalesTransactionItem & { product: Product })[], customer: Customer, station: Station, user: User }) | undefined>;
  getSalesTransactionWithItemsSecure(id: string, userStationId: string, userRole: string): Promise<(SalesTransaction & { items: (SalesTransactionItem & { product: Product })[], customer: Customer, station: Station, user: User }) | undefined>;
  createSalesTransaction(transaction: InsertSalesTransaction): Promise<SalesTransaction>;
  deleteSalesTransaction(id: string): Promise<void>;
  deleteSalesTransactionSecure(id: string, userStationId: string, userRole: string): Promise<void>;
  
  // Sales Transaction Items
  createSalesTransactionItem(item: InsertSalesTransactionItem): Promise<SalesTransactionItem>;
  getSalesTransactionItems(transactionId: string): Promise<SalesTransactionItem[]>;
  
  // Purchase Orders
  getPurchaseOrders(stationId: string): Promise<PurchaseOrder[]>;
  getPurchaseOrder(id: string): Promise<PurchaseOrder | undefined>;
  getPurchaseOrderWithItems(id: string): Promise<(PurchaseOrder & { items: PurchaseOrderItem[], supplier: Supplier, station: Station }) | undefined>;
  getPurchaseOrderWithItemsSecure(id: string, userStationId: string, userRole: string): Promise<(PurchaseOrder & { items: PurchaseOrderItem[], supplier: Supplier, station: Station }) | undefined>;
  createPurchaseOrder(order: InsertPurchaseOrder): Promise<PurchaseOrder>;
  deletePurchaseOrder(id: string): Promise<void>;
  deletePurchaseOrderSecure(id: string, userStationId: string, userRole: string): Promise<void>;
  
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
  getDailyReport(stationId: string, date: Date): Promise<any>;
  getAgingReport(stationId: string, type: 'receivable' | 'payable'): Promise<any>;
  deletePayment(id: string, stationId: string): Promise<void>;
  deleteExpense(id: string, stationId: string): Promise<void>;
  
  // Settings
  getSettings(stationId: string): Promise<Settings | undefined>;
  createSettings(settings: InsertSettings): Promise<Settings>;
  updateSettings(stationId: string, settings: Partial<InsertSettings>): Promise<Settings>;
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

  async getTanksByStation(stationId: string): Promise<(Tank & { product: Product })[]> {
    const result = await db
      .select({
        // Tank fields
        id: tanks.id,
        stationId: tanks.stationId,
        name: tanks.name,
        productId: tanks.productId,
        capacity: tanks.capacity,
        currentStock: tanks.currentStock,
        minimumLevel: tanks.minimumLevel,
        status: tanks.status,
        lastRefillDate: tanks.lastRefillDate,
        createdAt: tanks.createdAt,
        // Product fields (nested)
        product: {
          id: products.id,
          name: products.name,
          category: products.category,
          unit: products.unit,
          currentPrice: products.currentPrice,
          density: products.density,
          hsnCode: products.hsnCode,
          taxRate: products.taxRate,
          isActive: products.isActive,
          createdAt: products.createdAt
        }
      })
      .from(tanks)
      .innerJoin(products, eq(tanks.productId, products.id))
      .where(eq(tanks.stationId, stationId));
    
    return result as (Tank & { product: Product })[];
  }

  async getTank(id: string): Promise<Tank | undefined> {
    const [tank] = await db.select().from(tanks).where(eq(tanks.id, id));
    return tank || undefined;
  }

  async createTank(insertTank: InsertTank): Promise<Tank> {
    const [tank] = await db.insert(tanks).values(insertTank).returning();
    return tank;
  }

  async updateTankStock(id: string, currentStock: number): Promise<Tank> {
    const [tank] = await db.update(tanks)
      .set({ currentStock: currentStock.toString() })
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

  async updateCustomerOutstanding(customerId: string, additionalAmount: number): Promise<void> {
    try {
      const result = await db.update(customers)
        .set({ 
          outstandingAmount: sql`${customers.outstandingAmount} + ${additionalAmount}` 
        })
        .where(eq(customers.id, customerId))
        .returning({ id: customers.id });
        
      if (result.length === 0) {
        throw new Error(`Customer ${customerId} not found`);
      }
    } catch (error) {
      throw new Error(`Failed to update customer outstanding amount: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateSupplierOutstanding(supplierId: string, additionalAmount: number): Promise<void> {
    try {
      const result = await db.update(suppliers)
        .set({ 
          outstandingAmount: sql`${suppliers.outstandingAmount} + ${additionalAmount}` 
        })
        .where(eq(suppliers.id, supplierId))
        .returning({ id: suppliers.id });
        
      if (result.length === 0) {
        throw new Error(`Supplier ${supplierId} not found`);
      }
    } catch (error) {
      throw new Error(`Failed to update supplier outstanding amount: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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

  async updateSupplier(id: string, supplierData: Partial<InsertSupplier>): Promise<Supplier> {
    const [supplier] = await db.update(suppliers)
      .set(supplierData)
      .where(eq(suppliers.id, id))
      .returning();
    if (!supplier) throw new Error("Supplier not found");
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
    try {
      const [transaction] = await db.insert(salesTransactions).values(insertTransaction).returning();
      return transaction;
    } catch (error) {
      throw new Error(`Failed to create sales transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
    try {
      const [order] = await db.insert(purchaseOrders).values(insertOrder).returning();
      return order;
    } catch (error) {
      throw new Error(`Failed to create purchase order: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
    try {
      // Start a transaction to ensure atomicity
      const result = await db.transaction(async (tx) => {
        // Create the payment record
        const [payment] = await tx.insert(payments).values(insertPayment).returning();
        
        // Update outstanding amounts based on payment type
        const paymentAmount = parseFloat(payment.amount);
        
        if (payment.type === 'receivable' && payment.customerId) {
          // Customer payment - reduce customer's outstanding amount
          await tx.update(customers)
            .set({ 
              outstandingAmount: sql`${customers.outstandingAmount} - ${paymentAmount}` 
            })
            .where(eq(customers.id, payment.customerId));
        } else if (payment.type === 'payable' && payment.supplierId) {
          // Supplier payment - reduce supplier's outstanding amount
          await tx.update(suppliers)
            .set({ 
              outstandingAmount: sql`${suppliers.outstandingAmount} - ${paymentAmount}` 
            })
            .where(eq(suppliers.id, payment.supplierId));
        }
        
        return payment;
      });
      
      return result;
    } catch (error) {
      throw new Error(`Failed to create payment and update outstanding amounts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getStockMovements(tankId: string): Promise<StockMovement[]> {
    return await db.select()
      .from(stockMovements)
      .where(eq(stockMovements.tankId, tankId))
      .orderBy(desc(stockMovements.movementDate));
  }

  async createStockMovement(insertMovement: InsertStockMovement): Promise<StockMovement & { updatedTank?: Tank }> {
    return await db.transaction(async (tx) => {
      // Get current tank stock
      const [currentTank] = await tx.select().from(tanks).where(eq(tanks.id, insertMovement.tankId));
      if (!currentTank) {
        throw new Error(`Tank ${insertMovement.tankId} not found`);
      }

      const currentStock = parseFloat(currentTank.currentStock || '0');
      const movementQuantity = parseFloat(insertMovement.quantity);
      
      // Calculate new stock based on movement type
      let newStock: number;
      switch (insertMovement.movementType) {
        case 'in':
          newStock = currentStock + Math.abs(movementQuantity);
          break;
        case 'out':
          newStock = Math.max(0, currentStock - Math.abs(movementQuantity));
          break;
        case 'adjustment':
          // For adjustments, quantity can be positive or negative
          newStock = Math.max(0, currentStock + movementQuantity);
          break;
        case 'transfer':
          // For transfers, this handles the source tank (out)
          newStock = Math.max(0, currentStock - Math.abs(movementQuantity));
          break;
        case 'audit':
          // For audits, the new quantity IS the new stock (not a delta)
          newStock = Math.max(0, Math.abs(movementQuantity));
          break;
        default:
          throw new Error(`Invalid movement type: ${insertMovement.movementType}`);
      }

      // Create stock movement record with correct values
      const movementData = {
        ...insertMovement,
        previousStock: currentStock.toString(),
        newStock: newStock.toString(),
      };
      
      const [movement] = await tx.insert(stockMovements).values(movementData).returning();
      
      // Update tank stock and set last refill date if it's an 'in' movement
      const updateData: any = { currentStock: newStock.toString() };
      if (insertMovement.movementType === 'in') {
        updateData.lastRefillDate = new Date();
      }
      
      const [updatedTank] = await tx.update(tanks)
        .set(updateData)
        .where(eq(tanks.id, insertMovement.tankId))
        .returning();

      return {
        ...movement,
        updatedTank
      };
    });
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

  async getSalesTransactionWithItems(id: string): Promise<(SalesTransaction & { items: (SalesTransactionItem & { product: Product })[], customer: Customer, station: Station, user: User }) | undefined> {
    const transaction = await db
      .select()
      .from(salesTransactions)
      .leftJoin(customers, eq(salesTransactions.customerId, customers.id))
      .leftJoin(stations, eq(salesTransactions.stationId, stations.id))
      .leftJoin(users, eq(salesTransactions.userId, users.id))
      .where(eq(salesTransactions.id, id))
      .then(results => results[0]);

    if (!transaction) return undefined;
    
    // Ensure customer, station, and user exist - if not, the data is inconsistent
    if (!transaction.customers || !transaction.stations || !transaction.users) {
      throw new Error(`Sales transaction ${id} has missing customer, station, or user data`);
    }

    const itemsWithProducts = await db
      .select({
        // SalesTransactionItem fields
        id: salesTransactionItems.id,
        transactionId: salesTransactionItems.transactionId,
        productId: salesTransactionItems.productId,
        tankId: salesTransactionItems.tankId,
        quantity: salesTransactionItems.quantity,
        unitPrice: salesTransactionItems.unitPrice,
        totalPrice: salesTransactionItems.totalPrice,
        createdAt: salesTransactionItems.createdAt,
        // Product fields (nested)
        product: {
          id: products.id,
          name: products.name,
          category: products.category,
          unit: products.unit,
          currentPrice: products.currentPrice,
          density: products.density,
          hsnCode: products.hsnCode,
          taxRate: products.taxRate,
          isActive: products.isActive,
          createdAt: products.createdAt
        }
      })
      .from(salesTransactionItems)
      .innerJoin(products, eq(salesTransactionItems.productId, products.id))
      .where(eq(salesTransactionItems.transactionId, id));

    return {
      ...transaction.sales_transactions,
      items: itemsWithProducts as (SalesTransactionItem & { product: Product })[],
      customer: transaction.customers,
      station: transaction.stations,
      user: transaction.users
    };
  }

  async getSalesTransactionWithItemsSecure(id: string, userStationId: string, userRole: string): Promise<(SalesTransaction & { items: (SalesTransactionItem & { product: Product })[], customer: Customer, station: Station, user: User }) | undefined> {
    const transaction = await db
      .select()
      .from(salesTransactions)
      .leftJoin(customers, eq(salesTransactions.customerId, customers.id))
      .leftJoin(stations, eq(salesTransactions.stationId, stations.id))
      .leftJoin(users, eq(salesTransactions.userId, users.id))
      .where(eq(salesTransactions.id, id))
      .then(results => results[0]);

    if (!transaction) return undefined;
    
    // Ensure customer, station, and user exist - if not, the data is inconsistent
    if (!transaction.customers || !transaction.stations || !transaction.users) {
      throw new Error(`Sales transaction ${id} has missing customer, station, or user data`);
    }

    // Security check: verify the transaction belongs to the user's station (admins can access all)
    if (userRole !== 'admin' && transaction.sales_transactions.stationId !== userStationId) {
      throw new Error('Access denied: Transaction does not belong to your station');
    }

    const itemsWithProducts = await db
      .select({
        // SalesTransactionItem fields
        id: salesTransactionItems.id,
        transactionId: salesTransactionItems.transactionId,
        productId: salesTransactionItems.productId,
        tankId: salesTransactionItems.tankId,
        quantity: salesTransactionItems.quantity,
        unitPrice: salesTransactionItems.unitPrice,
        totalPrice: salesTransactionItems.totalPrice,
        createdAt: salesTransactionItems.createdAt,
        // Product fields (nested)
        product: {
          id: products.id,
          name: products.name,
          category: products.category,
          unit: products.unit,
          currentPrice: products.currentPrice,
          density: products.density,
          hsnCode: products.hsnCode,
          taxRate: products.taxRate,
          isActive: products.isActive,
          createdAt: products.createdAt
        }
      })
      .from(salesTransactionItems)
      .innerJoin(products, eq(salesTransactionItems.productId, products.id))
      .where(eq(salesTransactionItems.transactionId, id));

    return {
      ...transaction.sales_transactions,
      items: itemsWithProducts as (SalesTransactionItem & { product: Product })[],
      customer: transaction.customers,
      station: transaction.stations,
      user: transaction.users
    };
  }

  async deleteSalesTransaction(id: string): Promise<void> {
    await db.transaction(async (tx) => {
      // Delete related transaction items first
      await tx.delete(salesTransactionItems).where(eq(salesTransactionItems.transactionId, id));
      
      // Delete the transaction
      await tx.delete(salesTransactions).where(eq(salesTransactions.id, id));
    });
  }

  async deleteSalesTransactionSecure(id: string, userStationId: string, userRole: string): Promise<void> {
    await db.transaction(async (tx) => {
      // First verify the transaction belongs to the user's station (unless admin)
      if (userRole !== 'admin') {
        const [transaction] = await tx.select({ stationId: salesTransactions.stationId })
          .from(salesTransactions)
          .where(eq(salesTransactions.id, id));
        
        if (!transaction) {
          throw new Error('Sales transaction not found');
        }
        
        if (transaction.stationId !== userStationId) {
          throw new Error('Access denied: Transaction does not belong to your station');
        }
      }
      
      // Delete related transaction items first
      await tx.delete(salesTransactionItems).where(eq(salesTransactionItems.transactionId, id));
      
      // Delete the transaction
      const result = await tx.delete(salesTransactions).where(eq(salesTransactions.id, id)).returning({ id: salesTransactions.id });
      
      if (result.length === 0) {
        throw new Error('Sales transaction not found');
      }
    });
  }

  async getPurchaseOrder(id: string): Promise<PurchaseOrder | undefined> {
    const [order] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, id));
    return order || undefined;
  }

  async deletePurchaseOrder(id: string): Promise<void> {
    await db.transaction(async (tx) => {
      // Delete related order items first
      await tx.delete(purchaseOrderItems).where(eq(purchaseOrderItems.orderId, id));
      
      // Delete the purchase order
      await tx.delete(purchaseOrders).where(eq(purchaseOrders.id, id));
    });
  }

  async getPurchaseOrderWithItems(id: string): Promise<(PurchaseOrder & { items: PurchaseOrderItem[], supplier: Supplier, station: Station }) | undefined> {
    const order = await db
      .select()
      .from(purchaseOrders)
      .leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
      .leftJoin(stations, eq(purchaseOrders.stationId, stations.id))
      .where(eq(purchaseOrders.id, id))
      .then(results => results[0]);

    if (!order) return undefined;
    
    // Ensure supplier and station exist - if not, the data is inconsistent
    if (!order.suppliers || !order.stations) {
      throw new Error(`Purchase order ${id} has missing supplier or station data`);
    }

    const items = await db
      .select()
      .from(purchaseOrderItems)
      .where(eq(purchaseOrderItems.orderId, id));

    return {
      ...order.purchase_orders,
      items,
      supplier: order.suppliers,
      station: order.stations
    };
  }

  async getPurchaseOrderWithItemsSecure(id: string, userStationId: string, userRole: string): Promise<(PurchaseOrder & { items: PurchaseOrderItem[], supplier: Supplier, station: Station }) | undefined> {
    const order = await db
      .select()
      .from(purchaseOrders)
      .leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
      .leftJoin(stations, eq(purchaseOrders.stationId, stations.id))
      .where(eq(purchaseOrders.id, id))
      .then(results => results[0]);

    if (!order) return undefined;
    
    // Ensure supplier and station exist - if not, the data is inconsistent
    if (!order.suppliers || !order.stations) {
      throw new Error(`Purchase order ${id} has missing supplier or station data`);
    }

    // Security check: verify the order belongs to the user's station (admins can access all)
    if (userRole !== 'admin' && order.purchase_orders.stationId !== userStationId) {
      throw new Error('Access denied: Purchase order does not belong to your station');
    }

    const items = await db
      .select()
      .from(purchaseOrderItems)
      .where(eq(purchaseOrderItems.orderId, id));

    return {
      ...order.purchase_orders,
      items,
      supplier: order.suppliers,
      station: order.stations
    };
  }

  async deletePurchaseOrderSecure(id: string, userStationId: string, userRole: string): Promise<void> {
    await db.transaction(async (tx) => {
      // First verify the order belongs to the user's station (unless admin)
      if (userRole !== 'admin') {
        const [order] = await tx.select({ stationId: purchaseOrders.stationId })
          .from(purchaseOrders)
          .where(eq(purchaseOrders.id, id));
        
        if (!order) {
          throw new Error('Purchase order not found');
        }
        
        if (order.stationId !== userStationId) {
          throw new Error('Access denied: Purchase order does not belong to your station');
        }
      }
      
      // Delete related order items first
      await tx.delete(purchaseOrderItems).where(eq(purchaseOrderItems.orderId, id));
      
      // Delete the purchase order
      const result = await tx.delete(purchaseOrders).where(eq(purchaseOrders.id, id)).returning({ id: purchaseOrders.id });
      
      if (result.length === 0) {
        throw new Error('Purchase order not found');
      }
    });
  }

  async getDailyReport(stationId: string, date: Date): Promise<any> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Sales by payment method
    const salesByMethod = await db
      .select({
        paymentMethod: salesTransactions.paymentMethod,
        totalAmount: sum(salesTransactions.totalAmount),
        count: sql<number>`count(*)`,
        currencyCode: salesTransactions.currencyCode
      })
      .from(salesTransactions)
      .where(
        and(
          eq(salesTransactions.stationId, stationId),
          gte(salesTransactions.transactionDate, startOfDay),
          lte(salesTransactions.transactionDate, endOfDay)
        )
      )
      .groupBy(salesTransactions.paymentMethod, salesTransactions.currencyCode);

    // Expenses
    const dailyExpenses = await db
      .select({
        category: expenses.category,
        totalAmount: sum(expenses.amount),
        currencyCode: expenses.currencyCode
      })
      .from(expenses)
      .where(
        and(
          eq(expenses.stationId, stationId),
          gte(expenses.expenseDate, startOfDay),
          lte(expenses.expenseDate, endOfDay)
        )
      )
      .groupBy(expenses.category, expenses.currencyCode);

    return {
      date,
      salesByMethod,
      expenses: dailyExpenses
    };
  }

  async getAgingReport(stationId: string, type: 'receivable' | 'payable'): Promise<any> {
    try {
      if (type === 'receivable') {
        // Get all outstanding receivables
        const receivables = await db
          .select({
            id: salesTransactions.id,
            invoiceNumber: salesTransactions.invoiceNumber,
            customerName: customers.name,
            transactionDate: salesTransactions.transactionDate,
            dueDate: salesTransactions.dueDate,
            totalAmount: salesTransactions.totalAmount,
            paidAmount: salesTransactions.paidAmount,
            outstandingAmount: salesTransactions.outstandingAmount,
            currencyCode: salesTransactions.currencyCode,
            daysOverdue: sql<number>`CASE 
              WHEN ${salesTransactions.dueDate} IS NULL THEN 0
              WHEN ${salesTransactions.dueDate} < CURRENT_DATE THEN EXTRACT(day FROM CURRENT_DATE - ${salesTransactions.dueDate})::integer
              ELSE 0
            END`
          })
          .from(salesTransactions)
          .leftJoin(customers, eq(salesTransactions.customerId, customers.id))
          .where(
            and(
              eq(salesTransactions.stationId, stationId),
              sql`${salesTransactions.outstandingAmount} > 0`
            )
          )
          .orderBy(salesTransactions.dueDate);

        // Group into age buckets
        const buckets = {
          current: receivables.filter(r => r.daysOverdue <= 0),
          days30: receivables.filter(r => r.daysOverdue > 0 && r.daysOverdue <= 30),
          days60: receivables.filter(r => r.daysOverdue > 30 && r.daysOverdue <= 60),
          days90: receivables.filter(r => r.daysOverdue > 60 && r.daysOverdue <= 90),
          over90: receivables.filter(r => r.daysOverdue > 90)
        };

        // Calculate totals for each bucket
        const totals = {
          current: buckets.current.reduce((sum, r) => sum + Number(r.outstandingAmount), 0),
          days30: buckets.days30.reduce((sum, r) => sum + Number(r.outstandingAmount), 0),
          days60: buckets.days60.reduce((sum, r) => sum + Number(r.outstandingAmount), 0),
          days90: buckets.days90.reduce((sum, r) => sum + Number(r.outstandingAmount), 0),
          over90: buckets.over90.reduce((sum, r) => sum + Number(r.outstandingAmount), 0)
        };

        return {
          type: 'receivable',
          buckets,
          totals,
          grandTotal: Object.values(totals).reduce((sum, total) => sum + total, 0),
          details: receivables
        };

      } else {
        // Get all outstanding payables
        const payables = await db
          .select({
            id: purchaseOrders.id,
            orderNumber: purchaseOrders.orderNumber,
            supplierName: suppliers.name,
            orderDate: purchaseOrders.orderDate,
            dueDate: purchaseOrders.dueDate,
            totalAmount: purchaseOrders.totalAmount,
            paidAmount: purchaseOrders.paidAmount,
            outstandingAmount: sql<string>`${purchaseOrders.totalAmount} - ${purchaseOrders.paidAmount}`,
            currencyCode: purchaseOrders.currencyCode,
            daysOverdue: sql<number>`CASE 
              WHEN ${purchaseOrders.dueDate} IS NULL THEN 0
              WHEN ${purchaseOrders.dueDate} < CURRENT_DATE THEN EXTRACT(day FROM CURRENT_DATE - ${purchaseOrders.dueDate})::integer
              ELSE 0
            END`
          })
          .from(purchaseOrders)
          .leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
          .where(
            and(
              eq(purchaseOrders.stationId, stationId),
              sql`${purchaseOrders.totalAmount} - ${purchaseOrders.paidAmount} > 0`
            )
          )
          .orderBy(purchaseOrders.dueDate);

        // Group into age buckets
        const buckets = {
          current: payables.filter(p => p.daysOverdue <= 0),
          days30: payables.filter(p => p.daysOverdue > 0 && p.daysOverdue <= 30),
          days60: payables.filter(p => p.daysOverdue > 30 && p.daysOverdue <= 60),
          days90: payables.filter(p => p.daysOverdue > 60 && p.daysOverdue <= 90),
          over90: payables.filter(p => p.daysOverdue > 90)
        };

        // Calculate totals for each bucket
        const totals = {
          current: buckets.current.reduce((sum, p) => sum + Number(p.outstandingAmount), 0),
          days30: buckets.days30.reduce((sum, p) => sum + Number(p.outstandingAmount), 0),
          days60: buckets.days60.reduce((sum, p) => sum + Number(p.outstandingAmount), 0),
          days90: buckets.days90.reduce((sum, p) => sum + Number(p.outstandingAmount), 0),
          over90: buckets.over90.reduce((sum, p) => sum + Number(p.outstandingAmount), 0)
        };

        return {
          type: 'payable',
          buckets,
          totals,
          grandTotal: Object.values(totals).reduce((sum, total) => sum + total, 0),
          details: payables
        };
      }
    } catch (error) {
      throw new Error(`Failed to generate aging report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deletePayment(id: string, stationId: string): Promise<void> {
    try {
      const result = await db.delete(payments).where(
        and(
          eq(payments.id, id),
          eq(payments.stationId, stationId)
        )
      ).returning({ id: payments.id });
      
      if (result.length === 0) {
        throw new Error(`Payment ${id} not found or not authorized for station ${stationId}`);
      }
    } catch (error) {
      throw new Error(`Failed to delete payment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteExpense(id: string, stationId: string): Promise<void> {
    try {
      const result = await db.delete(expenses).where(
        and(
          eq(expenses.id, id),
          eq(expenses.stationId, stationId)
        )
      ).returning({ id: expenses.id });
      
      if (result.length === 0) {
        throw new Error(`Expense ${id} not found or not authorized for station ${stationId}`);
      }
    } catch (error) {
      throw new Error(`Failed to delete expense: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  async getSettings(stationId: string): Promise<Settings | undefined> {
    const [setting] = await db.select().from(settings).where(eq(settings.stationId, stationId));
    return setting || undefined;
  }

  async createSettings(insertSettings: InsertSettings): Promise<Settings> {
    const [setting] = await db.insert(settings).values(insertSettings).returning();
    return setting;
  }

  async updateSettings(stationId: string, settingsData: Partial<InsertSettings>): Promise<Settings> {
    const [setting] = await db.update(settings)
      .set({ ...settingsData, updatedAt: new Date() })
      .where(eq(settings.stationId, stationId))
      .returning();
    if (!setting) throw new Error("Settings not found");
    return setting;
  }
}

export const storage = new DatabaseStorage();
