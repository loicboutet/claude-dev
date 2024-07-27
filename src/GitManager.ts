import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class GitManager {
    constructor(private workspaceRoot: string) {}

    async createBranch(branchName: string): Promise<void> {
        try {
            await execAsync(`git checkout -b ${branchName}`, { cwd: this.workspaceRoot });
            vscode.window.showInformationMessage(`Created and switched to new branch: ${branchName}`);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to create branch: ${error}`);
        }
    }

    async commitAllChanges(commitMessage: string): Promise<void> {
        try {
            await execAsync('git add .', { cwd: this.workspaceRoot });
            await execAsync(`git commit -m "${commitMessage}"`, { cwd: this.workspaceRoot });
            vscode.window.showInformationMessage(`Changes committed successfully: ${commitMessage}`);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to commit changes: ${error}`);
            throw error; // Re-throw the error so the caller can handle it
        }
    }
}