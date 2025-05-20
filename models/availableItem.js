import { DataTypes } from "sequelize"
import sequelize from "./database.js"
import { User, Item, ItemBought, SoldItem } from "./index.js"
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
  businessId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  quantity: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
  },
  soldPrice: {
    type: DataTypes.DECIMAL(10, 2),
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
})

// Define associations
AvailableItem.belongsTo(User, { as: 'salesman', foreignKey: "salesmanId" })
AvailableItem.belongsTo(Item, {as: 'item', foreignKey: "itemId" })

// Add business association
AvailableItem.belongsTo(Business, { foreignKey: "businessId" })
Business.hasMany(AvailableItem, { foreignKey: "businessId" })

export default AvailableItem 