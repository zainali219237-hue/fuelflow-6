import { storage } from "./storage";
import bcrypt from "bcrypt";
import { db } from "./db";
import { users, stations, products, tanks } from "@shared/schema";
import { sql } from "drizzle-orm";

export async function seedInitialData() {
  try {
    // Check if database already has data
    const [userCount] = await db.select({ count: sql<number>`count(*)` }).from(users);
    if (userCount.count > 0) {
      console.log("Database already seeded, skipping initial data creation");
      return;
    }

    console.log("Seeding initial data...");

    // 1. Create a station
    const station = await storage.createStation({
      name: "FuelFlow Station 1",
      address: "123 Main Street, Demo City",
      gstNumber: "GST123456789",
      licenseNumber: "LIC123456",
      contactPhone: "+1-234-567-8900",
      contactEmail: "station@fuelflow.com",
      defaultCurrency: "PKR",
      isActive: true
    });

    console.log("Created station:", station.name);

    // 2. Create products (fuel types)
    const petrolProduct = await storage.createProduct({
      name: "Petrol",
      category: "fuel",
      unit: "litre",
      currentPrice: "290.00",
      density: "0.740",
      hsnCode: "27101990",
      taxRate: "0.00",
      isActive: true
    });

    const dieselProduct = await storage.createProduct({
      name: "Diesel",
      category: "fuel", 
      unit: "litre",
      currentPrice: "280.00",
      density: "0.830",
      hsnCode: "27101110",
      taxRate: "0.00",
      isActive: true
    });

    console.log("Created products:", petrolProduct.name, dieselProduct.name);

    // 3. Create tanks
    const petrolTank = await storage.createTank({
      stationId: station.id,
      name: "Tank 1 - Petrol",
      productId: petrolProduct.id,
      capacity: "20000.00",
      currentStock: "12000.00",
      minimumLevel: "3000.00",
      status: "normal",
      lastRefillDate: new Date()
    });

    const dieselTank = await storage.createTank({
      stationId: station.id,
      name: "Tank 2 - Diesel", 
      productId: dieselProduct.id,
      capacity: "20000.00",
      currentStock: "4000.00", // Low stock to show alert
      minimumLevel: "3000.00",
      status: "low",
      lastRefillDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
    });

    console.log("Created tanks:", petrolTank.name, dieselTank.name);

    // 4. Create demo users with hashed passwords
    const saltRounds = 10;

    const adminUser = await storage.createUser({
      username: "admin",
      password: await bcrypt.hash("admin123", saltRounds),
      fullName: "Admin User",
      role: "admin",
      stationId: station.id,
      isActive: true
    });

    const managerUser = await storage.createUser({
      username: "manager", 
      password: await bcrypt.hash("manager123", saltRounds),
      fullName: "Manager User",
      role: "manager",
      stationId: station.id,
      isActive: true
    });

    const cashierUser = await storage.createUser({
      username: "cashier",
      password: await bcrypt.hash("cashier123", saltRounds), 
      fullName: "Cashier User",
      role: "cashier",
      stationId: station.id,
      isActive: true
    });

    console.log("Created users:", adminUser.username, managerUser.username, cashierUser.username);

    // 5. Create some stock movements for realistic data
    await storage.createStockMovement({
      tankId: petrolTank.id,
      stationId: station.id,
      userId: adminUser.id,
      movementType: "in",
      quantity: "8000.00",
      previousStock: "4000.00",
      newStock: "12000.00",
      referenceType: "adjustment",
      notes: "Initial stock refill"
    });

    await storage.createStockMovement({
      tankId: dieselTank.id,
      stationId: station.id,
      userId: adminUser.id,
      movementType: "in", 
      quantity: "3000.00",
      previousStock: "1000.00",
      newStock: "4000.00",
      referenceType: "adjustment",
      notes: "Initial stock refill"
    });

    console.log("Created initial stock movements");
    console.log("✅ Initial data seeding completed successfully!");
    console.log("Demo login credentials:");
    console.log("- Admin: admin / admin123");
    console.log("- Manager: manager / manager123");
    console.log("- Cashier: cashier / cashier123");

  } catch (error) {
    console.error("Error seeding initial data:", error);
    throw error;
  }
}