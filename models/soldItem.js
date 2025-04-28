import { DataTypes } from "sequelize"
import sequelize from "./database.js"
import Item from "./item.js"
import User from "./user.js"
import Business from "./business.js"

const SoldItem = sequelize.define("SoldItem", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  soldTime: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  quantity: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  fractionId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  amount: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  expectedAmount: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  existing: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  status: {
    type: DataTypes.ENUM("pending", "completed", "cancelled"),
    defaultValue: "completed",
  },
  createdTime: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
})

SoldItem.belongsTo(Item, { foreignKey: "itemId" })
Item.hasMany(SoldItem, { foreignKey: "itemId" })

SoldItem.belongsTo(User, { foreignKey: "salesmanId", as: "salesman" })
User.hasMany(SoldItem, { foreignKey: "salesmanId", as: "sales" })

// Add business association
SoldItem.belongsTo(Business, { foreignKey: "businessId" })
Business.hasMany(SoldItem, { foreignKey: "businessId" })

export default SoldItem
