// public/script.js
const form = document.getElementById('intake-form');
const messageElement = document.getElementById('message');
const fields = ['name', 'dob', 'reason'];
let currentFieldIndex = 0;
let recognition;
let isRecognizing = false;

// 1. Initialize Web Speech API
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (typeof SpeechRecognition === 'undefined') {
    messageElement.textContent = "Speech Recognition is not supported by this browser. Please use Chrome or Edge.";
} else {
    recognition = new SpeechRecognition();
    recognition.continuous = false; 
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    // --- Voice Event Handlers ---

    recognition.onstart = function() {
        isRecognizing = true;
    };

    recognition.onresult = function(event) {
        const transcript = event.results[0][0].transcript.trim();
        const currentFieldId = fields[currentFieldIndex];
        const currentField = document.getElementById(currentFieldId);

        // Populate the field and move to the next
        currentField.value = transcript;
        messageElement.textContent = `Captured for ${currentFieldId}: "${transcript}". Ready for the next field...`;
        
        currentFieldIndex++;
        // Stop current recognition instance immediately to prevent interference
        recognition.stop(); 
    };

    recognition.onerror = function(event) {
        isRecognizing = false;
        // If the error is 'no-speech' or 'aborted', retry the current field.
        if (event.error === 'no-speech' || event.error === 'aborted') {
            messageElement.textContent = 'Voice error: No speech detected. Please try speaking clearly for the current field.';
            setTimeout(startNextFieldRecording, 2000); // Retry after a pause
        } else {
             messageElement.textContent = `General Voice Error: ${event.error}. Please restart the intake.`;
             console.error('Speech Recognition Error:', event.error);
        }
    };

    recognition.onend = function() {
        isRecognizing = false;
        // This is the CRITICAL point: After a result, onend fires, and we must advance the flow.
        // We only advance if we are not finished AND the error handler didn't already call it.
        if (currentFieldIndex < fields.length) {
            // Note: Use a small timeout to let the UI update before the next mic opens
             setTimeout(startNextFieldRecording, 500); 
        } else if (currentFieldIndex === fields.length) {
             form.requestSubmit(); // Submission is triggered after the last field is filled
        }
    };

    // --- Voice Flow Control ---

    document.getElementById('start-voice').addEventListener('click', () => {
        if (isRecognizing) {
            recognition.stop();
        }
        currentFieldIndex = 0; 
        fields.forEach(id => document.getElementById(id).value = '');
        document.getElementById('ticket-output').style.display = 'none';
        startNextFieldRecording();
    });
}

function startNextFieldRecording() {
    if (currentFieldIndex >= fields.length) {
        messageElement.textContent = "All details captured! Generating ticket...";
        // Form submission is now handled by the onend event after the last result.
        return; 
    }

    // Ensure any running recognition instance is stopped before starting a new one
    try {
        if (recognition && isRecognizing) {
            recognition.stop(); 
        }
    } catch (e) {
        // Safe to ignore if recognition wasn't active
    }

    const currentFieldId = fields[currentFieldIndex];
    const fieldLabel = document.querySelector(`label[for="${currentFieldId}"]`).textContent;

    messageElement.textContent = `🎙️ Ready for: ${fieldLabel}. Please speak now...`;
    document.getElementById(currentFieldId).focus(); 

    try {
        recognition.start();
    } catch (e) {
        console.warn('Recognition failed to start (may be busy):', e.message);
        // If it fails to start due to being busy, try again
        setTimeout(startNextFieldRecording, 1000);
    }
}

// 2. Form Submission Logic (fetch to server.js)
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

        // Display the ticket details and QR code
        document.getElementById('output-id').textContent = data.ticket.id;
        document.getElementById('output-name').textContent = data.ticket.name;
        document.getElementById('output-reason').textContent = data.ticket.reason;
        qrContainer.innerHTML = `<img src="${data.qrCodeUrl}" alt="QR Code Ticket">`;
        
        ticketOutput.style.display = 'block';
        messageElement.textContent = "Ticket Generated Successfully! Scan the QR code below.";
        
    } catch (error) {
        messageElement.textContent = 'A network error occurred. Check server status.';
        console.error('Fetch Error:', error);
    }
});