import { ItemTransaction, Item } from "../models/index.js"

export const getAllTransactions = async (req, res) => {
  try {
    const transactions = await ItemTransaction.findAll({
      where: { businessId: req.user.businessId },
      include: [{ model: Item }],
      order: [["createdTime", "DESC"]],
    })
    res.json(transactions)
  } catch (error) {
    res.status(500).json({ message: "Error fetching transactions", error: error.message })
  }
}

export const getTransactionById = async (req, res) => {
  try {
    const transaction = await ItemTransaction.findOne({
      where: {
        id: req.params.id,
        businessId: req.user.businessId,
      },
      include: [{ model: Item }],
    })

    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" })
    }

    res.json(transaction)
  } catch (error) {
    res.status(500).json({ message: "Error fetching transaction", error: error.message })
  }
}

export const createTransaction = async (req, res) => {
  try {
    const { itemId, fractionName, fractionPurchasePrice, fractionSoldPrice, quantity, location, expiryDate } = req.body

    // Check if item exists and belongs to the business
    const item = await Item.findOne({
      where: {
        id: itemId,
        businessId: req.user.businessId,
      },
    })

    if (!item) {
      return res.status(404).json({ message: "Item not found" })
    }

    // Create transaction
    const transaction = await ItemTransaction.create({
      itemId,
      fractionName,
      fractionPurchasePrice,
      fractionSoldPrice,
      quantity,
      location,
      expiryDate: expiryDate || null,
      businessId: req.user.businessId,
    })

    // Fetch the created transaction with its item
    const createdTransaction = await ItemTransaction.findByPk(transaction.id, {
      include: [{ model: Item }],
    })

    res.status(201).json(createdTransaction)
  } catch (error) {
    res.status(500).json({ message: "Error creating transaction", error: error.message })
  }
}

export const updateTransaction = async (req, res) => {
  try {
    const { fractionName, fractionPurchasePrice, fractionSoldPrice, quantity, location, expiryDate } = req.body

    const transaction = await ItemTransaction.findOne({
      where: {
        id: req.params.id,
        businessId: req.user.businessId,
      },
    })

    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" })
    }

    // Update transaction
    transaction.fractionName = fractionName || transaction.fractionName
    transaction.fractionPurchasePrice = fractionPurchasePrice || transaction.fractionPurchasePrice
    transaction.fractionSoldPrice = fractionSoldPrice || transaction.fractionSoldPrice
    transaction.quantity = quantity || transaction.quantity
    transaction.location = location || transaction.location
    transaction.expiryDate = expiryDate || transaction.expiryDate

    await transaction.save()

    // Fetch the updated transaction with its item
    const updatedTransaction = await ItemTransaction.findByPk(transaction.id, {
      include: [{ model: Item }],
    })

    res.json(updatedTransaction)
  } catch (error) {
    res.status(500).json({ message: "Error updating transaction", error: error.message })
  }
}

export const deleteTransaction = async (req, res) => {
  try {
    const transaction = await ItemTransaction.findOne({
      where: {
        id: req.params.id,
        businessId: req.user.businessId,
      },
    })

    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" })
    }

    await transaction.destroy()

    res.json({ message: "Transaction deleted successfully" })
  } catch (error) {
    res.status(500).json({ message: "Error deleting transaction", error: error.message })
  }
}
