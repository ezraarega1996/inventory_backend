import { SoldItem, Item, User, Fraction, sequelize } from "../models/index.js"

export const getAllSales = async (req, res) => {
  try {
    const sales = await SoldItem.findAll({
      where: { businessId: req.user.businessId },
      include: [
        { 
          model: Item,
          include: [{ model: Fraction }]
        }, 
        { model: User, as: "salesman", attributes: ["id", "name", "username"] }
      ],
      order: [["soldTime", "DESC"]],
    })

    // Transform the response to include fraction data directly
    const transformedSales = sales.map(sale => {
      const saleJson = sale.toJSON();
      const fraction = saleJson.Item?.Fractions?.find(f => f.id === saleJson.fractionId);
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
          include: [{ model: Fraction }]
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
    const { itemId, quantity, fractionId, amount, expectedAmount, status } = req.body
    console.log("One", req.body);
    // Check if item exists and belongs to the business
    const item = await Item.findOne({
      where: {
        id: itemId,
        businessId: req.user.businessId,
      },
      include: [{ model: Fraction }],
    })
    console.log("Two", item);
    if (!item) {
      return res.status(404).json({ message: "Item not found" })
    }
    console.log("Three");
    // Create sale
    const sale = await SoldItem.create({
      itemId,
      salesmanId: req.user.id,
      quantity,
      fractionId,
      amount,
      expectedAmount,
      status: status || "completed",
      businessId: req.user.businessId,
    })
    console.log("Four");
    // Fetch the created sale with its item and salesman
    const createdSale = await SoldItem.findByPk(sale.id, {
      include: [
        { 
          model: Item,
          include: [{ model: Fraction }]
        }, 
        { model: User, as: "salesman", attributes: ["id", "name", "username"] }
      ],
    })
    console.log("Five", createdSale); 

    // Transform the response to include fraction data directly
    const saleJson = createdSale.toJSON();
    const fraction = saleJson.Item?.Fractions?.find(f => f.id === saleJson.fractionId);
    if (fraction) {
      saleJson.fraction = fraction;
    }

    res.status(201).json(saleJson)
  } catch (error) {
    console.log("Six", error);
    res.status(500).json({ message: "Error creating sale", error: error.message })
  }
}

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
          include: [{ model: Fraction }]
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
