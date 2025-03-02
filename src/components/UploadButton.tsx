"use client";
import { trpc } from "@/app/_trpc/client";
import { UploadDropzone as Drop } from "@uploadthing/react";
import { useRouter } from "next/navigation";
import { RefObject, useRef, useState } from "react";
import { toast } from "sonner";
import DeleteFile from "./DeleteFile";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "./ui/dialog";

const UploadDropzone = ({ dialogTriggerRef }: { dialogTriggerRef: RefObject<HTMLButtonElement> }) => {
	const router = useRouter();
	const [isUploadComplete, setUploadIsComplete] = useState(false);

	const utils = trpc.useUtils();

	const { mutate: startPolling } = trpc.getFile.useMutation({
		onSuccess: (file) => {
			if (file.uploadStatus === "SUCCESS") {
				router.push(`/dashboard/${file.id}`);
			}
			if (file.uploadStatus === "FAILED") {
				toast.error("Something went wrong while processing your file", {
					description: "Your File was uploaded successfully but we couldn't process it delete and try again",
					duration: 12000,
					action: <DeleteFile className=" w-fit" id={file.id} />,
				});
				dialogTriggerRef.current?.click();
			}
		},
		retry: true,
		retryDelay: 1000,
		onError: (err) => {
			toast.error("Something went wrong", {
				description: "Please try again later",
			});
		},
	});

	return (
		<>
			{isUploadComplete ? (
				<div className="min-h-[400px] w-full flex flex-col items-center justify-center space-y-4 p-6">
					<div className="relative w-16 h-16">
						<div className="absolute inset-0 rounded-full border-4 border-gray-200"></div>
						<div className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div>
					</div>
					<h3 className="text-2xl font-semibold text-gray-800">Processing your PDF</h3>
					<p className="text-gray-500 text-center max-w-md">
						This may take a moment depending on the file size. Please don't close this window.
					</p>
				</div>
			) : (
				// @ts-ignore
				<Drop
					className="ut-label:text-lg text-white ut-allowed-content:ut-uploading:text-red-300"
					endpoint="FileUploader"
					onClientUploadComplete={(res: any) => {
						setUploadIsComplete(true);
						toast.success("File uploaded successfully");
						utils.getUserFiles.invalidate();
						startPolling({ key: res[0].key });
					}}
					onUploadError={(error: Error) => {
						toast.error(`${error.message}`, {
							description:
								"The uploaded file exceeds the maximum allowed size. Please reduce the file size and try again.",
							duration: 9000,
						});
					}}
					onChange={(files: any) => {
						if (files.length > 1) {
							toast.error("You can only upload one file at a time", {
								description: "Please try to upload one file at a time",
							});
							return;
						}
					}}
				/>
			)}
		</>
	);
};

const UploadButton = () => {
	const [isOpen, setIsOpen] = useState<boolean>(false);
	const dialogTriggerRef = useRef<HTMLButtonElement>(null);

	return (
		<Dialog
			open={isOpen}
			onOpenChange={(v) => {
				if (!v) {
					setIsOpen(v);
				}
			}}>
			<DialogTrigger ref={dialogTriggerRef} onClick={() => setIsOpen(true)} asChild>
				<Button>Upload PDF</Button>
			</DialogTrigger>

			<DialogContent>
				<DialogTitle>Upload PDF</DialogTitle>
				<UploadDropzone dialogTriggerRef={dialogTriggerRef} />
			</DialogContent>
		</Dialog>
	);
};

export default UploadButton;
