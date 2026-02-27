import axios, { AxiosInstance } from 'axios';

export interface InitiateCallPayload {
  phone: string;
  contactName?: string;
  companyName?: string;
  customPrompt?: string;
  metadata?: Record<string, any>;
}

export interface InitiateCallResponse {
  callId: string;
}

export class AICallClient {
  private readonly axiosInstance: AxiosInstance;
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl = process.env.VAPI_URL || 'https://api.vapi.ai/call';
    const apiKey = process.env.VAPI_API_KEY;

    if (!apiKey) {
      console.warn('VAPI_API_KEY is not defined. AI calls will fail unless configured.');
    }

    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async initiateCall(payload: InitiateCallPayload): Promise<InitiateCallResponse> {
    const phoneNumberId = process.env.VAPI_PHONE_NUMBER_ID;

    // VAPI requires an outbound phone number ID to bridge the call.
    if (!phoneNumberId || phoneNumberId.includes('your_vapi_phone_number')) {
      throw new Error('VAPI_PHONE_NUMBER_ID is missing from .env. Cannot make outbound calls.');
    }

    const requestBody: any = {
      phoneNumberId: phoneNumberId,
      customer: {
        number: payload.phone,
        name: payload.contactName || payload.companyName || 'Customer',
      },
      ...(payload.metadata && { metadata: payload.metadata }),
    };

    const defaultAssistantId = process.env.VAPI_ASSISTANT_ID;

    // If Custom Prompt is provided, override the assistant instructions
    if (payload.customPrompt) {
      if (defaultAssistantId && !defaultAssistantId.includes('your_vapi')) {
        requestBody.assistantId = defaultAssistantId;
      }
      requestBody.assistant = {
        model: {
          messages: [
            {
              role: 'system',
              content: payload.customPrompt
            }
          ]
        }
      };
    } else {
      // Fallback to default assistant
      if (!defaultAssistantId || defaultAssistantId.includes('your_vapi')) {
        throw new Error('VAPI_ASSISTANT_ID is missing from .env and no customPrompt was provided. VAPI needs an Assistant to run.');
      }
      requestBody.assistantId = defaultAssistantId;
    }

    try {
      const response = await this.axiosInstance.post('/call', requestBody);

      const callId = response.data?.id || response.data?.callId;

      if (!callId) {
        throw new Error('Invalid response from VAPI: missing callId');
      }

      return { callId };
    } catch (error: any) {
      throw new Error(`Failed to initiate VAPI call: ${error.response?.data?.message || error.message}`);
    }
  }
}
