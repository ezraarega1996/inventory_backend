import { Business, User, Subscription, Item, SoldItem } from "../models/index.js"
import { sequelize } from "../models/index.js"
import { Op } from "sequelize"


// Create a new business
export const createBusiness = async (req, res) => {
  console.log("createBusiness")
  const transaction = await sequelize.transaction()
  console.log("one")
  try {
    const { name, address, phone, email, ownerName, ownerEmail, ownerPhone, ownerUsername, ownerPassword } = req.body
    console.log("two", req.body)
    // Check if business with this email already exists
    const existingBusiness = await Business.findOne({
      where: { email },
      transaction,
    })
    console.log("three", existingBusiness)

    if (existingBusiness) {
      await transaction.rollback()
      return res.status(400).json({ message: "Business with this email already exists" })
    }
    console.log("four")
    
    // Create business
    const business = await Business.create(
      {
        name,
        address,
        phone,
        email,
        subscriptionStatus: "trial",
        subscriptionPlan: "free",
        trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days trial
      },
      { transaction },
    )
    console.log("seven", business)

    // Only create owner user if all owner fields are provided
    if (ownerName && ownerEmail && ownerPhone && ownerUsername && ownerPassword) {
      // Check if user with this email or username already exists
      const existingUser = await User.findOne({
        where: {
          [Op.or]: [{ email: ownerEmail }, { username: ownerUsername }],
        },
        transaction,
      })
      console.log("five", existingUser)
      if (existingUser) {
        await transaction.rollback()
        return res.status(400).json({ message: "User with this email or username already exists" })
      }
      console.log("six")

      // Create owner user
      const owner = await User.create(
        {
          name: ownerName,
          email: ownerEmail,
          phone: ownerPhone,
          location: address || "Not specified",
          username: ownerUsername,
          password: ownerPassword,
          role: "owner",
          businessId: business.id,
        },
        { transaction },
      )
      console.log("eight", owner)
    }

    // Create initial subscription
    await Subscription.create(
      {
        businessId: business.id,
        plan: "free",
        status: "active",
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days trial
        amount: 0,
      },
      { transaction },
    )

    await transaction.commit()

    res.status(201).json({
      message: "Business created successfully",
      business: {
        id: business.id,
        name: business.name,
        email: business.email,
      },
      owner: {
        id: owner.id,
        name: owner.name,
        email: owner.email,
      },
    })
  } catch (error) {
    await transaction.rollback()
    res.status(500).json({ message: "Error creating business", error: error.message })
  }
}

// Get all businesses (admin only)
export const getAllBusinesses = async (req, res) => {
  try {
    const businesses = await Business.findAll({
      include: [
        {
          model: User,
          where: { role: "owner" },
          attributes: ["id", "name", "email", "phone"],
          required: false,
        },
        {
          model: Subscription,
          where: { status: "active" },
          required: false,
          order: [["createdAt", "DESC"]],
          limit: 1,
        },
      ],
    })

    res.json(businesses)
  } catch (error) {
    res.status(500).json({ message: "Error fetching businesses", error: error.message })
  }
}

// Get business by ID
export const getBusinessById = async (req, res) => {
  try {
    const business = await Business.findByPk(req.params.id, {
      include: [
        {
          model: User,
          where: { role: "owner" },
          attributes: ["id", "name", "email", "phone"],
          required: false,
        },
        {
          model: Subscription,
          where: { status: "active" },
          required: false,
          order: [["createdAt", "DESC"]],
          limit: 1,
        },
      ],
    })

    if (!business) {
      return res.status(404).json({ message: "Business not found" })
    }

    // Check if user belongs to this business or is admin
    if (req.user.role !== "admin" && req.user.businessId !== business.id) {
      return res.status(403).json({ message: "Not authorized to view this business" })
    }

    res.json(business)
  } catch (error) {
    res.status(500).json({ message: "Error fetching business", error: error.message })
  }
}

// Update business
export const updateBusiness = async (req, res) => {
  try {
    const { name, address, phone, email, logo } = req.body
    const business = await Business.findByPk(req.params.id)

    if (!business) {
      return res.status(404).json({ message: "Business not found" })
    }

    // Check if user is owner of this business or admin
    if (req.user.role !== "admin" && (req.user.role !== "owner" || req.user.businessId !== business.id)) {
      return res.status(403).json({ message: "Not authorized to update this business" })
    }

    // Update business
    if (name) business.name = name
    if (address) business.address = address
    if (phone) business.phone = phone
    if (email) business.email = email
    if (logo) business.logo = logo

    await business.save()

    res.json(business)
  } catch (error) {
    res.status(500).json({ message: "Error updating business", error: error.message })
  }
}

// Update subscription
export const updateSubscription = async (req, res) => {
  try {
    const { plan, status, endDate, paymentMethod, paymentId, amount, currency, isAutoRenew } = req.body
    const business = await Business.findByPk(req.params.id)

    if (!business) {
      return res.status(404).json({ message: "Business not found" })
    }

    // Only admin can update subscription
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized to update subscription" })
    }

    // Update business subscription status
    business.subscriptionStatus = status || business.subscriptionStatus
    business.subscriptionPlan = plan || business.subscriptionPlan
    business.subscriptionEndsAt = endDate ? new Date(endDate) : business.subscriptionEndsAt

    await business.save()

    // Create new subscription record
    const subscription = await Subscription.create({
      businessId: business.id,
      plan: plan || "free",
      status: status || "active",
      startDate: new Date(),
      endDate: endDate ? new Date(endDate) : null,
      paymentMethod,
      paymentId,
      amount: amount || 0,
      currency: currency || "USD",
      isAutoRenew: isAutoRenew !== undefined ? isAutoRenew : true,
    })

    res.json({
      business: {
        id: business.id,
        name: business.name,
        subscriptionStatus: business.subscriptionStatus,
        subscriptionPlan: business.subscriptionPlan,
        subscriptionEndsAt: business.subscriptionEndsAt,
      },
      subscription,
    })
  } catch (error) {
    res.status(500).json({ message: "Error updating subscription", error: error.message })
  }
}

// Get business statistics
export const getBusinessStats = async (req, res) => {
  try {
    const businessId = req.params.id

    // Check if business exists
    const business = await Business.findByPk(businessId)
    if (!business) {
      return res.status(404).json({ message: "Business not found" })
    }

    // Check if user belongs to this business or is admin
    if (req.user.role !== "admin" && req.user.businessId !== businessId) {
      return res.status(403).json({ message: "Not authorized to view this business stats" })
    }

    // Get user count
    const userCount = await User.count({
      where: { businessId },
    })

    // Get item count
    const itemCount = await Item.count({
      where: { businessId },
    })

    // Get total sales
    const salesData = await SoldItem.findAll({
      where: { businessId },
      attributes: [
        [sequelize.fn("sum", sequelize.col("amount")), "totalSales"],
        [sequelize.fn("count", sequelize.col("id")), "salesCount"],
      ],
    })

    // Get sales by month for the last 12 months
    const salesByMonth = await SoldItem.findAll({
      where: {
        businessId,
        soldTime: {
          [sequelize.Op.gte]: new Date(new Date().setFullYear(new Date().getFullYear() - 1)),
        },
      },
      attributes: [
        [sequelize.fn("date_trunc", "month", sequelize.col("soldTime")), "month"],
        [sequelize.fn("sum", sequelize.col("amount")), "total"],
      ],
      group: [sequelize.fn("date_trunc", "month", sequelize.col("soldTime"))],
      order: [[sequelize.fn("date_trunc", "month", sequelize.col("soldTime")), "ASC"]],
    })

    res.json({
      userCount,
      itemCount,
      totalSales: salesData[0]?.dataValues.totalSales || 0,
      salesCount: salesData[0]?.dataValues.salesCount || 0,
      salesByMonth,
    })
  } catch (error) {
    res.status(500).json({ message: "Error fetching business stats", error: error.message })
  }
}
