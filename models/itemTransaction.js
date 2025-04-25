import { DataTypes } from "sequelize"
import sequelize from "./database.js"
import Item from "./item.js"
import Business from "./business.js"

const ItemTransaction = sequelize.define("ItemTransaction", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  fractionName: {
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

ItemTransaction.belongsTo(Item, { foreignKey: "itemId" })
Item.hasMany(ItemTransaction, { foreignKey: "itemId" })

// Add business association
ItemTransaction.belongsTo(Business, { foreignKey: "businessId" })
Business.hasMany(ItemTransaction, { foreignKey: "businessId" })

export default ItemTransaction
