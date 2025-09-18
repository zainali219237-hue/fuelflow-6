import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertUserSchema, insertStationSchema, insertProductSchema, insertTankSchema,
  insertCustomerSchema, insertSupplierSchema, insertSalesTransactionSchema,
  insertSalesTransactionItemSchema, insertPurchaseOrderSchema, insertPurchaseOrderItemSchema,
  insertExpenseSchema, insertPaymentSchema, insertStockMovementSchema, insertSettingsSchema
} from "@shared/schema";
import bcrypt from "bcrypt";
import { requireAuth, requireRole, requireStationAccess, generateToken, verifyFirebaseToken, AuthenticatedUser } from "./auth";

export async function registerRoutes(app: Express): Promise<Server> {

  // Admin routes (admin only)
  app.get("/api/admin/users", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const users = await storage.getUsers();
      // Remove passwords from response
      const safeUsers = users.map(({ password, ...user }) => user);
      res.json(safeUsers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post("/api/admin/users", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      const hashedPassword = await bcrypt.hash(validatedData.password, 10);
      const userData = { ...validatedData, password: hashedPassword };
      const user = await storage.createUser(userData);
      // Remove password from response
      const { password, ...safeUser } = user;
      res.status(201).json(safeUser);
    } catch (error) {
      res.status(400).json({ message: "Invalid user data" });
    }
  });

  app.put("/api/admin/users/:id", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertUserSchema.partial().parse(req.body);

      // Hash password if provided
      if (validatedData.password) {
        validatedData.password = await bcrypt.hash(validatedData.password, 10);
      }

      const user = await storage.updateUser(id, validatedData);
      // Remove password from response
      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      res.status(400).json({ message: "Invalid user data" });
    }
  });

  app.delete("/api/admin/users/:id", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteUser(id);
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Authentication routes (unprotected)
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;

      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Remove password from response and generate token
      const { password: _, ...userWithoutPassword } = user;
      const authUser: AuthenticatedUser = {
        id: userWithoutPassword.id,
        username: userWithoutPassword.username,
        fullName: userWithoutPassword.fullName,
        role: userWithoutPassword.role,
        stationId: userWithoutPassword.stationId || undefined,
        isGoogleAuth: false
      };

      const token = generateToken(authUser);
      res.json({ user: authUser, token });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/google", async (req, res) => {
    try {
      const { idToken } = req.body;

      if (!idToken) {
        return res.status(400).json({ message: "Firebase ID token required" });
      }

      const decodedToken = await verifyFirebaseToken(idToken);
      if (!decodedToken) {
        return res.status(401).json({ message: "Invalid Firebase token" });
      }

      // Check if user exists in database
      let user = await storage.getUserByUsername(decodedToken.email || decodedToken.uid);

      if (!user) {
        // Create new user for Google sign-in
        const hashedPassword = await bcrypt.hash(Math.random().toString(36), 10); // Random password for Google users
        const newUser = {
          username: decodedToken.email || decodedToken.uid,
          password: hashedPassword,
          fullName: decodedToken.name || decodedToken.email || 'Google User',
          role: 'cashier' as const, // Default role for Google users
          isActive: true
        };

        user = await storage.createUser(newUser);
      }

      // Create authenticated user object
      const authUser: AuthenticatedUser = {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        stationId: user.stationId || undefined,
        email: decodedToken.email,
        isGoogleAuth: true
      };

      const token = generateToken(authUser);
      res.json({ user: authUser, token });
    } catch (error) {
      console.error('Google auth error:', error);
      res.status(500).json({ message: "Google authentication failed" });
    }
  });

  // Get current user
  app.get("/api/auth/me", (req, res) => {
    // This is a placeholder, real implementation should use token or session
    // For now, we simulate a user object if session exists
    // In a real app, you'd verify a JWT from the Authorization header
    const users = [{ id: 1, username: 'admin', email: 'admin@example.com', fullName: 'Admin User', role: 'admin', stationId: 'stn1', password: '' }]; // Dummy user data for simulation
    const user = users.find(u => u.id === req.session?.userId);
    if (user) {
      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        stationId: user.stationId,
        // Add responsive flag for mobile clients
        preferences: {
          sidebarCollapsed: false,
          mobileLayout: true
        }
      });
    } else {
      res.status(401).json({ error: "Not authenticated" });
    }
  });

  // Protected routes (require authentication)
  // Stations routes
  app.get("/api/stations", requireAuth, async (req, res) => {
    try {
      const stations = await storage.getStations();
      res.json(stations);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch stations" });
    }
  });

  app.post("/api/stations", requireAuth, requireRole(['admin', 'manager']), async (req, res) => {
    try {
      const validatedData = insertStationSchema.parse(req.body);
      const station = await storage.createStation(validatedData);
      res.status(201).json(station);
    } catch (error) {
      res.status(400).json({ message: "Invalid station data" });
    }
  });

  app.get("/api/stations/:id", requireAuth, requireStationAccess, async (req, res) => {
    try {
      const { id } = req.params;
      const station = await storage.getStation(id);
      if (!station) {
        return res.status(404).json({ message: "Station not found" });
      }
      res.json(station);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch station" });
    }
  });

  // Settings routes
  app.get("/api/settings/:stationId", requireAuth, requireStationAccess, async (req, res) => {
    try {
      const { stationId } = req.params;
      const settings = await storage.getSettings(stationId);
      if (!settings) {
        // Return default settings if none exist
        const defaultSettings = {
          stationId,
          taxEnabled: false,
          taxRate: '0',
          currencyCode: 'PKR' as const,
        };
        return res.json(defaultSettings);
      }
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  app.post("/api/settings/:stationId", requireAuth, requireRole(['admin', 'manager']), requireStationAccess, async (req, res) => {
    try {
      const { stationId } = req.params;
      // Ensure stationId comes from URL params, not body
      const { stationId: _, ...bodyData } = req.body;
      const validatedData = insertSettingsSchema.parse({ ...bodyData, stationId });

      try {
        const settings = await storage.createSettings(validatedData);
        res.status(201).json(settings);
      } catch (error: any) {
        // Handle unique constraint violation - settings already exist
        if (error.message.includes('duplicate') || error.message.includes('unique')) {
          const existingSettings = await storage.getSettings(stationId);
          if (existingSettings) {
            return res.status(409).json({
              message: "Settings already exist for this station. Use PUT to update.",
              settings: existingSettings
            });
          }
        }
        throw error;
      }
    } catch (error) {
      res.status(400).json({ message: "Invalid settings data" });
    }
  });

  app.put("/api/settings/:stationId", requireAuth, requireRole(['admin', 'manager']), requireStationAccess, async (req, res) => {
    try {
      const { stationId } = req.params;
      // Ensure stationId comes from URL params, not body
      const { stationId: _, ...bodyData } = req.body;
      const validatedData = insertSettingsSchema.partial().parse(bodyData);
      const settings = await storage.updateSettings(stationId, validatedData);
      res.json(settings);
    } catch (error) {
      res.status(400).json({ message: "Invalid settings data" });
    }
  });

  // Products routes
  app.get("/api/products", requireAuth, async (req, res) => {
    try {
      const products = await storage.getProducts();
      res.json(products);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.post("/api/products", requireAuth, requireRole(['admin', 'manager']), async (req, res) => {
    try {
      const validatedData = insertProductSchema.parse(req.body);
      const product = await storage.createProduct(validatedData);
      res.status(201).json(product);
    } catch (error) {
      res.status(400).json({ message: "Invalid product data" });
    }
  });

  app.put("/api/products/:id", requireAuth, requireRole(['admin', 'manager']), async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertProductSchema.partial().parse(req.body);
      const product = await storage.updateProduct(id, validatedData);
      res.json(product);
    } catch (error) {
      res.status(400).json({ message: "Invalid product data" });
    }
  });

  // Tanks routes
  app.get("/api/tanks/:stationId", requireAuth, requireStationAccess, async (req, res) => {
    try {
      const { stationId } = req.params;
      const tanks = await storage.getTanksByStation(stationId);
      res.json(tanks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tanks" });
    }
  });

  app.post("/api/tanks", requireAuth, requireRole(['admin', 'manager']), async (req, res) => {
    try {
      const validatedData = insertTankSchema.parse(req.body);
      const tank = await storage.createTank(validatedData);
      res.status(201).json(tank);
    } catch (error) {
      res.status(400).json({ message: "Invalid tank data" });
    }
  });

  // Stock Movements routes
  app.get("/api/stock-movements/:tankId", requireAuth, async (req, res) => {
    try {
      const { tankId } = req.params;
      const stockMovements = await storage.getStockMovements(tankId);
      res.json(stockMovements);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch stock movements" });
    }
  });

  app.post("/api/stock-movements", requireAuth, async (req, res) => {
    try {
      const validatedData = insertStockMovementSchema.parse(req.body);
      const stockMovement = await storage.createStockMovement(validatedData);
      res.status(201).json(stockMovement);
    } catch (error) {
      res.status(400).json({ message: "Invalid stock movement data" });
    }
  });

  // Customers routes
  app.get("/api/customers", requireAuth, async (req, res) => {
    try {
      const customers = await storage.getCustomers();
      res.json(customers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch customers" });
    }
  });

  app.post("/api/customers", requireAuth, async (req, res) => {
    try {
      const validatedData = insertCustomerSchema.parse(req.body);
      const customer = await storage.createCustomer(validatedData);
      res.status(201).json(customer);
    } catch (error) {
      res.status(400).json({ message: "Invalid customer data" });
    }
  });

  app.put("/api/customers/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertCustomerSchema.partial().parse(req.body);
      const customer = await storage.updateCustomer(id, validatedData);
      res.json(customer);
    } catch (error) {
      res.status(400).json({ message: "Invalid customer data" });
    }
  });

  // Suppliers routes
  app.get("/api/suppliers", requireAuth, async (req, res) => {
    try {
      const suppliers = await storage.getSuppliers();
      res.json(suppliers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch suppliers" });
    }
  });

  app.post("/api/suppliers", requireAuth, requireRole(['admin', 'manager']), async (req, res) => {
    try {
      const validatedData = insertSupplierSchema.parse(req.body);
      const supplier = await storage.createSupplier(validatedData);
      res.status(201).json(supplier);
    } catch (error) {
      res.status(400).json({ message: "Invalid supplier data" });
    }
  });

  app.put("/api/suppliers/:id", requireAuth, requireRole(['admin', 'manager']), async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertSupplierSchema.partial().parse(req.body);
      const supplier = await storage.updateSupplier(id, validatedData);
      res.json(supplier);
    } catch (error) {
      res.status(400).json({ message: "Invalid supplier data" });
    }
  });

  // Sales transactions routes
  app.get("/api/sales/:stationId", requireAuth, requireStationAccess, async (req, res) => {
    try {
      const { stationId } = req.params;
      const { limit } = req.query;
      const sales = await storage.getSalesTransactions(stationId, limit ? parseInt(limit as string) : undefined);
      res.json(sales);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch sales" });
    }
  });

  app.get("/api/sales/detail/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const userStationId = req.user?.stationId || '';
      const userRole = req.user?.role || '';

      const sale = await storage.getSalesTransactionWithItemsSecure(id, userStationId, userRole);
      if (!sale) {
        return res.status(404).json({ message: "Sales transaction not found" });
      }
      res.json(sale);
    } catch (error) {
      if (error instanceof Error && error.message.includes('Access denied')) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to fetch sales transaction details" });
    }
  });

  app.delete("/api/sales/:id", requireAuth, requireRole(['admin', 'manager']), async (req, res) => {
    try {
      const { id } = req.params;
      const userStationId = req.user?.stationId || '';
      const userRole = req.user?.role || '';

      await storage.deleteSalesTransactionSecure(id, userStationId, userRole);
      res.json({ message: "Sales transaction deleted successfully" });
    } catch (error) {
      if (error instanceof Error && error.message.includes('Access denied')) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to delete sales transaction" });
    }
  });

  app.post("/api/sales", requireAuth, async (req, res) => {
    try {
      const { transaction, items } = req.body;

      // Validate transaction data
      const validatedTransaction = insertSalesTransactionSchema.parse(transaction);
      const createdTransaction = await storage.createSalesTransaction(validatedTransaction);

      // Create transaction items
      const createdItems = [];
      for (const item of items) {
        const validatedItem = insertSalesTransactionItemSchema.parse({
          ...item,
          transactionId: createdTransaction.id
        });
        const createdItem = await storage.createSalesTransactionItem(validatedItem);
        createdItems.push(createdItem);

        // Create stock movement (previousStock and newStock are calculated automatically)
        await storage.createStockMovement({
          tankId: item.tankId,
          stationId: validatedTransaction.stationId,
          userId: validatedTransaction.userId,
          movementType: 'out',
          quantity: item.quantity, // Positive quantity - method handles the direction
          previousStock: '0', // Will be calculated automatically
          newStock: '0', // Will be calculated automatically
          referenceId: createdTransaction.id,
          referenceType: 'sale',
          notes: `Sale - Invoice ${createdTransaction.invoiceNumber}`,
          movementDate: new Date(),
        });
      }

      // Update customer outstanding amount for credit sales
      if (validatedTransaction.paymentMethod === 'credit' && validatedTransaction.customerId) {
        await storage.updateCustomerOutstanding(
          validatedTransaction.customerId,
          parseFloat(validatedTransaction.outstandingAmount || '0')
        );
      }

      res.status(201).json({ transaction: createdTransaction, items: createdItems });
    } catch (error) {
      if (error instanceof Error && error.name === 'ZodError') {
        console.error("Sales validation error:", error.message, (error as any).errors);
        return res.status(400).json({
          message: "Validation failed",
          errors: (error as any).errors
        });
      }
      console.error("Sales creation error:", error);
      console.error("Request body:", JSON.stringify(req.body, null, 2));
      res.status(400).json({ message: "Invalid sales data", error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Purchase orders routes
  app.get("/api/purchase-orders/:stationId", requireAuth, requireStationAccess, async (req, res) => {
    try {
      const { stationId } = req.params;
      const orders = await storage.getPurchaseOrders(stationId);
      res.json(orders);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch purchase orders" });
    }
  });

  app.get("/api/purchase-orders/detail/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const userStationId = req.user?.stationId || '';
      const userRole = req.user?.role || '';

      const order = await storage.getPurchaseOrderWithItemsSecure(id, userStationId, userRole);
      if (!order) {
        return res.status(404).json({ message: "Purchase order not found" });
      }
      res.json(order);
    } catch (error) {
      if (error instanceof Error && error.message.includes('Access denied')) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to fetch purchase order details" });
    }
  });

  app.delete("/api/purchase-orders/:id", requireAuth, requireRole(['admin', 'manager']), async (req, res) => {
    try {
      const { id } = req.params;
      const userStationId = req.user?.stationId || '';
      const userRole = req.user?.role || '';

      await storage.deletePurchaseOrderSecure(id, userStationId, userRole);
      res.json({ message: "Purchase order deleted successfully" });
    } catch (error) {
      if (error instanceof Error && error.message.includes('Access denied')) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to delete purchase order" });
    }
  });

  app.post("/api/purchase-orders", requireAuth, requireRole(['admin', 'manager']), async (req, res) => {
    try {
      const { order, items } = req.body;

      const validatedOrder = insertPurchaseOrderSchema.parse(order);
      const createdOrder = await storage.createPurchaseOrder(validatedOrder);

      const createdItems = [];
      for (const item of items) {
        const validatedItem = insertPurchaseOrderItemSchema.parse({
          ...item,
          orderId: createdOrder.id
        });
        const createdItem = await storage.createPurchaseOrderItem(validatedItem);
        createdItems.push(createdItem);
      }

      res.status(201).json({ order: createdOrder, items: createdItems });
    } catch (error) {
      res.status(400).json({ message: "Invalid purchase order data" });
    }
  });

  // Expenses routes
  app.get("/api/expenses/:stationId", requireAuth, requireStationAccess, async (req, res) => {
    try {
      const { stationId } = req.params;
      const expenses = await storage.getExpenses(stationId);
      res.json(expenses);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch expenses" });
    }
  });

  app.delete("/api/expenses/:stationId/:id", requireAuth, requireRole(['admin', 'manager']), requireStationAccess, async (req, res) => {
    try {
      const { id, stationId } = req.params;
      await storage.deleteExpense(id, stationId);
      res.json({ message: "Expense deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete expense" });
    }
  });

  app.post("/api/expenses", requireAuth, async (req, res) => {
    try {
      const validatedData = insertExpenseSchema.parse(req.body);
      const expense = await storage.createExpense(validatedData);
      res.status(201).json(expense);
    } catch (error) {
      res.status(400).json({ message: "Invalid expense data" });
    }
  });

  // Payments routes
  app.get("/api/payments/:stationId", requireAuth, requireStationAccess, async (req, res) => {
    try {
      const { stationId } = req.params;
      const payments = await storage.getPayments(stationId);
      res.json(payments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch payments" });
    }
  });

  app.delete("/api/payments/:stationId/:id", requireAuth, requireRole(['admin', 'manager']), requireStationAccess, async (req, res) => {
    try {
      const { id, stationId } = req.params;
      await storage.deletePayment(id, stationId);
      res.json({ message: "Payment deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete payment" });
    }
  });

  app.post("/api/payments", requireAuth, async (req, res) => {
    try {
      // Validate that user has stationId for security
      if (!req.user.stationId) {
        return res.status(400).json({ message: "User must be assigned to a station to record payments" });
      }

      // Extract only allowed fields from client, ignore userId/stationId
      const { customerId, supplierId, amount, currencyCode, paymentMethod, referenceNumber, notes, type } = req.body;

      // Use server-side attribution from authenticated user
      const paymentData = {
        customerId,
        supplierId,
        amount,
        currencyCode: currencyCode || 'PKR',
        paymentMethod,
        referenceNumber,
        notes,
        type,
        // Server-side attribution - never trust client
        userId: req.user.id,
        stationId: req.user.stationId
      };

      const payment = await storage.createPayment(paymentData);
      res.status(201).json(payment);
    } catch (error) {
      console.error('Payment creation error:', error);
      res.status(400).json({ message: "Invalid payment data" });
    }
  });

  // Dashboard stats
  app.get("/api/dashboard/:stationId", requireAuth, requireStationAccess, async (req, res) => {
    try {
      const { stationId } = req.params;
      const stats = await storage.getDashboardStats(stationId);
      console.log('Dashboard stats:', JSON.stringify(stats, null, 2));
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Reports
  app.get("/api/reports/sales/:stationId", requireAuth, requireStationAccess, async (req, res) => {
    try {
      const { stationId } = req.params;
      const { startDate, endDate } = req.query;

      const report = await storage.getSalesReport(
        stationId,
        new Date(startDate as string),
        new Date(endDate as string)
      );
      res.json(report);
    } catch (error) {
      res.status(500).json({ message: "Failed to generate sales report" });
    }
  });

  app.get("/api/reports/financial/:stationId", requireAuth, requireStationAccess, async (req, res) => {
    try {
      const { stationId } = req.params;
      const { startDate, endDate } = req.query;

      const report = await storage.getFinancialReport(
        stationId,
        new Date(startDate as string),
        new Date(endDate as string)
      );
      res.json(report);
    } catch (error) {
      res.status(500).json({ message: "Failed to generate financial report" });
    }
  });

  app.get("/api/reports/daily/:stationId", requireAuth, requireStationAccess, async (req, res) => {
    try {
      const { stationId } = req.params;
      const { date } = req.query;

      const report = await storage.getDailyReport(
        stationId,
        date ? new Date(date as string) : new Date()
      );
      res.json(report);
    } catch (error) {
      res.status(500).json({ message: "Failed to generate daily report" });
    }
  });

  app.get("/api/reports/aging/:stationId", requireAuth, requireStationAccess, async (req, res) => {
    try {
      const { stationId } = req.params;
      const { type } = req.query;

      if (!type || (type !== 'receivable' && type !== 'payable')) {
        return res.status(400).json({ message: "Type parameter must be 'receivable' or 'payable'" });
      }

      const report = await storage.getAgingReport(stationId, type as 'receivable' | 'payable');
      res.json(report);
    } catch (error) {
      res.status(500).json({ message: "Failed to generate aging report" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}