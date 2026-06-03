const { Sequelize } = require('sequelize');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

const dbName = process.env.DB_NAME || 'cyberlingo';
const dbUser = process.env.DB_USER || 'root';
const dbPass = process.env.DB_PASS || '';
const dbHost = process.env.DB_HOST || 'localhost';
const dbPort = process.env.DB_PORT || 3306;

const ensureDatabaseExists = async () => {
  try {
    const connection = await mysql.createConnection({
      host: dbHost,
      port: dbPort,
      user: dbUser,
      password: dbPass
    });
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
    await connection.end();
    console.log(`✅ Đã đảm bảo cơ sở dữ liệu "${dbName}" tồn tại.`);
  } catch (err) {
    console.error('❌ Lỗi khi tự động tạo cơ sở dữ liệu:', err.message);
  }
};

const sequelize = new Sequelize(
  dbName,
  dbUser,
  dbPass,
  {
    host: dbHost,
    port: dbPort,
    dialect: 'mysql',
    logging: false,
    define: {
      timestamps: true
    }
  }
);

sequelize.ensureDatabaseExists = ensureDatabaseExists;
module.exports = sequelize;
