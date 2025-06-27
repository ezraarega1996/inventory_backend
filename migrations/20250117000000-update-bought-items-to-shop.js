'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // First, add shopId column to ItemBought table if it doesn't exist
      const itemBoughtTableInfo = await queryInterface.describeTable('ItemBoughts');
      if (!itemBoughtTableInfo.shopId) {
        await queryInterface.addColumn('ItemBoughts', 'shopId', {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: 'Shops',
            key: 'id'
          }
        }, { transaction });
      }

      // Add shopId column to AvailableItems table if it doesn't exist
      const availableItemTableInfo = await queryInterface.describeTable('AvailableItems');
      if (!availableItemTableInfo.shopId) {
        await queryInterface.addColumn('AvailableItems', 'shopId', {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: 'Shops',
            key: 'id'
          }
        }, { transaction });
      }

      // Update existing ItemBought records to assign them to a default shop
      // First, get the first shop for each business
      const businesses = await queryInterface.sequelize.query(
        'SELECT DISTINCT "businessId" FROM "ItemBoughts" WHERE "shopId" IS NULL',
        { type: Sequelize.QueryTypes.SELECT, transaction }
      );

      for (const business of businesses) {
        const defaultShop = await queryInterface.sequelize.query(
          'SELECT id FROM "Shops" WHERE "businessId" = :businessId LIMIT 1',
          { 
            replacements: { businessId: business.businessId },
            type: Sequelize.QueryTypes.SELECT,
            transaction 
          }
        );

        if (defaultShop.length > 0) {
          await queryInterface.sequelize.query(
            'UPDATE "ItemBoughts" SET "shopId" = :shopId WHERE "businessId" = :businessId AND "shopId" IS NULL',
            { 
              replacements: { 
                shopId: defaultShop[0].id,
                businessId: business.businessId 
              },
              transaction 
            }
          );
        }
      }

      // Update existing AvailableItem records to assign them to a default shop
      const availableItemBusinesses = await queryInterface.sequelize.query(
        'SELECT DISTINCT "businessId" FROM "AvailableItems" WHERE "shopId" IS NULL',
        { type: Sequelize.QueryTypes.SELECT, transaction }
      );

      for (const business of availableItemBusinesses) {
        const defaultShop = await queryInterface.sequelize.query(
          'SELECT id FROM "Shops" WHERE "businessId" = :businessId LIMIT 1',
          { 
            replacements: { businessId: business.businessId },
            type: Sequelize.QueryTypes.SELECT,
            transaction 
          }
        );

        if (defaultShop.length > 0) {
          await queryInterface.sequelize.query(
            'UPDATE "AvailableItems" SET "shopId" = :shopId WHERE "businessId" = :businessId AND "shopId" IS NULL',
            { 
              replacements: { 
                shopId: defaultShop[0].id,
                businessId: business.businessId 
              },
              transaction 
            }
          );
        }
      }

      // Make shopId NOT NULL for ItemBoughts
      await queryInterface.changeColumn('ItemBoughts', 'shopId', {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Shops',
          key: 'id'
        }
      }, { transaction });

      // Make shopId NOT NULL for AvailableItems
      await queryInterface.changeColumn('AvailableItems', 'shopId', {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Shops',
          key: 'id'
        }
      }, { transaction });

      // Remove salesmanId column from ItemBoughts if it exists
      if (itemBoughtTableInfo.salesmanId) {
        await queryInterface.removeColumn('ItemBoughts', 'salesmanId', { transaction });
      }

      // Remove salesmanId column from AvailableItems if it exists
      if (availableItemTableInfo.salesmanId) {
        await queryInterface.removeColumn('AvailableItems', 'salesmanId', { transaction });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Add back salesmanId columns
      await queryInterface.addColumn('ItemBoughts', 'salesmanId', {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id'
        }
      }, { transaction });

      await queryInterface.addColumn('AvailableItems', 'salesmanId', {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id'
        }
      }, { transaction });

      // Make shopId nullable again
      await queryInterface.changeColumn('ItemBoughts', 'shopId', {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Shops',
          key: 'id'
        }
      }, { transaction });

      await queryInterface.changeColumn('AvailableItems', 'shopId', {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Shops',
          key: 'id'
        }
      }, { transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}; 