import express from "express"
import cors from "cors"
import dotenv from "dotenv"
import { sequelize, syncDatabase } from "./models/index.js"
import authRoutes from "./routes/authRoutes.js"
import userRoutes from "./routes/userRoutes.js"
import categoryRoutes from "./routes/categoryRoutes.js"
import itemRoutes from "./routes/itemRoutes.js"
import fractionRoutes from "./routes/fractionRoutes.js"
import salesRoutes from "./routes/salesRoutes.js"
import businessRoutes from "./routes/businessRoutes.js"
import paymentRoutes from "./routes/paymentRoutes.js"
import boughtRoutes from "./routes/boughtRoutes.js"
import availableItemRoutes from "./routes/availableItemRoutes.js"


dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

// Middleware
app.use(cors())
app.use(express.json())

// Special handling for Stripe webhook
app.use("/api/payments/webhook", express.raw({ type: "application/json" }))

// Routes
app.use("/api/auth", authRoutes)
app.use("/api/users", userRoutes)
app.use("/api/categories", categoryRoutes)
app.use("/api/items", itemRoutes)
app.use("/api/fractions", fractionRoutes)
app.use("/api/sales", salesRoutes)
app.use("/api/businesses", businessRoutes)
app.use("/api/payments", paymentRoutes)
app.use("/api/boughts", boughtRoutes)
app.use("/api/available-items", availableItemRoutes)

// Test database connection
sequelize
  .authenticate()
  .then(() => {
    console.log("Database connection established successfully.")
    return syncDatabase()
  })
  .catch((err) => {
    console.error("Unable to connect to the database:", err)
  })

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

export default app
