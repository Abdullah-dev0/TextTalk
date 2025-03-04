import { db } from "@/db";
import { embeddings } from "@/lib/embeddings";
import index from "@/lib/pinecone";
import { rateLimiter } from "@/lib/rateLimiter";
import { chatTemplate, translationTemplate } from "@/lib/templates/chat-templates";
import { SendMessageValidator } from "@/lib/validators/SendMessageValidator";
import { currentUser } from "@clerk/nextjs/server";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnablePassthrough, RunnableSequence } from "@langchain/core/runnables";
import { ChatMistralAI } from "@langchain/mistralai";
import { PineconeStore } from "@langchain/pinecone";
import { StreamingTextResponse } from "ai";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

const llm = new ChatMistralAI({
	model: "mistral-large-latest",
	apiKey: process.env.OPENAI_API_KEY!,
	maxRetries: 2,
	temperature: 0.3,
});

export const POST = async (req: NextRequest, res: NextResponse) => {
	const body = await req.json();
	// const llm = new ChatGoogleGenerativeAI({
	// 	model: "gemini-1.5-flash",
	// 	apiKey: process.env.GOOGLE_API_KEY!,
	// 	maxRetries: 2,
	// 	temperature: 0.3,
	// });

	const user = await currentUser();

	if (!user) return new Response("Unauthorized", { status: 401 });

	const { success, remaining } = await rateLimiter.limit(user.id);
	if (!success) {
		return new Response("Rate limit exceeded please try again later", { status: 429 });
	}

	const { fileId, message, language } = SendMessageValidator.parse(body);

	const lowerCaseLanguage = language.toLowerCase();

	const file = await db.file.findFirst({
		where: {
			id: fileId,
			userId: user.id,
		},
	});

	if (!file) return new Response("Not found", { status: 404 });

	await db.message.create({
		data: {
			text: message,
			isUserMessage: true,
			userId: user.id,
			fileId,
		},
	});

	const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
		pineconeIndex: index,
		namespace: file.id,
	});

	const retrievedDocs = await vectorStore.similaritySearch(message, 3);

	const prevMessages = await db.message.findMany({
		where: { fileId },
		orderBy: { createdAt: "asc" },
		take: 6,
	});

	const formattedPrevMessages = prevMessages.map((msg) => ({
		role: msg.isUserMessage ? ("user" as const) : ("system" as const),
		content: msg.text,
	}));

	const context = retrievedDocs
		.map((doc) => `${doc.pageContent}\nPage Number: ${doc.metadata?.pageNumber}`)
		.join("\n\n");

	const chainArray: any = [
		{
			context: () => context,
			question: new RunnablePassthrough(),
			chat_history: () =>
				formattedPrevMessages
					.map((message) => {
						if (message.role === "user") return `User: ${message.content}\n`;
						return `Assistant: ${message.content}\n`;
					})
					.join(""),
		},
		chatTemplate,
		llm,
		new StringOutputParser(),
	];

	if (lowerCaseLanguage !== "english") {
		console.log("PUSHING THE TRANSLATION CHAIN");
		chainArray.push(
			{
				input: (preresult: string) => preresult,
				language: () => lowerCaseLanguage,
			},
			translationTemplate,
			llm,
			new StringOutputParser(),
		);
	}

	const chain = RunnableSequence.from(chainArray);

	const stream = await chain.stream({
		question: message,
	});

	const readableStream = new ReadableStream({
		async start(controller) {
			const chunks: string[] = [];

			try {
				for await (const chunk of stream) {
					controller.enqueue(chunk);
					chunks.push(chunk);
				}

				await db.message.create({
					data: {
						text: chunks.join(""),
						isUserMessage: false,
						fileId,
						userId: user.id,
					},
				});

				controller.close();
			} catch (error) {
				console.error("Error saving message", error);
				controller.error(error);
			}
		},
	});

	return new StreamingTextResponse(readableStream);
};
