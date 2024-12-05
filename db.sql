CREATE DATABASE  IF NOT EXISTS `auctioneer` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `auctioneer`;
-- MySQL dump 10.13  Distrib 8.0.31, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: auctioneer
-- ------------------------------------------------------
-- Server version	8.3.0

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `leagues`
--

DROP TABLE IF EXISTS `leagues`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `leagues` (
  `league_id` int NOT NULL AUTO_INCREMENT,
  `league_name` varchar(100) NOT NULL,
  `league_full_name` varchar(250) DEFAULT NULL,
  `league_locations` varchar(300) DEFAULT NULL,
  `total_players` varchar(45) DEFAULT NULL,
  `total_teams` varchar(45) NOT NULL,
  `has_unsold` varchar(45) NOT NULL DEFAULT 'no',
  `league_start_date` varchar(45) DEFAULT NULL,
  `league_end_date` varchar(45) DEFAULT NULL,
  `registration_fee` varchar(45) DEFAULT NULL,
  `created_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` varchar(45) DEFAULT NULL,
  `registration_end_date` varchar(45) DEFAULT NULL,
  PRIMARY KEY (`league_id`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='league_locations-->>add as comma separated';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `leagues`
--

LOCK TABLES `leagues` WRITE;
/*!40000 ALTER TABLE `leagues` DISABLE KEYS */;
INSERT INTO `leagues` VALUES (1,'TPL','Tmdy Premier League','Thirumarady,Koothattukulam,Edayar','110','8','no','2024-12-05','2024-12-05','200','2024-12-05 09:46:02','1','2024-12-04'),(2,'CPL','Champions League','Thirumarady,Koothattukulam,Edayar','110','8','no','2024-12-05','2024-12-05','200','2024-12-05 09:46:02','1','2024-12-05'),(4,'KPL','National Football League ','Muvattupuzha,Perumbavoor,Piravom','120','10','yes','12-12-2024',NULL,'250','2024-12-05 09:50:00','1','10-12-2024'),(5,'GPL','Major League Soccer','Eloor,Kakkanad,Kaloor','95','6','no','15-12-2024',NULL,'150','2024-12-05 09:51:00','1','12-12-2024'),(6,'BPL','Indian Premier League ','Angamaly,Aluva,Chalakudy','105','7','yes','18-12-2024',NULL,'300','2024-12-05 09:52:00','1','16-12-2024'),(7,'CPL','National Basketball Association','Kolenchery,Vadavucode,Edappally','115','9','no','20-12-2024',NULL,'180','2024-12-05 09:53:00','1','18-12-2024'),(8,'TPL-2','Major League Baseball','Thrippunithura,Maradu,Panangad','100','8','yes','22-12-2024',NULL,'220','2024-12-05 09:54:00','1','20-12-2024'),(9,'DPL','Drupal League Baseball','Varapuzha,Kothamangalam,Puthencruz','130','11','no','25-12-2024',NULL,'270','2024-12-05 09:55:00','1','22-12-2024'),(10,'FPL','Fa League Baseball','Chengannur,Mavelikkara,Pathanamthitta','140','12','yes','28-12-2024',NULL,'350','2024-12-05 09:56:00','1','26-12-2024'),(11,'HPL','Major League Crkt','Kayamkulam,Haripad,Kuttanad','90','5','no','30-12-2024',NULL,'175','2024-12-05 09:57:00','1','28-12-2024'),(12,'IPL','Ind League crkt','Kumarakom,Kottayam,Pala','125','10','yes','02-01-2025',NULL,'400','2024-12-05 09:58:00','1','30-12-2024'),(13,'JPL','jaihind League Baseball','Changanassery,Thiruvalla,Mallappally','110','8','no','05-01-2025',NULL,'200','2024-12-05 09:59:00','1','02-01-2025'),(14,'TCL','Tata league','Kolla,kklm,aluva','200','10','no','2024-12-09','2024-12-27','200','2024-12-05 22:14:26','1','2024-12-08');
/*!40000 ALTER TABLE `leagues` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_login`
--

DROP TABLE IF EXISTS `user_login`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_login` (
  `user_id` int NOT NULL AUTO_INCREMENT,
  `user_name` varchar(85) NOT NULL,
  `user_password` varchar(255) NOT NULL,
  `created_date` varchar(45) DEFAULT NULL,
  `last_login_date` varchar(45) DEFAULT NULL,
  `is_banned` varchar(45) DEFAULT 'no',
  `display_name` varchar(95) DEFAULT NULL,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `user_name_UNIQUE` (`user_name`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_login`
--

LOCK TABLES `user_login` WRITE;
/*!40000 ALTER TABLE `user_login` DISABLE KEYS */;
INSERT INTO `user_login` VALUES (1,'ajay@gmail.com','$2a$10$pxNinqTwnLwUUQJ.1kTVgOVJVl9dWeqfOrciEW345ddCj8gtJX89.',NULL,NULL,'no','ajay');
/*!40000 ALTER TABLE `user_login` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2024-12-05 23:04:11
