import { Anthropic } from "@anthropic-ai/sdk"
import { ClaudeRequestResult } from "./shared/ClaudeRequestResult"
import { ToolExecutor } from "./ToolExecutor"
import { SYSTEM_PROMPT, tools } from "./Constants"
import { ClaudeDev } from "./ClaudeDev"
import https from 'https'

export class ApiHandler {
	private client: Anthropic
	private conversationHistory: Anthropic.MessageParam[]
	private claudeDev: ClaudeDev

	constructor(client: Anthropic, conversationHistory: Anthropic.MessageParam[], claudeDev: ClaudeDev) {
		this.client = client
		this.conversationHistory = conversationHistory
		this.claudeDev = claudeDev
	}

	updateClient(client: Anthropic) {
		this.client = client
	}

	async makeRequest(
		userContent: Array<
			| Anthropic.TextBlockParam
			| Anthropic.ImageBlockParam
			| Anthropic.ToolUseBlockParam
			| Anthropic.ToolResultBlockParam
		>,
		requestCount: number,
		maxRequestsPerTask: number,
		toolExecutor: ToolExecutor
	): Promise<ClaudeRequestResult> {
		this.conversationHistory.push({ role: "user", content: userContent })

		try {
			// Log the API request
			await this.claudeDev.say(
				"api_req_started",
				JSON.stringify({
					request: {
						model: "claude-3-5-sonnet-20240620",
						max_tokens: 4096,
						system: "(see SYSTEM_PROMPT in Constants.ts)",
						messages: [{ conversation_history: "..." }, { role: "user", content: userContent }],
						tools: "(see tools in Constants.ts)",
						tool_choice: { type: "auto" },
					},
				})
			)

			const response = await this.client.messages.create({
				model: "claude-3-5-sonnet-20240620",
				max_tokens: 4096,
				system: SYSTEM_PROMPT,
				messages: this.conversationHistory,
				tools: tools,
				tool_choice: { type: "auto" },
			})

			let assistantResponses: Anthropic.Messages.ContentBlock[] = []
			let inputTokens = response.usage.input_tokens
			let outputTokens = response.usage.output_tokens

			// Log the API response
			await this.claudeDev.say(
				"api_req_finished",
				JSON.stringify({
					tokensIn: inputTokens,
					tokensOut: outputTokens,
					cost: this.calculateApiCost(inputTokens, outputTokens),
				})
			)

			for (const contentBlock of response.content) {
				if (contentBlock.type === "text") {
					assistantResponses.push(contentBlock)
					await this.claudeDev.say("text", contentBlock.text)
				}
			}

			let toolResults: Anthropic.ToolResultBlockParam[] = []
			let attemptCompletionBlock: Anthropic.Messages.ToolUseBlock | undefined
			for (const contentBlock of response.content) {
				if (contentBlock.type === "tool_use") {
					assistantResponses.push(contentBlock)
					const toolName = contentBlock.name as any
					const toolInput = contentBlock.input
					const toolUseId = contentBlock.id
					if (toolName === "attempt_completion") {
						attemptCompletionBlock = contentBlock
					} else {
						const result = await toolExecutor.executeTool(toolName, toolInput)
						toolResults.push({ type: "tool_result", tool_use_id: toolUseId, content: result })
					}
				}
			}

			if (assistantResponses.length > 0) {
				this.conversationHistory.push({ role: "assistant", content: assistantResponses })
			}

			let didCompleteTask = false

			if (attemptCompletionBlock) {
				let result = await toolExecutor.executeTool(
					attemptCompletionBlock.name as any,
					attemptCompletionBlock.input
				)
				if (result === "") {
					didCompleteTask = true
					result = "The user is satisfied with the result."
				}
				toolResults.push({ type: "tool_result", tool_use_id: attemptCompletionBlock.id, content: result })
			}

			if (toolResults.length > 0 && !didCompleteTask) {
				const {
					didCompleteTask: recDidCompleteTask,
					inputTokens: recInputTokens,
					outputTokens: recOutputTokens,
				} = await this.makeRequest(toolResults, requestCount + 1, maxRequestsPerTask, toolExecutor)
				didCompleteTask = recDidCompleteTask
				inputTokens += recInputTokens
				outputTokens += recOutputTokens
			}

			return { didCompleteTask, inputTokens, outputTokens }
		} catch (error: any) {
			console.error(`API request failed:\n${error.message ?? JSON.stringify(error, null, 2)}`)
			await this.claudeDev.say("error", `API request failed:\n${error.message ?? JSON.stringify(error, null, 2)}`)
			return { didCompleteTask: true, inputTokens: 0, outputTokens: 0 }
		}
	}

	async makePerplexityRequest(question: string, apiKey: string): Promise<ClaudeRequestResult & { content: string }> {
		try {
			console.log("Starting Perplexity API request")

			const payload = {
				model: "llama-3-sonar-large-32k-online",
				messages: [{ role: "user", content: question }],
				max_tokens: 4096,
				temperature: 0.2,
				top_p: 0.9,
				top_k: 0,
				stream: false,
				presence_penalty: 0,
				frequency_penalty: 1,
			}

			// Log the API request
			await this.claudeDev.say(
				"api_req_started",
				JSON.stringify({
					type: "Perplexity API Request",
					request: payload,
				})
			)

			console.log("Perplexity API request payload:", payload)

			const response = await this.makePerplexityHttpRequest('/chat/completions', payload, apiKey)

			console.log("Received Perplexity API response:", response)

			const content = response.choices[0].message.content
			const inputTokens = response.usage.prompt_tokens
			const outputTokens = response.usage.completion_tokens

			// Log the API response
			await this.claudeDev.say(
				"api_req_finished",
				JSON.stringify({
					type: "Perplexity API Response",
					tokensIn: inputTokens,
					tokensOut: outputTokens,
					response: response,
				})
			)

			console.log("Perplexity API request completed successfully")

			await this.claudeDev.say("text", content)

			return { 
				didCompleteTask: true, 
				inputTokens, 
				outputTokens,
				content 
			}
		} catch (error: any) {
			console.error("Perplexity API request failed:", error)
			const errorMessage = error.message ?? JSON.stringify(error, null, 2)
			console.error(`Perplexity API request failed:\n${errorMessage}`)
			await this.claudeDev.say("error", `Perplexity API request failed:\n${errorMessage}`)
			return { didCompleteTask: false, inputTokens: 0, outputTokens: 0, content: "" }
		}
	}

	private calculateApiCost(inputTokens: number, outputTokens: number): number {
		const INPUT_COST_PER_MILLION = 3.0 // $3 per million input tokens
		const OUTPUT_COST_PER_MILLION = 15.0 // $15 per million output tokens
		const inputCost = (inputTokens / 1_000_000) * INPUT_COST_PER_MILLION
		const outputCost = (outputTokens / 1_000_000) * OUTPUT_COST_PER_MILLION
		return inputCost + outputCost
	}

	private makePerplexityHttpRequest(path: string, data: any, apiKey: string): Promise<any> {
		return new Promise((resolve, reject) => {
			if (!apiKey) {
				console.error("Perplexity API Key is not provided")
				reject(new Error("Perplexity API Key is not provided"))
				return
			}

			console.log("Using Perplexity API Key:", apiKey.substring(0, 5) + '...' + apiKey.substring(apiKey.length - 5))

			const options = {
				hostname: 'api.perplexity.ai',
				port: 443,
				path: path,
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${apiKey}`
				}
			}

			console.log("Request options:", JSON.stringify(options, null, 2))

			const req = https.request(options, (res) => {
				let responseData = ''

				res.on('data', (chunk) => {
					responseData += chunk
				})

				res.on('end', () => {
					console.log(`Response status: ${res.statusCode}`)
					console.log(`Response headers:`, res.headers)
					if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
						resolve(JSON.parse(responseData))
					} else {
						reject(new Error(`HTTP error! status: ${res.statusCode}, body: ${responseData}`))
					}
				})
			})

			req.on('error', (error) => {
				reject(error)
			})

			const requestBody = JSON.stringify(data)
			console.log("Request body:", requestBody)

			req.write(requestBody)
			req.end()
		})
	}
}