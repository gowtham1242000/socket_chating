const { Sequelize } = require('sequelize');

global.Op = Sequelize.Op;

const operatorsAliases = {
  $notIn: Op.notIn,
  $like: Op.like,
  $gte: Op.gte,
  $lte: Op.lte,
  $lt: Op.lt,
  $gt: Op.gt,
  $ne: Op.ne,
  $or: Op.or,
  $eq: Op.eq,
  $col: Op.col,
  $in: Op.in,
  $cast: (value, type) => Sequelize.cast(value, type) // Use Sequelize.cast instead
};

// PostgreSQL connection
const sequelizePostgres = new Sequelize('politiks', 'politiksuser', 'politikspassword', {
  host: 'localhost',
  dialect: 'postgres',
  port: '5432',
  logging: false,
  timezone: '+05:30',
  operatorsAliases,
  dialectOptions: {
    statement_timeout: 60000,
  },
});

// Sync PostgreSQL
sequelizePostgres.sync()
  .then(() => {
    console.log('PostgreSQL Database connected successfully');
  })
  .catch(err => {
    console.log("There was a problem connecting to PostgreSQL Database: " + err);
  });

// MySQL connection
const sequelizeMySQL = new Sequelize('politiksAWS_db', 'admin', '1vILPCCPQKFQDC9gPs7f', {
  host: 'database-2.c724ogqc88dn.eu-north-1.rds.amazonaws.com',
  dialect: 'mysql',
  port: '3306', // Default MySQL port
  logging: false,
  timezone: '+05:30',
  //operatorsAliases,
  dialectOptions: {
    connectTimeout: 100000,
  },
});

// Sync MySQL
sequelizeMySQL.sync()
  .then(() => {
    console.log('MySQL Database connected successfully');
  })
  .catch(err => {
    console.log("Error connecting to MySQL Database: " + err);
  });

module.exports = { sequelizePostgres, sequelizeMySQL };
