import * as mammoth from 'mammoth';

export interface UploadedFile {
  name: string;
  size: number;
  type: string;
  content: string; // Base64 encoded content
  extractedText?: string; // Extracted text from Word documents
}

// ===== File Upload Limits =====
export const FILE_LIMITS = {
  MAX_FILE_SIZE: 10 * 1024 * 1024,      // 10 MB per file
  MAX_TOTAL_SIZE: 50 * 1024 * 1024,     // 50 MB total
  MAX_FILE_COUNT: 20,                    // 20 files max
  MAX_IMAGE_DIMENSION: 4096,             // 4096px max
  ALLOWED_TYPES: [
    'image/*',
    'text/plain',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/json',
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
};

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  warnings?: string[];
}

/**
 * Validate a single file against limits
 */
export function validateFile(file: File, currentFiles: UploadedFile[]): FileValidationResult {
  // Check file count
  if (currentFiles.length >= FILE_LIMITS.MAX_FILE_COUNT) {
    return {
      valid: false,
      error: `Maximum ${FILE_LIMITS.MAX_FILE_COUNT} files allowed. Remove some files first.` 
    };
  }
  
  // Check individual file size
  if (file.size > FILE_LIMITS.MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File "${file.name}" is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is ${FILE_LIMITS.MAX_FILE_SIZE / 1024 / 1024} MB.` 
    };
  }
  
  // Check total size
  const currentTotalSize = currentFiles.reduce((sum, f) => sum + f.size, 0);
  if (currentTotalSize + file.size > FILE_LIMITS.MAX_TOTAL_SIZE) {
    return {
      valid: false,
      error: `Total upload size would exceed ${FILE_LIMITS.MAX_TOTAL_SIZE / 1024 / 1024} MB limit. Remove some files first.` 
    };
  }
  
  return { valid: true };
}

/**
 * Convert file to base64 string
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
  });
}

/**
 * Process files with validation
 */
export async function processFilesWithValidation(
  fileList: File[], 
  currentFiles: UploadedFile[]
): Promise<{ files: UploadedFile[]; errors: string[] }> {
  const errors: string[] = [];
  const validFiles: File[] = [];
  
  for (const file of fileList) {
    const validation = validateFile(file, [...currentFiles, ...validFiles.map(f => ({
      name: f.name,
      size: f.size,
      type: f.type,
      content: '',
      extractedText: '',
    }))]);
    
    if (validation.valid) {
      validFiles.push(file);
    } else {
      errors.push(validation.error!);
    }
  }
  
  const processedFiles = await processFiles(validFiles);
  return { files: processedFiles, errors };
}

/**
 * Process uploaded files (extract text, convert to base64)
 */
export async function processFiles(fileList: File[]): Promise<UploadedFile[]> {
  return Promise.all(
    fileList.map(async (file) => {
      let content = '';
      let extractedText = '';
      
      // Handle Word documents
      if (file.name.endsWith('.docx') || file.name.endsWith('.doc')) {
        try {
          const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
          extractedText = result.value;
          content = await fileToBase64(file);
        } catch (error) {
          console.error('Error extracting text from Word document:', error);
          extractedText = 'Error: Could not extract text from document';
          content = await fileToBase64(file);
        }
      }
      // Handle PDF documents
      else if (file.name.endsWith('.pdf')) {
        try {
          content = await fileToBase64(file);
          extractedText = `PDF Document: ${file.name}`;
        } catch (error) {
          console.error('Error processing PDF:', error);
          extractedText = 'Error: Could not process PDF';
          content = await fileToBase64(file);
        }
      }
      // Handle text files (.txt)
      else if (file.name.endsWith('.txt') || file.type === 'text/plain') {
        try {
          const text = await file.text();
          extractedText = text;
          content = await fileToBase64(file);
        } catch (error) {
          console.error('Error reading text file:', error);
          extractedText = 'Error: Could not read text file';
          content = await fileToBase64(file);
        }
      }
      // Handle JSON files
      else if (file.name.endsWith('.json') || file.type === 'application/json') {
        try {
          const text = await file.text();
          // Validate JSON
          const jsonData = JSON.parse(text);
          // Format JSON with indentation for better readability
          extractedText = `JSON Content:\n\`\`\`json\n${JSON.stringify(jsonData, null, 2)}\n\`\`\``;
          content = await fileToBase64(file);
        } catch (error) {
          console.error('Error processing JSON:', error);
          extractedText = 'Error: Invalid JSON file or could not parse JSON';
          content = await fileToBase64(file);
        }
      }
      // Handle CSV files
      else if (file.name.endsWith('.csv') || file.type === 'text/csv') {
        try {
          const text = await file.text();
          extractedText = `CSV Content:\n\`\`\`csv\n${text}\n\`\`\``;
          content = await fileToBase64(file);
        } catch (error) {
          console.error('Error reading CSV file:', error);
          extractedText = 'Error: Could not read CSV file';
          content = await fileToBase64(file);
        }
      }
      // Handle Excel files
      else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        try {
          content = await fileToBase64(file);
          extractedText = `Excel Spreadsheet: ${file.name}\nNote: Excel files are attached. AI can analyze the data structure.`;
        } catch (error) {
          console.error('Error processing Excel file:', error);
          extractedText = 'Error: Could not process Excel file';
          content = await fileToBase64(file);
        }
      }
      // Handle other files (images, etc.)
      else {
        content = await fileToBase64(file);
        // For unknown file types, add a note
        if (!file.type.startsWith('image/')) {
          extractedText = `File: ${file.name}\nType: ${file.type || 'unknown'}\nSize: ${(file.size / 1024).toFixed(2)} KB`;
        }
      }
      
      return {
        name: file.name,
        size: file.size,
        type: file.type,
        content,
        extractedText,
      };
    })
  );
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}
