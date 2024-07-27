export interface ExtensionMessage {
	type: "action" | "state" | "taskHistory" | "error" | "loadedTaskHistory"
	text?: string
	action?:
		| "plusButtonTapped"
		| "settingsButtonTapped"
		| "didBecomeVisible"
		| "viewTaskHistory"
		| "taskHistoryCleared"
		| "newTaskCreated"
	state?: {
		didOpenOnce: boolean
		apiKey?: string
		perplexityApiKey?: string
		maxRequestsPerTask?: number
		claudeMessages: ClaudeMessage[]
		autoApproveNonDestructive: boolean
		autoApproveWriteToFile: boolean
		autoApproveExecuteCommand: boolean
	}
	taskHistory?: Task[]
	message?: string
	task?: string
	messages?: ClaudeMessage[]
}

export interface ClaudeMessage {
	ts: number
	type: "ask" | "say"
	ask?: ClaudeAsk
	say?: ClaudeSay
	text?: string
}

export type ClaudeAsk = "request_limit_reached" | "followup" | "command" | "completion_result" | "tool"
export type ClaudeSay =
	| "task"
	| "error"
	| "api_req_started"
	| "api_req_finished"
	| "text"
	| "command_output"
	| "completion_result"
	| "user_feedback"

export interface ClaudeSayTool {
	tool: "editedExistingFile" | "newFileCreated" | "readFile" | "listFiles"
	path?: string
	diff?: string
	content?: string
}

export interface Task {
	id: string
	description: string
	timestamp: number
}

export interface ClaudeAskResponse {
	response: string
	type: ClaudeAsk
}