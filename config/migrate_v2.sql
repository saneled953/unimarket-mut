-- Migration v2: Add residence, whatsapp, payment_methods to users
-- Add notifications table
-- Run this ONLY if your database already exists (do NOT re-run schema.sql)

USE unimarket;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS residence VARCHAR(100) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(20) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS payment_methods JSON DEFAULT NULL;

CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type ENUM('message','listing_sold','review','system') DEFAULT 'message',
  title VARCHAR(150) NOT NULL,
  body TEXT NOT NULL,
  link VARCHAR(255) DEFAULT NULL,
  is_read TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

SELECT 'Migration v2 complete ✅' AS status;
