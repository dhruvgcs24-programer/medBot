// server.js
import express from 'express';
import QRCode from 'qrcode';
import bodyParser from 'body-parser';

const app = express();
const PORT = 3000;

// Middleware
app.use(bodyParser.json());
app.use(express.static('public')); // Serve static files from 'public' folder

/**
 * Endpoint to receive patient data, generate a unique ticket, and encode it as a QR code.
 */
app.post('/generate-ticket', async (req, res) => {
    try {
        const patientData = req.body;
        
        // 1. Validate data
        if (!patientData.name || !patientData.reason) {
            return res.status(400).json({ success: false, message: "Name and Reason for Arrival are required." });
        }

        // 2. Prepare ticket data (Simulating unique ID generation)
        const ticketData = {
            id: `TICKET-${Date.now()}`,
            name: patientData.name,
            dob: patientData.dob,
            reason: patientData.reason.substring(0, 100), 
            timestamp: new Date().toISOString()
        };
        
        // 3. Convert JSON object to a string for QR encoding
        const qrString = JSON.stringify(ticketData);

        // 4. Generate QR Code as a data URL (Base64 encoded PNG)
        const qrDataURL = await QRCode.toDataURL(qrString, {
            errorCorrectionLevel: 'H',
            type: 'image/png',
            width: 256
        });

        // 5. Send the QR code and ticket details back to the client
        res.json({
            success: true,
            ticket: ticketData,
            qrCodeUrl: qrDataURL
        });

    } catch (error) {
        console.error("QR Code Generation Error:", error);
        res.status(500).json({ success: false, message: "Internal server error during ticket generation." });
    }
});

app.listen(PORT, () => {
    console.log(`MedBot Ticket Generator running at http://localhost:${PORT}`);
});