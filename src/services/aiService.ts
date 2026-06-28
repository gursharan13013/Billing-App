import { GoogleGenAI, Type } from "@google/genai";
import { billingService } from "./billingService";

let aiInstance: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
    if (!aiInstance) {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.warn("GEMINI_API_KEY is not set. AI features will not work.");
        }
        // Initialize Gemini (will use empty string if missing to avoid browser crash on init, but will fail gracefully on usage)
        aiInstance = new GoogleGenAI({ apiKey: apiKey || "MISSING_API_KEY" });
    }
    return aiInstance;
}

export interface AIParsedItem {
    itemName: string;
    qty: number;
    unit?: string;
}

export interface AICommandResult {
    action: 'TRANSACTION' | 'ADVICE' | 'UNKNOWN';
    transactionType?: 'Sale' | 'Purchase' | 'Sale Order' | 'Purchase Order';
    partyName?: string;
    items?: AIParsedItem[];
    advice?: string;
}

export const aiService = {
    /**
     * Analyzes natural language input (Text/Voice) and determines action.
     */
    processCommand: async (userInput: string): Promise<AICommandResult> => {
        try {
            console.log("AI Service: Starting processCommand for:", userInput);
            // 1. Fetch Context (Existing Items and Parties) to help AI map names accurately
            console.log("AI Service: Fetching context from DB...");
            const [items, parties] = await Promise.all([
                billingService.getAllItems(),
                billingService.getAllParties()
            ]);
            console.log("AI Service: Context fetched. Items:", items.length, "Parties:", parties.length);

            // Create a lightweight context string
            const itemContext = items.map(i => `${i.name} (Stock: ${i.openingStock}, Rate: ${i.saleRate})`).join(", ");
            const partyContext = parties.map(p => `${p.name} (${p.type})`).join(", ");

            // 2. Call Gemini with a timeout
            console.log("AI Service: Calling Gemini API...");
            const timeoutPromise = new Promise<never>((_, reject) => 
                setTimeout(() => reject(new Error("Gemini API Timeout")), 15000)
            );

            const aiClient = getAiClient();
            const responsePromise = aiClient.models.generateContent({
                model: 'gemini-3.1-pro-preview',
                contents: [
                    {
                        role: 'user',
                        parts: [
                            {
                                text: `You are an intelligent assistant for a billing app. 
                                Analyze the User Input (which can be in Hindi, English, or Hinglish) and perform one of two actions: 
                                1. TRANSACTION: If the user wants to create an order or bill. 
                                2. ADVICE: If the user asks about business status, stock, or what to buy.

                                Context Data:
                                Known Items: ${itemContext}
                                Known Parties: ${partyContext}

                                User Input: "${userInput}"

                                STRICT MAPPING RULES (English & Hindi):
                                1. "Send Order", "Order Send", "Order Bhejo", "Order Bhejen", "Order Karna Hai", "का ऑर्डर करें", "का आर्डर करें" -> ALWAYS 'Purchase Order' (Sending order to supplier).
                                2. "Order Received", "Order Receive", "Order Aaya", "Order Mila", "Order Received Hua", "Received Order", "रिसीवड ऑर्डर" -> ALWAYS 'Sale Order' (Received order from customer -> Create Sale Order).
                                3. "Sale", "Bill", "Invoice", "Becho" -> 'Sale'.
                                4. "Purchase", "Buy", "Kharido" -> 'Purchase'.
                                5. "Sale Order" (Explicitly stated) -> 'Sale Order'.
                                6. "Purchase Order" (Explicitly stated) -> 'Purchase Order'.

                                General Rules:
                                - Map "Party Name" to the closest match in Known Parties. If no match, use the name provided in the input.
                                - Map "Item Name" to the closest match in Known Items.
                                - For ADVICE, analyze the stock levels in 'Known Items' and tell the user what is running low (e.g. stock <= 10) in Hindi/English mix.
                                - ALWAYS return valid JSON matching the schema.
                                `
                            }
                        ]
                    }
                ],
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            action: { 
                                type: Type.STRING, 
                                enum: ["TRANSACTION", "ADVICE", "UNKNOWN"],
                                description: "The type of action required."
                            },
                            transactionType: {
                                type: Type.STRING,
                                enum: ["Sale", "Purchase", "Sale Order", "Purchase Order"],
                                description: "Only for TRANSACTION. The type of voucher."
                            },
                            partyName: {
                                type: Type.STRING,
                                description: "Only for TRANSACTION. The name of the customer or supplier."
                            },
                            items: {
                                type: Type.ARRAY,
                                description: "Only for TRANSACTION. List of items.",
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        itemName: { type: Type.STRING },
                                        qty: { type: Type.NUMBER },
                                        unit: { type: Type.STRING, nullable: true }
                                    }
                                }
                            },
                            advice: {
                                type: Type.STRING,
                                description: "Only for ADVICE. The text response giving business advice."
                            }
                        }
                    }
                }
            });

            const response = await Promise.race([responsePromise, timeoutPromise]);

            // 3. Parse Response
            const resultText = response.text;
            if (!resultText) throw new Error("No response from AI");
            
            const result = JSON.parse(resultText) as AICommandResult;
            return result;

        } catch (error) {
            console.error("AI Service Error:", error);
            console.log("Full error object:", JSON.stringify(error, null, 2));
            return { action: 'UNKNOWN', advice: "Sorry, I couldn't understand that. Please try again." };
        }
    }
};
