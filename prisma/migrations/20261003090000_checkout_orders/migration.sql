-- AlterTable
ALTER TABLE `Order` ADD COLUMN `deliveryFeeConfirmed` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `deliveryMethod` VARCHAR(40) NOT NULL DEFAULT 'STANDARD',
    ADD COLUMN `displayCurrency` ENUM('PKR', 'USD') NOT NULL DEFAULT 'PKR',
    ADD COLUMN `exchangeRate` DECIMAL(18, 8) NULL,
    ADD COLUMN `idempotencyKey` VARCHAR(64) NULL,
    ADD COLUMN `stockReleasedAt` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `OrderStatusEvent` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `status` ENUM('NEW', 'CONFIRMED', 'PROCESSING', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED') NOT NULL,
    `actor` VARCHAR(16) NOT NULL DEFAULT 'SYSTEM',
    `note` VARCHAR(500) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `OrderStatusEvent_orderId_createdAt_idx`(`orderId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `Order_idempotencyKey_key` ON `Order`(`idempotencyKey`);

-- AddForeignKey
ALTER TABLE `OrderStatusEvent` ADD CONSTRAINT `OrderStatusEvent_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;


-- Data integrity
ALTER TABLE `Order` ADD CONSTRAINT `Order_exchangeRate_positive` CHECK (`exchangeRate` IS NULL OR `exchangeRate` > 0);

-- Backfill: existing orders get a starting history entry (and their current status when it differs).
INSERT INTO `OrderStatusEvent` (`id`, `orderId`, `status`, `actor`, `createdAt`)
SELECT CONCAT('bf', SUBSTRING(MD5(CONCAT(`id`, 'NEW')), 1, 23)), `id`, 'NEW', 'SYSTEM', `createdAt` FROM `Order`;
INSERT INTO `OrderStatusEvent` (`id`, `orderId`, `status`, `actor`, `createdAt`)
SELECT CONCAT('bf', SUBSTRING(MD5(CONCAT(`id`, `status`)), 1, 23)), `id`, `status`, 'SYSTEM', `updatedAt` FROM `Order` WHERE `status` <> 'NEW';
