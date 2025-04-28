import express from "express"
import {
  calculateAvailableItems,
  getAllAvailableItems,
  getAvailableItemById,
} from "../controllers/availableItemController.js"
import { authenticate } from "../middleware/auth.js"

const router = express.Router()

router.get("/calculate", authenticate, calculateAvailableItems)
router.get("/", authenticate, getAllAvailableItems)
router.get("/:id", authenticate, getAvailableItemById)

export default router 