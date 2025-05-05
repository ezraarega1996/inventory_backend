import { SoldItem, Item, User, Fraction, AvailableItem, sequelize } from "../models/index.js"

export const getAllSales = async (req, res) => {
  try {
    const sales = await SoldItem.findAll({
      where: { businessId: req.user.businessId },
      include: [
        { 
           model: Item,
          include: [{ model: Fraction, as: "fractions" }]
        }, 
        { model: User, as: "salesman", attributes: ["id", "name", "username"] }
      ],
      order: [["soldTime", "DESC"]],
    })

    // Transform the response to include fraction data directly
    const transformedSales = sales.map(sale => {
      const saleJson = sale.toJSON();
      const fraction = saleJson.Item?.Fractions?.findOne(f => f.id === saleJson.fractionId);
      if (fraction) {
        saleJson.fraction = fraction;
      }
      return saleJson;
    });

    res.json(transformedSales)
  } catch (error) {
    res.status(500).json({ message: "Error fetching sales", error: error.message })
  }
}

export const getSaleById = async (req, res) => {
  try {
    const sale = await SoldItem.findOne({
      where: {
        id: req.params.id,
        businessId: req.user.businessId,
      },
      include: [
        { 
           model: Item,
          include: [{ model: Fraction, as: "fractions" }]
        }, 
        { model: User, as: "salesman", attributes: ["id", "name", "username"] }
      ],
    })

    if (!sale) {
      return res.status(404).json({ message: "Sale not found" })
    }

    // Transform the response to include fraction data directly
    const saleJson = sale.toJSON();
    const fraction = saleJson.Item?.Fractions?.find(f => f.id === saleJson.fractionId);
    if (fraction) {
      saleJson.fraction = fraction;
    }

    res.json(saleJson)
  } catch (error) {
    res.status(500).json({ message: "Error fetching sale", error: error.message })
  }
}

export const createSale = async (req, res) => {
  try {
    const { itemId, fractionId, quantity, amount } = req.body;
    const salesmanId = req.user.id;

    // Validate required fields
    if (!itemId || !fractionId || !quantity || !amount) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Get item and fraction details
    const item = await Item.findByPk(itemId, {
      include: [{ model: Fraction, as: 'fractions' }]
    });
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    const fraction = item.fractions.find(f => f.id === fractionId);
    if (!fraction) {
      return res.status(404).json({ message: 'Fraction not found' });
    }

    // Convert quantity to units based on fraction ratio
    const quantityInUnits = quantity * fraction.ratio;

    // // Check available quantity
    // const availableQuantity = await getAvailableQuantity(itemId, fractionId);
    // if (availableQuantity < quantity) {
    //   return res.status(400).json({ 
    //     message: `Not enough quantity available. Available: ${availableQuantity}` 
    //   });
    // }
    // Create sale
    const sale = new SoldItem({
      itemId,
      fractionId,
      quantity,
      amount,
      expectedAmount: amount,
      salesmanId,
      businessId: req.user.businessId
    });

    await sale.save();

    // Update available items
    const availableItem = await AvailableItem.findOne({
      itemId,
      salesmanId,
      businessId: req.user.businessId
    });

    if (availableItem) {
      availableItem.quantity -= quantityInUnits;
      await availableItem.save();
    }

    res.status(201).json(sale);
  } catch (error) {
    console.error('Error creating sale:', error);
    res.status(500).json({ message: 'Error creating sale' });
  }
};

export const updateSale = async (req, res) => {
  try {
    const { quantity, amount, expectedAmount, status, existing } = req.body

    const sale = await SoldItem.findOne({
      where: {
        id: req.params.id,
        businessId: req.user.businessId,
      },
    })

    if (!sale) {
      return res.status(404).json({ message: "Sale not found" })
    }

    // Check if user is owner or the salesman who created the sale
    if (req.user.role !== "owner" && req.user.role !== "admin" && sale.salesmanId !== req.user.id) {
      return res.status(403).json({ message: "Not authorized to update this sale" })
    }

    // Update sale
    if (quantity !== undefined) sale.quantity = quantity
    if (amount !== undefined) sale.amount = amount
    if (expectedAmount !== undefined) sale.expectedAmount = expectedAmount
    if (status !== undefined) sale.status = status
    if (existing !== undefined) sale.existing = existing

    await sale.save()

    // Fetch the updated sale with its item and salesman
    const updatedSale = await SoldItem.findByPk(sale.id, {
      include: [{ model: Item }, { model: User, as: "salesman", attributes: ["id", "name", "username"] }],
    })

    res.json(updatedSale)
  } catch (error) {
    res.status(500).json({ message: "Error updating sale", error: error.message })
  }
}

export const deleteSale = async (req, res) => {
  try {
    const sale = await SoldItem.findOne({
      where: {
        id: req.params.id,
        businessId: req.user.businessId,
      },
    })

    if (!sale) {
      return res.status(404).json({ message: "Sale not found" })
    }

    // Only owner or admin can delete sales
    if (req.user.role !== "owner" && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized to delete sales" })
    }

    await sale.destroy()

    res.json({ message: "Sale deleted successfully" })
  } catch (error) {
    res.status(500).json({ message: "Error deleting sale", error: error.message })
  }
}

export const getSalesByUser = async (req, res) => {
  try {
    const sales = await SoldItem.findAll({
      where: {
        salesmanId: req.user.id,
        businessId: req.user.businessId,
      },
      include: [
        { 
           model: Item,
          include: [{ model: Fraction, as: "fractions" }]
        },
        { model: User, as: "salesman", attributes: ["id", "name", "username"] }
      ],
      order: [["soldTime", "DESC"]],
    })
    res.json(sales)
  } catch (error) {
    res.status(500).json({ message: "Error fetching sales", error: error.message })
  }
}

export const getDashboardStats = async (req, res) => {
  try {
    // Get total sales amount for this business
    const totalSales = await SoldItem.sum("amount", {
      where: { businessId: req.user.businessId },
    })

    // Get sales count for this business
    const salesCount = await SoldItem.count({
      where: { businessId: req.user.businessId },
    })

    // Get sales by day for the last 30 days for this business
    const salesByDay = await SoldItem.findAll({
      attributes: [
        [sequelize.fn("date", sequelize.col("soldTime")), "date"],
        [sequelize.fn("sum", sequelize.col("amount")), "total"],
      ],
      where: {
        businessId: req.user.businessId,
        soldTime: {
          [sequelize.Op.gte]: new Date(new Date() - 30 * 24 * 60 * 60 * 1000),
        },
      },
      group: [sequelize.fn("date", sequelize.col("soldTime"))],
      order: [[sequelize.fn("date", sequelize.col("soldTime")), "ASC"]],
    })

    // Get top selling items for this business
    const topItems = await SoldItem.findAll({
      attributes: [
        "itemId",
        [sequelize.fn("sum", sequelize.col("quantity")), "totalQuantity"],
        [sequelize.fn("sum", sequelize.col("amount")), "totalAmount"],
      ],
      where: { businessId: req.user.businessId },
      include: [
        {
          model: Item,
          attributes: ["name"],
        },
      ],
      group: ["itemId", "Item.id", "Item.name"],
      order: [[sequelize.fn("sum", sequelize.col("amount")), "DESC"]],
      limit: 5,
    })

    res.json({
      totalSales,
      salesCount,
      salesByDay,
      topItems,
    })
  } catch (error) {
    res.status(500).json({ message: "Error fetching dashboard stats", error: error.message })
  }
}

export const getAvailableQuantity = async (req, res) => {
  try {
    const { itemId, fractionId } = req.query

    if (!itemId || !fractionId) {
      return res.status(400).json({ message: "Item ID and Fraction ID are required" })
    }

    // Get the fraction to calculate ratio
    const fraction = await Fraction.findOne({
      where: { id: fractionId }
    })

    if (!fraction) {
      return res.status(404).json({ message: "Fraction not found" })
    }

    // Get available item
    const availableItem = await AvailableItem.findOne({
      where: {
        itemId,
        businessId: req.user.businessId,
        // If user is a salesman, only show items assigned to them
        // If user is owner or admin, show all items
        salesmanId: req.user.role === 'salesman' ? req.user.id : null,
      }
    })

    if (!availableItem) {
      return res.json({ availableQuantity: 0 })
    }

    // Convert available quantity from units to the requested fraction
    const availableQuantity = availableItem.quantity / fraction.ratio

    res.json({ availableQuantity })
  } catch (error) {
    res.status(500).json({ message: "Error fetching available quantity", error: error.message })
  }
}
