const express = require("express");
const mysql = require("mysql");
const app = express();
const bodyParser = require("body-parser");

// Database connection configurations
const db1Pool = mysql.createPool({
  connectionLimit: 10,
  host: "10.35.10.78",
  user: "root",
  password: "78mes@haier",
  database: "quality_control",
});
const db2Pool = mysql.createPool({
  connectionLimit: 10,
  host: "10.35.10.77",
  user: "mes_it",
  password: "Haier@2022",
  database: "cosmo_im_9771",
});

//App use
app.use(bodyParser.json());
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  next();
});
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS, PUT, PATCH, DELETE"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-Requested-With,content-type"
  );
  next();
});
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  next();
});

//Insert compressor
app.post("/Saved", (req, res) => {
  const { materialBarcode, compressorBarcode, scanTime } = req.body;

  const sql =
    "INSERT INTO compressor (material_barcode, compressor_barcode, scan_time) VALUES (?, ?, ?)";
  const values = [materialBarcode, compressorBarcode, scanTime];

  db1Pool.query(sql, values, (err, result) => {
    if (err) {
      console.error("Error saving data to database:", err);
      res.status(500).send("Internal Server Error");
      return;
    }
    console.log("Data saved to compressor table:", result);
    res.status(200).send("Data saved successfully");
  });
});

// Define the route for /History
app.get("/History", (req, res) => {
  // Execute the SQL query to fetch data from the database
  db1Pool.query(
    "SELECT material_barcode, compressor_barcode, scan_time FROM compressor WHERE DATE(scan_time) = CURDATE() ORDER BY ID DESC;",
    (error, results) => {
      if (error) {
        console.error("Error executing SQL query:", error);
        res.status(500).json({ error: "Internal server error" });
      } else {
        // Send the fetched data as a JSON response
        res.json(results);
      }
    }
  );
});

//Report
app.get("/oilcharger", async (req, res) => {
  const { startDate, endDate, row } = req.query;
  let query1;
  if (row === "All") {
    query1 = `SELECT model, barcode, datetime, program, r600_setpoint, r600_actum, status, alarm FROM oilcharger WHERE datetime BETWEEN '${startDate}' AND '${endDate}'`;
  } else {
    query1 = `SELECT model, barcode, datetime, program, r600_setpoint, r600_actum, status, alarm FROM oilcharger WHERE datetime BETWEEN '${startDate}' AND '${endDate}' LIMIT ${row}`;
  }
  const query2 =
    "SELECT WorkUser_MOrderCode, WorkUser_BarCode, WorkUser_LineName FROM bns_pm_operation";
  try {
    const [result1, result2] = await Promise.all([
      executeQuery(db1Pool, query1),
      executeQuery(db2Pool, query2),
    ]);
    const joinedData = joinData_charge(result1, result2);
    res.json(joinedData);
  } catch (error) {
    res.status(500).send(`Error: ${error.message}`);
  }
});
function executeQuery(pool, query) {
  return new Promise((resolve, reject) => {
    pool.getConnection((err, connection) => {
      if (err) {
        reject(err);
        return;
      }
      connection.query(query, (err, result) => {
        connection.release();
        if (err) {
          reject(err);
          return;
        }
        resolve(result);
      });
    });
  });
}
function joinData_charge(data1, data2) {
  const joinedData = [];
  const map = new Map();
  data2.forEach((entry) => {
    map.set(entry.WorkUser_BarCode, entry);
  });
  data1.forEach((entry) => {
    const matchingEntry = map.get(entry.barcode);
    if (matchingEntry) {
      const joinedEntry = {
        ...entry,
        ...matchingEntry,
      };
      joinedData.push(joinedEntry);
    }
  });
  return joinedData;
}

app.get("/coolingtest", async (req, res) => {
  const { startDate, endDate, row } = req.query;
  let query1;
  if (row === "All") {
    query1 = `SELECT model, barcode, StartTime, Remark FROM cooling_test WHERE StartTime BETWEEN '${startDate}' AND '${endDate}'`;
  } else {
    query1 = `SELECT model, barcode, StartTime, Remark FROM cooling_test WHERE StartTime BETWEEN '${startDate}' AND '${endDate}' LIMIT ${row}`;
  }
  const query2 =
    "SELECT WorkUser_MOrderCode, WorkUser_BarCode, WorkUser_LineName FROM bns_pm_operation";
  try {
    const [result1, result2] = await Promise.all([
      executeQuery(db1Pool, query1),
      executeQuery(db2Pool, query2),
    ]);
    const joinedData = joinData_cooling(result1, result2);
    res.json(joinedData);
  } catch (error) {
    res.status(500).send(`Error: ${error.message}`);
  }
});
function executeQuery(pool, query) {
  return new Promise((resolve, reject) => {
    pool.getConnection((err, connection) => {
      if (err) {
        reject(err);
        return;
      }
      connection.query(query, (err, result) => {
        connection.release();
        if (err) {
          reject(err);
          return;
        }
        resolve(result);
      });
    });
  });
}
function joinData_cooling(data1, data2) {
  const joinedData = [];
  const map = new Map();
  data2.forEach((entry) => {
    map.set(entry.WorkUser_BarCode, entry);
  });
  data1.forEach((entry) => {
    const matchingEntry = map.get(entry.barcode);
    if (matchingEntry) {
      const joinedEntry = {
        ...entry,
        ...matchingEntry,
      };
      joinedData.push(joinedEntry);
    }
  });
  return joinedData;
}

app.get("/compressor", (req, res) => {
  const { startDate, endDate, row } = req.query;
  let query1;
  if (row === "All") {
    query1 = `SELECT material_barcode, compressor_barcode, scan_time FROM compressor WHERE scan_time BETWEEN '${startDate}' AND '${endDate}'`;
  } else {
    query1 = `SELECT material_barcode, compressor_barcode, scan_time FROM compressor WHERE scan_time BETWEEN '${startDate}' AND '${endDate}' LIMIT ${row}`;
  }
  const query2 =
    "SELECT WorkUser_MOrderCode, WorkUser_BarCode, WorkUser_LineName FROM bns_pm_operation";
  const query3 = "SELECT model, barcode FROM oilcharger";
  db1Pool.getConnection((err, connection) => {
    if (err)
      return res.status(500).send(`Error connecting to Database: ${err}`);
    connection.query(query1, (err1, result1) => {
      connection.release();
      if (err1)
        return res
          .status(500)
          .send(`Error querying data from Database: ${err1}`);
      db2Pool.getConnection((err, connection) => {
        if (err)
          return res.status(500).send(`Error connecting to Database: ${err}`);
        connection.query(query2, (err2, result2) => {
          connection.release();
          if (err2)
            return res
              .status(500)
              .send(`Error querying data from Database: ${err2}`);
          db1Pool.getConnection((err, connection) => {
            if (err)
              return res
                .status(500)
                .send(`Error connecting to Database: ${err}`);
            connection.query(query3, (err3, result3) => {
              connection.release();
              if (err3)
                return res
                  .status(500)
                  .send(`Error querying data from Database: ${err3}`);
              const joinedData = joinData_compressor(result1, result2, result3);
              res.json(joinedData);
            });
          });
        });
      });
    });
  });
});
function joinData_compressor(data1, data2, data3) {
  const joinedData = [];
  const map1 = new Map(data1.map((entry) => [entry.compressor_barcode, entry]));
  const map3 = new Map(data3.map((entry) => [entry.barcode, entry]));
  data2.forEach((entry2) => {
    const matchingEntry1 = map1.get(entry2.WorkUser_BarCode);
    const matchingEntry3 = map3.get(entry2.WorkUser_BarCode);
    if (matchingEntry1 && matchingEntry3) {
      const joinedEntry = {
        ...entry2,
        ...matchingEntry1,
        ...matchingEntry3,
      };
      joinedData.push(joinedEntry);
    }
  });
  return joinedData;
}

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});