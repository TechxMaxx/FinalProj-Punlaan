-- Punlaan database (full install). Import into an empty database, e.g. punlaan3.

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
DROP TABLE IF EXISTS `cart`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `cart` (
  `cart_id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`cart_id`),
  UNIQUE KEY `unique_user_cart` (`user_id`),
  CONSTRAINT `cart_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `cart` WRITE;
/*!40000 ALTER TABLE `cart` DISABLE KEYS */;
INSERT INTO `cart` VALUES (1,20,'2026-08-23 20:25:15','2026-08-23 20:26:25'),(2,23,'2026-08-24 02:30:00','2026-08-24 02:30:00'),(3,24,'2026-08-24 02:31:00','2026-08-24 02:31:00'),(4,25,'2026-08-24 02:32:00','2026-08-24 02:32:00'),(5,26,'2026-08-24 02:33:00','2026-08-24 02:33:00'),(6,27,'2026-08-24 02:34:00','2026-08-24 02:34:00'),(7,7,'2026-08-24 02:35:00','2026-08-24 02:35:00'),(8,8,'2026-08-24 02:36:00','2026-08-24 02:36:00'),(9,10,'2026-08-24 02:37:00','2026-08-24 02:37:00'),(10,13,'2026-08-24 02:38:00','2026-08-24 02:38:00'),(11,16,'2026-08-24 02:39:00','2026-08-24 02:39:00'),(12,34,'2026-08-30 17:20:08','2026-08-30 17:20:08'),(14,38,'2026-09-23 12:05:22','2026-09-23 12:05:22'),(20,71,'2026-09-24 20:39:57','2026-09-24 20:39:57'),(21,70,'2026-09-24 22:06:41','2026-09-24 22:06:41'),(22,73,'2026-09-25 03:07:37','2026-09-25 03:07:37');
/*!40000 ALTER TABLE `cart` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `cart_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `cart_items` (
  `cart_item_id` int(11) NOT NULL AUTO_INCREMENT,
  `cart_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `quantity` int(11) NOT NULL DEFAULT 1,
  `added_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`cart_item_id`),
  UNIQUE KEY `unique_cart_product` (`cart_id`,`product_id`),
  KEY `cart_id` (`cart_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `cart_items_ibfk_1` FOREIGN KEY (`cart_id`) REFERENCES `cart` (`cart_id`) ON DELETE CASCADE,
  CONSTRAINT `cart_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `product` (`product_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=50 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `cart_items` WRITE;
/*!40000 ALTER TABLE `cart_items` DISABLE KEYS */;
INSERT INTO `cart_items` VALUES (3,2,32,2,'2026-08-24 02:30:00'),(4,3,33,3,'2026-08-24 02:31:00'),(5,4,34,1,'2026-08-24 02:32:00'),(6,5,35,2,'2026-08-24 02:33:00'),(7,6,36,1,'2026-08-24 02:34:00'),(8,7,37,2,'2026-08-24 02:35:00'),(9,8,38,1,'2026-08-24 02:36:00'),(10,9,39,4,'2026-08-24 02:37:00'),(11,10,40,2,'2026-08-24 02:38:00'),(12,11,41,3,'2026-08-24 02:39:00'),(21,1,12,1,'2026-09-16 15:05:12'),(23,1,13,1,'2026-09-23 06:22:38'),(41,20,40,1,'2026-09-24 20:39:57'),(47,14,48,1,'2026-09-25 02:48:16'),(49,20,9,1,'2026-09-25 04:04:14');
/*!40000 ALTER TABLE `cart_items` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `categories` (
  `category_id` int(11) NOT NULL AUTO_INCREMENT,
  `parent_id` int(11) DEFAULT NULL,
  `name` varchar(100) NOT NULL,
  `slug` varchar(100) NOT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `size_tier` varchar(10) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`category_id`),
  UNIQUE KEY `slug` (`slug`),
  KEY `parent_id` (`parent_id`),
  CONSTRAINT `categories_ibfk_1` FOREIGN KEY (`parent_id`) REFERENCES `categories` (`category_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=55 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `categories` WRITE;
/*!40000 ALTER TABLE `categories` DISABLE KEYS */;
INSERT INTO `categories` VALUES (1,NULL,'Seedlings','seedlings',1,'small',1,'2026-09-24 22:42:41'),(2,NULL,'Bushes','bushes',2,'medium',1,'2026-09-24 22:42:41'),(3,NULL,'Saplings','saplings',3,'large',1,'2026-09-24 22:42:41'),(4,NULL,'Indoor Plants','indoor-plants',4,'medium',1,'2026-09-24 22:42:41'),(5,NULL,'Garden Supplies','supplies',5,'medium',1,'2026-09-24 22:42:41'),(11,1,'Vegetable Seedlings','veg-seedlings',1,NULL,1,'2026-09-24 22:42:41'),(12,1,'Fruit Seedlings','fruit-seedlings',2,NULL,1,'2026-09-24 22:42:41'),(13,1,'Herb & Culinary Seedlings','herb-seedlings',3,NULL,1,'2026-09-24 22:42:41'),(21,2,'Flowering Bushes','flowering-bushes',1,NULL,1,'2026-09-24 22:42:41'),(22,2,'Ornamental Bushes','ornamental-bushes',2,NULL,1,'2026-09-24 22:42:41'),(23,2,'Landscaping Bushes','landscaping-bushes',3,NULL,1,'2026-09-24 22:42:41'),(31,3,'Fruit Tree Saplings','fruit-saplings',1,NULL,1,'2026-09-24 22:42:41'),(32,3,'Native Tree Saplings','native-saplings',2,NULL,1,'2026-09-24 22:42:41'),(33,3,'Shade & Ornamental Tree Saplings','shade-saplings',3,NULL,1,'2026-09-24 22:42:41'),(41,4,'Foliage Plants','foliage-plants',1,NULL,1,'2026-09-24 22:42:41'),(42,4,'Succulents & Cacti','succulents',2,'small',1,'2026-09-24 22:42:41'),(51,5,'Fertilizers & Soil','fertilizers-soil',1,NULL,1,'2026-09-24 22:42:41'),(52,5,'Garden Tools & Pots','tools-pots',2,NULL,1,'2026-09-24 22:42:41');
/*!40000 ALTER TABLE `categories` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `conversations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `conversations` (
  `conversation_id` int(11) NOT NULL AUTO_INCREMENT,
  `customer_id` int(11) NOT NULL,
  `vendor_id` int(11) NOT NULL,
  `product_id` int(11) DEFAULT NULL,
  `last_message_id` int(11) NOT NULL DEFAULT 0,
  `last_message_at` datetime DEFAULT NULL,
  `customer_last_read_id` int(11) NOT NULL DEFAULT 0,
  `vendor_last_read_id` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`conversation_id`),
  UNIQUE KEY `unique_pair` (`customer_id`,`vendor_id`),
  KEY `vendor_id` (`vendor_id`),
  CONSTRAINT `conversations_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `conversations_ibfk_2` FOREIGN KEY (`vendor_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `conversations` WRITE;
/*!40000 ALTER TABLE `conversations` DISABLE KEYS */;
INSERT INTO `conversations` VALUES (1,38,9,NULL,0,NULL,0,0,'2026-09-25 02:47:34'),(2,38,71,NULL,2,'2026-09-25 11:03:29',1,2,'2026-09-25 02:48:24'),(3,73,71,48,0,NULL,0,0,'2026-09-25 03:17:04');
/*!40000 ALTER TABLE `conversations` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `messages` (
  `message_id` int(11) NOT NULL AUTO_INCREMENT,
  `conversation_id` int(11) NOT NULL,
  `sender_id` int(11) NOT NULL,
  `body` text NOT NULL,
  `product_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`message_id`),
  KEY `conversation_id` (`conversation_id`,`message_id`),
  CONSTRAINT `messages_ibfk_1` FOREIGN KEY (`conversation_id`) REFERENCES `conversations` (`conversation_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `messages` WRITE;
/*!40000 ALTER TABLE `messages` DISABLE KEYS */;
INSERT INTO `messages` VALUES (1,2,38,'hello pre',NULL,'2026-09-25 02:48:29'),(2,2,71,'hello',NULL,'2026-09-25 03:03:29');
/*!40000 ALTER TABLE `messages` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `notification_recipients`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `notification_recipients` (
  `notification_recipient_id` int(11) NOT NULL AUTO_INCREMENT,
  `notification_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT 0,
  `read_at` datetime DEFAULT NULL,
  `is_dismissed` tinyint(1) NOT NULL DEFAULT 0,
  `dismissed_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`notification_recipient_id`),
  UNIQUE KEY `unique_notification_user` (`notification_id`,`user_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `notification_recipients_ibfk_1` FOREIGN KEY (`notification_id`) REFERENCES `notifications` (`notification_id`) ON DELETE CASCADE,
  CONSTRAINT `notification_recipients_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=134 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `notification_recipients` WRITE;
/*!40000 ALTER TABLE `notification_recipients` DISABLE KEYS */;
INSERT INTO `notification_recipients` VALUES (1,1,9,0,NULL,0,NULL,'2026-09-23 09:19:39'),(2,1,11,0,NULL,0,NULL,'2026-09-23 09:19:39'),(3,1,13,0,NULL,0,NULL,'2026-09-23 09:19:39'),(4,1,14,0,NULL,0,NULL,'2026-09-23 09:19:39'),(5,1,15,0,NULL,0,NULL,'2026-09-23 09:19:39'),(6,1,17,0,NULL,0,NULL,'2026-09-23 09:19:39'),(7,1,20,1,'2026-09-23 17:32:02',0,NULL,'2026-09-23 09:19:39'),(8,1,22,0,NULL,0,NULL,'2026-09-23 09:19:39'),(9,1,23,0,NULL,0,NULL,'2026-09-23 09:19:39'),(10,1,24,0,NULL,0,NULL,'2026-09-23 09:19:39'),(11,1,25,0,NULL,0,NULL,'2026-09-23 09:19:39'),(12,1,26,0,NULL,0,NULL,'2026-09-23 09:19:39'),(13,1,28,0,NULL,0,NULL,'2026-09-23 09:19:39'),(14,1,29,0,NULL,0,NULL,'2026-09-23 09:19:39'),(15,1,30,0,NULL,0,NULL,'2026-09-23 09:19:39'),(16,1,31,0,NULL,0,NULL,'2026-09-23 09:19:39'),(17,1,32,0,NULL,0,NULL,'2026-09-23 09:19:39'),(18,1,33,0,NULL,0,NULL,'2026-09-23 09:19:39'),(19,1,35,0,NULL,0,NULL,'2026-09-23 09:19:39'),(32,2,13,0,NULL,0,NULL,'2026-09-23 09:20:44'),(33,2,23,0,NULL,0,NULL,'2026-09-23 09:20:44'),(34,2,24,0,NULL,0,NULL,'2026-09-23 09:20:44'),(35,2,25,0,NULL,0,NULL,'2026-09-23 09:20:44'),(36,2,26,0,NULL,0,NULL,'2026-09-23 09:20:44'),(37,2,33,0,NULL,0,NULL,'2026-09-23 09:20:44'),(38,2,35,0,NULL,0,NULL,'2026-09-23 09:20:44'),(39,3,9,0,NULL,0,NULL,'2026-09-23 09:26:41'),(40,3,11,0,NULL,0,NULL,'2026-09-23 09:26:41'),(41,3,14,0,NULL,0,NULL,'2026-09-23 09:26:41'),(42,3,15,0,NULL,0,NULL,'2026-09-23 09:26:41'),(43,3,17,0,NULL,0,NULL,'2026-09-23 09:26:41'),(44,3,20,1,'2026-09-23 17:32:01',0,NULL,'2026-09-23 09:26:41'),(45,3,22,0,NULL,0,NULL,'2026-09-23 09:26:41'),(46,3,28,0,NULL,0,NULL,'2026-09-23 09:26:41'),(47,3,29,0,NULL,0,NULL,'2026-09-23 09:26:41'),(48,3,30,0,NULL,0,NULL,'2026-09-23 09:26:41'),(49,3,31,0,NULL,0,NULL,'2026-09-23 09:26:41'),(50,3,32,0,NULL,0,NULL,'2026-09-23 09:26:41'),(75,4,71,0,NULL,0,NULL,'2026-09-25 02:48:29'),(76,5,38,0,NULL,0,NULL,'2026-09-25 03:03:29'),(77,6,38,0,NULL,0,NULL,'2026-09-25 03:05:03'),(78,7,38,0,NULL,0,NULL,'2026-09-25 03:05:07'),(79,8,73,0,NULL,0,NULL,'2026-09-25 03:12:51'),(80,9,71,0,NULL,0,NULL,'2026-09-25 03:12:51'),(81,10,73,0,NULL,0,NULL,'2026-09-25 03:15:10'),(82,11,73,1,'2026-09-25 11:15:27',0,NULL,'2026-09-25 03:15:14'),(83,12,71,0,NULL,0,NULL,'2026-09-25 03:16:33'),(84,13,71,0,NULL,0,NULL,'2026-09-25 03:17:03');
/*!40000 ALTER TABLE `notification_recipients` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `notifications` (
  `notification_id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(120) NOT NULL,
  `message` varchar(500) NOT NULL,
  `audience` enum('All','Customers','Vendors','Specific') NOT NULL,
  `priority` enum('Info','Promo','Urgent') NOT NULL DEFAULT 'Info',
  `kind` varchar(20) NOT NULL DEFAULT 'broadcast',
  `link` varchar(255) DEFAULT NULL,
  `target_user_id` int(11) DEFAULT NULL,
  `sent_by_admin_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`notification_id`),
  KEY `target_user_id` (`target_user_id`),
  CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`target_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `notifications` WRITE;
/*!40000 ALTER TABLE `notifications` DISABLE KEYS */;
INSERT INTO `notifications` VALUES (1,'Testing Broadcast!','testing if its working pls','All','Info','broadcast',NULL,NULL,35,'2026-09-23 09:19:39'),(2,'Testing customers for promos','eeee','Customers','Promo','broadcast',NULL,NULL,35,'2026-09-23 09:20:44'),(3,'Plese work','pls pls pls','Vendors','Urgent','broadcast',NULL,NULL,35,'2026-09-23 09:26:41'),(4,'New message from Jastin','hello pre','Specific','Info','system','MyAccount/customer/Messages.html?c=2',71,NULL,'2026-09-25 02:48:29'),(5,'New message from Test Seller Garden','hello','Specific','Info','system','MyAccount/customer/Messages.html?c=2',38,NULL,'2026-09-25 03:03:29'),(6,'Order packed','The seller packed Halaman na Maliit × 1 (order PM-20260923-162039-8093). It will be handed to the courier soon.','Specific','Info','system','MyAccount/customer/MyOrders.html',38,NULL,'2026-09-25 03:05:03'),(7,'Order handed to the courier','Halaman na Maliit × 1 (order PM-20260923-162039-8093) is now with the courier.','Specific','Info','system','MyAccount/customer/MyOrders.html',38,NULL,'2026-09-25 03:05:07'),(8,'Order placed','Your order PM-20260925-111251-9142 (₱266.00) was placed. Pay the rider when it arrives.','Specific','Info','system','MyAccount/customer/MyOrders.html',73,NULL,'2026-09-25 03:12:51'),(9,'New order to pack','Order PM-20260925-111251-9142: 1 item(s) worth ₱20.00. Pack it and mark it Packed.','Specific','Info','system','MyAccount/vendor/OrderProcessing.html',71,NULL,'2026-09-25 03:12:51'),(10,'Order packed','The seller packed Halaman na Maliit × 1 (order PM-20260925-111251-9142). It will be handed to the courier soon.','Specific','Info','system','MyAccount/customer/MyOrders.html',73,NULL,'2026-09-25 03:15:10'),(11,'Order handed to the courier','Halaman na Maliit × 1 (order PM-20260925-111251-9142) is now with the courier.','Specific','Info','system','MyAccount/customer/MyOrders.html',73,NULL,'2026-09-25 03:15:14'),(12,'Order received','The buyer received Halaman na Maliit × 1 (order PM-20260925-111251-9142). The sale counts toward your earnings once the return period ends.','Specific','Info','system','MyAccount/vendor/Sales.html',71,NULL,'2026-09-25 03:16:33'),(13,'New 5-star review','A buyer rated Halaman na Maliit 5/5: \"Maangas Boy\" You can reply in Reviews.','Specific','Info','system','MyAccount/vendor/Reviews.html',71,NULL,'2026-09-25 03:17:03');
/*!40000 ALTER TABLE `notifications` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `order_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `order_items` (
  `order_item_id` int(11) NOT NULL AUTO_INCREMENT,
  `order_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `vendor_id` int(11) NOT NULL,
  `product_name` varchar(150) NOT NULL,
  `product_image` varchar(255) DEFAULT NULL,
  `unit_price` decimal(10,2) NOT NULL,
  `quantity` int(11) NOT NULL,
  `total_price` decimal(10,2) NOT NULL,
  `commission_rate` decimal(5,2) NOT NULL DEFAULT 5.00,
  `status` enum('to-pack','packed','shipping','shipped','completed','cancelled') NOT NULL DEFAULT 'to-pack',
  `status_note` text DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`order_item_id`),
  KEY `order_id` (`order_id`),
  KEY `product_id` (`product_id`),
  KEY `vendor_id` (`vendor_id`),
  CONSTRAINT `order_items_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`) ON DELETE CASCADE,
  CONSTRAINT `order_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `product` (`product_id`) ON DELETE CASCADE,
  CONSTRAINT `order_items_ibfk_3` FOREIGN KEY (`vendor_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=32 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `order_items` WRITE;
/*!40000 ALTER TABLE `order_items` DISABLE KEYS */;
INSERT INTO `order_items` VALUES (1,1,9,9,'Tomato Seedling','products/tomato_seedling.jpg',35.00,3,105.00,5.00,'to-pack','Waiting for vendor to prepare the order.',NULL,'2026-08-23 20:25:28','2026-08-23 20:25:28'),(2,1,20,20,'Dwarf Santan','products/dwarf_santan.jpg',100.00,2,200.00,5.00,'to-pack','Waiting for vendor to prepare the order.',NULL,'2026-08-23 20:25:28','2026-08-23 20:25:28'),(3,2,28,20,'Grafted Calamansi Sapling','products/calamansi_grafted.jpg',250.00,1,250.00,5.00,'shipping','Package is currently with the delivery courier.',NULL,'2026-08-23 20:25:38','2026-08-23 20:25:38'),(4,3,21,20,'Bougainvillea','products/bougainvillea.jpg',180.00,1,180.00,5.00,'to-pack','',NULL,'2026-08-23 20:25:48','2026-08-23 20:43:32'),(5,4,32,28,'Dwarf Banana Sapling','products/banana_sapling.jpg',110.00,2,220.00,5.00,'to-pack','Waiting for vendor to prepare the order.',NULL,'2026-08-24 02:40:00','2026-08-24 02:40:00'),(6,5,33,28,'Sweet Basil Seedling','products/basil_seedling.jpg',40.00,3,120.00,5.00,'packed','Vendor has prepared the order.',NULL,'2026-08-24 02:41:00','2026-08-24 02:45:00'),(7,6,34,29,'Pink Bougainvillea','products/bougainvillea.jpg',190.00,1,190.00,5.00,'shipping','Package is currently with the delivery courier.',NULL,'2026-08-24 02:42:00','2026-08-24 02:46:00'),(8,7,35,29,'Dwarf Santan Premium','products/dwarf_santan.jpg',120.00,2,240.00,5.00,'shipped','Package has been shipped.',NULL,'2026-08-24 02:43:00','2026-08-24 02:47:00'),(9,8,36,30,'Gardenia Starter Plant','products/gardenia.jpg',185.00,1,185.00,5.00,'completed','Order successfully delivered.','2026-08-24 10:50:00','2026-08-24 02:44:00','2026-09-24 22:42:39'),(10,9,37,30,'Golden Duranta Plant','products/duranta.jpg',145.00,2,290.00,5.00,'completed','Order successfully delivered.','2026-08-24 10:51:00','2026-08-24 02:45:00','2026-09-24 22:42:39'),(11,10,39,31,'Terracotta Garden Pot','products/no_photo.jpg',85.00,1,85.00,5.00,'cancelled','Order cancelled by customer.',NULL,'2026-08-24 02:46:00','2026-08-24 02:52:00'),(12,11,38,31,'Fukien Tea Bonsai','products/fukien_tea.jpg',250.00,1,250.00,5.00,'shipping','Package is currently with the delivery courier.',NULL,'2026-08-24 02:47:00','2026-08-24 02:53:00'),(13,12,40,32,'Mint Herb Seedling','products/mint_seedling.jpg',35.00,2,70.00,5.00,'packed','Vendor has prepared the order.',NULL,'2026-08-24 02:48:00','2026-08-24 02:54:00'),(14,13,41,32,'Oregano Herb Seedling','products/oregano_seedling.jpg',40.00,3,120.00,5.00,'to-pack','Waiting for vendor to prepare the order.',NULL,'2026-08-24 02:49:00','2026-08-24 02:49:00'),(15,14,9,9,'Tomato Seedling','products/tomato_seedling.jpg',35.00,1,35.00,5.00,'to-pack','Waiting for vendor to prepare the order.',NULL,'2026-08-29 20:08:19','2026-08-29 20:08:19'),(16,15,10,9,'Eggplant Seedling','products/eggplant_seedling.jpg',30.00,3,90.00,5.00,'to-pack','Waiting for vendor to prepare the order.',NULL,'2026-08-29 20:09:16','2026-08-29 20:09:16'),(17,15,14,9,'Papaya Seedling','products/papaya_seedling.jpg',60.00,5,300.00,5.00,'to-pack','Waiting for vendor to prepare the order.',NULL,'2026-08-29 20:09:16','2026-08-29 20:09:16'),(18,16,26,20,'Golden Duranta','products/duranta.jpg',140.00,2,280.00,5.00,'packed','',NULL,'2026-08-29 20:10:49','2026-08-29 20:11:13'),(19,17,42,34,'Sample Seeds','products/no_photo.jpg',10.00,2,20.00,5.00,'completed','','2026-08-31 01:21:27','2026-08-30 17:20:54','2026-09-24 22:42:39'),(20,17,10,9,'Eggplant Seedling','products/eggplant_seedling.jpg',30.00,5,150.00,5.00,'to-pack','Waiting for vendor to prepare the order.',NULL,'2026-08-30 17:20:54','2026-08-30 17:20:54'),(21,18,18,9,'Oregano Seedling','products/oregano_seedling.jpg',35.00,1,35.00,5.00,'to-pack','Waiting for vendor to prepare the order.',NULL,'2026-09-16 16:18:52','2026-09-16 16:18:52'),(24,21,38,31,'Fukien Tea Bonsai','products/fukien_tea.jpg',250.00,1,250.00,5.00,'to-pack','Waiting for vendor to prepare the order.',NULL,'2026-09-23 13:17:07','2026-09-23 13:17:07'),(29,26,48,71,'Halaman na Maliit','products/uploads/6a84b656b6123ad07a5fa5115d50e499.jpg',20.00,1,20.00,5.00,'shipping','Your order has been handed to the courier.',NULL,'2026-09-23 14:20:39','2026-09-25 03:05:07'),(31,27,48,71,'Halaman na Maliit','products/uploads/6a84b656b6123ad07a5fa5115d50e499.jpg',20.00,1,20.00,5.00,'completed','Customer confirmed the order was received.','2026-09-25 11:16:33','2026-09-25 03:12:51','2026-09-25 03:16:33');
/*!40000 ALTER TABLE `order_items` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `order_shipments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `order_shipments` (
  `shipment_id` int(11) NOT NULL AUTO_INCREMENT,
  `order_id` int(11) NOT NULL,
  `vendor_id` int(11) NOT NULL,
  `from_city` varchar(150) DEFAULT NULL,
  `distance_km` decimal(7,1) DEFAULT NULL,
  `zone` varchar(40) DEFAULT NULL,
  `shipping_fee` decimal(10,2) NOT NULL DEFAULT 0.00,
  `courier` varchar(60) DEFAULT NULL,
  `tracking_number` varchar(80) DEFAULT NULL,
  `shipped_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`shipment_id`),
  UNIQUE KEY `unique_order_vendor` (`order_id`,`vendor_id`),
  KEY `vendor_id` (`vendor_id`),
  CONSTRAINT `order_shipments_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=47 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `order_shipments` WRITE;
/*!40000 ALTER TABLE `order_shipments` DISABLE KEYS */;
INSERT INTO `order_shipments` VALUES (1,1,9,NULL,NULL,NULL,150.00,NULL,NULL,NULL,'2026-09-24 22:42:39'),(2,2,20,NULL,NULL,NULL,150.00,NULL,NULL,NULL,'2026-09-24 22:42:39'),(3,3,20,NULL,NULL,NULL,150.00,NULL,NULL,NULL,'2026-09-24 22:42:39'),(4,4,28,NULL,NULL,NULL,120.00,NULL,NULL,NULL,'2026-09-24 22:42:39'),(5,5,28,NULL,NULL,NULL,100.00,NULL,NULL,NULL,'2026-09-24 22:42:39'),(6,6,29,NULL,NULL,NULL,120.00,NULL,NULL,NULL,'2026-09-24 22:42:39'),(7,7,29,NULL,NULL,NULL,150.00,NULL,NULL,NULL,'2026-09-24 22:42:39'),(8,8,30,NULL,NULL,NULL,120.00,NULL,NULL,NULL,'2026-09-24 22:42:39'),(9,9,30,NULL,NULL,NULL,150.00,NULL,NULL,NULL,'2026-09-24 22:42:39'),(10,10,31,NULL,NULL,NULL,100.00,NULL,NULL,NULL,'2026-09-24 22:42:39'),(11,11,31,NULL,NULL,NULL,150.00,NULL,NULL,NULL,'2026-09-24 22:42:39'),(12,12,32,NULL,NULL,NULL,100.00,NULL,NULL,NULL,'2026-09-24 22:42:39'),(13,13,32,NULL,NULL,NULL,120.00,NULL,NULL,NULL,'2026-09-24 22:42:39'),(14,14,9,NULL,NULL,NULL,150.00,NULL,NULL,NULL,'2026-09-24 22:42:39'),(15,15,9,NULL,NULL,NULL,150.00,NULL,NULL,NULL,'2026-09-24 22:42:39'),(16,16,20,NULL,NULL,NULL,150.00,NULL,NULL,NULL,'2026-09-24 22:42:39'),(17,17,9,NULL,NULL,NULL,150.00,NULL,NULL,NULL,'2026-09-24 22:42:39'),(18,18,9,NULL,NULL,NULL,150.00,NULL,NULL,NULL,'2026-09-24 22:42:39'),(19,21,31,NULL,NULL,NULL,150.00,NULL,NULL,NULL,'2026-09-24 22:42:39'),(20,26,71,NULL,NULL,NULL,150.00,NULL,NULL,NULL,'2026-09-24 22:42:39'),(36,27,71,'Imus, Cavite',24.5,NULL,246.00,NULL,NULL,NULL,'2026-09-25 03:12:51');
/*!40000 ALTER TABLE `order_shipments` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `orders` (
  `order_id` int(11) NOT NULL AUTO_INCREMENT,
  `order_number` varchar(50) NOT NULL,
  `customer_id` int(11) NOT NULL,
  `shipping_address` text DEFAULT NULL,
  `shipping_lat` decimal(10,7) DEFAULT NULL,
  `shipping_lng` decimal(10,7) DEFAULT NULL,
  `subtotal` decimal(10,2) NOT NULL DEFAULT 0.00,
  `shipping_fee` decimal(10,2) NOT NULL DEFAULT 0.00,
  `total_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `payment_method` varchar(20) NOT NULL DEFAULT 'cod',
  `payment_status` varchar(20) NOT NULL DEFAULT 'unpaid',
  `paid_at` datetime DEFAULT NULL,
  `paymongo_checkout_id` varchar(100) DEFAULT NULL,
  `paymongo_payment_id` varchar(100) DEFAULT NULL,
  `refunded_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `status` enum('to-pack','packed','shipping','shipped','completed','cancelled') NOT NULL DEFAULT 'to-pack',
  `status_note` text DEFAULT NULL,
  `order_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`order_id`),
  UNIQUE KEY `order_number` (`order_number`),
  KEY `customer_id` (`customer_id`),
  CONSTRAINT `orders_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `orders` WRITE;
/*!40000 ALTER TABLE `orders` DISABLE KEYS */;
INSERT INTO `orders` VALUES (1,'PM-20260824-0001',13,'Quezon City, Metro Manila',NULL,NULL,305.00,150.00,455.00,'cod','unpaid',NULL,NULL,NULL,0.00,'to-pack','Order received and waiting for vendor processing.','2026-08-23 20:25:28','2026-08-23 20:25:28'),(2,'PM-20260823-0002',13,'Makati City, Metro Manila',NULL,NULL,250.00,150.00,400.00,'cod','unpaid',NULL,NULL,NULL,0.00,'shipping','Your order is currently being delivered.','2026-08-23 20:25:38','2026-08-23 20:25:38'),(3,'PM-20260820-0003',20,'Manila City, Metro Manila',NULL,NULL,180.00,150.00,330.00,'cod','paid','2026-08-24 04:27:16',NULL,NULL,0.00,'completed','Order successfully delivered.','2026-08-23 20:25:48','2026-09-24 20:50:36'),(4,'PM-20260824-0004',23,'Quezon City, Metro Manila',NULL,NULL,220.00,120.00,340.00,'cod','unpaid',NULL,NULL,NULL,0.00,'to-pack','Order received and waiting for vendor processing.','2026-08-24 02:40:00','2026-08-24 02:40:00'),(5,'PM-20260824-0005',24,'Makati City, Metro Manila',NULL,NULL,120.00,100.00,220.00,'cod','unpaid',NULL,NULL,NULL,0.00,'packed','Vendor has prepared the order for shipment.','2026-08-24 02:41:00','2026-08-24 02:45:00'),(6,'PM-20260824-0006',25,'Manila City, Metro Manila',NULL,NULL,190.00,120.00,310.00,'cod','unpaid',NULL,NULL,NULL,0.00,'shipping','Package is currently with the delivery courier.','2026-08-24 02:42:00','2026-08-24 02:46:00'),(7,'PM-20260824-0007',26,'Pasig City, Metro Manila',NULL,NULL,240.00,150.00,390.00,'cod','unpaid',NULL,NULL,NULL,0.00,'shipped','Package has been shipped to the customer.','2026-08-24 02:43:00','2026-08-24 02:47:00'),(8,'PM-20260824-0008',27,'Taguig City, Metro Manila',NULL,NULL,185.00,120.00,305.00,'cod','paid','2026-08-24 10:50:00',NULL,NULL,0.00,'completed','Order successfully delivered.','2026-08-24 02:44:00','2026-09-24 20:50:36'),(9,'PM-20260824-0009',7,'Quezon City, Metro Manila',NULL,NULL,280.00,150.00,430.00,'cod','paid','2026-08-24 10:51:00',NULL,NULL,0.00,'completed','Order successfully delivered.','2026-08-24 02:45:00','2026-09-24 20:50:36'),(10,'PM-20260824-0010',8,'Makati City, Metro Manila',NULL,NULL,85.00,100.00,185.00,'cod','unpaid',NULL,NULL,NULL,0.00,'cancelled','Order cancelled by customer.','2026-08-24 02:46:00','2026-08-24 02:52:00'),(11,'PM-20260824-0011',10,'Taguig City, Metro Manila',NULL,NULL,350.00,150.00,500.00,'cod','unpaid',NULL,NULL,NULL,0.00,'shipping','Package is currently with the delivery courier.','2026-08-24 02:47:00','2026-08-24 02:53:00'),(12,'PM-20260824-0012',13,'Quezon City, Metro Manila',NULL,NULL,70.00,100.00,170.00,'cod','unpaid',NULL,NULL,NULL,0.00,'packed','Vendor has prepared the order for shipment.','2026-08-24 02:48:00','2026-08-24 02:54:00'),(13,'PM-20260824-0013',16,'Manila City, Metro Manila',NULL,NULL,120.00,120.00,240.00,'cod','unpaid',NULL,NULL,NULL,0.00,'to-pack','Order received and waiting for vendor processing.','2026-08-24 02:49:00','2026-08-24 02:49:00'),(14,'PM-20260829-220819-5879',20,'Quezon City',NULL,NULL,35.00,150.00,185.00,'cod','unpaid',NULL,NULL,NULL,0.00,'to-pack','Order received and waiting for vendor processing.','2026-08-29 20:08:19','2026-08-29 20:08:19'),(15,'PM-20260829-220916-7525',20,'Quezon City',NULL,NULL,390.00,150.00,540.00,'cod','unpaid',NULL,NULL,NULL,0.00,'to-pack','Order received and waiting for vendor processing.','2026-08-29 20:09:16','2026-08-29 20:09:16'),(16,'PM-20260829-221049-7689',20,'Quezon City',NULL,NULL,280.00,150.00,430.00,'cod','unpaid',NULL,NULL,NULL,0.00,'to-pack','Order received and waiting for vendor processing.','2026-08-29 20:10:49','2026-08-29 20:10:49'),(17,'PM-20260830-192054-7562',34,'Quezon City',NULL,NULL,170.00,150.00,320.00,'cod','unpaid',NULL,NULL,NULL,0.00,'to-pack','Order received and waiting for vendor processing.','2026-08-30 17:20:54','2026-08-30 17:20:54'),(18,'PM-20260916-181852-8026',20,'Quezon City',NULL,NULL,35.00,150.00,185.00,'cod','unpaid',NULL,NULL,NULL,0.00,'to-pack','Order received and waiting for vendor processing.','2026-09-16 16:18:52','2026-09-16 16:18:52'),(21,'PM-20260923-151707-1649',38,'Pogi | 09123456789 | Astoria 15, Brgy. Sauyo, Quezon City, Metro Manila 1116',NULL,NULL,250.00,150.00,400.00,'cod','unpaid',NULL,NULL,NULL,0.00,'to-pack','Order received and waiting for vendor processing.','2026-09-23 13:17:07','2026-09-23 13:17:07'),(26,'PM-20260923-162039-8093',38,'Pogi | 09123456789 | Astoria 15, Brgy. Sauyo, Quezon City, Metro Manila 1116',NULL,NULL,20.00,150.00,170.00,'cod','unpaid',NULL,NULL,NULL,0.00,'shipping','Handed to the courier.','2026-09-23 14:20:39','2026-09-25 03:05:07'),(27,'PM-20260925-111251-9142',73,'JASTIN UY | 639275608715 | Nicanor Padilla Street, Brgy. Barangay 235, City of Manila, Metro Manila 1005',14.5911838,120.9903717,20.00,246.00,266.00,'cod','paid','2026-09-25 11:16:33',NULL,NULL,0.00,'completed','Order completed.','2026-09-25 03:12:51','2026-09-25 03:16:33');
/*!40000 ALTER TABLE `orders` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `payouts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `payouts` (
  `payout_id` int(11) NOT NULL AUTO_INCREMENT,
  `vendor_id` int(11) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `method` varchar(20) NOT NULL,
  `account_name` varchar(150) NOT NULL,
  `account_number` varchar(60) NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'requested',
  `reference` varchar(100) DEFAULT NULL,
  `admin_note` text DEFAULT NULL,
  `requested_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `processed_at` datetime DEFAULT NULL,
  PRIMARY KEY (`payout_id`),
  KEY `vendor_id` (`vendor_id`),
  KEY `status` (`status`),
  CONSTRAINT `payouts_ibfk_1` FOREIGN KEY (`vendor_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `payouts` WRITE;
/*!40000 ALTER TABLE `payouts` DISABLE KEYS */;
/*!40000 ALTER TABLE `payouts` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `product`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `product` (
  `product_id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `product_image` varchar(255) DEFAULT NULL,
  `product_name` varchar(150) NOT NULL,
  `category` varchar(100) NOT NULL,
  `subcategory` varchar(100) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `location` varchar(255) DEFAULT NULL,
  `price` decimal(10,2) NOT NULL,
  `stock` int(11) NOT NULL DEFAULT 0,
  `submitted_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `reviewed_at` timestamp NULL DEFAULT NULL,
  `status` tinyint(4) NOT NULL DEFAULT 0 COMMENT '0=Pending,1=Approved,2=Rejected, 3 =Deleted',
  `rejection_reason` text DEFAULT NULL,
  `catalog_status` tinyint(4) NOT NULL DEFAULT 0 COMMENT '0=Not Approved,1=Hidden,2=Review,3=Active',
  PRIMARY KEY (`product_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `product_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=50 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `product` WRITE;
/*!40000 ALTER TABLE `product` DISABLE KEYS */;
INSERT INTO `product` VALUES (6,7,'products/no_photo.jpg','Untitled Plant','Indoor Plants','Foliage Plants','Listing submitted without sufficient information.',NULL,0.00,0,'2026-07-29 06:10:00','2026-07-29 08:45:00',3,'Listing rejected due to missing product image and incomplete description.',0),(8,9,'products/narra_seedling.jpg','Narra Seedling','Seedlings',NULL,'Narra seedling with planting guide included.',NULL,120.00,75,'2026-07-28 07:30:00','2026-08-05 17:51:09',2,'Protected species. Vendor must provide required permit.',0),(9,9,'products/tomato_seedling.jpg','Tomato Seedling','Seedlings','Vegetable Seedlings','Healthy tomato seedling suitable for home gardens and container planting.',NULL,35.00,49,'2026-08-11 13:38:30',NULL,1,NULL,3),(10,9,'products/eggplant_seedling.jpg','Eggplant Seedling','Seedlings','Vegetable Seedlings','Strong eggplant seedling ready for transplanting into garden soil or containers.',NULL,30.00,37,'2026-08-11 13:38:30',NULL,1,NULL,3),(11,9,'products/chili_seedling.jpg','Chili Pepper Seedling','Seedlings','Vegetable Seedlings','Young chili pepper plant suitable for sunny balconies, pots, and backyard gardens.',NULL,40.00,40,'2026-08-11 13:38:30',NULL,1,NULL,3),(12,9,'products/okra_seedling.jpg','Okra Seedling','Seedlings','Vegetable Seedlings','Healthy okra seedling suitable for warm Philippine growing conditions.',NULL,30.00,35,'2026-08-11 13:38:30',NULL,1,NULL,3),(13,9,'products/calamansi_seedling.jpg','Calamansi Seedling','Seedlings','Fruit Seedlings','Calamansi seedling suitable for backyard gardens and large containers.',NULL,85.00,30,'2026-08-11 13:38:30',NULL,1,NULL,3),(14,9,'products/papaya_seedling.jpg','Papaya Seedling','Seedlings','Fruit Seedlings','Young papaya plant suitable for home gardens and small fruit-growing areas.',NULL,60.00,20,'2026-08-11 13:38:30',NULL,1,NULL,3),(15,9,'products/mango_seedling.jpg','Mango Seedling','Seedlings','Fruit Seedlings','Healthy mango seedling suitable for planting in spacious outdoor areas.',NULL,120.00,20,'2026-08-11 13:38:30',NULL,1,NULL,3),(16,9,'products/basil_seedling.jpg','Sweet Basil Seedling','Seedlings','Herb & Culinary Seedlings','Aromatic sweet basil seedling ideal for kitchen gardens and container growing.',NULL,35.00,40,'2026-08-11 13:38:30',NULL,1,NULL,3),(17,9,'products/mint_seedling.jpg','Mint Seedling','Seedlings','Herb & Culinary Seedlings','Fresh mint seedling that grows well in containers and partial sunlight.',NULL,30.00,35,'2026-08-11 13:38:30',NULL,1,NULL,3),(18,9,'products/oregano_seedling.jpg','Oregano Seedling','Seedlings','Herb & Culinary Seedlings','Oregano seedling suitable for culinary use and home herb gardens.',NULL,35.00,34,'2026-08-11 13:38:30',NULL,1,NULL,3),(19,20,'products/ixora.jpg','Red Ixoras','Bushes','Flowering Bushes','Established red ixora plant producing clusters of bright flowers..',NULL,150.00,30,'2026-08-11 13:38:30',NULL,1,NULL,2),(20,20,'products/dwarf_santan.jpg','Dwarf Santan','Bushes','Flowering Bushes','Compact flowering santan suitable for borders, pots, and small gardens.',NULL,100.00,30,'2026-08-11 13:38:30',NULL,1,NULL,3),(21,20,'products/bougainvillea.jpg','Bougainvillea','Bushes','Flowering Bushes','Colorful bougainvillea plant suitable for sunny gardens and landscape areas.',NULL,180.00,20,'2026-08-11 13:38:30',NULL,1,NULL,3),(22,20,'products/rosas.jpg','Rosas Rose Bush','Bushes','Flowering Bushes','Young rose bush suitable for outdoor gardens with adequate sunlight.',NULL,160.00,20,'2026-08-11 13:38:30',NULL,1,NULL,3),(23,20,'products/fukien_tea.jpg','Fukien Tea','Bushes','Ornamental Bushes','Compact ornamental shrub commonly used for bonsai and decorative gardening.',NULL,220.00,15,'2026-08-11 13:38:30',NULL,1,NULL,3),(24,20,'products/gardenia.jpg','Gardenia Bush','Bushes','Ornamental Bushes','Fragrant gardenia bush suitable for decorative outdoor planting.',NULL,175.00,18,'2026-08-11 13:38:30',NULL,1,NULL,3),(25,20,'products/ficus_bush.jpg','Ficus Ornamental Bush','Bushes','Ornamental Bushes','Hardy ornamental ficus suitable for landscaping and decorative planting.',NULL,200.00,15,'2026-08-11 13:38:30',NULL,1,NULL,3),(26,20,'products/duranta.jpg','Golden Duranta','Bushes','Landscaping Bushes','Decorative duranta bush suitable for garden borders and landscape designs.',NULL,140.00,23,'2026-08-11 13:38:30',NULL,1,NULL,3),(27,20,'products/banana_sapling.jpg','Banana Tree Sapling','Saplings','Fruit Tree Saplings','Healthy banana sapling suitable for backyard fruit gardens.',NULL,95.00,25,'2026-08-11 13:38:30',NULL,1,NULL,3),(28,20,'products/calamansi_grafted.jpg','Grafted Calamansi Sapling','Saplings','Fruit Tree Saplings','Grafted calamansi sapling designed for home gardens and container growing.',NULL,250.00,15,'2026-08-11 13:38:30',NULL,1,NULL,3),(29,20,'products/no_photo.jpg','Banana Seeds','Seedlings','Vegetable Seedlings','Testing actually','Manila',50.00,50,'2026-08-23 15:24:30',NULL,2,NULL,0),(31,22,'products/no_photo.jpg','Ash Soil','Garden Supplies','Fertilizers & Soil','Burned Ashes in the soil','Davao City',100.00,10,'2026-08-24 07:39:48','2026-08-24 09:08:14',1,NULL,1),(32,28,'products/banana_sapling.jpg','Dwarf Banana Sapling','Saplings','Fruit Tree Saplings','Healthy dwarf banana sapling suitable for backyard gardens.','Antipolo City',110.00,35,'2026-08-24 02:15:00','2026-08-24 02:20:00',1,NULL,3),(33,28,'products/basil_seedling.jpg','Sweet Basil Seedling','Seedlings','Herb & Culinary Seedlings','Fresh basil seedling suitable for kitchen gardens.','Antipolo City',40.00,50,'2026-08-24 02:16:00','2026-08-24 02:21:00',1,NULL,3),(34,29,'products/bougainvillea.jpg','Pink Bougainvillea','Bushes','Flowering Bushes','Colorful bougainvillea suitable for sunny gardens.','Marikina City',190.00,25,'2026-08-24 02:17:00','2026-08-24 02:22:00',1,NULL,3),(35,29,'products/dwarf_santan.jpg','Dwarf Santan Premium','Bushes','Flowering Bushes','Compact santan plant suitable for pots and garden borders.','Marikina City',120.00,30,'2026-08-24 02:18:00','2026-08-24 02:23:00',1,NULL,3),(36,30,'products/gardenia.jpg','Gardenia Starter Plant','Bushes','Ornamental Bushes','Fragrant gardenia starter plant for outdoor gardens.','Caloocan City',185.00,20,'2026-08-24 02:19:00','2026-08-24 02:24:00',1,NULL,3),(37,30,'products/duranta.jpg','Golden Duranta Plant','Bushes','Landscaping Bushes','Decorative golden duranta suitable for garden borders.','Caloocan City',145.00,25,'2026-08-24 02:20:00','2026-08-24 02:25:00',1,NULL,2),(38,31,'products/fukien_tea.jpg','Fukien Tea Bonsai','Bushes','Ornamental Bushes','Compact Fukien tea plant suitable for bonsai enthusiasts.','Pasay City',250.00,14,'2026-08-24 02:21:00','2026-08-24 02:26:00',1,NULL,3),(39,31,'products/no_photo.jpg','Terracotta Garden Pot','Garden Supplies','Garden Tools & Pots','Basic terracotta pot for small to medium plants.','Pasay City',85.00,60,'2026-08-24 02:22:00','2026-08-24 02:27:00',1,NULL,1),(40,32,'products/mint_seedling.jpg','Mint Herb Seedling','Seedlings','Herb & Culinary Seedlings','Fresh mint seedling suitable for containers and kitchen gardens.','Las Pinas City',35.00,45,'2026-08-24 02:23:00','2026-08-24 02:28:00',1,NULL,3),(41,32,'products/oregano_seedling.jpg','Oregano Herb Seedling','Seedlings','Herb & Culinary Seedlings','Oregano seedling suitable for home herb gardens.','Las Pinas City',40.00,45,'2026-08-24 02:24:00','2026-08-24 02:29:00',1,NULL,2),(42,34,'products/no_photo.jpg','Sample Seeds','Seedlings','Vegetable Seedlings','www','Quezon City',10.00,8,'2026-08-30 17:18:52','2026-08-30 17:19:20',1,NULL,3),(48,71,'products/uploads/6a84b656b6123ad07a5fa5115d50e499.jpg','Halaman na Maliit','Indoor Plants','Foliage Plants','Maganda','Dito Lang',20.00,2,'2026-09-23 14:17:20','2026-09-23 14:17:48',1,NULL,3),(49,71,'products/uploads/72e2548fe109a57d5dcf4bae8cd1e527.jpg','Halaman na Malaki','Seedlings',NULL,'','Dito Lang ulit',25.00,8,'2026-09-23 14:18:46','2026-09-23 14:19:05',1,NULL,3);
/*!40000 ALTER TABLE `product` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `product_images`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `product_images` (
  `image_id` int(11) NOT NULL AUTO_INCREMENT,
  `product_id` int(11) NOT NULL,
  `file_path` varchar(255) NOT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`image_id`),
  KEY `idx_product_images_product` (`product_id`,`sort_order`),
  CONSTRAINT `fk_product_images_product` FOREIGN KEY (`product_id`) REFERENCES `product` (`product_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=40 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `product_images` WRITE;
/*!40000 ALTER TABLE `product_images` DISABLE KEYS */;
INSERT INTO `product_images` VALUES (1,8,'products/narra_seedling.jpg',0,'2026-09-23 14:01:23'),(2,9,'products/tomato_seedling.jpg',0,'2026-09-23 14:01:23'),(3,10,'products/eggplant_seedling.jpg',0,'2026-09-23 14:01:23'),(4,11,'products/chili_seedling.jpg',0,'2026-09-23 14:01:23'),(5,12,'products/okra_seedling.jpg',0,'2026-09-23 14:01:23'),(6,13,'products/calamansi_seedling.jpg',0,'2026-09-23 14:01:23'),(7,14,'products/papaya_seedling.jpg',0,'2026-09-23 14:01:23'),(8,15,'products/mango_seedling.jpg',0,'2026-09-23 14:01:23'),(9,16,'products/basil_seedling.jpg',0,'2026-09-23 14:01:23'),(10,17,'products/mint_seedling.jpg',0,'2026-09-23 14:01:23'),(11,18,'products/oregano_seedling.jpg',0,'2026-09-23 14:01:23'),(12,19,'products/ixora.jpg',0,'2026-09-23 14:01:23'),(13,20,'products/dwarf_santan.jpg',0,'2026-09-23 14:01:23'),(14,21,'products/bougainvillea.jpg',0,'2026-09-23 14:01:23'),(15,22,'products/rosas.jpg',0,'2026-09-23 14:01:23'),(16,23,'products/fukien_tea.jpg',0,'2026-09-23 14:01:23'),(17,24,'products/gardenia.jpg',0,'2026-09-23 14:01:23'),(18,25,'products/ficus_bush.jpg',0,'2026-09-23 14:01:23'),(19,26,'products/duranta.jpg',0,'2026-09-23 14:01:23'),(20,27,'products/banana_sapling.jpg',0,'2026-09-23 14:01:23'),(21,28,'products/calamansi_grafted.jpg',0,'2026-09-23 14:01:23'),(22,32,'products/banana_sapling.jpg',0,'2026-09-23 14:01:23'),(23,33,'products/basil_seedling.jpg',0,'2026-09-23 14:01:23'),(24,34,'products/bougainvillea.jpg',0,'2026-09-23 14:01:23'),(25,35,'products/dwarf_santan.jpg',0,'2026-09-23 14:01:23'),(26,36,'products/gardenia.jpg',0,'2026-09-23 14:01:23'),(27,37,'products/duranta.jpg',0,'2026-09-23 14:01:23'),(28,38,'products/fukien_tea.jpg',0,'2026-09-23 14:01:23'),(29,40,'products/mint_seedling.jpg',0,'2026-09-23 14:01:23'),(30,41,'products/oregano_seedling.jpg',0,'2026-09-23 14:01:23'),(38,48,'products/uploads/6a84b656b6123ad07a5fa5115d50e499.jpg',0,'2026-09-23 14:17:20'),(39,49,'products/uploads/72e2548fe109a57d5dcf4bae8cd1e527.jpg',0,'2026-09-23 14:18:46');
/*!40000 ALTER TABLE `product_images` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `product_reviews`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `product_reviews` (
  `review_id` int(11) NOT NULL AUTO_INCREMENT,
  `order_item_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `vendor_id` int(11) NOT NULL,
  `customer_id` int(11) NOT NULL,
  `rating` tinyint(4) NOT NULL,
  `comment` text DEFAULT NULL,
  `seller_reply` text DEFAULT NULL,
  `replied_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`review_id`),
  UNIQUE KEY `unique_order_item` (`order_item_id`),
  KEY `product_id` (`product_id`),
  KEY `vendor_id` (`vendor_id`),
  KEY `customer_id` (`customer_id`),
  CONSTRAINT `product_reviews_ibfk_1` FOREIGN KEY (`order_item_id`) REFERENCES `order_items` (`order_item_id`) ON DELETE CASCADE,
  CONSTRAINT `product_reviews_ibfk_2` FOREIGN KEY (`customer_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `product_reviews` WRITE;
/*!40000 ALTER TABLE `product_reviews` DISABLE KEYS */;
INSERT INTO `product_reviews` VALUES (1,31,48,71,73,5,'Maangas Boy',NULL,NULL,'2026-09-25 03:17:03','2026-09-25 03:17:03');
/*!40000 ALTER TABLE `product_reviews` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `reports`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `reports` (
  `report_id` int(11) NOT NULL AUTO_INCREMENT,
  `reporter_id` int(11) DEFAULT NULL,
  `target_type` enum('product','shop') NOT NULL,
  `product_id` int(11) DEFAULT NULL,
  `vendor_id` int(11) NOT NULL,
  `reason` varchar(60) NOT NULL,
  `details` text DEFAULT NULL,
  `status` enum('open','resolved','dismissed') NOT NULL DEFAULT 'open',
  `admin_note` text DEFAULT NULL,
  `handled_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `handled_at` datetime DEFAULT NULL,
  PRIMARY KEY (`report_id`),
  KEY `status` (`status`),
  KEY `vendor_id` (`vendor_id`),
  KEY `product_id` (`product_id`),
  KEY `reports_reporter` (`reporter_id`),
  CONSTRAINT `reports_product` FOREIGN KEY (`product_id`) REFERENCES `product` (`product_id`) ON DELETE CASCADE,
  CONSTRAINT `reports_reporter` FOREIGN KEY (`reporter_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL,
  CONSTRAINT `reports_vendor` FOREIGN KEY (`vendor_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `reports` WRITE;
/*!40000 ALTER TABLE `reports` DISABLE KEYS */;
/*!40000 ALTER TABLE `reports` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `return_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `return_requests` (
  `return_id` int(11) NOT NULL AUTO_INCREMENT,
  `order_item_id` int(11) NOT NULL,
  `order_id` int(11) NOT NULL,
  `customer_id` int(11) NOT NULL,
  `vendor_id` int(11) NOT NULL,
  `reason` varchar(60) NOT NULL,
  `details` text DEFAULT NULL,
  `photo` varchar(255) DEFAULT NULL,
  `refund_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `status` varchar(20) NOT NULL DEFAULT 'requested',
  `seller_note` text DEFAULT NULL,
  `dispute_note` text DEFAULT NULL,
  `admin_note` text DEFAULT NULL,
  `refund_method` varchar(20) DEFAULT NULL,
  `refund_reference` varchar(100) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `resolved_at` datetime DEFAULT NULL,
  PRIMARY KEY (`return_id`),
  UNIQUE KEY `unique_order_item` (`order_item_id`),
  KEY `customer_id` (`customer_id`),
  KEY `vendor_id` (`vendor_id`),
  KEY `status` (`status`),
  CONSTRAINT `return_requests_ibfk_1` FOREIGN KEY (`order_item_id`) REFERENCES `order_items` (`order_item_id`) ON DELETE CASCADE,
  CONSTRAINT `return_requests_ibfk_2` FOREIGN KEY (`customer_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `return_requests` WRITE;
/*!40000 ALTER TABLE `return_requests` DISABLE KEYS */;
/*!40000 ALTER TABLE `return_requests` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `saved_plants`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `saved_plants` (
  `saved_plant_id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `saved_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`saved_plant_id`),
  UNIQUE KEY `unique_saved_plant` (`user_id`,`product_id`),
  KEY `fk_saved_plants_product` (`product_id`),
  CONSTRAINT `fk_saved_plants_product` FOREIGN KEY (`product_id`) REFERENCES `product` (`product_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_saved_plants_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `saved_plants` WRITE;
/*!40000 ALTER TABLE `saved_plants` DISABLE KEYS */;
INSERT INTO `saved_plants` VALUES (2,20,18,'2026-09-16 23:54:22'),(3,20,20,'2026-09-16 23:54:22'),(6,38,9,'2026-09-23 20:12:27');
/*!40000 ALTER TABLE `saved_plants` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `settings` (
  `setting_key` varchar(50) NOT NULL,
  `setting_value` varchar(255) NOT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `settings` WRITE;
/*!40000 ALTER TABLE `settings` DISABLE KEYS */;
INSERT INTO `settings` VALUES ('commission_percent','5','2026-09-24 22:42:42'),('min_payout','100','2026-09-25 02:37:54'),('return_days','7','2026-09-24 22:42:42');
/*!40000 ALTER TABLE `settings` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `user_addresses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `user_addresses` (
  `address_id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `label` varchar(30) NOT NULL DEFAULT 'Home',
  `recipient_name` varchar(150) NOT NULL,
  `phone` varchar(20) NOT NULL,
  `region_code` varchar(12) DEFAULT NULL,
  `region` varchar(100) DEFAULT NULL,
  `province_code` varchar(12) DEFAULT NULL,
  `province` varchar(100) DEFAULT NULL,
  `city_code` varchar(12) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `barangay_code` varchar(12) DEFAULT NULL,
  `barangay` varchar(100) DEFAULT NULL,
  `street` varchar(255) NOT NULL,
  `postal_code` varchar(10) DEFAULT NULL,
  `geo_lat` decimal(10,7) DEFAULT NULL,
  `geo_lng` decimal(10,7) DEFAULT NULL,
  `is_default` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`address_id`),
  KEY `idx_user_addresses_user` (`user_id`),
  CONSTRAINT `fk_user_addresses_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=49 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `user_addresses` WRITE;
/*!40000 ALTER TABLE `user_addresses` DISABLE KEYS */;
INSERT INTO `user_addresses` VALUES (1,7,'Home','John Cruz','09171234561',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Quezon City',NULL,NULL,NULL,1,'2026-09-23 12:44:46','2026-09-23 12:44:46'),(2,8,'Home','Angela Lopez','09181234562',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Makati City',NULL,NULL,NULL,1,'2026-09-23 12:44:46','2026-09-23 12:44:46'),(3,9,'Home','Michael Garcia','09191234563',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Pasig City',NULL,NULL,NULL,1,'2026-09-23 12:44:46','2026-09-23 12:44:46'),(4,10,'Home','Kevin Reyes','09201234564',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Taguig City',NULL,NULL,NULL,1,'2026-09-23 12:44:46','2026-09-23 12:44:46'),(5,11,'Home','Sarah Santos','09211234565',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Manila City',NULL,NULL,NULL,1,'2026-09-23 12:44:46','2026-09-23 12:44:46'),(6,12,'Home','Daniel Torres','09221234566',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Antipolo City',NULL,NULL,NULL,1,'2026-09-23 12:44:46','2026-09-23 12:44:46'),(7,20,'Home','Jessica Margarete','+63 921 843 1111',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Quezon City',NULL,NULL,NULL,1,'2026-09-23 12:44:46','2026-09-23 12:44:46'),(8,23,'Home','Carlo Mendoza','09170000001',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Quezon City',NULL,NULL,NULL,1,'2026-09-23 12:44:46','2026-09-23 12:44:46'),(9,24,'Home','Maria Reyes','09170000002',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Makati City',NULL,NULL,NULL,1,'2026-09-23 12:44:46','2026-09-23 12:44:46'),(10,25,'Home','Paolo Santos','09170000003',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Manila City',NULL,NULL,NULL,1,'2026-09-23 12:44:46','2026-09-23 12:44:46'),(11,26,'Home','Andrea Cruz','09170000004',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Pasig City',NULL,NULL,NULL,1,'2026-09-23 12:44:46','2026-09-23 12:44:46'),(12,27,'Home','Luis Navarro','09170000005',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Taguig City',NULL,NULL,NULL,1,'2026-09-23 12:44:46','2026-09-23 12:44:46'),(13,28,'Home','Elena Flores','09170000006',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Antipolo City',NULL,NULL,NULL,1,'2026-09-23 12:44:46','2026-09-23 12:44:46'),(14,29,'Home','Ramon Garcia','09170000007',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Marikina City',NULL,NULL,NULL,1,'2026-09-23 12:44:46','2026-09-23 12:44:46'),(15,30,'Home','Sofia Torres','09170000008',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Caloocan City',NULL,NULL,NULL,1,'2026-09-23 12:44:46','2026-09-23 12:44:46'),(16,31,'Home','Miguel Ramos','09170000009',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Pasay City',NULL,NULL,NULL,1,'2026-09-23 12:44:46','2026-09-23 12:44:46'),(17,32,'Home','Bianca Aquino','09170000010',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Las Pinas City',NULL,NULL,NULL,1,'2026-09-23 12:44:46','2026-09-23 12:44:46'),(18,34,'Home','Example User','63 928 888 1234',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Quezon City',NULL,NULL,NULL,1,'2026-09-23 12:44:46','2026-09-23 12:44:46'),(39,70,'Home','Test Customer','09171234567','130000000','National Capital Region ? NCR',NULL,NULL,'137404000','Quezon City','137404001','Alicia','12 Mabini St.','1105',NULL,NULL,1,'2026-09-23 14:12:15','2026-09-25 02:37:54'),(40,73,'Home','JASTIN UY','639275608715','130000000','National Capital Region – NCR',NULL,NULL,'133900000','City of Manila','133901236','Barangay 235','Nicanor Padilla Street','1005',14.5911838,120.9903717,1,'2026-09-25 03:08:13','2026-09-25 03:08:13');
/*!40000 ALTER TABLE `user_addresses` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `users` (
  `user_id` int(11) NOT NULL AUTO_INCREMENT,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `store_name` varchar(100) DEFAULT NULL,
  `store_description` text DEFAULT NULL,
  `store_banner` varchar(255) DEFAULT NULL,
  `store_links` text DEFAULT NULL,
  `shop_region_code` varchar(12) DEFAULT NULL,
  `shop_region` varchar(100) DEFAULT NULL,
  `shop_province_code` varchar(12) DEFAULT NULL,
  `shop_province` varchar(100) DEFAULT NULL,
  `shop_city_code` varchar(12) DEFAULT NULL,
  `shop_city` varchar(100) DEFAULT NULL,
  `shop_lat` decimal(10,7) DEFAULT NULL,
  `shop_lng` decimal(10,7) DEFAULT NULL,
  `email` varchar(150) NOT NULL,
  `email_verified` tinyint(1) NOT NULL DEFAULT 1,
  `password` varchar(255) NOT NULL,
  `google_id` varchar(255) DEFAULT NULL,
  `facebook_id` varchar(255) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `bio` text DEFAULT NULL,
  `geo_lat` decimal(10,7) DEFAULT NULL,
  `geo_lng` decimal(10,7) DEFAULT NULL,
  `profile_picture` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `last_login` timestamp NULL DEFAULT NULL,
  `is_vendor` tinyint(1) NOT NULL DEFAULT 0 COMMENT ' -- 0 = Customer, 1 = Vendor\r\n',
  `is_admin` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'is_admin = 0 → Normal account\r\nis_admin = 1 → Admin account',
  `is_superadmin` tinyint(1) NOT NULL DEFAULT 0,
  `admin_role` enum('admin','super_admin') DEFAULT NULL,
  `verification_status` tinyint(4) NOT NULL DEFAULT 0 COMMENT '-- 0 = Not Required (Customer)\r\n    -- 1 = Pending\r\n    -- 2 = Approved\r\n    -- 3 = Rejected',
  `account_status` tinyint(4) NOT NULL DEFAULT 0 COMMENT '-- 0 = Active\r\n    -- 1 = Suspended\r\n    -- 2 = Blocked',
  `free_ship_min` decimal(10,2) DEFAULT NULL,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `uniq_users_google_id` (`google_id`),
  UNIQUE KEY `uniq_users_facebook_id` (`facebook_id`)
) ENGINE=InnoDB AUTO_INCREMENT=74 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (7,'John','Cruz',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'john.cruz@punlaan.com',1,'$2y$10$abcdefghijklmnopqrstuv',NULL,NULL,'09171234561','Quezon City',NULL,NULL,NULL,NULL,'2026-08-04 20:08:47',NULL,0,0,0,NULL,0,1,NULL),(8,'Angela','Lopez',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'angela.lopez@punlaan.com',1,'$2y$10$abcdefghijklmnopqrstuv',NULL,NULL,'09181234562','Makati City',NULL,NULL,NULL,NULL,'2026-08-04 20:08:47',NULL,0,0,0,NULL,0,1,NULL),(9,'Michael','Garcia',NULL,NULL,NULL,NULL,'130000000','NCR – National Capital Region',NULL,NULL,'137403000','City of Pasig',14.5764000,121.0851000,'michael.garcia@punlaan.com',1,'$2y$10$abcdefghijklmnopqrstuv',NULL,NULL,'09191234563','Pasig City',NULL,NULL,NULL,NULL,'2026-08-04 20:08:47',NULL,1,0,0,NULL,2,0,NULL),(10,'Kevin','Reyes',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'kevin.reyes@punlaan.com',1,'$2y$10$abcdefghijklmnopqrstuv',NULL,NULL,'09201234564','Taguig City',NULL,NULL,NULL,NULL,'2026-08-04 20:08:47',NULL,0,0,0,NULL,0,2,NULL),(11,'Sarah','Santos',NULL,NULL,NULL,NULL,'130000000','NCR – National Capital Region',NULL,NULL,'133900000','City of Manila',14.5995000,120.9842000,'sarah.santos@punlaan.com',1,'$2y$10$abcdefghijklmnopqrstuv',NULL,NULL,'09211234565','Manila City',NULL,NULL,NULL,NULL,'2026-08-04 20:08:47',NULL,1,0,0,NULL,2,0,NULL),(12,'Daniel','Torres',NULL,NULL,NULL,NULL,'040000000','Region IV-A – CALABARZON','045800000','Rizal','045802000','City of Antipolo',14.6255000,121.1245000,'daniel.torres@punlaan.com',1,'$2y$10$abcdefghijklmnopqrstuv',NULL,NULL,'09221234566','Antipolo City',NULL,NULL,NULL,NULL,'2026-08-04 20:08:47',NULL,1,0,0,NULL,2,2,NULL),(13,'test','tester',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'tes@gmail.com',1,'$2y$10$zU27aoy64RI9Wb3GwcXYBu8di/xYxKFm/ECq9m74drkAIIZVeXQ.K',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-08-05 18:37:16',NULL,0,0,0,NULL,0,0,NULL),(14,'test','tester','',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'test@gmail.com',1,'$2y$10$7.rhhmGDGA..LPpx.I7wXeWk9FZHyUhCjEtpeVKPstWFjesQTbe9y',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-08-05 18:38:29',NULL,1,0,0,NULL,0,0,NULL),(15,'sigma','ligma','',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'ball@gmail.com',1,'$2y$10$LNZfqH1E6Jt8olerOQY8Oe1DjmLewhS/rsT/vHUFmsRw1p3HghxVu',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-08-05 19:01:51',NULL,1,0,0,NULL,0,0,NULL),(16,'tesst','sess',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'bruh@gmail.com',1,'$2y$10$7XH/nHPT0mab.nq6AICgoewYZmQD9iiCZfdvc8U8J3eCBlRjKTsbm',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-08-05 19:03:14',NULL,0,0,0,NULL,0,2,NULL),(17,'actual','testing','Scammers Shop',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'bro@gmail.com',1,'$2y$10$WhfT0IKZY85Xvu/MUeeQdOBk79Dsarc556LhIl3mTXubhUnC2p066',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-08-05 19:06:31',NULL,0,0,0,NULL,1,0,NULL),(20,'Jessica','Margarete','Nanay\'s Garden Home',NULL,NULL,NULL,'130000000','NCR – National Capital Region',NULL,NULL,'137404000','Quezon City',14.6760000,121.0437000,'tester@gmail.com',1,'$2y$10$xLt0h5NIz7GIUM/xzuFzxeTyHHwkWKp/9EH7CAWB0l/kIOseXNrUK',NULL,NULL,'+63 921 843 1111','Quezon City','I\'m a beta tester for this website!',NULL,NULL,NULL,'2026-08-05 19:52:32','2026-09-23 09:40:11',1,0,0,NULL,2,0,NULL),(22,'Nathan','Ambrosio','Nathan\'s Greens',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'nathan@gmail.com',1,'$2y$10$xLt0h5NIz7GIUM/xzuFzxeTyHHwkWKp/9EH7CAWB0l/kIOseXNrUK',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-08-23 17:53:06','2026-09-16 18:26:09',1,1,0,'admin',2,0,NULL),(23,'Carlo','Mendoza',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'carlo.mendoza@test.com',1,'$2y$12$11P2dY7DFdtUDgTiHwFcGOomYddhVoAvcgiAMKnhlZqAVuA0XSory',NULL,NULL,'09170000001','Quezon City','Test customer account.',NULL,NULL,NULL,'2026-08-24 02:00:00',NULL,0,0,0,NULL,0,0,NULL),(24,'Maria','Reyes',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'maria.reyes@test.com',1,'$2y$12$u/UJ2BnXmVLtZ.jg6c3zk.NahTtpxiT13CoY8Ju514S8Qq912NpW6',NULL,NULL,'09170000002','Makati City','Test customer account.',NULL,NULL,NULL,'2026-08-24 02:01:00',NULL,0,0,0,NULL,0,0,NULL),(25,'Paolo','Santos',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'paolo.santos@test.com',1,'$2y$12$nqre9IJ3CQ.ABRg0Ao3IpOLzDx35H5V9Y4nU.tRfFBaYvA4TsWcnW',NULL,NULL,'09170000003','Manila City','Test customer account.',NULL,NULL,NULL,'2026-08-24 02:02:00',NULL,0,0,0,NULL,0,0,NULL),(26,'Andrea','Cruz',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'andrea.cruz@test.com',1,'$2y$12$ssdkuQUCugh9vcXrlkMLBuAN.pv0SVLdQjseRo4w9bOztzp2aYvcu',NULL,NULL,'09170000004','Pasig City','Test customer account.',NULL,NULL,NULL,'2026-08-24 02:03:00',NULL,0,0,0,NULL,0,0,NULL),(27,'Luis','Navarro',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'luis.navarro@test.com',1,'$2y$12$QCtNxfxwsIU3y3wjpD5Pd.fQNYVSwFAw.HCOt4EKPw9czUXk7JibO',NULL,NULL,'09170000005','Taguig City','Test customer account.',NULL,NULL,NULL,'2026-08-24 02:04:00',NULL,0,0,0,NULL,0,1,NULL),(28,'Elena','Flores','Elena\'s Plant Nursery',NULL,NULL,NULL,'040000000','Region IV-A – CALABARZON','045800000','Rizal','045802000','City of Antipolo',14.6255000,121.1245000,'elena.flores@test.com',1,'$2y$12$mO7kakFK7hWrbPTkqJrmu.Xkdmxtmk78cDA/NhccP02YSMxPA30Jy',NULL,NULL,'09170000006','Antipolo City','Supplier of seedlings and ornamental plants.',NULL,NULL,NULL,'2026-08-24 02:05:00',NULL,1,0,0,NULL,2,0,NULL),(29,'Ramon','Garcia','Ramon\'s Garden Shop',NULL,NULL,NULL,'130000000','NCR – National Capital Region',NULL,NULL,'137402000','City of Marikina',14.6507000,121.1029000,'ramon.garcia@test.com',1,'$2y$12$gvkYFJww0OAsOCuwJdEqmOXRbp5cKp5EEqmMFZnESpBUqKsPXu9Dm',NULL,NULL,'09170000007','Marikina City','Flowering plants and garden supplies.',NULL,NULL,NULL,'2026-08-24 02:06:00',NULL,1,0,0,NULL,2,0,NULL),(30,'Sofia','Torres','Sofia\'s Green Corner',NULL,NULL,NULL,'130000000','NCR – National Capital Region',NULL,NULL,'137501000','City of Caloocan',14.6507000,120.9667000,'sofia.torres@test.com',1,'$2y$12$t7lTzl9t4lecZtNf5BJQCeDs/oDEXIfGAiu4Eh4q4HJU72XqhdHjG',NULL,NULL,'09170000008','Caloocan City','Plants, soil, and gardening materials.',NULL,NULL,NULL,'2026-08-24 02:07:00',NULL,1,0,0,NULL,2,0,NULL),(31,'Miguel','Ramos','Miguel\'s Garden Tools',NULL,NULL,NULL,'130000000','NCR – National Capital Region',NULL,NULL,'137605000','Pasay City',14.5378000,121.0014000,'miguel.ramos@test.com',1,'$2y$12$STfdvNf8W/FZBuminDKWDOM2n7kAMK6KTSmRIsjSvmJFL7BU85wcC',NULL,NULL,'09170000009','Pasay City','Garden tools and decorative pots.',NULL,NULL,NULL,'2026-08-24 02:08:00',NULL,1,0,0,NULL,2,0,NULL),(32,'Bianca','Aquino','Bianca\'s Plant House',NULL,NULL,NULL,'130000000','NCR – National Capital Region',NULL,NULL,'137601000','City of Las Piñas',14.4445000,120.9939000,'bianca.aquino@test.com',1,'$2y$12$V82mfqkVADDznRnbFBYojOULXi7exLlImS.gN5danO2C7dtubFbAq',NULL,NULL,'09170000010','Las Pinas City','Indoor and outdoor plants for home gardens.',NULL,NULL,NULL,'2026-08-24 02:09:00',NULL,1,0,0,NULL,2,0,NULL),(33,'Customer','Sample',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'customer@gmail.com',1,'$2y$10$qu.ybC3xVwTxaWp/IchA3OiPfQvJ2v9ZgaIX0s9UFdowX3vydHfiy',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-08-30 17:00:17','2026-09-24 20:32:07',0,0,0,NULL,0,0,NULL),(34,'Example','User','Sample Store',NULL,NULL,NULL,'130000000','NCR – National Capital Region',NULL,NULL,'137404000','Quezon City',14.6760000,121.0437000,'example@gmail.com',1,'$2y$10$D3XYHxAsSH7JhhjEIq8wSOmdbU2VTwrbqeZzUBI3o73nd.QTAwtZa',NULL,NULL,'63 928 888 1234','Quezon City','Hello World!',NULL,NULL,NULL,'2026-08-30 17:14:03','2026-08-30 17:16:15',1,0,0,NULL,2,1,NULL),(35,'admin','user',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'admin@gmail.com',1,'$2y$10$KyOiXaylzJSRBXohuisNAOuYOoZajBtiAEHWxJixTe8Hb.QJ0PMB2',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-09-16 18:39:56','2026-09-25 03:00:00',0,1,0,'admin',0,0,NULL),(38,'Jastin','Uy',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'uyjastin@gmail.com',1,'$2y$10$ozxD2fZAjVcHd4wspOv4p.uqAiYd0b/iDClTUHmUXBaa.zv17J8pK','104639424118124602264',NULL,'',NULL,'',NULL,NULL,NULL,'2026-09-23 11:36:40','2026-09-25 02:47:16',0,0,0,NULL,0,0,NULL),(70,'Test','Customer',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'customer@punlaan.test',1,'$2y$10$3VmF26aNtG4/qDbqwQuAlej.WOVnIvufgTm0PZGbld6v3w2m8YPo6',NULL,NULL,'09171234567',NULL,NULL,NULL,NULL,NULL,'2026-09-23 14:12:15','2026-09-26 11:56:55',0,0,0,NULL,0,0,NULL),(71,'Test','Seller','Test Seller Garden','Test shop for trying out the seller dashboard.',NULL,'[]','040000000','Region IV-A – CALABARZON','042100000','Cavite','042109000','City of Imus',14.4297000,120.9367000,'seller@punlaan.test',1,'$2y$10$3VmF26aNtG4/qDbqwQuAlej.WOVnIvufgTm0PZGbld6v3w2m8YPo6',NULL,NULL,'09181234567',NULL,NULL,NULL,NULL,'uploads/avatars/df29b86a5eb6408196b8deffd681e08d.jpg','2026-09-23 14:12:15','2026-09-26 12:25:41',1,0,0,NULL,2,0,NULL),(72,'Test','Admin',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'admin@punlaan.test',1,'$2y$10$g.55yhQa7.gdKAZ2xRkEeuQquBWgB8NLUfgFVnPZkP342BvqtEIfi',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-09-23 14:12:15','2026-09-24 22:04:13',0,1,1,'super_admin',0,0,NULL),(73,'JASTIN','UY',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'qjuy01@tip.edu.ph',1,'$2y$10$ga/SOz9GEBcs1lWtB7M9cuClB3HIZnrH/hVmQ18mX5D17WKNwjNF6','105797567444091814790',NULL,NULL,'Nicanor Padilla Street, Brgy. Barangay 235, City of Manila, Metro Manila 1005',NULL,NULL,NULL,NULL,'2026-09-25 03:07:19','2026-09-25 04:44:18',0,0,0,NULL,0,0,NULL);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `vendor_documents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `vendor_documents` (
  `document_id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `document_type` varchar(50) NOT NULL,
  `file_path` varchar(255) NOT NULL,
  `uploaded_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`document_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `vendor_documents_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `vendor_documents` WRITE;
/*!40000 ALTER TABLE `vendor_documents` DISABLE KEYS */;
/*!40000 ALTER TABLE `vendor_documents` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
DROP TABLE IF EXISTS `api_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `api_tokens` (
  `token_id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `token_hash` char(64) NOT NULL,
  `kind` enum('login','verify') NOT NULL DEFAULT 'login',
  `device` varchar(100) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `last_used_at` datetime DEFAULT NULL,
  `expires_at` datetime NOT NULL,
  PRIMARY KEY (`token_id`),
  UNIQUE KEY `token_hash` (`token_hash`),
  KEY `idx_api_tokens_user` (`user_id`),
  CONSTRAINT `fk_api_tokens_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=29 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `remember_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `remember_tokens` (
  `token_id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `selector` char(24) NOT NULL,
  `token_hash` char(64) NOT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`token_id`),
  UNIQUE KEY `selector` (`selector`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `remember_tokens_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `email_codes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `email_codes` (
  `code_id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `email` varchar(255) NOT NULL,
  `code_hash` char(64) NOT NULL,
  `attempts` tinyint(4) NOT NULL DEFAULT 0,
  `expires_at` datetime NOT NULL,
  `used_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`code_id`),
  KEY `idx_email_codes_user` (`user_id`,`created_at`),
  CONSTRAINT `fk_email_codes_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `password_resets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `password_resets` (
  `reset_id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `token_hash` char(64) NOT NULL,
  `expires_at` datetime NOT NULL,
  `used_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`reset_id`),
  UNIQUE KEY `uniq_password_resets_token` (`token_hash`),
  KEY `idx_password_resets_user` (`user_id`),
  CONSTRAINT `fk_password_resets_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

