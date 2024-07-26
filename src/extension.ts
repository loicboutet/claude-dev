// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode"
import { SidebarProvider } from "./providers/SidebarProvider"
import { TaskHistoryManager } from "./TaskHistoryManager"
import { GitManager } from "./GitManager"

/*
Built using https://github.com/microsoft/vscode-webview-ui-toolkit

Inspired by
https://github.com/microsoft/vscode-webview-ui-toolkit-samples/tree/main/default/weather-webview
https://github.com/microsoft/vscode-webview-ui-toolkit-samples/tree/main/frameworks/hello-world-react-cra

*/

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	const provider = new SidebarProvider(context);

	context.subscriptions.push(vscode.window.registerWebviewViewProvider(SidebarProvider.viewType, provider));

	context.subscriptions.push(
		vscode.commands.registerCommand("claude-dev.plusButtonTapped", async () => {
			await provider.clearTask();
			await provider.postStateToWebview();
			await provider.postMessageToWebview({ type: "action", action: "plusButtonTapped"});
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand("claude-dev.settingsButtonTapped", () => {
			provider.postMessageToWebview({ type: "action", action: "settingsButtonTapped"});
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand("claude-dev.showTaskHistory", () => {
			provider.postMessageToWebview({ type: "action", action: "viewTaskHistory"});
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand("claude-dev.clearTaskHistory", () => {
			const taskHistoryManager = new TaskHistoryManager(context);
			taskHistoryManager.clearHistory();
			vscode.window.showInformationMessage("Task history cleared");
			provider.postMessageToWebview({ type: "action", action: "taskHistoryCleared"});
		})
	);

	// New command for creating a Git branch
	context.subscriptions.push(
		vscode.commands.registerCommand("claude-dev.createGitBranch", async (branchName: string) => {
			const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
			if (workspaceRoot) {
				const gitManager = new GitManager(workspaceRoot);
				await gitManager.createBranch(branchName);
			} else {
				vscode.window.showErrorMessage("No workspace folder found. Please open a folder and try again.");
			}
		})
	);

	// Handle the commitFiles message
	provider.setWebviewMessageHandler("commitFiles", async () => {
		const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
		if (workspaceRoot) {
			const gitManager = new GitManager(workspaceRoot);
			try {
				await gitManager.commitAllChanges("Task completed by Claude Dev");
				vscode.window.showInformationMessage("Changes committed successfully.");
			} catch (error) {
				vscode.window.showErrorMessage(`Failed to commit changes: ${error}`);
			}
		} else {
			vscode.window.showErrorMessage("No workspace folder found. Please open a folder and try again.");
		}
	});
}

// This method is called when your extension is deactivated
export function deactivate() {}