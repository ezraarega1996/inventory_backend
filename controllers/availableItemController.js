import { AvailableItem, Item, Bought, SoldItem, Fraction } from "../models/index.js"
import { Op } from "sequelize"

export const calculateAvailableItems = async (req, res) => {
  try {
    const { businessId } = req.user

    // Get all items for the business
    const items = await Item.findAll({
      where: { businessId },
      include: [
        {
          model: Bought,
          where: { businessId },
          required: false,
        },
        {
          model: SoldItem,
          where: { businessId },
          required: false,
        },
      ],
    })

    // Calculate available items for each item
    for (const item of items) {
      // Calculate total bought quantity
      const totalBought = item.Boughts?.reduce((sum, bought) => sum + bought.quantity, 0) || 0

      // Calculate total sold quantity
      const totalSold = item.SoldItems?.reduce((sum, sold) => sum + sold.quantity, 0) || 0

      // Calculate available quantity
      const availableQuantity = totalBought - totalSold

      // Get the latest sold price from bought items
      const latestBought = item.Boughts?.sort((a, b) => b.createdTime - a.createdTime)[0]
      const soldPrice = latestBought?.fractionSoldPrice || 0

      // Find existing available item
      const existingAvailableItem = await AvailableItem.findOne({
        where: {
          itemId: item.id,
          businessId,
        },
      });

      if (existingAvailableItem) {
        // Update existing available item
        await existingAvailableItem.update({
          quantity: availableQuantity,
          soldPrice,
        });
      } else {
        // Create new available item only if it doesn't exist
        await AvailableItem.create({
          itemId: item.id,
          businessId,
          quantity: availableQuantity,
          soldPrice,
        });
      }
    }

    // Fetch all available items with their items
    const availableItems = await AvailableItem.findAll({
      where: { businessId },
      include: [
        { 
          model: Item,
          include: [{ model: Fraction }]
        }
      ],
    })

    res.json(availableItems)
  } catch (error) {
    res.status(500).json({ message: "Error calculating available items", error: error.message })
  }
}

export const getAllAvailableItems = async (req, res) => {
  try {
    const availableItems = await AvailableItem.findAll({
      where: { businessId: req.user.businessId },
      include: [
        { 
          model: Item,
          include: [{ model: Fraction }]
        }
      ],
      order: [["createdAt", "DESC"]],
    })
    res.json(availableItems)
  } catch (error) {
    res.status(500).json({ message: "Error fetching available items", error: error.message })
  }
}

export const getAvailableItemById = async (req, res) => {
  try {
    const availableItem = await AvailableItem.findOne({
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

    if (!availableItem) {
      return res.status(404).json({ message: "Available item not found" })
    }

    res.json(availableItem)
  } catch (error) {
    res.status(500).json({ message: "Error fetching available item", error: error.message })
  }
} 