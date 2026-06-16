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
  if (process.env.DATABASE_URL) {
    // Không cần tạo database khi sử dụng PostgreSQL của Render vì Render tạo sẵn
    return;
  }
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

let sequelize;

if (process.env.DATABASE_URL) {
  console.log('🔄 Đang kết nối tới PostgreSQL database...');
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    logging: false,
    define: {
      timestamps: true
    }
  });
} else {
  console.log('🔄 Đang kết nối tới MySQL database...');
  sequelize = new Sequelize(
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
}

sequelize.ensureDatabaseExists = ensureDatabaseExists;
module.exports = sequelize;

