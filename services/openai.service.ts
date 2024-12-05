// import 'dotenv/config';
import OpenAI from 'openai';
import { createMessage, getAllMessages } from '../models/message.model';
import { connect } from 'http2';
import { searchIndex } from './embedder.service';
const openai = new OpenAI();
const instructions =
    "You are a customer support assistant for TechEase Solutions, a company that provides comprehensive IT services to businesses. Your role is to assist our clients with their technical issues, answer questions about our services, and provide guidance on using our products effectively. Always respond in a friendly, professional manner, and ensure your explanations are clear and concise. If you're unable to resolve an issue immediately, reassure the customer that you will escalate the problem and follow up promptly. Your goal is to provide exceptional support and ensure customer satisfaction.";
const systemInstruction = {
    role: 'system',
    content: instructions,
};

export async function sendMessage(threadId: string, content: { text: string; url?: string }) {
    console.log('sendMessage', threadId, JSON.stringify(content));
    const query = content.text;
    let responseText = 'Sorry, I am not able to understand your query. Please try again.';
    await createMessage({
        thread_id: threadId,
        role: 'user',
        content: query,
    });

    //we want to return an array of database records
    //we cannot pass it directly to messages, as we need to apply transformatins
    const dbMessages: any[] = (await getAllMessages(threadId)).map(message => {
        const formattedMessage: any = {
            role: message.role,
            content: message.content,
        };
        if (message.tool_calls) {
            formattedMessage.tool_calls = message.tool_calls;
        }
        if (message.tool_call_id) {
            formattedMessage.tool_call_id = message.tool_call_id;
        }
        return formattedMessage;
    });

    const messages: any[] = [systemInstruction, ...dbMessages];
    const message = await createCompleteion(messages);
    console.log('Response:', message);

    //check if there are tool_calls
    if (message.tool_calls && message.tool_calls.length) {
        messages.push(message);

        // need to call create message - this was in the message model
        await createMessage({
            thread_id: threadId,
            role: 'user',
            content: '',
            tool_calls: message.tool_calls,
        });
        //get the context from the tool_calls. IF there are no tool calls, we will set the response to the message content
        //when we have a tool call we need to response with a message. THis will be added to the messages array and every time you receive the messahe with tool calls it will be update
        for (const tool_Call of message.tool_calls) {
            if (tool_Call.function && tool_Call.function.name === 'getContext') {
                console.log('Tool Calls:', tool_Call);
                const functionArgs = JSON.parse(tool_Call.function.arguments);
                const context = await getContext(functionArgs.question);
                const responsMessage = {
                    role: 'tool',
                    tool_call_id: tool_Call.id,
                    content: context,
                };
                await createMessage({
                    thread_id: threadId,
                    role: 'tool',
                    content: context,
                    tool_call_id: tool_Call.id,
                });

                messages.push(responsMessage);
            }
        }

        const response = await createCompleteion(messages);
        responseText = response.content;
    } else {
        responseText = message.content;
    }

    if (message.content) {
        await createMessage({
            thread_id: threadId,
            role: 'assistant',
            content: message.content,
        });
        console.log('Answer:', message.content);
        responseText = message.content;
    }

    return { content: responseText };
}

async function getContext(query: string) {
    const embeddingResult = await embed(query);
    const matches = (await searchIndex(embeddingResult[0].embedding)).matches;
    return matches.length ? matches.map(match => match.metadata.content).join('\n\n') : '';
}

async function createCompleteion(messages: any[]) {
    const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages,
        tools: [
            {
                type: 'function',
                function: {
                    name: 'getContext',
                    description: "Retrieve the relevant context to answer the user's IT/software related questions.",
                    parameters: {
                        type: 'object',
                        properties: {
                            question: {
                                type: 'string',
                                description: "The user's question about IT/software that requires additioanl context.",
                            },
                        },
                        required: ['question'],
                        additionalProperties: false,
                    },
                },
            },
        ],
    });

    const message = completion.choices[0].message;
    return message;
}

export async function embed(input: string) {
    const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input,
    });

    console.log(response);
    return response.data;
}
