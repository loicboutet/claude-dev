export interface WebviewMessage {
	type:
		| "webviewDidLaunch"
		| "newTask"
		| "loadTask"
		| "apiKey"
		| "maxRequestsPerTask"
		| "askResponse"
		| "clearTask"
		| "viewTaskHistory"
		| "clearTaskHistory"
		| "autoApproveNonDestructive"
		| "autoApproveWriteToFile"
		| "autoApproveExecuteCommand"
		| "taskCompleted"
		| "acceptTaskAndCommit"
		| "commitFiles"
	text?: string
	taskId?: string
	askResponse?: ClaudeAskResponse
	value?: boolean
}

export type ClaudeAskResponse = "yesButtonTapped" | "noButtonTapped" | "textResponse"
