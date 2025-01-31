import mysql from 'mysql2';

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '123',
  database: 'beautyapp'
});

export default pool.promise();