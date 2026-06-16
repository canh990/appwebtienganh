const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');
dotenv.config();

const dbName = process.env.DB_NAME || 'cyberlingo';
const dbUser = process.env.DB_USER || 'postgres';
const dbPass = process.env.DB_PASS || '';
const dbHost = process.env.DB_HOST || 'localhost';
const dbPort = process.env.DB_PORT || 5432;

const ensureDatabaseExists = async () => {
  // Đối với PostgreSQL, giả định database đã được tạo sẵn ở môi trường local hoặc tự động tạo trên Render.
  return;
};

let sequelize;

if (process.env.DATABASE_URL) {
  console.log('🔄 Đang kết nối tới PostgreSQL database qua DATABASE_URL...');
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
  console.log('🔄 Đang kết nối tới PostgreSQL database local...');
  sequelize = new Sequelize(
    dbName,
    dbUser,
    dbPass,
    {
      host: dbHost,
      port: dbPort,
      dialect: 'postgres',
      logging: false,
      define: {
        timestamps: true
      }
    }
  );
}

sequelize.ensureDatabaseExists = ensureDatabaseExists;
module.exports = sequelize;
