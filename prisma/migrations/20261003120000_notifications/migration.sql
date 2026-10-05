-- AlterTable
ALTER TABLE `Order` ADD COLUMN `locale` VARCHAR(8) NOT NULL DEFAULT 'en';

-- CreateTable
CREATE TABLE `Notification` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NULL,
    `eventKey` VARCHAR(191) NOT NULL,
    `type` ENUM('ORDER_CONFIRMATION', 'ORDER_STATUS', 'PAYMENT_CONFIRMED', 'ADMIN_NEW_ORDER') NOT NULL,
    `audience` ENUM('CUSTOMER', 'ADMIN') NOT NULL,
    `channel` ENUM('WHATSAPP', 'EMAIL') NOT NULL,
    `recipient` VARCHAR(191) NULL,
    `status` ENUM('PENDING', 'SENT', 'FAILED', 'SKIPPED') NOT NULL DEFAULT 'PENDING',
    `attempts` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `providerReference` VARCHAR(191) NULL,
    `fallbackFrom` ENUM('WHATSAPP', 'EMAIL') NULL,
    `errorMessage` VARCHAR(500) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Notification_orderId_createdAt_idx`(`orderId`, `createdAt`),
    INDEX `Notification_status_createdAt_idx`(`status`, `createdAt`),
    UNIQUE INDEX `Notification_eventKey_channel_key`(`eventKey`, `channel`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;


-- Data integrity
ALTER TABLE `Order` ADD CONSTRAINT `Order_locale_supported` CHECK (`locale` IN ('en', 'ur', 'hi'));
