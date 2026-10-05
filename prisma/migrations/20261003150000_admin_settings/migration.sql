-- CreateTable
CREATE TABLE `SystemSetting` (
    `key` VARCHAR(100) NOT NULL,
    `category` ENUM('WHATSAPP', 'SMTP', 'BUSINESS', 'NOTIFICATIONS') NOT NULL,
    `value` TEXT NULL,
    `ciphertext` TEXT NULL,
    `iv` VARCHAR(32) NULL,
    `authTag` VARCHAR(32) NULL,
    `keyId` VARCHAR(16) NULL,
    `updatedById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `SystemSetting_category_idx`(`category`),
    INDEX `SystemSetting_updatedById_idx`(`updatedById`),
    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SettingAuditLog` (
    `id` VARCHAR(191) NOT NULL,
    `actorId` VARCHAR(191) NULL,
    `category` ENUM('WHATSAPP', 'SMTP', 'BUSINESS', 'NOTIFICATIONS') NOT NULL,
    `action` ENUM('SETTINGS_UPDATED', 'CREDENTIAL_REPLACED', 'CREDENTIAL_REMOVED', 'PREFERENCES_CHANGED', 'OVERRIDES_CLEARED', 'INTEGRATION_TESTED') NOT NULL,
    `keys` VARCHAR(500) NULL,
    `success` BOOLEAN NULL,
    `outcome` VARCHAR(300) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `SettingAuditLog_category_action_createdAt_idx`(`category`, `action`, `createdAt`),
    INDEX `SettingAuditLog_createdAt_idx`(`createdAt`),
    INDEX `SettingAuditLog_actorId_idx`(`actorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `SystemSetting` ADD CONSTRAINT `SystemSetting_updatedById_fkey` FOREIGN KEY (`updatedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SettingAuditLog` ADD CONSTRAINT `SettingAuditLog_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;


-- Data integrity: a row is either a plain value or a complete encrypted credential.
ALTER TABLE `SystemSetting` ADD CONSTRAINT `SystemSetting_value_or_secret` CHECK (
  (`ciphertext` IS NULL AND `iv` IS NULL AND `authTag` IS NULL AND `keyId` IS NULL)
  OR (`value` IS NULL AND `ciphertext` IS NOT NULL AND `iv` IS NOT NULL AND `authTag` IS NOT NULL AND `keyId` IS NOT NULL)
);
