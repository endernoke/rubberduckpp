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
    error: [
        'error/error1.mp3',
        'error/error2.mp3',
        'error/error3.mp3',
        'error/error4.mp3'
    ],
    success: [
        'success/success1.mp3',
        'success/success2.mp3',
        'success/success3.mp3'
    ],
    paste: [
        'paste/paste1.mp3',
        'paste/paste1.mp3',
        'paste/paste1.mp3'
    ],
    hugepaste: [
       // 'hugepaste/hugepaste1.mp3'
    ],
    delete: [
        'delete/delete1.mp3'
    ],
    typing: [],
    longError: []
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
                        playSound('error');
                        lastErrorTime = Date.now();
                        consecutiveErrors++;

                        // Check for long error messages
                        const longErrors = errors.filter(e => e.message.length > 200);
                        if (longErrors.length > 0) {
                            playSound('longError');
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
                playSound('success');
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
                    playSound("paste");
                }
            }

            // Check for huge paste operations
            if (changes.length === 1 && changes[0].text.length > 1000) {
                const timeSinceFocus = Date.now() - lastPasteTime;
                if (hasFocus && timeSinceFocus < 2000) {
                    playSound("hugepaste");
                }
            }

            // Check for large deletions
            if (changes.length === 1 && changes[0].text === '' && 
                changes[0].rangeLength > 500) {
                playSound("delete");
            }

            // Handle continuous typing
            if (changes.length === 1 && changes[0].text.length === 1) {
                const now = Date.now();
                if (now - lastTypingTime < 500) {
                    if (!typingTimer) {
                        typingTimer = setTimeout(() => {
                            playSound("typing");
                            typingTimer = null;
                        }, 60000); // 60 seconds of continuous typing
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

function playSound(category) {
    const soundFiles = MESSAGES[category];
    const randomSound = soundFiles[Math.floor(Math.random() * soundFiles.length)];
    const player = require("sound-play");
    const soundPath = path.join(__dirname, 'sounds', randomSound);
    
    const config = vscode.workspace.getConfiguration('rubberDuckPlusPlus');
    if (!config.get('enabled')) {
        return;
    }

    vscode.window.showInformationMessage("Starting sound...");
    /*player.play(soundPath, { volume: config.get('volume') }, (err) => {
        if (err) {
            console.error(`Error playing sound: ${err}`);
        }
    });*/
    player.play(soundPath, config.get('volume'));
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