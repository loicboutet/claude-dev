export interface ClaudeRequestResult {
	didCompleteTask: boolean
	inputTokens: number
	outputTokens: number
	content?: Array<{ type: string; text?: string }>
}
