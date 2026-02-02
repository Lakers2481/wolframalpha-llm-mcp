import { WolframLLMService } from '../services/wolfram-llm.js';
// Initialize service
const wolframLLMService = new WolframLLMService({
    appId: process.env.WOLFRAM_LLM_APP_ID || ''
});
export const tools = [
    {
        name: "ask_llm",
        description: "Ask WolframAlpha a question",
        inputSchema: {
            type: "object",
            properties: {
                query: {
                    type: "string",
                    description: "The query to ask WolframAlpha"
                }
            },
            required: ["query"]
        },
        handler: async (args) => {
            const response = await wolframLLMService.query(args.query);
            if (!response.success || !response.result) {
                throw new Error(response.error || 'Failed to get LLM response from WolframAlpha');
            }
            // Get the raw result text
            let rawText = response.result.result;
            // Find the second "Assumption:" section and remove everything after it
            const lines = rawText.split('\n\n');
            const firstAssumptionIndex = lines.findIndex(line => line.startsWith('Assumption:'));
            let processedLines = lines;
            if (firstAssumptionIndex >= 0) {
                const secondAssumptionIndex = lines.findIndex((line, i) => i > firstAssumptionIndex && line.startsWith('Assumption:'));
                if (secondAssumptionIndex > 0) {
                    // Keep only the content up to the second assumption
                    processedLines = lines.slice(0, secondAssumptionIndex);
                    // Check if there's a URL section and add it back if needed
                    const urlLine = lines.find(line => line.startsWith('Wolfram|Alpha website result'));
                    if (urlLine && !processedLines.includes(urlLine)) {
                        processedLines.push(urlLine);
                    }
                }
            }
            // Reconstruct the text
            let text = `Query: ${response.result.query}\n`;
            if (response.result.interpretation) {
                text += `Interpretation: ${response.result.interpretation}\n`;
            }
            text += `\nResult: ${processedLines.join('\n\n')}\n`;
            if (response.result.url) {
                text += `\nFull results: ${response.result.url}`;
            }
            return {
                content: [{
                        type: "text",
                        text
                    }]
            };
        }
    },
    {
        name: "get_simple_answer",
        description: "Simple answer from WolframAlpha",
        inputSchema: {
            type: "object",
            properties: {
                query: {
                    type: "string",
                    description: "The query to ask WolframAlpha"
                }
            },
            required: ["query"]
        },
        handler: async (args) => {
            const response = await wolframLLMService.getSimplifiedAnswer(args.query);
            if (!response.success || !response.result) {
                throw new Error(response.error || 'Failed to get simplified answer from WolframAlpha');
            }
            // Get the raw result text
            let rawText = response.result.result;
            // Find the second "Assumption:" section and remove everything after it
            const lines = rawText.split('\n\n');
            const firstAssumptionIndex = lines.findIndex(line => line.startsWith('Assumption:'));
            let processedText = rawText;
            if (firstAssumptionIndex >= 0) {
                const secondAssumptionIndex = lines.findIndex((line, i) => i > firstAssumptionIndex && line.startsWith('Assumption:'));
                if (secondAssumptionIndex > 0) {
                    // Keep only the content up to the second assumption
                    const processedLines = lines.slice(0, secondAssumptionIndex);
                    // Check if there's a URL section and add it back if needed
                    const urlLine = lines.find(line => line.startsWith('Wolfram|Alpha website result'));
                    if (urlLine && !processedLines.includes(urlLine)) {
                        processedLines.push(urlLine);
                    }
                    processedText = processedLines.join('\n\n');
                }
            }
            return {
                content: [{
                        type: "text",
                        text: processedText
                    }]
            };
        }
    },
    {
        name: "validate_key",
        description: "Validate API key",
        inputSchema: {
            type: "object",
            properties: {},
            required: []
        },
        handler: async (_args) => {
            const isValid = await wolframLLMService.validateApiKey();
            return {
                content: [{
                        type: "text",
                        text: isValid ? "API key is valid" : "API key is invalid"
                    }]
            };
        }
    }
];
