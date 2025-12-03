# 📁 File Upload & Ingestion Features - Complete Guide

## ✅ What's Been Added

Your OneMindAI now has professional file ingestion features matching Multi_modal_POC_1:

### **🎯 Core Features:**
1. ✅ **Drag & Drop Files** - Images, Word docs, PDFs
2. ✅ **Paste Screenshots** - Ctrl+V image paste directly into prompt
3. ✅ **Image Thumbnails** - 80x80px previews with hover remove
4. ✅ **File Type Icons** - 📘 for Word, 📕 for PDF, 📄 for others
5. ✅ **Document Content Preview** - Extracted text from Word docs
6. ✅ **Multiple File Support** - Upload many files at once
7. ✅ **Real-time Processing** - Base64 encoding and text extraction

---

## 📦 Dependencies Installed

```bash
✅ mammoth v1.8.0 - Word document text extraction
✅ lucide-react v0.460.0 - Icon library (optional, using emojis instead)
```

---

## 📂 Files Created

### **1. `src/lib/file-utils.ts`**
- **Purpose**: File processing utilities
- **Functions**:
  - `fileToBase64()` - Convert files to base64
  - `processFiles()` - Extract text from Word docs, process PDFs
  - `formatFileSize()` - Human-readable file sizes
- **Types**:
  - `UploadedFile` interface with name, size, type, content, extractedText

### **2. `src/components/FileUploadZone.tsx`**
- **Purpose**: Complete file upload UI component
- **Features**:
  - Drag & drop zone with visual feedback
  - File input button
  - Image thumbnail grid (80x80px)
  - Document list with icons
  - Content preview for Word docs
  - Remove file buttons
  - Help text and tips

### **3. Updated `src/OneMindAI.tsx`**
- **Added**: File upload state management
- **Added**: Paste handler for screenshots
- **Added**: FileUploadZone integration
- **Added**: File processing on paste

---

## 🎨 UI Features

### **Image Upload:**
```
┌─────────────────────────────────────┐
│  📎 Attach Files  or drag & drop    │
├─────────────────────────────────────┤
│  Images (2)                         │
│  ┌────┐ ┌────┐                      │
│  │ ✕  │ │ ✕  │                      │
│  │img1│ │img2│                      │
│  └────┘ └────┘                      │
└─────────────────────────────────────┘
```

### **Document Upload:**
```
┌─────────────────────────────────────┐
│  Documents (2)                      │
│  📘 report.docx         ✕           │
│  📕 presentation.pdf    ✕           │
├─────────────────────────────────────┤
│  Document Content Preview:          │
│  📄 report.docx                     │
│     This is the extracted text...   │
└─────────────────────────────────────┘
```

### **Drag & Drop Overlay:**
```
┌─────────────────────────────────────┐
│                                     │
│              📁                     │
│       Drop files here               │
│  Supports images, Word docs, PDFs   │
│                                     │
└─────────────────────────────────────┘
```

---

## 🚀 How to Use

### **Method 1: Drag & Drop**
1. **Drag files** from your file explorer
2. **Drop onto** the prompt textarea or file upload zone
3. **Visual feedback** shows drop zone
4. **Files appear** in preview area

### **Method 2: Paste Screenshots**
1. **Take screenshot** (Windows: Win+Shift+S, Mac: Cmd+Shift+4)
2. **Click in prompt** textarea
3. **Paste** with Ctrl+V (Windows) or Cmd+V (Mac)
4. **Image appears** in thumbnail grid

### **Method 3: File Button**
1. **Click** "📎 Attach Files" button
2. **Select files** from file picker
3. **Multiple selection** supported
4. **Files process** and appear in preview

---

## 🧪 Test the Features

### **Test 1: Image Upload**
1. **Drag an image** onto the prompt area
2. **See 80x80px thumbnail** appear
3. **Hover over thumbnail** - see remove button (✕)
4. **Click ✕** to remove image

### **Test 2: Screenshot Paste**
1. **Take screenshot** (Win+Shift+S or Cmd+Shift+4)
2. **Click in prompt** textarea
3. **Press Ctrl+V** or Cmd+V
4. **Screenshot appears** as thumbnail

### **Test 3: Word Document**
1. **Upload .docx file** via button or drag
2. **See document icon** (📘) in file list
3. **Check "Document Content Preview"** section
4. **See extracted text** from document

### **Test 4: PDF Upload**
1. **Upload .pdf file**
2. **See PDF icon** (📕) in file list
3. **File name** displayed with remove button

### **Test 5: Multiple Files**
1. **Select multiple files** at once
2. **All files process** simultaneously
3. **Images in grid**, **documents in list**
4. **Remove individual files** as needed

---

## 📊 Supported File Types

### **Images** (with thumbnails):
- ✅ PNG
- ✅ JPG/JPEG
- ✅ GIF
- ✅ WebP
- ✅ SVG
- ✅ BMP

### **Documents** (with text extraction):
- ✅ Word (.docx, .doc) - Full text extraction
- ✅ PDF (.pdf) - File reference (no text extraction yet)

### **Data Files** (accepted but no preview):
- ✅ CSV (.csv)
- ✅ Excel (.xlsx, .xls)

---

## 🔧 Technical Implementation

### **File Processing Flow:**
```typescript
1. User uploads file
   ↓
2. processFiles() called
   ↓
3. Check file type
   ↓
4. Word doc? → Extract text with mammoth
5. PDF? → Store reference
6. Image? → Convert to base64
   ↓
7. Return UploadedFile object
   ↓
8. Update state → UI updates
```

### **Base64 Encoding:**
```typescript
// All files converted to base64 for easy transmission
{
  name: "screenshot.png",
  type: "image/png",
  size: 45678,
  content: "data:image/png;base64,iVBORw0KGgo...",
  extractedText: undefined
}
```

### **Word Document Extraction:**
```typescript
// Mammoth extracts raw text from .docx files
{
  name: "report.docx",
  type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  size: 123456,
  content: "data:application/vnd...;base64,UEsDBBQ...",
  extractedText: "This is the full text content of the document..."
}
```

---

## 🎯 Integration with AI Engines

### **How Files Are Sent:**

Currently, files are stored in state but not yet sent to AI engines. To integrate:

```typescript
// In your runAll() function, enhance the prompt with file data:

async function runAll() {
  // ... existing code ...
  
  // Enhance prompt with file information
  let enhancedPrompt = prompt;
  
  // Add Word document content
  const wordDocs = uploadedFiles.filter(f => 
    f.name.endsWith('.docx') || f.name.endsWith('.doc')
  );
  
  if (wordDocs.length > 0) {
    enhancedPrompt += '\n\n--- Document Content ---\n';
    wordDocs.forEach(doc => {
      enhancedPrompt += `\n${doc.name}:\n${doc.extractedText}\n`;
    });
  }
  
  // For Claude Vision API (images):
  const images = uploadedFiles.filter(f => f.type.startsWith('image/'));
  
  // Send to Claude with images
  if (images.length > 0) {
    // Use Claude's vision API
    const response = await client.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 4096,
      messages: [{
        role: "user",
        content: [
          { type: "text", text: enhancedPrompt },
          ...images.map(img => ({
            type: "image",
            source: {
              type: "base64",
              media_type: img.type,
              data: img.content.split(',')[1], // Remove data:image/png;base64, prefix
            }
          }))
        ]
      }]
    });
  }
}
```

---

## 🎨 Customization Options

### **Change Thumbnail Size:**
```typescript
// In FileUploadZone.tsx, line ~80
className="w-20 h-20 object-cover rounded-lg border-2 border-gray-300"
// Change w-20 h-20 to w-32 h-32 for larger thumbnails
```

### **Change File Icons:**
```typescript
// In FileUploadZone.tsx, line ~100
{isWordDoc && '📘'}
{isPDF && '📕'}
// Replace with custom icons or components
```

### **Change Preview Text Length:**
```typescript
// In FileUploadZone.tsx, line ~125
{file.extractedText?.substring(0, 500)}
// Change 500 to show more/less text
```

### **Add More File Types:**
```typescript
// In FileUploadZone.tsx, line ~35
accept="image/*,.csv,.xlsx,.xls,.doc,.docx,.pdf"
// Add more extensions like ,.txt,.json
```

---

## ⚠️ Important Notes

### **File Size Limits:**
- **Browser memory**: Large files (>10MB) may cause performance issues
- **Base64 encoding**: Increases file size by ~33%
- **Recommendation**: Limit to files under 5MB each

### **Word Document Extraction:**
- **Works with**: .docx files (Office 2007+)
- **May not work with**: .doc files (older format)
- **Extracts**: Plain text only (no formatting, images, tables)

### **PDF Limitations:**
- **Current**: No text extraction from PDFs
- **Future**: Add pdf.js library for text extraction
- **Workaround**: Convert PDF to Word first

### **Security Considerations:**
- **Base64 in memory**: Files stored in browser memory
- **No server upload**: Files not sent to server (yet)
- **API transmission**: Files sent to AI APIs as base64
- **Privacy**: Files never stored permanently

---

## 🐛 Troubleshooting

### **"File not uploading"**
→ Check file type is supported
→ Check file size is reasonable (<5MB)
→ Check browser console for errors

### **"Word document text not extracting"**
→ Ensure file is .docx (not .doc)
→ Check file is not corrupted
→ Try re-saving document in Word

### **"Paste not working"**
→ Ensure you're pasting an image (not file path)
→ Click in textarea first
→ Use Ctrl+V (Windows) or Cmd+V (Mac)

### **"Thumbnails not showing"**
→ Check image file is valid
→ Check browser supports image type
→ Check console for base64 errors

### **"Remove button not appearing"**
→ Hover over thumbnail
→ Check if disabled during generation
→ Try refreshing page

---

## 🎉 You Now Have Professional File Upload!

### **What You Can Do:**
1. ✅ **Drag & drop** images, Word docs, PDFs
2. ✅ **Paste screenshots** directly with Ctrl+V
3. ✅ **Preview images** with 80x80px thumbnails
4. ✅ **Extract text** from Word documents
5. ✅ **Remove files** individually with hover buttons
6. ✅ **Upload multiple files** at once
7. ✅ **See file content** in preview area

### **Next Steps:**
1. **Test all upload methods** (drag, paste, button)
2. **Try different file types** (images, docs, PDFs)
3. **Integrate with AI engines** (send files with prompts)
4. **Customize UI** to match your brand
5. **Add more file types** as needed

---

## 🚀 Ready to Use!

Your OneMindAI now has the same professional file ingestion features as Multi_modal_POC_1!

**Open http://localhost:5173/ and start uploading files!** 🎊

### **Quick Test:**
1. **Take a screenshot** (Win+Shift+S or Cmd+Shift+4)
2. **Click in prompt** textarea
3. **Press Ctrl+V** or Cmd+V
4. **See your screenshot** appear as thumbnail!

**Professional file upload is now live in your OneMindAI!** 📁✨
