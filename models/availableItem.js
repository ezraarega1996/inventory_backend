import { DataTypes } from "sequelize"
import sequelize from "./database.js"
import Item from "./item.js"
import Business from "./business.js"

const AvailableItem = sequelize.define("AvailableItem", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  itemId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  quantity: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
  },
  soldPrice: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
})

AvailableItem.belongsTo(Item, { foreignKey: "itemId" })
Item.hasOne(AvailableItem, { foreignKey: "itemId" })

// Add business association
AvailableItem.belongsTo(Business, { foreignKey: "businessId" })
Business.hasMany(AvailableItem, { foreignKey: "businessId" })

export default AvailableItem 