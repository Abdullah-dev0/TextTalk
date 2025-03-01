import { relatedPdf } from "@/actions/relatedpdf";
import { FileText, Send } from "lucide-react";
import { useContext, useRef } from "react";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { ChatContext } from "./ChatContext";
import SelectLanguage from "./SelectLanguage";
import { useTransition } from "react";
import { File } from "@prisma/client";
import { trpc } from "@/app/_trpc/client";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";

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
			const loadingToast = toast.loading("Fetching related PDFs");
			try {
				const response = await relatedPdf(file as File);
				if (response.success) {
					await utils.getFileMessages.invalidate({ fileId: file?.id });
					toast.dismiss(loadingToast);
					toast.success("Related PDFs updated", {
						duration: 1500,
					});
				}
			} catch (error) {
				console.error("Error fetching related PDFs:", error);
				toast.dismiss(loadingToast);
				toast.error("Failed to update related PDFs", {
					duration: 1500,
				});
			}
		});
	};

	return (
		<div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-white via-white/80 to-transparent pb-6">
			<div className="mx-auto max-w-4xl px-4">
				<div className="relative flex flex-row items-center rounded-xl border border-input bg-background shadow-md hover:shadow-lg transition-shadow">
					<div className="flex items-center pl-3">
						<TooltipProvider delayDuration={100}>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										variant="outline"
										onClick={relatedPdfHandler}
										disabled={isPending}
										size="sm"
										className="flex items-center gap-1.5 h-8 rounded-md border-muted text-muted-foreground hover:bg-accent hover:text-foreground">
										<FileText className="h-4 w-4" />
										<span className="text-xs font-medium">PDFs</span>
										{isPending && <span className="text-xs ml-1">(loading...)</span>}
									</Button>
								</TooltipTrigger>
								<TooltipContent side="top" className="bg-primary text-primary-foreground">
									<p>Find related PDF documents</p>
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					</div>

					<Textarea
						rows={1}
						ref={textareaRef}
						maxRows={4}
						autoFocus
						onChange={handleInputChange}
						value={message}
						disabled={isLoading || isPending}
						onKeyDown={(e) => {
							if (e.key === "Enter" && !e.shiftKey) {
								e.preventDefault();
								if (message.trim() === "") return;
								addMessage();
								textareaRef.current?.focus();
							}
						}}
						placeholder="Enter your question..."
						className="min-h-[54px] max-h-[120px] resize-none border-0 bg-transparent py-3 pr-24 pl-2 text-base focus-visible:ring-0 focus-visible:ring-offset-0"
					/>

					<div className="absolute right-2 flex items-center gap-2">
						<div className="p-1 rounded-md hover:bg-accent">
							<SelectLanguage />
						</div>

						<Button
							disabled={isLoading || isDisabled}
							className="h-10 w-10 rounded-lg p-0 bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
							aria-label="send message"
							onClick={() => {
								if (message.trim() === "") {
									toast.error("Message is required");
									return;
								}
								addMessage();
								textareaRef.current?.focus();
							}}>
							<Send className="h-5 w-5" />
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
};

export default ChatInput;
