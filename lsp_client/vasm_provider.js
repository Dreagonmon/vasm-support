import * as vscode from "vscode";
import { processFileContent, getAllLabels, getAllRegisters } from "./as";

const INSTRUCTION_DOCS = {
"NOPE": `NOPE

Do nothing. 

Some runtime may use this as a debug instruction.
`,
"EXIT": `EXIT

Exit the program.
`,
"WKEY": `WKEY

Wait for key change.

The key event stored in \`r0\`.
`,
"GKEY": `GKEY

Get key event.

The key event stored in \`r0\`.
`,
"TICK": `TICK

Tick the clock in milliseconds, stored in \`r0\`.
`,
"SAVE": `SAVE

Save the \`rs0\` ~ \`rs15\` (16 bytes) to the disk.
`,
"LOAD": `LOAD

Load data to \`rs0\` ~ \`rs15\` (16 bytes) from the disk.
`,
"TILE": `TILE \`id\` \`d0\` \`d1\` ... \`d7\`

Define the tile data. \`id\` in range [0, 63].
`,
"STOR": `STOR \`num\` \`reg\`

Store the number into the register.
`,
"MOVE": `MOVE \`reg1\` \`reg2\`

Move(Copy) the value from \`reg1\` to \`reg2\`.
`,
"ADDI": `ADDI \`reg\`

\`r0\` = \`r0\` + \`reg\`
`,
"SUBI": `SUBI \`reg\`

\`r0\` = \`r0\` - \`reg\`
`,
"MULI": `MULI \`reg\`

\`r0\` = \`r0\` * \`reg\`
`,
"DIVI": `DIVI \`reg\`

\`r0\` = \`r0\` / \`reg\`
`,
"MODI": `MODI \`reg\`

\`r0\` = \`r0\` % \`reg\`
`,
"INVI": `INVI

\`r0\` = ~ \`r0\`
`,
"JUMP": `JUMP \`loc\`

Jump to the \`loc\`.
`,
"JPEZ": `JPEZ \`loc\`

Jump to the \`loc\` if \`r0\` == 0.
`,
"JPGZ": `JPGZ \`loc\`

Jump to the \`loc\` if \`r0\` > 0 and \`r0\` < 128.
`,
"JPLZ": `JPLZ \`loc\`

Jump to the \`loc\` if \`r0\` >= 128.
`,
"CALL": `CALL \`loc\`

Save to the call stack and jump to the \`loc\`.
`,
"RETN": `RETN

Return to the last CALL location.
`,
"DTIL": `DTIL \`reg\` \`id\`

Draw the tile (with \`id\` index) to the \`reg\` position.

\`id\` in range [0, 63].

Position in range [0, 63].
`,
"DNUM": `DNUM \`reg1\` \`reg2\`

Draw the number in \`reg2\` to the \`reg1\` position.

Position in range [0, 63].
`,
"DTXT": `DTXT \`reg\` "text..."

Draw the ascii text to the \`reg\` position.

Position in range [0, 63].
`,
"DSEL": `DSEL \`reg\` "option1" "option2" "option3" ...

Draw the selector to the \`reg\` position.

Wait for user to select, store the selection to \`r0\`.

Position in range [0, 63], and will round to the start of the row.
`,
"RAND": `RAND

Use \`r0\` as the seed to generate a random number, stored to \`r0\`.
`,
};

/**
 * vasmProviderHover
 * @param {vscode.TextDocument} document 
 * @param {vscode.Position} position 
 * @param {vscode.CancellationToken} token 
 * @returns {vscode.Hover}
 */
export const vasmProviderHover = (document, position, token) => {
    const word = document.getText(document.getWordRangeAtPosition(position));
    console.log(word);
    if (word in INSTRUCTION_DOCS) {
        return new vscode.Hover(INSTRUCTION_DOCS[word]);
    }
    return null;
}

/**
 * vasmProviderHover
 * @param {vscode.TextDocument} document 
 * @param {vscode.Position} position 
 * @param {vscode.CancellationToken} token 
 * @returns {vscode.CompletionList<vscode.CompletionItem>}
 */
export const vasmProvideKeywordCompletionItems = (document, position, token) => {
    const inst = new vscode.CompletionList();
    for (const instruction in INSTRUCTION_DOCS) {
        const item = new vscode.CompletionItem(instruction, vscode.CompletionItemKind.Keyword);
        item.documentation = INSTRUCTION_DOCS[instruction];
        inst.items.push(item);
    }
    return inst;
}

/**
 * vasmProviderHover
 * @param {vscode.TextDocument} document 
 * @param {vscode.Position} position 
 * @param {vscode.CancellationToken} token 
 * @returns {vscode.CompletionList<vscode.CompletionItem>}
 */
export const vasmProvideLabelCompletionItems = (document, position, token) => {
    const instructions = [];
    const docs = document.getText();
    try {
        processFileContent(docs, instructions);
    } catch {
        // ignore error
    }
    const labels = getAllLabels(instructions);
    const inst = new vscode.CompletionList();
    for (const label of labels) {
        const item = new vscode.CompletionItem(label, vscode.CompletionItemKind.Function);
        inst.items.push(item);
    }
    return inst;
}

/**
 * vasmProviderHover
 * @param {vscode.TextDocument} document 
 * @param {vscode.Position} position 
 * @param {vscode.CancellationToken} token 
 * @returns {vscode.CompletionList<vscode.CompletionItem>}
 */
export const vasmProvideRegisterCompletionItems = (document, position, token) => {
    const instructions = [];
    const docs = document.getText();
    try {
        processFileContent(docs, instructions);
    } catch {
        // ignore error
    }
    const regs = getAllRegisters(instructions);
    const inst = new vscode.CompletionList();
    for (const reg of regs) {
        const item = new vscode.CompletionItem(reg, vscode.CompletionItemKind.Variable);
        inst.items.push(item);
    }
    return inst;
}
