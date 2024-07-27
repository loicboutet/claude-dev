export interface WebviewMessage {
	type:
		| "webviewDidLaunch"
		| "newTask"
		| "loadTask"
		| "apiKey"
		| "perplexityApiKey"
		| "maxRequestsPerTask"
		| "askResponse"
		| "clearTask"
		| "viewTaskHistory"
		| "clearTaskHistory"
		| "autoApproveNonDestructive"
		| "autoApproveWriteToFile"
		| "autoApproveExecuteCommand"
	text?: string
	taskId?: string
	askResponse?: ClaudeAskResponse
	value?: boolean
}

export type ClaudeAskResponse = "yesButtonTapped" | "noButtonTapped" | "textResponse"