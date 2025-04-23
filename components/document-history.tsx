import { DocumentMetadata } from "../app/types/index";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, CheckCircle2 } from "lucide-react";

interface DocumentHistoryProps {
  documents: DocumentMetadata[];
  selectedDocuments: DocumentMetadata[];
  onDocumentSelect: (doc: DocumentMetadata) => void;
  onDelete: (namespace: string) => Promise<void>;
}

export function DocumentHistory({
  documents,
  selectedDocuments,
  onDocumentSelect,
  onDelete,
}: DocumentHistoryProps) {
  if (documents.length === 0) {
    return (
      <div className="text-center text-gray-500 dark:text-gray-400">
        No documents uploaded yet
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold mb-4">Document History</h2>
      <div className="space-y-2">
        {documents.map((doc) => {
          const isSelected = selectedDocuments.some((d) => d.id === doc.id);
          return (
            <Card
              key={doc.id}
              className={`p-4 cursor-pointer transition-colors ${
                isSelected
                  ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                  : "hover:bg-gray-50 dark:hover:bg-gray-800"
              }`}
              onClick={() => onDocumentSelect(doc)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{doc.filename}</span>
                    {isSelected && (
                      <CheckCircle2 className="h-4 w-4 text-blue-500" />
                    )}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {doc.uploadedAt.toLocaleDateString()}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(doc.namespace);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
