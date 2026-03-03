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
    this.baseUrl = (process.env.VAPI_URL || 'https://api.vapi.ai').replace(/\/call$/, '');
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
        number: this.formatPhoneNumber(payload.phone),
        name: payload.contactName || payload.companyName || 'Customer',
      },
      ...(payload.metadata && { metadata: payload.metadata }),
    };

    const defaultAssistantId = process.env.VAPI_ASSISTANT_ID;

    if (payload.customPrompt) {
      // If we use an existing assistant but want to change the system prompt, VAPI requires
      // us to put it in assistantOverrides and provide the base model/provider fields again.
      requestBody.assistantId = defaultAssistantId;
      requestBody.assistantOverrides = {
        firstMessage: payload.customPrompt,
        model: {
          provider: 'openai',
          model: 'gpt-4o-mini',
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
      // VAPI uses /call/phone when initiating an outbound call
      const response = await this.axiosInstance.post('/call/phone', requestBody);

      const callId = response.data?.id || response.data?.callId || response.data?.orgId;

      if (!callId) {
        throw new Error('Invalid response from VAPI: missing call tracking ID');
      }

      return { callId };
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.message;
      const errorPayload = error.response?.data ? JSON.stringify(error.response.data) : 'No response data';
      const requestPayload = JSON.stringify(requestBody);
      throw new Error(`Failed to initiate VAPI call: ${errorMsg} | Payload Sent: ${requestPayload} | Provider Response: ${errorPayload}`);
    }
  }

  /**
   * Formats a raw phone string into E.164 (e.g. +14155552671)
   */
  private formatPhoneNumber(phone: string): string {
    // Remove all non-numeric characters except the leading '+'
    let cleaned = phone.replace(/(?!^\+)[^\d]/g, '');

    // If it doesn't start with '+', assume US country code '+1'
    if (!cleaned.startsWith('+')) {
      // If they provided a 10-digit number, prepend +1
      if (cleaned.length === 10) {
        cleaned = '+1' + cleaned;
      } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
        // If they provided 11 digits starting with 1, just prepend +
        cleaned = '+' + cleaned;
      } else {
        // Fallback for unexpected lengths, just prepend +1 and let VAPI validate
        cleaned = '+1' + cleaned;
      }
    }

    return cleaned;
  }
}
