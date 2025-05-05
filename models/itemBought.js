import { DataTypes } from "sequelize"
import sequelize from "./database.js"
import Item from "./item.js"
import Business from "./business.js"
import User from "./user.js"
import Fraction from "./fraction.js"

const ItemBought = sequelize.define("ItemBought", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  itemId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  fractionId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  fractionPurchasePrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  fractionSoldPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  quantity: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  location: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  expiryDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  businessId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  salesmanId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: User,
      key: "id",
    },
  },
  createdTime: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
})

ItemBought.belongsTo(Item, { foreignKey: "itemId" })
ItemBought.belongsTo(Business, { foreignKey: "businessId" })
ItemBought.belongsTo(User, { as: 'salesman', foreignKey: "salesmanId" })
ItemBought.belongsTo(Fraction, { foreignKey: "fractionId" })

export default ItemBought
