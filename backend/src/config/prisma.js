const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

// Initialize the PostgreSQL pool using your DATABASE_URL from .env
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL 
});

// Create the driver adapter instance
const adapter = new PrismaPg(pool);

// Instantiate PrismaClient with the driver adapter
const prisma = new PrismaClient({ adapter });

module.exports = prisma;