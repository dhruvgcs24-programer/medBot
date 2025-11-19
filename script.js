// public/script.js
const form = document.getElementById('intake-form');
const messageElement = document.getElementById('message');
const fields = ['name', 'dob', 'reason'];
let currentFieldIndex = 0;
let recognition;

// 1. Initialize Web Speech API
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (typeof SpeechRecognition === 'undefined') {
    messageElement.textContent = "Speech Recognition is not supported by this browser. Please use Chrome or Edge.";
} else {
    recognition = new SpeechRecognition();
    recognition.continuous = false; 
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    // Event handlers for voice input
    recognition.onresult = function(event) {
        const transcript = event.results[0][0].transcript.trim();
        const currentFieldId = fields[currentFieldIndex];
        const currentField = document.getElementById(currentFieldId);

        // Populate the field and provide feedback
        currentField.value = transcript;
        messageElement.textContent = `Captured for ${currentFieldId}: "${transcript}"`;
        
        currentFieldIndex++;
        startNextFieldRecording(); 
    };

    recognition.onerror = function(event) {
        // Handle no-speech or other errors, then try the current field again
        messageElement.textContent = 'Voice error: ' + event.error + '. Trying again...';
        console.error('Speech Recognition Error:', event.error);
        
        // Restart recording for the current field after a short delay
        setTimeout(startNextFieldRecording, 1500);
    };

    recognition.onend = function() {
        // The recognition service stopped. If we haven't finished all fields, restart.
        if (currentFieldIndex < fields.length && !recognition.isStarting) {
             console.log('Recognition ended unexpectedly. Restarting...');
             // Note: The onend handler can be complex; relying mainly on onresult/onerror to advance.
        }
    };

    // Start the voice intake process
    document.getElementById('start-voice').addEventListener('click', () => {
        currentFieldIndex = 0; // Reset intake flow
        // Clear previous input fields
        fields.forEach(id => document.getElementById(id).value = '');
        document.getElementById('ticket-output').style.display = 'none';
        startNextFieldRecording();
    });
}

function startNextFieldRecording() {
    if (currentFieldIndex >= fields.length) {
        messageElement.textContent = "All details captured! Generating ticket...";
        form.requestSubmit(); // Triggers the form's submit event listener below
        return;
    }

    const currentFieldId = fields[currentFieldIndex];
    const fieldLabel = document.querySelector(`label[for="${currentFieldId}"]`).textContent;

    messageElement.textContent = `🎙️ Ready for: ${fieldLabel}. Please speak now...`;
    document.getElementById(currentFieldId).focus(); 

    try {
        recognition.start();
    } catch (e) {
        // Prevents error if start is called while recognition is already active
        console.warn('Recognition already started or failed to start:', e.message);
    }
}

// 2. Form Submission Logic (Sent to server.js)
form.addEventListener('submit', async function(event) {
    event.preventDefault();

    const formData = new FormData(form);
    const patientData = Object.fromEntries(formData.entries());
    const ticketOutput = document.getElementById('ticket-output');
    const qrContainer = document.getElementById('qr-code-container');

    messageElement.textContent = "Generating QR Ticket...";
    ticketOutput.style.display = 'none';
    qrContainer.innerHTML = '';

    try {
        const response = await fetch('/generate-ticket', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(patientData)
        });

        const data = await response.json();

        if (!data.success) {
            messageElement.textContent = 'Error: ' + data.message;
            return;
        }

        // Display the ticket details
        document.getElementById('output-id').textContent = data.ticket.id;
        document.getElementById('output-name').textContent = data.ticket.name;
        document.getElementById('output-reason').textContent = data.ticket.reason;
        
        // Display the QR Code image
        qrContainer.innerHTML = `<img src="${data.qrCodeUrl}" alt="QR Code Ticket">`;
        
        // Show the output section
        ticketOutput.style.display = 'block';
        messageElement.textContent = "Ticket Generated Successfully! Scan the QR code below.";
        
    } catch (error) {
        messageElement.textContent = 'A network error occurred. Check server status.';
        console.error('Fetch Error:', error);
    }
});