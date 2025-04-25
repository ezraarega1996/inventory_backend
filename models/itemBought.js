import { DataTypes } from "sequelize"
import sequelize from "./database.js"
import Item from "./item.js"
import Business from "./business.js"

const ItemBought = sequelize.define("ItemBought", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  fractionId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  fractionPurchasePrice: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  fractionSoldPrice: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  quantity: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  location: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  expiryDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  createdTime: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
})

ItemBought.belongsTo(Item, { foreignKey: "itemId" })
ItemBought.belongsTo(Business, { foreignKey: "businessId" })

export default ItemBought
