"use client";

import { Card } from "@/components/ui/card";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { DocumentMetadata } from "@/app/types";
import { DocumentHistory } from "@/components/document-history";
import { useUploadThing } from "@/lib/uploadthing";

interface UploadSectionProps {
  documents: DocumentMetadata[];
  selectedDocuments: DocumentMetadata[];
  onDocumentSelect: (doc: DocumentMetadata) => void;
  onUploadComplete: (documents: DocumentMetadata[]) => void;
}

export function UploadSection({ 
  documents, 
  selectedDocuments, 
  onDocumentSelect, 
  onUploadComplete 
}: UploadSectionProps) {
  const [loading, setLoading] = useState<Map<string, boolean>>(new Map());
  const [uploadProgress, setUploadProgress] = useState(false);
  const [error, setError] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const {startUpload} = useUploadThing('pdfUploader');



  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    try {
      setLoading(new Map());
      setError("");
      setUploadProgress(false);
      setIsUploading(true);
      setUploadedFiles(acceptedFiles);

      const uploadedDocs: DocumentMetadata[] = [];

      for (const file of acceptedFiles) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("userId", "default-user");

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to upload file");
        }

        const data = await response.json();
        const newDoc: DocumentMetadata = {
          id: data.documentId,
          filename: file.name,
          uploadedAt: new Date(),
          summary: "Document uploaded successfully",
          pageCount: 1,
          fileSize: file.size,
          namespace: data.documentId,
          type: file.type || 'application/octet-stream'
        };

      const res= startUpload(acceptedFiles);
      console.log("This is a upload thing log", res)

        uploadedDocs.push(newDoc);
      }
      onUploadComplete(uploadedDocs);
      setUploadProgress(true);
    } catch (error) {
      console.error("Upload error:", error);
      setError(error instanceof Error ? error.message : "Failed to upload file");
    } finally {
      setLoading(new Map());
      setIsUploading(false);
    }
  }, [onUploadComplete]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    multiple: true
  });

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="space-y-4">
            <div
              {...getRootProps()}
              className="border-2 border-dashed p-8 text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg"
            >
              <input {...getInputProps()} />
              {isDragActive ? (
                <p>Drop the files here ...</p>
              ) : (
                <p>Drag and drop PDF files here, or click to select files</p>
              )}
            </div>
            {loading.size > 0 && <p className="text-center">Loading...</p>}
            {error && <p className="text-red-500">{error}</p>}
            {uploadProgress && <p className="text-center">Upload complete!</p>}
            
            {uploadedFiles.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-700">Selected files:</h3>
                <ul className="text-sm text-gray-500">
                  {uploadedFiles.map((file, index) => (
                    <li key={index}>{file.name}</li>
                  ))}
                </ul>
              </div>
            )}
            {isUploading && (
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-indigo-600 h-2.5 rounded-full"
                  style={{ width: uploadProgress ? "100%" : "0%" }}
                ></div>
              </div>
            )}
          </div>
        </Card>
        <Card className="p-4">
          <DocumentHistory
            documents={documents}
            selectedDocuments={selectedDocuments}
            onDocumentSelect={onDocumentSelect}
            onDelete={async (namespace) => {
              try {
                const docsToDelete = documents.filter(doc => doc.namespace === namespace);
                docsToDelete.forEach(doc => {
                  localStorage.removeItem(`file-${doc.id}`);
                });
              } catch (error) {
                setError(
                  error instanceof Error ? error.message : "Failed to delete namespace"
                );
              }
            }}
          />
        </Card>
      </div>
    </div>
  );
} 