-- AlterTable
ALTER TABLE `reservations` ADD COLUMN `room_count` TINYINT UNSIGNED NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE `room_units` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `room_id` BIGINT UNSIGNED NOT NULL,
    `unit_number` VARCHAR(30) NOT NULL,
    `status` ENUM('Available', 'Maintenance') NOT NULL DEFAULT 'Available',
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL,

    INDEX `idx_room_units_room`(`room_id`),
    UNIQUE INDEX `uq_room_unit_number`(`room_id`, `unit_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reservation_units` (
    `reservation_id` BIGINT UNSIGNED NOT NULL,
    `unit_id` BIGINT UNSIGNED NOT NULL,

    INDEX `idx_reservation_units_unit`(`unit_id`),
    PRIMARY KEY (`reservation_id`, `unit_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `room_units` ADD CONSTRAINT `room_units_room_id_fkey` FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reservation_units` ADD CONSTRAINT `reservation_units_reservation_id_fkey` FOREIGN KEY (`reservation_id`) REFERENCES `reservations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reservation_units` ADD CONSTRAINT `reservation_units_unit_id_fkey` FOREIGN KEY (`unit_id`) REFERENCES `room_units`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Data backfill: every existing room type becomes 1 physical unit,
-- and every existing reservation is linked to that unit (previous behaviour: 1 room per type).
INSERT INTO `room_units` (`room_id`, `unit_number`, `status`, `created_at`, `updated_at`)
SELECT `id`, CAST((`id` * 100 + 1) AS CHAR), 'Available', CURRENT_TIMESTAMP(0), CURRENT_TIMESTAMP(0)
FROM `rooms`;

INSERT INTO `reservation_units` (`reservation_id`, `unit_id`)
SELECT r.`id`, u.`id`
FROM `reservations` r
JOIN `room_units` u ON u.`room_id` = r.`room_id`;
