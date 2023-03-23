import * as vscode from "vscode";
import { vasmProviderHover, vasmProvideKeywordCompletionItems, vasmProvideLabelCompletionItems, vasmProvideRegisterCompletionItems } from "./vasm_provider";

/**
 * on activate
 * @param {import("vscode").ExtensionContext} context 
 */
export function activate (context) {
	const hvdisp = vscode.languages.registerHoverProvider("vasm", { provideHover: vasmProviderHover });
	context.subscriptions.push(hvdisp);
	const cpkdisp = vscode.languages.registerCompletionItemProvider(
		"vasm", { provideCompletionItems: vasmProvideKeywordCompletionItems },
		""
	);
	context.subscriptions.push(cpkdisp);
	const cpldisp = vscode.languages.registerCompletionItemProvider(
		"vasm", { provideCompletionItems: vasmProvideLabelCompletionItems },
		"l"
	);
	context.subscriptions.push(cpldisp);
	const cprdisp = vscode.languages.registerCompletionItemProvider(
		"vasm", { provideCompletionItems: vasmProvideRegisterCompletionItems },
		"r"
	);
	context.subscriptions.push(cprdisp);
}

export function deactivate () {
	// Noop
}
