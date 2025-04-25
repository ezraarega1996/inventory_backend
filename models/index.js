import sequelize from "./database.js"
import User from "./user.js"
import Category from "./category.js"
import Item from "./item.js"
import Fraction from "./fraction.js"
import ItemTransaction from "./itemTransaction.js"
import SoldItem from "./soldItem.js"
import Business from "./business.js"
import Subscription from "./subscription.js"

const syncDatabase = async () => {
  try {
    await sequelize.sync({ alter: true })
    console.log("Database synchronized successfully")
  } catch (error) {
    console.error("Error synchronizing database:", error)
  }
}

export { sequelize, User, Category, Item, Fraction, ItemTransaction, SoldItem, Business, Subscription, syncDatabase }
