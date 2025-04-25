import express from "express"
import {
  getAllTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction,
} from "../controllers/transactionController.js"
import { authenticate, authorizeOwner } from "../middleware/auth.js"

const router = express.Router()

router.get("/", authenticate, getAllTransactions)
router.get("/:id", authenticate, getTransactionById)
router.post("/", authenticate, authorizeOwner, createTransaction)
router.put("/:id", authenticate, authorizeOwner, updateTransaction)
router.delete("/:id", authenticate, authorizeOwner, deleteTransaction)

export default router
