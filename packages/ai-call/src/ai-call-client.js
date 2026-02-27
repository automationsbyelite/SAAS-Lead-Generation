"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AICallClient = void 0;
const axios_1 = __importDefault(require("axios"));
class AICallClient {
    constructor() {
        this.baseUrl = process.env.VAPI_URL || 'https://api.vapi.ai/call';
        const apiKey = process.env.VAPI_API_KEY || '';
        this.axiosInstance = axios_1.default.create({
            baseURL: this.baseUrl,
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
        });
    }
    async initiateCall(payload) {
        const requestBody = {
            phoneNumberId: payload.phone,
            customer: {
                number: payload.phone,
                name: payload.contactName || payload.companyName || 'Customer',
            },
            ...(payload.metadata && { metadata: payload.metadata }),
        };
        try {
            const response = await this.axiosInstance.post('/call', requestBody);
            const callId = response.data?.id || response.data?.callId;
            if (!callId) {
                throw new Error('Invalid response from VAPI: missing callId');
            }
            return { callId };
        }
        catch (error) {
            throw new Error(`Failed to initiate VAPI call: ${error.message}`);
        }
    }
}
exports.AICallClient = AICallClient;
