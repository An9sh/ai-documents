import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Send } from "lucide-react";
import { DocumentMetadata } from "@/lib/types";

interface ChatInterfaceProps {
  onSubmit: (question: string) => Promise<string>;
  isLoading: boolean;
  selectedDocuments: DocumentMetadata[];
}

export function ChatInterface({
  onSubmit,
  isLoading,
  selectedDocuments,
}: ChatInterfaceProps) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isLoading) return;

    const userMessage = message.trim();
    setMessage("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);

    try {
      const response = await onSubmit(userMessage);
      setMessages((prev) => [...prev, { role: "assistant", content: response }]);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <span className="font-medium">Selected Documents:</span>
          <span className="text-sm text-gray-500">
            {selectedDocuments.length === 0
              ? "None"
              : selectedDocuments.map((doc) => doc.filename).join(", ")}
          </span>
        </div>

        <div className="h-[400px] overflow-y-auto space-y-4">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  msg.role === "user"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-100 dark:bg-gray-800"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex space-x-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ask a question about your documents..."
            disabled={isLoading || selectedDocuments.length === 0}
          />
          <Button type="submit" disabled={isLoading || selectedDocuments.length === 0}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </div>
    </Card>
  );
}
