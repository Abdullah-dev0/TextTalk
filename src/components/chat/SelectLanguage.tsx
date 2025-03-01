"use client";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { languages } from "@/constant";
import { useContext } from "react";
import { ChatContext } from "./ChatContext";
import { Globe } from "lucide-react";

export default function SelectLanguage() {
	const { language, setLanguage } = useContext(ChatContext);
	return (
		<Select defaultValue={language} value={language} onValueChange={setLanguage}>
			<SelectTrigger className="h-8 border-none bg-transparent focus:ring-0 min-w-[40px] px-1.5 flex items-center justify-center">
				<div className="flex items-center gap-1.5">
					<Globe className="h-4 w-4 text-muted-foreground" />
					<span className="text-xs font-medium hidden sm:inline">Language</span>
				</div>
			</SelectTrigger>
			<SelectContent align="end" className="min-w-[180px]">
				<SelectGroup>
					{languages.map((lang) => (
						<SelectItem key={lang.id} value={lang.language} className="capitalize text-sm">
							{lang.language}
						</SelectItem>
					))}
				</SelectGroup>
			</SelectContent>
		</Select>
	);
}
