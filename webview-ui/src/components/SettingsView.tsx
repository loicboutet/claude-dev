import React, { useEffect, useState } from "react"
import {
	VSCodeTextField,
	VSCodeDivider,
	VSCodeLink,
	VSCodeButton,
	VSCodeCheckbox,
} from "@vscode/webview-ui-toolkit/react"
import { vscode } from "../utilities/vscode"

type SettingsViewProps = {
	apiKey: string
	setApiKey: React.Dispatch<React.SetStateAction<string>>
	maxRequestsPerTask: string
	setMaxRequestsPerTask: React.Dispatch<React.SetStateAction<string>>
	autoApproveNonDestructive: boolean
	setAutoApproveNonDestructive: React.Dispatch<React.SetStateAction<boolean>>
	autoApproveWriteToFile: boolean
	setAutoApproveWriteToFile: React.Dispatch<React.SetStateAction<boolean>>
	autoApproveExecuteCommand: boolean
	setAutoApproveExecuteCommand: React.Dispatch<React.SetStateAction<boolean>>
	onDone: () => void
}

type AutoApproveSettingType = "autoApproveNonDestructive" | "autoApproveWriteToFile" | "autoApproveExecuteCommand"

const SettingsView = ({
	apiKey,
	setApiKey,
	maxRequestsPerTask,
	setMaxRequestsPerTask,
	autoApproveNonDestructive,
	setAutoApproveNonDestructive,
	autoApproveWriteToFile,
	setAutoApproveWriteToFile,
	autoApproveExecuteCommand,
	setAutoApproveExecuteCommand,
	onDone,
}: SettingsViewProps) => {
	const [apiKeyErrorMessage, setApiKeyErrorMessage] = useState<string | undefined>(undefined)
	const [maxRequestsErrorMessage, setMaxRequestsErrorMessage] = useState<string | undefined>(undefined)

	const disableDoneButton = apiKeyErrorMessage != null || maxRequestsErrorMessage != null

	const handleApiKeyChange = (event: any) => {
		const input = event.target.value
		setApiKey(input)
		validateApiKey(input)
	}

	const validateApiKey = (value: string) => {
		if (value.trim() === "") {
			setApiKeyErrorMessage("API Key cannot be empty")
		} else {
			setApiKeyErrorMessage(undefined)
		}
	}

	const handleMaxRequestsChange = (event: any) => {
		const input = event.target.value
		setMaxRequestsPerTask(input)
		validateMaxRequests(input)
	}

	const validateMaxRequests = (value: string | undefined) => {
		if (value?.trim()) {
			const num = Number(value)
			if (isNaN(num)) {
				setMaxRequestsErrorMessage("Maximum requests must be a number")
			} else if (num < 3 || num > 100) {
				setMaxRequestsErrorMessage("Maximum requests must be between 3 and 100")
			} else {
				setMaxRequestsErrorMessage(undefined)
			}
		} else {
			setMaxRequestsErrorMessage(undefined)
		}
	}

	const handleAutoApproveChange = (
		setter: React.Dispatch<React.SetStateAction<boolean>>,
		settingType: AutoApproveSettingType
	) => {
		return (e: any) => {
			const target = e.target as HTMLInputElement
			setter(target.checked)
			vscode.postMessage({ type: settingType, value: target.checked })
		}
	}

	const handleSubmit = () => {
		vscode.postMessage({ type: "apiKey", text: apiKey })
		vscode.postMessage({ type: "maxRequestsPerTask", text: maxRequestsPerTask })
		onDone()
	}

	// validate as soon as the component is mounted
	useEffect(() => {
		validateApiKey(apiKey)
		validateMaxRequests(maxRequestsPerTask)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	return (
		<div style={{ margin: "0 auto", paddingTop: "10px" }}>
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					marginBottom: "17px",
				}}>
				<h3 style={{ color: "var(--vscode-foreground)", margin: 0 }}>Settings</h3>
				<VSCodeButton onClick={handleSubmit} disabled={disableDoneButton}>
					Done
				</VSCodeButton>
			</div>

			<div style={{ marginBottom: "20px" }}>
				<VSCodeTextField
					value={apiKey}
					style={{ width: "100%" }}
					placeholder="Enter your Anthropic API Key"
					onInput={handleApiKeyChange}>
					Anthropic API Key
				</VSCodeTextField>
				{apiKeyErrorMessage && (
					<p
						style={{
							fontSize: "12px",
							marginTop: "5px",
							color: "var(--vscode-errorForeground)",
						}}>
						{apiKeyErrorMessage}
					</p>
				)}
				<p
					style={{
						fontSize: "12px",
						marginTop: "5px",
						color: "var(--vscode-descriptionForeground)",
					}}>
					This key is not shared with anyone and only used to make API requests from the extension.
					<VSCodeLink href="https://console.anthropic.com/" style={{ display: "inline" }}>
						You can get an API key by signing up here.
					</VSCodeLink>
				</p>
			</div>

			<div style={{ marginBottom: "20px" }}>
				<VSCodeTextField
					value={maxRequestsPerTask}
					style={{ width: "100%" }}
					placeholder="20"
					onInput={handleMaxRequestsChange}>
					Maximum # Requests Per Task
				</VSCodeTextField>
				{maxRequestsErrorMessage && (
					<p
						style={{
							fontSize: "12px",
							marginTop: "5px",
							color: "var(--vscode-errorForeground)",
						}}>
						{maxRequestsErrorMessage}
					</p>
				)}
				<p
					style={{
						fontSize: "12px",
						marginTop: "5px",
						color: "var(--vscode-descriptionForeground)",
					}}>
					If Claude Dev reaches this limit, it will pause and ask for your permission before making additional
					requests.
				</p>
			</div>

			<VSCodeDivider />

			<div style={{ marginTop: "20px", marginBottom: "20px" }}>
				<h4 style={{ color: "var(--vscode-foreground)", marginBottom: "10px" }}>Auto-approve Settings</h4>
				<VSCodeCheckbox
					checked={autoApproveNonDestructive}
					onChange={
						handleAutoApproveChange(setAutoApproveNonDestructive, "autoApproveNonDestructive") as any
					}>
					Auto-approve non-destructive actions (read_file, list_files)
				</VSCodeCheckbox>
				<VSCodeCheckbox
					checked={autoApproveWriteToFile}
					onChange={handleAutoApproveChange(setAutoApproveWriteToFile, "autoApproveWriteToFile") as any}>
					Auto-approve write_to_file actions
				</VSCodeCheckbox>
				<VSCodeCheckbox
					checked={autoApproveExecuteCommand}
					onChange={
						handleAutoApproveChange(setAutoApproveExecuteCommand, "autoApproveExecuteCommand") as any
					}>
					Auto-approve execute_command actions
				</VSCodeCheckbox>
				<p
					style={{
						fontSize: "12px",
						marginTop: "5px",
						color: "var(--vscode-descriptionForeground)",
					}}>
					Be cautious when enabling auto-approve for write_to_file and execute_command, as these can modify
					your system.
				</p>
			</div>

			<VSCodeDivider />

			<div
				style={{
					marginTop: "20px",
					textAlign: "center",
					color: "var(--vscode-descriptionForeground)",
					fontSize: "12px",
					lineHeight: "1.2",
					fontStyle: "italic",
				}}>
				<p>
					This project was made for Anthropic's "Build with Claude June 2024 contest"
					<br />
					<VSCodeLink href="https://github.com/saoudrizwan/claude-dev">
						https://github.com/saoudrizwan/claude-dev
					</VSCodeLink>
				</p>
			</div>
		</div>
	)
}

export default SettingsView
