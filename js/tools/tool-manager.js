import { Logger } from '../utils/logger.js';
import { ApplicationError, ErrorCodes } from '../utils/error-boundary.js';
import { GoogleSearchTool } from './google-search.js';
import { WeatherTool } from './weather-tool.js';
import { EmailTool } from './email-tool.js'; // Import the EmailTool

/**
 * Manages the registration and execution of tools.
 * Tools are used to extend the functionality of the Gemini API, allowing it to interact with external services.
 */
export class ToolManager {
    /**
     * Creates a new ToolManager and registers default tools.
     */
    constructor() {
        this.tools = new Map();
        this.registerDefaultTools();
    }

    /**
     * Registers the default tools: GoogleSearchTool, WeatherTool, and EmailTool.
     */
    registerDefaultTools() {
        this.registerTool('googleSearch', new GoogleSearchTool());
        this.registerTool('weather', new WeatherTool());
        this.registerTool('email', new EmailTool()); // Register the EmailTool
    }

    /**
     * Registers a new tool.
     *
     * @param {string} name - The name of the tool.
     * @param {Object} toolInstance - The tool instance. Must have a `getDeclaration` method.
     * @throws {ApplicationError} Throws an error if a tool with the same name is already registered or if the tool instance is invalid.
     */
    registerTool(name, toolInstance) {
        if (this.tools.has(name)) {
            throw new ApplicationError(
                `Tool "${name}" is already registered.`,
                ErrorCodes.INVALID_STATE
            );
        }

        if (!toolInstance || typeof toolInstance.getDeclaration !== 'function') {
            throw new ApplicationError(
                `Invalid tool instance for "${name}". Tool must have a "getDeclaration" method.`,
                ErrorCodes.INVALID_PARAMETER
            );
        }

        this.tools.set(name, toolInstance);
        Logger.info(`Tool "${name}" registered successfully.`);
    }

    /**
     * Returns the tool declarations for all registered tools.
     * These declarations are used by the Gemini API to understand what tools are available.
     *
     * @returns {Object[]} An array of tool declarations.
     */
    getToolDeclarations() {
        const declarations = [];

        this.tools.forEach((tool, name) => {
            try {
                const declaration = tool.getDeclaration();
                if (declaration) {
                    declarations.push({
                        name,
                        declaration
                    });
                } else {
                    Logger.warn(`Tool "${name}" returned an empty declaration.`);
                }
            } catch (error) {
                Logger.error(`Failed to get declaration for tool "${name}":`, error);
            }
        });

        return declarations;
    }

    /**
     * Handles a tool call from the Gemini API.
     * Executes the specified tool with the given arguments.
     *
     * @param {Object} functionCall - The function call object from the Gemini API.
     * @param {string} functionCall.name - The name of the tool to execute.
     * @param {Object} functionCall.args - The arguments to pass to the tool.
     * @param {string} functionCall.id - The ID of the function call.
     * @returns {Promise<Object>} A promise that resolves with the tool's response.
     * @throws {ApplicationError} Throws an error if the tool is unknown or if the tool execution fails.
     */
    async handleToolCall(functionCall) {
        const { name, args, id } = functionCall;
        Logger.info(`Handling tool call: "${name}"`, { args });

        // Find the tool by name
        let tool;
        if (name === 'get_weather_on_date') {
            tool = this.tools.get('weather');
        } else if (name === 'sendEmail') {
            tool = this.tools.get('email');
        } else {
            tool = this.tools.get(name);
        }

        if (!tool) {
            throw new ApplicationError(
                `Unknown tool: "${name}".`,
                ErrorCodes.INVALID_PARAMETER
            );
        }

        try {
            // Execute the tool
            const result = await tool.execute(args);
            Logger.info(`Tool "${name}" executed successfully.`, { result });

            return {
                functionResponses: [{
                    response: { output: result },
                    id
                }]
            };
        } catch (error) {
            Logger.error(`Tool "${name}" execution failed:`, error);

            return {
                functionResponses: [{
                    response: { error: error.message },
                    id
                }]
            };
        }
    }
}