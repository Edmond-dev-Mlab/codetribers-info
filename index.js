const { google } = require('googleapis');
const admin = require('firebase-admin');
const fs = require('fs');
require('dotenv').config();  // Add this line to load environment variables

// Initialize Firebase Admin SDK with credentials
admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_KEY))
});
const firestore = admin.firestore();

// Load client secrets for Google Sheets API
const credentials = JSON.parse(process.env.SHEETS_KEY);

// Configure JWT auth client for Google Sheets API
const authClient = new google.auth.JWT(
  credentials.client_email,
  null,
  credentials.private_key,
  ['https://www.googleapis.com/auth/spreadsheets.readonly']
);

// Google Sheets API setup
const sheets = google.sheets('v4');
const spreadsheetId = process.env.SPREADSHEET_ID;  // Use environment variable for spreadsheet ID

// Function to get data from Google Sheets
async function getDataFromSheet(req, res) {
  try {
    await authClient.authorize();
    const sheetRes = await sheets.spreadsheets.values.get({
      auth: authClient,
      spreadsheetId,
      range: process.env.SHEET_RANGE  // Use environment variable for range
    });

    const rows = sheetRes.data.values;
    if (rows.length) {
      const rowCount = rows.length;
      const range = `Sheet1!A1:E${rowCount}`;  // Adjust range based on the number of rows
      console.log(`Fetching data from range: ${range}`);

      const dataRes = await sheets.spreadsheets.values.get({
        auth: authClient,
        spreadsheetId,
        range
      });

      const data = dataRes.data.values;
      if (data.length) {
        console.log('Data from Google Sheet:', data);
        await uploadToFirestore(data);
        res.status(200).send('Data synced successfully!');
      } else {
        console.log('No data found.');
        res.status(404).send('No data found.');
      }
    } else {
      console.log('No data found.');
      res.status(404).send('No data found.');
    }
  } catch (error) {
    console.error('Error fetching data from Google Sheets:', error);
    res.status(500).send('Error fetching data from Google Sheets.');
  }
}

// Function to upload data to Firestore
async function uploadToFirestore(data) {
  try {
    for (const [index, row] of data.entries()) {
      if (index === 0) continue;  // Skip header row
      const [fullName, email, idNumber, totalScore, status] = row;

      const docRef = firestore.collection('trainees').doc(`trainee-${index}`);
      await docRef.set({
        fullName,
        email,
        idNumber,
        totalScore,
        status
      }, { merge: true });  // Use merge to update existing documents

      console.log(`Uploaded trainee-${index}:`, {
        fullName,
        email,
        idNumber,
        totalScore,
        status
      });
    }
    console.log('All data uploaded to Firestore!');
  } catch (error) {
    console.error('Error uploading data to Firestore:', error);
  }
}

// Export the function for Google Cloud Functions
exports.syncData = getDataFromSheet;