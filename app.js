// Fermi Problem Practice App

// Store the shuffled questions array
let questionsArray = [];
let currentQuestionIndex = 0;
let questionsAnswered = 0;
let totalError = 0;
let withinOneOrder = 0; // Track answers within 1 order of magnitude

// DOM elements
let questionDisplay, answerInput, submitBtn, resultDisplay, resultContent, nextBtn, scoreTracker;
let errorMessage; // For displaying error messages

// Fetch and process question data from the GitHub repository
// Handles network errors and invalid JSON gracefully
async function loadQuestions() {
    try {
        const response = await fetch('https://raw.githubusercontent.com/EricAndrechek/FermiQuestions/main/question-bank.json');
        
        // Check if the fetch was successful
        if (!response.ok) {
            throw new Error(`Failed to load questions: HTTP ${response.status}. Please check your internet connection.`);
        }
        
        // Parse the JSON data
        const data = await response.json();
        
        // Validate that the data has the expected structure
        if (!data.questions || typeof data.questions !== 'object') {
            throw new Error('Invalid question data format.');
        }
        
        // Flatten all questions from all sources into a single array
        // The JSON structure has questions nested under different sources
        const flattened = [];
        for (const source in data.questions) {
            const sourceQuestions = data.questions[source];
            for (const questionText in sourceQuestions) {
                flattened.push({
                    question: questionText,
                    answer: sourceQuestions[questionText] // Answer is the power of 10
                });
            }
        }
        
        // Shuffle the array randomly so questions appear in different order each session
        shuffleArray(flattened);
        
        // Store in the global variable for use throughout the session
        questionsArray = flattened;
        
        console.log(`Loaded ${questionsArray.length} questions`);
        return questionsArray;
    } catch (error) {
        console.error('Error loading questions:', error);
        // Re-throw with a user-friendly message
        throw new Error(error.message || 'Unable to load questions. Please check your internet connection and try again.');
    }
}

// Fisher-Yates shuffle algorithm
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// Parse user input (handles scientific notation like 5e6, 5E6, 3.5e8, etc.)
// parseFloat automatically handles both lowercase 'e' and uppercase 'E' in scientific notation
function parseUserInput(input) {
    const trimmed = input.trim();
    if (!trimmed) return null;
    
    // Try to parse as number (handles scientific notation automatically)
    // Examples: "5e6", "5E6", "3.5e8", "1.2E-3" all work
    const num = parseFloat(trimmed);
    if (isNaN(num) || !isFinite(num)) return null;
    
    // Handle zero and negative numbers
    if (num === 0) return null; // Can't take log of 0
    if (num < 0) return null; // Can't take log of negative
    
    return num;
}

// Convert number to order of magnitude (rounded)
// Uses Math.round which automatically handles Science Olympiad rounding rule:
// Numbers ≥ 3.16 × 10^n round up to n+1
// Example: 3.16 × 10^5 = 316,000 rounds to 10^6
function toOrderOfMagnitude(num) {
    if (num <= 0) return null; // Handle invalid input
    return Math.round(Math.log10(num));
}

// Calculate orders of magnitude difference
function calculateError(userOrder, correctOrder) {
    return Math.abs(userOrder - correctOrder);
}

// Get feedback color class based on error
function getFeedbackClass(error) {
    if (error === 0) return 'feedback-exact';
    if (error === 1) return 'feedback-close';
    if (error <= 2) return 'feedback-ballpark';
    return 'feedback-off';
}

// Get feedback message
function getFeedbackMessage(error) {
    if (error === 0) return 'Exactly right!';
    if (error === 1) return 'Close! Off by 1 order of magnitude';
    if (error <= 2) return `In the ballpark. Off by ${error} orders of magnitude`;
    return `Off by ${error} orders of magnitude`;
}

// Display current question
function displayQuestion() {
    if (currentQuestionIndex >= questionsArray.length) {
        questionDisplay.textContent = 'No more questions! You\'ve completed all questions.';
        answerInput.disabled = true;
        submitBtn.disabled = true;
        return;
    }
    
    const currentQuestion = questionsArray[currentQuestionIndex];
    questionDisplay.textContent = currentQuestion.question;
    answerInput.value = '';
    answerInput.focus();
    resultDisplay.style.display = 'none';
    hideErrorMessage();
}

// Show error message
function showErrorMessage(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    answerInput.style.borderColor = '#f44336';
}

// Hide error message
function hideErrorMessage() {
    errorMessage.style.display = 'none';
    answerInput.style.borderColor = '#ddd';
}

// Check the user's answer against the correct answer
// Validates input, calculates order of magnitude, and displays color-coded feedback
function checkAnswer() {
    const userInput = answerInput.value.trim();
    
    // Handle empty input
    if (!userInput) {
        showErrorMessage('Please enter an answer');
        return;
    }
    
    // Parse user input (handles scientific notation like 5e6, 3.5E8, etc.)
    const userNumber = parseUserInput(userInput);
    
    // Handle non-numeric input
    if (userNumber === null) {
        showErrorMessage('Please enter a valid number');
        return;
    }
    
    // Get the current question and its correct answer (as power of 10)
    const currentQuestion = questionsArray[currentQuestionIndex];
    const correctOrder = currentQuestion.answer;
    
    // Convert user's number to order of magnitude
    const userOrder = toOrderOfMagnitude(userNumber);
    
    if (userOrder === null) {
        showErrorMessage('Please enter a valid positive number');
        return;
    }
    
    // Clear any error messages
    hideErrorMessage();
    
    // Calculate how many orders of magnitude off the user was
    const error = calculateError(userOrder, correctOrder);
    
    // Update session statistics
    questionsAnswered++;
    totalError += error;
    if (error <= 1) {
        withinOneOrder++; // Track accuracy (within 1 order of magnitude)
    }
    updateScoreTracker();
    
    // Display results with color-coded feedback
    const userValue = userNumber;
    const correctValue = Math.pow(10, correctOrder);
    
    resultContent.innerHTML = `
        <div class="result-item">
            <span class="result-label">Your answer:</span> 
            <span class="result-value">${formatNumberForDisplay(userValue)} → 10<sup>${userOrder}</sup></span>
        </div>
        <div class="result-item">
            <span class="result-label">Correct answer:</span> 
            <span class="result-value">10<sup>${correctOrder}</sup> ${getPowerOf10Description(correctOrder)}</span>
        </div>
        <div class="result-item">
            <span class="result-label">You were ${error} order${error !== 1 ? 's' : ''} of magnitude off</span>
        </div>
        <div class="result-feedback ${getFeedbackClass(error)}">
            ${getFeedbackMessage(error)}
        </div>
    `;
    
    // Show results and disable input
    resultDisplay.style.display = 'block';
    answerInput.disabled = true;
    submitBtn.disabled = true;
    
    // Focus on next button for keyboard navigation (Enter or Right Arrow)
    nextBtn.focus();
}

// Format number for display (user's input)
function formatNumberForDisplay(num) {
    // Use toLocaleString for comma formatting
    if (num >= 1e12) {
        return num.toLocaleString(undefined, { maximumFractionDigits: 0 });
    }
    if (num >= 1e6) {
        return num.toLocaleString(undefined, { maximumFractionDigits: 0 });
    }
    if (num >= 1e3) {
        return num.toLocaleString(undefined, { maximumFractionDigits: 0 });
    }
    if (num >= 1) {
        return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
    }
    return num.toExponential(2);
}

// Get human-readable description for power of 10
function getPowerOf10Description(power) {
    const value = Math.pow(10, power);
    
    if (power >= 12) return "(that's about 1 trillion)";
    if (power >= 9) return "(that's about 1 billion)";
    if (power >= 6) return "(that's about 1 million)";
    if (power >= 3) return "(that's about 1,000)";
    if (power >= 0) {
        // For powers 0-2, show the actual value
        if (value >= 1) {
            return `(that's about ${value.toLocaleString()})`;
        }
        return `(that's about ${value})`;
    }
    // For negative powers
    if (power === -3) return "(that's about 0.001)";
    if (power < -3) {
        return `(that's about ${value.toExponential(2)})`;
    }
    // For -1, -2
    return `(that's about ${value})`;
}

// Move to next question
function nextQuestion() {
    currentQuestionIndex++;
    answerInput.disabled = false;
    submitBtn.disabled = false;
    displayQuestion();
}

// Update score tracker
function updateScoreTracker() {
    const avgError = questionsAnswered > 0 ? (totalError / questionsAnswered).toFixed(1) : '0.0';
    const accuracy = questionsAnswered > 0 ? Math.round((withinOneOrder / questionsAnswered) * 100) : 0;
    scoreTracker.textContent = `Questions answered: ${questionsAnswered} | Average error: ${avgError} order${parseFloat(avgError) !== 1 ? 's' : ''} of magnitude | Accuracy: ${accuracy}% within 1 order`;
}

// Initialize UI
function initializeUI() {
    questionDisplay = document.getElementById('questionDisplay');
    answerInput = document.getElementById('answerInput');
    submitBtn = document.getElementById('submitBtn');
    resultDisplay = document.getElementById('resultDisplay');
    resultContent = document.getElementById('resultContent');
    nextBtn = document.getElementById('nextBtn');
    scoreTracker = document.getElementById('scoreTracker');
    errorMessage = document.getElementById('errorMessage');
    
    // Event listeners
    submitBtn.addEventListener('click', checkAnswer);
    nextBtn.addEventListener('click', nextQuestion);
    
    // Keyboard support
    // When input is enabled: Enter submits answer
    // When results are shown: Enter or Right Arrow goes to next question
    answerInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !answerInput.disabled) {
            e.preventDefault();
            checkAnswer();
        }
    });
    
    // Global keyboard listener for next question (when results are shown)
    document.addEventListener('keydown', (e) => {
        // Only handle if results are displayed
        if (resultDisplay.style.display === 'block') {
            if (e.key === 'Enter' || e.key === 'ArrowRight') {
                e.preventDefault();
                nextQuestion();
            }
        }
    });
    
    // Clear error message when user starts typing
    answerInput.addEventListener('input', () => {
        if (errorMessage.style.display === 'block') {
            hideErrorMessage();
        }
    });
}

// App initialization - runs when the page loads
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Fermi Problem Practice App loaded');
    initializeUI();
    
    try {
        // Fetch and load questions from the remote JSON file
        await loadQuestions();
        console.log('Questions loaded and shuffled:', questionsArray);
        
        // Display the first question immediately
        displayQuestion();
    } catch (error) {
        // Handle errors gracefully - show user-friendly message
        console.error('Failed to load questions:', error);
        questionDisplay.textContent = `Error: ${error.message || 'Unable to load questions. Please check your internet connection and refresh the page.'}`;
        questionDisplay.style.color = '#c62828';
        questionDisplay.style.background = '#ffebee';
        
        // Disable input and submit button if questions can't be loaded
        answerInput.disabled = true;
        submitBtn.disabled = true;
    }
});
