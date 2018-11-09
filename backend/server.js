import express from "express";
import bodyParser from "body-parser";
import logger from "morgan";
import { getSecret } from "./secret";

// const express = require("express");
// const bodyParser = require("body-parser");
// const logger = require("morgan");
// const {getSecret} = require("./secret");

const MongoClient = require("mongodb").MongoClient;
const path = require('path');


// and create our instances
const app = express();
const router = express.Router();

let db;

MongoClient.connect(getSecret("dbUri"), { useNewUrlParser: true } , function (err, client) {
  if (err) throw err;
  db = client.db("who_database");
});

// set our port to either a predetermined port number if you have set it up, or 3001
const API_PORT = process.env.API_PORT || 5000;
// now we should configure the API to use bodyParser and look for JSON data in the request body
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(logger('dev'));


// now we can set the route path & initialize the API
router.get('/', (req, res) => {
 res.json({ message: 'Hello, World!' });
});

router.get("/databases/:country", (req, res) => {
  let finalResult = [];
  let whs = [{"name": "whs"}];
  let cho = [{"name": "cho"}];
  let ntd = [{"name": "ntd"}];

  const { country } = req.params;
  const year = (new Date().getFullYear() - 4).toString();
  //MongoDB query
  db.collection("diseases")
    .aggregate([
      {
        $lookup: {
          from: "cho",
          pipeline: [
            {
              $match: {
                $and: [
                  { "dim.COUNTRY": country },
                  { "dim.YEAR": { $gte: year } }
                ]
              }
            }
          ],
          as: "cho"
        }
      },
      {
        $lookup: {
          from: "ntd",
          pipeline: [
            {
              $match: {
                $and: [
                  { "dim.COUNTRY": country },
                  { "dim.YEAR": { $gte: year } }
                ]
              }
            }
          ],
          as: "ntd"
        }
      },
      {
        $lookup: {
          from: "whs",
          pipeline: [
            {
              $match: {
                $and: [
                  { "dim.COUNTRY": country },
                  { "dim.YEAR": { $gte: year } }
                ]
              }
            }
          ],
          as: "whs"
        }
      }
    ]).toArray((err, result) => {
      //read through records
      if (err) {
        res.json({ success: false, error: err });
      }

      //populate cho array
      result.forEach(element => {
        if (Object.keys(element).includes("cho")){
          populateArray(element,"cho", cho);
        }
        if (Object.keys(element).includes("whs")) {
          populateArray(element, "whs", whs);
        }
        if (Object.keys(element).includes("ntd")) {
          populateArray(element, "ntd", ntd);
        }

      });
      finalResult.push(cho);
      finalResult.push(ntd);
      finalResult.push(whs);

      //send final array
      return res.json({ success: true, data: finalResult });
    });

});

router.get("/databases", (req, res) => {
  res.json({ success: false, error: "No data found" });
})

function populateArray(inputArray, disease, array){
  inputArray[disease].forEach(ele => {
    let atYear = parseInt(ele["dim"]["YEAR"]);
    let value = parseInt(ele["Value"]);
    let yearValue = [];
    if(value != 0){
      yearValue = { year: atYear, cases: value };
      array.push(yearValue);
      array.sort(function(a, b) {
        var aNum = a["year"];
        var bNum = b["year"];
        return aNum - bNum;
      });
    }
  })
}  

//public 
// const publicPath = path.resolve(__dirname, "public");
// app.use(express.static(publicPath));

// if (process.env.NODE_ENV === "production") {
  // Set static folder
  // app.use(express.static("public"));

  // app.get("*", (req, res) => {
  //   res.sendFile(path.resolve(__dirname, "public", "index.html"));
  // });
// }


app.use(express.static(path.join(__dirname, "public")));

// Use our router configuration when we call /api
app.use('/api', router);

// app.listen(API_PORT, () =>
//   console.log(`MERN HealthGram listening on port ${API_PORT} and looking in folder`
// ));

var server = app.listen(process.env.PORT || 5000, function() {
  var port = server.address().port;
  console.log("Express is working on port " + port + "and looking for folder " + __dirname);
});