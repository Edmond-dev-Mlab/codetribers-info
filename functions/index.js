const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { google } = require("googleapis");
const fs = require("fs");
const path = require("path");

// Initialize Firebase Admin SDK
admin.initializeApp();

// Initialize Google Sheets API
const sheets = google.sheets("v4");

// Path to the service account key for Google Sheets
const sheetsKeyPath = path.join(__dirname, "../sheets-key.json");
const sheetsKey = JSON.parse(fs.readFileSync(sheetsKeyPath));

// Authenticate with Google Sheets API
const auth = new google.auth.JWT({
  email: sheetsKey.client_email,
  key: sheetsKey.private_key,
  scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
});

// Spreadsheet ID and range (adjust as needed)
const spreadsheetId = "1UFCt9aB82O3snNvO4LLNruJkNmaRvpynXlmrsvZGw0Q";  // Replace with your actual spreadsheet ID
const range = "Sheet1!A2:D";  // Replace with your actual sheet and range

// Function to fetch data from Google Sheets
async function getDataFromSheet() {
  const response = await sheets.spreadsheets.values.get({
    auth,
    spreadsheetId,
    range,
  });

  return response.data.values;
}

// Firebase Function to upload data to Firestore from Google Sheets
exports.uploadDataFromSheet = functions.https.onRequest(async (req, res) => {
  try {
    // Fetch data from Google Sheets
    const data = await getDataFromSheet();
    
    // Iterate over the data and upload it to Firestore
    const batch = admin.firestore().batch();

    data.forEach((row) => {
      const [name, surname, email, status] = row;
      const docRef = admin.firestore().collection("trainees").doc();
      
      batch.set(docRef, { name, surname, email, status });
    });

    // Commit the batch operation to Firestore
    await batch.commit();
    
    res.status(200).send("Data uploaded to Firestore successfully.");
  } catch (error) {
    console.error("Error fetching data from Google Sheets:", error);
    res.status(500).send("Error uploading data.");
  }
});
