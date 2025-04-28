import { ItemBought, Item, Fraction, AvailableItem, SoldItem } from "../models/index.js"

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

// Helper function to convert quantity to unit fraction
// Helper function to convert quantity to unit fraction
async function convertToUnitQuantity(itemId, fractionId, quantity) {

  // Fetch the fraction by ID
  const fraction = await Fraction.findOne({
    where: { id: fractionId },
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
      isUnit: true,
    },
  });

  if (!unitFraction) {
    throw new Error('Unit fraction not found for this item');
  }

  // Convert quantity to unit fraction equivalent
  return (quantity * fraction.ratio) / unitFraction.ratio;
}

export const createBought = async (req, res) => {
  try {
    const { itemId, fractionId, fractionPurchasePrice, fractionSoldPrice, quantity, location, expiryDate } = req.body;
    // Validate the fractionId
    const fraction = await Fraction.findOne({
      where: { id: fractionId, itemId },
    });

    if (!fraction) {
      return res.status(400).json({ message: `Invalid fractionId: ${fractionId} for itemId: ${itemId}` });
    }

    // Check if item exists and belongs to the business
    const item = await Item.findOne({
      where: {
        id: itemId,
        businessId: req.user.businessId,
      },
    });

    if (!item) {
      return res.status(404).json({ message: "Item not found" });
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
    });

    // Get all bought items for this item
    const boughts = await ItemBought.findAll({
      where: {
        itemId,
        businessId: req.user.businessId,
      },
      include: [{ model: Item, include: [{ model: Fraction }] }],
    });

    // Calculate total bought quantity in unit fractions
    let totalBought = 0;

    for (const bought of boughts) {
      const unitQuantity = await convertToUnitQuantity(itemId, bought.fractionId, bought.quantity);
      totalBought += unitQuantity;
    }

    // Get all sold items for this item
    const solds = await SoldItem.findAll({
      where: {
        itemId,
        businessId: req.user.businessId,
      },
      include: [{ model: Item, include: [{ model: Fraction }] }],
    });

    // Calculate total sold quantity in unit fractions
    let totalSold = 0;
    for (const sold of solds) {
      const unitQuantity = await convertToUnitQuantity(itemId, sold.fractionId, sold.quantity);
      totalSold += unitQuantity;
    }

    // Calculate available quantity
    const availableQuantity = totalBought - totalSold;

    // Update or create available item
    await AvailableItem.upsert({
      itemId,
      businessId: req.user.businessId,
      quantity: availableQuantity,
      soldPrice: fractionSoldPrice,
    });

    // Fetch the created bought item with its item
    const createdBought = await ItemBought.findByPk(bought.id, {
      include: [{ model: Item }],
    });

    res.status(201).json(createdBought);
  } catch (error) {
    res.status(500).json({ message: "Error creating bought item", error: error.message });
  }
};
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

    // Update available item
    await AvailableItem.upsert({
      itemId: bought.itemId,
      businessId: req.user.businessId,
      quantity: availableQuantity,
      soldPrice: fractionSoldPrice,
    })

    res.json(bought)
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

    // Update available item
    await AvailableItem.upsert({
      itemId: bought.itemId,
      businessId: req.user.businessId,
      quantity: availableQuantity,
      soldPrice: bought.fractionSoldPrice,
    })

    res.json({ message: "Bought item deleted successfully" })
  } catch (error) {
    res.status(500).json({ message: "Error deleting bought item", error: error.message })
  }
}
