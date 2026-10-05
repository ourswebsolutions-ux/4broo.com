-- DropIndex
DROP INDEX `Product_status_price_idx` ON `Product`;

-- AlterTable
ALTER TABLE `Product` ADD COLUMN `effectivePrice` DECIMAL(12, 2) NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX `Product_status_effectivePrice_idx` ON `Product`(`status`, `effectivePrice`);

-- Backfill: the price actually charged today.
UPDATE `Product`
SET `effectivePrice` = IF(`onSale` AND `salePrice` IS NOT NULL AND `salePrice` < `price`, `salePrice`, `price`);

ALTER TABLE `Product` ADD CONSTRAINT `Product_effectivePrice_check` CHECK (`effectivePrice` >= 0);
