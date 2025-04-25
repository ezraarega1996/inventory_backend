import { ItemBought, Item, Fraction } from "../models/index.js"

export const getAllBoughts = async (req, res) => {
  try {
    const boughts = await ItemBought.findAll({
      where: { businessId: req.user.businessId },
      include: [
        { 
          model: Item,
          include: [{ model: Fraction }]
        }
      ],
      order: [["createdTime", "DESC"]],
    })
    res.json(boughts)
  } catch (error) {
    res.status(500).json({ message: "Error fetching bought items", error: error.message })
  }
}

export const getBoughtById = async (req, res) => {
  try {
    const bought = await ItemBought.findOne({
      where: {
        id: req.params.id,
        businessId: req.user.businessId,
      },
      include: [
        { 
          model: Item,
          include: [{ model: Fraction }]
        }
      ],
    })

    if (!bought) {
      return res.status(404).json({ message: "Bought item not found" })
    }

    res.json(bought)
  } catch (error) {
    res.status(500).json({ message: "Error fetching bought item", error: error.message })
  }
}

export const createBought = async (req, res) => {
  try {
    const { itemId, fractionId, fractionPurchasePrice, fractionSoldPrice, quantity, location, expiryDate } = req.body

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

    // Create bought item
    const bought = await ItemBought.create({
      itemId,
      fractionId,
      fractionPurchasePrice,
      fractionSoldPrice,
      quantity,
      location,
      expiryDate: expiryDate || null,
      businessId: req.user.businessId,
    })

    // Fetch the created bought item with its item
    const createdBought = await ItemBought.findByPk(bought.id, {
      include: [{ model: Item }],
    })

    res.status(201).json(createdBought)
  } catch (error) {
    res.status(500).json({ message: "Error creating bought item", error: error.message })
  }
}

export const updateBought = async (req, res) => {
  try {
    const { fractionId, fractionPurchasePrice, fractionSoldPrice, quantity, location, expiryDate } = req.body

    const bought = await ItemBought.findOne({
      where: {
        id: req.params.id,
        businessId: req.user.businessId,
      },
    })

    if (!bought) {
      return res.status(404).json({ message: "Bought item not found" })
    }

    await bought.update({
      fractionId,
      fractionPurchasePrice,
      fractionSoldPrice,
      quantity,
      location,
      expiryDate: expiryDate || null,
    })

    // Fetch the updated bought item with its item
    const updatedBought = await ItemBought.findByPk(bought.id, {
      include: [{ model: Item }],
    })

    res.json(updatedBought)
  } catch (error) {
    res.status(500).json({ message: "Error updating bought item", error: error.message })
  }
}

export const deleteBought = async (req, res) => {
  try {
    const bought = await ItemBought.findOne({
      where: {
        id: req.params.id,
        businessId: req.user.businessId,
      },
    })

    if (!bought) {
      return res.status(404).json({ message: "Bought item not found" })
    }

    await bought.destroy()

    res.json({ message: "Bought item deleted successfully" })
  } catch (error) {
    res.status(500).json({ message: "Error deleting bought item", error: error.message })
  }
}
