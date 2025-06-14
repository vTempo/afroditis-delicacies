/**
 * header comment
 */
"use strict";

const express = require("express");
const app = express();

const multer = require("multer");

const sqlite3 = require("sqlite3");
const sqlite = require("sqlite");

const cookieParser = require("cookie-parser");

// for application/x-www-form-urlencoded
app.use(express.urlencoded({extended: true})); // built-in middleware
// for application/json
app.use(express.json()); // built-in middleware
// for multipart/form-data (required with FormData)
app.use(multer().none()); // requires the "multer" module

// for cookies
app.use(cookieParser());



/**
 * Establishes a database connection to the database and returns the database object.
 * Any errors that occur should be caught in the function that calls this one.
 * @returns {sqlite3.Database} - The database object for the connection.
 */
async function getDBConnection() {
  const db = await sqlite.open({
    filename: "deli.db",
    driver: sqlite3.Database
  });
  return db;
}

app.use(express.static("public"));
const PORT = process.env.PORT || 8000;
app.listen(PORT);