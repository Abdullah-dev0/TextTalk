import { relatedPdf } from "@/actions/relatedpdf";
import { Send } from "lucide-react";
import { useContext, useRef } from "react";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { ChatContext } from "./ChatContext";
import SelectLanguage from "./SelectLanguage";
import { useTransition } from "react";
import { File } from "@prisma/client";
import { trpc } from "@/app/_trpc/client";

interface ChatInputProps {
	isDisabled?: boolean;
	file?: File;
}

const ChatInput = ({ isDisabled, file }: ChatInputProps) => {
	const { addMessage, handleInputChange, isLoading, message } = useContext(ChatContext);
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const [isPending, startTransition] = useTransition();

	const utils = trpc.useUtils();

	const relatedPdfHandler = () => {
		startTransition(async () => {
			try {
				const response = await relatedPdf(file as File);
				console.log(response);
				if (response.success) {
					await utils.getFileMessages.invalidate({ fileId: file?.id });
				}
			} catch (error) {
				console.error("Error fetching related PDFs:", error);
			}
		});
	};

	return (
		<div className="absolute bottom-0 left-0 w-full">
			<div className="flex flex-row  items-center px-2 md:px-4 md:last:mb-6 lg:mx-auto lg:max-w-2xl xl:max-w-3xl">
				<div className="relative flex h-full  flex-1 items-stretch md:flex-col">
					<div className="relative flex flex-col w-full flex-grow p-4">
						<div className="relative">
							<Textarea
								rows={1}
								ref={textareaRef}
								maxRows={4}
								autoFocus
								onChange={handleInputChange}
								value={message}
								onKeyDown={(e) => {
									if (e.key === "Enter" && !e.shiftKey) {
										e.preventDefault();
										if (message.trim() === "") return;
										addMessage();
										textareaRef.current?.focus();
									}
								}}
								placeholder="Enter your question..."
								className="resize-none pr-8 text-base py-3 scrollbar-thumb-blue scrollbar-thumb-rounded scrollbar-track-blue-lighter scrollbar-w-2 scrolling-touch"
							/>

							<Button
								disabled={isLoading || isDisabled}
								className="absolute bottom-1.5 right-[8px]"
								aria-label="send message"
								onClick={() => {
									if (message.trim() === "") {
										toast.error("Message is required");
										return;
									}
									addMessage();
									textareaRef.current?.focus();
								}}>
								<Send className="h-4 w-4" />
							</Button>
							<Button onClick={relatedPdfHandler} disabled={isPending}>
								Related PDF
							</Button>
						</div>
					</div>
				</div>
				<SelectLanguage />
			</div>
		</div>
	);
};

export default ChatInput;
