import * as vscode from "vscode";
import {
	vasmProviderHover, vasmProvideKeywordCompletionItems,
	vasmProvideLabelCompletionItems, vasmProvideRegisterCompletionItems,
	vasmCreateDiagnosticCollection,
	vasmAnalyseTextDocument, vasmCloseTextDocument, vasmScheduleAnalyseTextDocument
} from "./vasm_provider";

/**
 * on activate
 * @param {import("vscode").ExtensionContext} context 
 */
export function activate (context) {
	vasmCreateDiagnosticCollection("vasm");
	const odotddisp = vscode.workspace.onDidOpenTextDocument(vasmAnalyseTextDocument);
	context.subscriptions.push(odotddisp);
	const odctddisp = vscode.workspace.onDidCloseTextDocument(vasmCloseTextDocument);
	context.subscriptions.push(odctddisp);
	const oddtddisp = vscode.workspace.onDidChangeTextDocument((documentChange) => {
		vasmScheduleAnalyseTextDocument(documentChange.document);
	});
	context.subscriptions.push(oddtddisp);
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
