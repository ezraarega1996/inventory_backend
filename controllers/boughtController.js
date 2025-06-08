import { ItemBought, Item, Fraction, AvailableItem, SoldItem, User } from "../models/index.js"
import sequelize from "../models/database.js"
import { parse } from "dotenv"

export const getAllBoughts = async (req, res) => {
  try {
    const boughts = await ItemBought.findAll({
      where: { businessId: req.user.businessId },
      include: [
        { 
          model: Item,
          include: [{ model: Fraction, as: "fractions" }]
        },
        {
          model: User,
          as: 'salesman',
          attributes: ['id', 'name', 'username']
        },
      ],
      order: [["createdTime", "DESC"]],
    })
    res.json(boughts)
  } catch (error) {
    console.log("errr in listing boughts: ", error)
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
          include: [{ model: Fraction, as: "fractions" }]
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

// Helper function to convert quantity to unit fraction
async function convertToUnitQuantity(itemId, fractionId, quantity) {
  const fraction = await Fraction.findOne({
    where: { id: fractionId }
  });
  if (!fraction) {
    throw new Error('Fraction not found');
  }
  // If this is already a unit fraction, return the quantity as is
  if (fraction.isUnit) {
    return quantity;
  }

  // Find the unit fraction for this item
  const unitFraction = await Fraction.findOne({
    where: {
      itemId,
      isUnit: true
    }
  });
  if (!unitFraction) {
    throw new Error('Unit fraction not found for this item');
  }
  // Convert quantity to unit fraction equivalent
  return (quantity * fraction.ratio) / unitFraction.ratio;
}

export const createBought = async (req, res) => {
  const transaction = await sequelize.transaction()
  try {
    const { itemId, fractionId, fractionPurchasePrice, fractionSoldPrice, quantity, location, expiryDate, salesmanId } = req.body

    // Check if item exists and belongs to the business
    const item = await Item.findOne({
      where: {
        id: itemId,
        businessId: req.user.businessId,
      },
    })

    if (!item) {
      await transaction.rollback()
      return res.status(404).json({ message: "Item not found" })
    }

    // Get the fraction being used
    const fraction = await Fraction.findOne({
      where: { id: fractionId }
    })

    if (!fraction) {
      await transaction.rollback()
      return res.status(404).json({ message: "Fraction not found" })
    }

    // Convert quantity to units based on fraction ratio
    const quantityInUnits = quantity * fraction.ratio

    // Find existing available item
    const existingAvailableItem = await AvailableItem.findOne({
      where: {
        itemId,
        businessId: req.user.businessId,
        salesmanId: salesmanId || null,
      },
      transaction
    })

    let availableItem;
    if (existingAvailableItem) {
      // Update existing available item by adding the new quantity
      existingAvailableItem.quantity = quantityInUnits + parseFloat(existingAvailableItem.quantity)
      existingAvailableItem.soldPrice = fractionSoldPrice
      await existingAvailableItem.save({ transaction })
      availableItem = existingAvailableItem;
    } else {
      // Create new available item with the current quantity
      availableItem = await AvailableItem.create({
        itemId,
        businessId: req.user.businessId,
        quantity: quantityInUnits,
        soldPrice: fractionSoldPrice,
        salesmanId,
      }, { transaction })
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
      available_items_count: availableItem.quantity / fraction.ratio,
      salesmanId,
      availableItemId: availableItem.id,
    }, { transaction })

    // Fetch the created bought item with its item
    const createdBought = await ItemBought.findByPk(bought.id, {
      include: [
        { model: Item },
        { model: User, as: 'salesman', attributes: ['id', 'name', 'username'] },
        { model: AvailableItem }
      ],
      transaction
    })

    await transaction.commit()
    res.status(201).json(createdBought)
  } catch (error) {
    await transaction.rollback()
    res.status(500).json({ message: "Error creating bought item", error: error.message })
  }
}

export const updateBought = async (req, res) => {
  const transaction = await sequelize.transaction()
  try {
    const { fractionId, fractionPurchasePrice, fractionSoldPrice, quantity, location, expiryDate, salesmanId } = req.body

    const bought = await ItemBought.findOne({
      where: {
        id: req.params.id,
        businessId: req.user.businessId,
      },
      transaction
    })

    if (!bought) {
      await transaction.rollback()
      return res.status(404).json({ message: "Bought item not found" })
    }

    // Get the old fraction and quantity for comparison
    const oldFraction = await Fraction.findOne({
      where: { id: bought.fractionId }
    })
    const oldQuantityInUnits = bought.quantity * oldFraction.ratio

    // Get the new fraction
    const newFraction = await Fraction.findOne({
      where: { id: fractionId }
    })

    if (!newFraction) {
      await transaction.rollback()
      return res.status(404).json({ message: "Fraction not found" })
    }

    // Convert new quantity to units
    const newQuantityInUnits = quantity * newFraction.ratio

    // Update bought item
    await bought.update({
      fractionId,
      fractionPurchasePrice,
      fractionSoldPrice,
      quantity,
      location,
      expiryDate: expiryDate || null,
      salesmanId,
    }, { transaction })

    // Find existing available item for old salesman
    const oldAvailableItem = await AvailableItem.findOne({
      where: {
        itemId: bought.itemId,
        businessId: req.user.businessId,
        salesmanId: bought.salesmanId,
      },
      transaction
    })

    if (oldAvailableItem) {
      // Remove the old quantity from old salesman's available items
      oldAvailableItem.quantity -= oldQuantityInUnits
      if (oldAvailableItem.quantity <= 0) {
        await oldAvailableItem.destroy({ transaction })
      } else {
        await oldAvailableItem.save({ transaction })
      }
    }

    // Find or create available item for new salesman
    const newAvailableItem = await AvailableItem.findOne({
      where: {
        itemId: bought.itemId,
        businessId: req.user.businessId,
        salesmanId: salesmanId,
      },
      transaction
    })

    if (newAvailableItem) {
      // Add the new quantity to new salesman's available items
      newAvailableItem.quantity += newQuantityInUnits
      newAvailableItem.soldPrice = fractionSoldPrice
      await newAvailableItem.save({ transaction })
    } else {
      // Create new available item for new salesman
      await AvailableItem.create({
        itemId: bought.itemId,
        businessId: req.user.businessId,
        quantity: newQuantityInUnits,
        soldPrice: fractionSoldPrice,
        salesmanId,
      }, { transaction })
    }

    await transaction.commit()
    res.json(bought)
  } catch (error) {
    await transaction.rollback()
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

    // Get all bought items for this item
    const boughts = await ItemBought.findAll({
      where: { 
        itemId: bought.itemId,
        businessId: req.user.businessId,
      },
      include: [{ model: Item, include: [{ model: Fraction }] }],
    });

    // Calculate total bought quantity in unit fractions
    let totalBought = 0;
    for (const bought of boughts) {
      const unitQuantity = await convertToUnitQuantity(bought.itemId, bought.fractionId, bought.quantity);
      totalBought += unitQuantity;
    }

    // Get all sold items for this item
    const solds = await SoldItem.findAll({
      where: { 
        itemId: bought.itemId,
        businessId: req.user.businessId,
      },
      include: [{ model: Item, include: [{ model: Fraction }] }],
    });

    // Calculate total sold quantity in unit fractions
    let totalSold = 0;
    for (const sold of solds) {
      const unitQuantity = await convertToUnitQuantity(sold.itemId, sold.fractionId, sold.quantity);
      totalSold += unitQuantity;
    }

    // Calculate available quantity
    const availableQuantity = totalBought - totalSold;

    // Find existing available item
    const existingAvailableItem = await AvailableItem.findOne({
      where: {
        itemId: bought.itemId,
        businessId: req.user.businessId,
      },
    });

    if (existingAvailableItem) {
      // Update existing available item
      await existingAvailableItem.update({
        quantity: availableQuantity,
        soldPrice: bought.fractionSoldPrice,
      });
    } else {
      // Create new available item only if it doesn't exist
      await AvailableItem.create({
        itemId: bought.itemId,
        businessId: req.user.businessId,
        quantity: availableQuantity,
        soldPrice: bought.fractionSoldPrice,
      });
    }

    res.json({ message: "Bought item deleted successfully" })
  } catch (error) {
    res.status(500).json({ message: "Error deleting bought item", error: error.message })
  }
}
