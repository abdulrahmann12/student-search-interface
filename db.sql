-- =============================================================
-- Student Registration Reconciliation – Database Schema
-- Compatible with MySQL 5.7+ / MariaDB 10.3+
--
-- Import this file in phpMyAdmin or run:
--   mysql -u root -p reconciliation_db < db.sql
--
-- After import, run the seed script to create the first admin:
--   npm run seed
-- =============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `workspace_assignments`;
DROP TABLE IF EXISTS `action_logs`;
DROP TABLE IF EXISTS `manual_selections`;
DROP TABLE IF EXISTS `workspaces`;
DROP TABLE IF EXISTS `users`;


-- -------------------------------------------------------
-- Table: users
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id`            INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  `username`      VARCHAR(60)      NOT NULL,
  `email`         VARCHAR(255)     NOT NULL,
  `password_hash` VARCHAR(255)     NOT NULL,
  `role`          ENUM('admin','user') NOT NULL DEFAULT 'user',
  `is_active`     TINYINT(1)       NOT NULL DEFAULT 1,
  `created_at`    TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_username` (`username`),
  UNIQUE KEY `uq_email`    (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------
-- Table: workspaces
-- Each row represents one uploaded semester workbook.
-- Student records are stored as JSON for simplicity;
-- manual_selections are stored in a separate table so
-- individual reviews can be updated without rewriting the
-- entire student payload.
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS `workspaces` (
  `id`                      VARCHAR(64)  NOT NULL,
  `name`                    VARCHAR(255) NOT NULL,
  `file_name`               VARCHAR(255) NOT NULL DEFAULT '',
  `students`                LONGTEXT     NOT NULL COMMENT 'JSON array of student records',
  `subject_columns`         TEXT         NOT NULL COMMENT 'JSON array of subject column definitions',
  `export_columns`          TEXT         NOT NULL COMMENT 'JSON array of export column definitions',
  `header_rows`             TEXT         NOT NULL COMMENT 'JSON array of header rows for export',
  `created_by`              INT UNSIGNED NOT NULL,
  `created_at`              TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`              TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_created_by` (`created_by`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `fk_workspace_user`
    FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------
-- Table: manual_selections
-- Stores per-student paper-form course selections.
-- One row per (workspace, student row).
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS `manual_selections` (
  `id`                   INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `workspace_id`         VARCHAR(64)  NOT NULL,
  `row_id`               VARCHAR(64)  NOT NULL,
  `selected_course_keys` TEXT         NOT NULL DEFAULT '[]' COMMENT 'JSON array of selected course keys',
  `reviewed_at`          TIMESTAMP    NULL DEFAULT NULL,
  `last_edited_at`       TIMESTAMP    NULL DEFAULT NULL,
  `reviewed_by`          INT UNSIGNED NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ws_row` (`workspace_id`, `row_id`),
  KEY `idx_ms_workspace` (`workspace_id`),
  CONSTRAINT `fk_sel_workspace`
    FOREIGN KEY (`workspace_id`) REFERENCES `workspaces` (`id`)
    ON DELETE CASCADE,
  CONSTRAINT `fk_sel_user`
    FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------
-- Table: action_logs
-- Audit trail for all significant user actions.
-- username is denormalized so logs remain readable even
-- if the account is later renamed or deleted.
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS `action_logs` (
  `id`             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`        INT UNSIGNED NOT NULL,
  `username`       VARCHAR(60)  NOT NULL COMMENT 'Denormalized for readability',
  `action`         VARCHAR(100) NOT NULL,
  `workspace_id`   VARCHAR(64)  NULL DEFAULT NULL,
  `student_row_id` VARCHAR(64)  NULL DEFAULT NULL,
  `details`        TEXT         NULL DEFAULT NULL COMMENT 'JSON object with extra context',
  `created_at`     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_log_user`      (`user_id`),
  KEY `idx_log_action`    (`action`),
  KEY `idx_log_workspace` (`workspace_id`),
  KEY `idx_log_created`   (`created_at`),
  CONSTRAINT `fk_log_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------
-- Table: workspace_assignments
-- Maps which users have been granted access to a workspace.
-- Admins always have full access regardless of this table.
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS `workspace_assignments` (
  `id`           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `workspace_id` VARCHAR(64)  NOT NULL,
  `user_id`      INT UNSIGNED NOT NULL,
  `assigned_at`  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `assigned_by`  INT UNSIGNED NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_wa_ws_user` (`workspace_id`, `user_id`),
  KEY `idx_wa_workspace` (`workspace_id`),
  KEY `idx_wa_user`      (`user_id`),
  CONSTRAINT `fk_wa_workspace`
    FOREIGN KEY (`workspace_id`) REFERENCES `workspaces` (`id`)
    ON DELETE CASCADE,
  CONSTRAINT `fk_wa_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE,
  CONSTRAINT `fk_wa_by`
    FOREIGN KEY (`assigned_by`) REFERENCES `users` (`id`)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
