// Fermi Problem Practice App

// Store the questions array
let questionsArray = [];
let currentQuestion = null; // Store the currently displayed question
let questionsAnswered = 0;
let totalError = 0;
let withinOneOrder = 0; // Track answers within 1 order of magnitude

// DOM elements
let questionDisplay, answerInput, submitBtn, resultDisplay, resultContent, nextBtn, scoreTracker;
let errorMessage; // For displaying error messages
let bootScreen, desktop, clockElement;
let statQuestions, statError, statAccuracy; // New stat elements

// Load question data from the global 'data' variable set by data.js script tag
// The data.js file defines: data = [{question: "...", answer: 9, source: "...", number: 1}, ...]
// This function waits for the script to load, then validates the data
function loadQuestions() {
    return new Promise((resolve, reject) => {
        // Check if data is already loaded
        if (typeof data !== 'undefined' && Array.isArray(data)) {
            if (data.length === 0) {
                reject(new Error('No questions found in data file.'));
                return;
            }
            questionsArray = data;
            console.log(`Loaded ${questionsArray.length} questions`);
            resolve(questionsArray);
            return;
        }
        
        // Wait for script to load (check every 100ms, max 5 seconds)
        let attempts = 0;
        const maxAttempts = 50;
        const checkInterval = setInterval(() => {
            attempts++;
            if (typeof data !== 'undefined' && Array.isArray(data)) {
                clearInterval(checkInterval);
                if (data.length === 0) {
                    reject(new Error('No questions found in data file.'));
                    return;
                }
                questionsArray = data;
                console.log(`Loaded ${questionsArray.length} questions`);
                resolve(questionsArray);
            } else if (attempts >= maxAttempts) {
                clearInterval(checkInterval);
                reject(new Error('Question data not loaded. Please check your internet connection and refresh the page.'));
            }
        }, 100);
    });
}

// Pick a random question from the data array
function getRandomQuestion() {
    if (questionsArray.length === 0) {
        return null;
    }
    const randomIndex = Math.floor(Math.random() * questionsArray.length);
    return questionsArray[randomIndex];
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

// Display current question with attribution
function displayQuestion() {
    if (questionsArray.length === 0) {
        questionDisplay.innerHTML = 'No questions available.';
        answerInput.disabled = true;
        submitBtn.disabled = true;
        return;
    }
    
    // Pick a random question from the array and store it
    currentQuestion = getRandomQuestion();
    
    if (!currentQuestion) {
        questionDisplay.innerHTML = 'No questions available.';
        answerInput.disabled = true;
        submitBtn.disabled = true;
        return;
    }
    
    // Display question text with attribution
    const questionText = currentQuestion.question || '';
    const attribution = currentQuestion.source && currentQuestion.number 
        ? `<div class="question-attribution">— ${currentQuestion.source}, #${currentQuestion.number}</div>`
        : '';
    
    questionDisplay.innerHTML = `<div class="question-text">${questionText}</div>${attribution}`;
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
    
    // Get the currently displayed question
    if (!currentQuestion) {
        showErrorMessage('No question loaded');
        return;
    }
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

// Move to next question (picks a new random question)
function nextQuestion() {
    answerInput.disabled = false;
    submitBtn.disabled = false;
    displayQuestion();
}

// Update score tracker with retro game-style formatting
function updateScoreTracker() {
    const avgError = questionsAnswered > 0 ? (totalError / questionsAnswered).toFixed(1) : '0.0';
    const accuracy = questionsAnswered > 0 ? Math.round((withinOneOrder / questionsAnswered) * 100) : 0;
    
    // Update individual stat elements with retro formatting
    if (statQuestions) {
        statQuestions.textContent = String(questionsAnswered).padStart(3, '0');
    }
    if (statError) {
        statError.textContent = avgError;
    }
    if (statAccuracy) {
        statAccuracy.textContent = String(accuracy).padStart(3, '0') + '%';
    }
}

// Update clock display
function updateClock() {
    if (clockElement) {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        clockElement.textContent = `${hours}:${minutes}`;
    }
}

// Boot sequence: show boot screen, then transition to desktop
// "Ready." appears at 0.6s, wait 0.3s after that (0.9s total), then fade out
function showBootSequence() {
    bootScreen = document.getElementById('bootScreen');
    desktop = document.getElementById('desktop');
    
    if (!bootScreen || !desktop) {
        console.error('Boot screen or desktop element not found');
        return;
    }
    
    // Ensure desktop starts hidden
    desktop.style.display = 'none';
    
    // "Ready." appears at 0.6s, wait 0.3s after that (0.9s total)
    setTimeout(() => {
        // Fade out boot screen (faster fade)
        bootScreen.style.opacity = '0';
        bootScreen.style.transition = 'opacity 0.3s ease-out';
        
        // After fade completes, hide boot screen and show desktop
        setTimeout(() => {
            bootScreen.style.display = 'none';
            desktop.style.display = 'block';
            desktop.style.opacity = '0';
            desktop.style.transition = 'opacity 0.3s ease-in';
            
            // Force reflow to ensure transition works
            desktop.offsetHeight;
            
            // Fade in desktop
            desktop.style.opacity = '1';
        }, 300);
    }, 900); // 0.6s (Ready appears) + 0.3s (wait) = 0.9s
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
    clockElement = document.getElementById('clock');
    statQuestions = document.getElementById('statQuestions');
    statError = document.getElementById('statError');
    statAccuracy = document.getElementById('statAccuracy');
    
    // Initialize clock and update every minute
    updateClock();
    setInterval(updateClock, 60000);
    
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
    console.log('FERMI ESTIMATOR v1.0 loaded');
    
    // Initialize UI first (elements need to exist for boot sequence)
    initializeUI();
    
    // Show boot sequence (starts immediately)
    showBootSequence();
    
    // Start loading questions in parallel with boot sequence
    let questionsLoaded = false;
    let bootComplete = false;
    
    function showQuestionWhenReady() {
        if (questionsLoaded && bootComplete && questionDisplay) {
            if (questionsArray.length > 0) {
                displayQuestion();
            }
        }
    }
    
    // Boot sequence completes at ~1.2s (0.9s + 0.3s fade)
    setTimeout(() => {
        bootComplete = true;
        showQuestionWhenReady();
    }, 1200);
    
    try {
        // Load questions from the global 'data' variable (set by data.js script tag)
        await loadQuestions();
        console.log('Questions loaded:', questionsArray);
        questionsLoaded = true;
        showQuestionWhenReady();
    } catch (error) {
        // Handle errors gracefully - show user-friendly message
        console.error('Failed to load questions:', error);
        questionsLoaded = true; // Mark as "loaded" even on error so we can show error message
        
        // Wait for boot to complete, then show error
        setTimeout(() => {
            if (questionDisplay) {
                questionDisplay.textContent = `ERROR: ${error.message || 'Unable to load questions. Please check your internet connection and refresh the page.'}`;
                questionDisplay.style.color = '#C75050';
                questionDisplay.style.background = '#F5D4D4';
            }
            
            // Disable input and submit button if questions can't be loaded
            if (answerInput) answerInput.disabled = true;
            if (submitBtn) submitBtn.disabled = true;
        }, 1200);
    }
});
