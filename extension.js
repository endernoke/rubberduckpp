const vscode = require('vscode');
const path = require('path');

let lastErrorTime = 0;
let consecutiveErrors = 0;
let lastPasteTime = 0;
let typingTimer = null;
let lastTypingTime = 0;
let hasFocus = false;

// Encouraging messages mapping
const MESSAGES = {
    error: 'keepGoing.mp3',        // "Don't worry, we'll fix this!"
    success: 'victory.mp3',        // "You did it! I knew you could!"
    largePaste: 'awesome.mp3',     // "Wow, that's a lot of code! Looking good!"
    largeDelete: 'brave.mp3',      // "That's the spirit! Sometimes we need a fresh start!"
    continuousTyping: 'flow.mp3',  // "You're in the zone! Keep it up!"
    longError: 'challenge.mp3'     // "This is a tricky one, but you've got this!"
};

function activate(context) {
    // Show welcome message
    vscode.window.showInformationMessage('🦆 RubberDuck++ is here to cheer you on!');

    // Register event handlers
    let diagnosticCollection = vscode.languages.createDiagnosticCollection('rubberDuckPlusPlus');
    
    // Handle syntax/compile errors
    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument(event => {
            vscode.workspace.openTextDocument(event.document.uri).then(doc => {
                const diagnostics = vscode.languages.getDiagnostics(doc.uri);
                if (diagnostics.length > 0) {
                    const errors = diagnostics.filter(d => d.severity === vscode.DiagnosticSeverity.Error);
                    if (errors.length > 0) {
                        playSound(MESSAGES.error);
                        lastErrorTime = Date.now();
                        consecutiveErrors++;

                        // Check for long error messages
                        const longErrors = errors.filter(e => e.message.length > 200);
                        if (longErrors.length > 0) {
                            playSound(MESSAGES.longError);
                        }
                    }
                }
            });
        })
    );

    // Handle successful code execution after errors
    context.subscriptions.push(
        vscode.debug.onDidStartDebugSession(() => {
            const timeSinceLastError = Date.now() - lastErrorTime;
            if (consecutiveErrors >= 3 && timeSinceLastError < 300000) { // 5 minutes
                playSound(MESSAGES.success);
                consecutiveErrors = 0;
            }
        })
    );

    // Handle window focus
    context.subscriptions.push(
        vscode.window.onDidChangeWindowState(e => {
            hasFocus = e.focused;
            if (hasFocus) {
                lastPasteTime = Date.now();
            }
        })
    );

    // Handle text changes
    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument(event => {
            const changes = event.contentChanges;
            
            // Check for large paste operations
            if (changes.length === 1 && changes[0].text.length > 500) {
                const timeSinceFocus = Date.now() - lastPasteTime;
                if (hasFocus && timeSinceFocus < 2000) {
                    playSound(MESSAGES.largePaste);
                }
            }

            // Check for large deletions
            if (changes.length === 1 && changes[0].text === '' && 
                changes[0].rangeLength > 500) {
                playSound(MESSAGES.largeDelete);
            }

            // Handle continuous typing
            if (changes.length === 1 && changes[0].text.length === 1) {
                const now = Date.now();
                if (now - lastTypingTime < 500) {
                    if (!typingTimer) {
                        typingTimer = setTimeout(() => {
                            playSound(MESSAGES.continuousTyping);
                            typingTimer = null;
                        }, 5000); // 5 seconds of continuous typing
                    }
                } else {
                    if (typingTimer) {
                        clearTimeout(typingTimer);
                        typingTimer = null;
                    }
                }
                lastTypingTime = now;
            }
        })
    );
    // Register commands
    context.subscriptions.push(
        vscode.commands.registerCommand('rubberDuckPlusPlus.enable', () => {
            vscode.workspace.getConfiguration('rubberDuckPlusPlus').update('enabled', true, true);
            vscode.window.showInformationMessage('🦆 RubberDuck++ is ready to cheer you on!');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('rubberDuckPlusPlus.disable', () => {
            vscode.workspace.getConfiguration('rubberDuckPlusPlus').update('enabled', false, true);
            vscode.window.showInformationMessage('🦆 RubberDuck++ is taking a break!');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('rubberDuckPlusPlus.setVolume', async () => {
            const volume = await vscode.window.showInputBox({
                prompt: 'Set volume (0.0 to 1.0)',
                placeHolder: '0.7',
                validateInput: (value) => {
                    const num = parseFloat(value);
                    return (num >= 0 && num <= 1) ? null : 'Please enter a number between 0.0 and 1.0';
                }
            });
            
            if (volume !== undefined) {
                vscode.workspace.getConfiguration('rubberDuckPlusPlus').update('volume', parseFloat(volume), true);
                vscode.window.showInformationMessage(`🦆 Volume set to ${volume}`);
            }
        })
    );
}

function playSound(soundFile) {
    const player = require('play-sound')();
    const soundPath = path.join(__dirname, 'sounds', soundFile);
    player.play(soundPath, (err) => {
        if (err) {
            console.error(`Error playing sound: ${err}`);
        }
    });
}

function deactivate() {
    if (typingTimer) {
        clearTimeout(typingTimer);
    }
}

module.exports = {
    activate,
    deactivate
};