import { generateCode } from "./codeGen.js";

/**
 * Example usage of the code generation function
 *
 * Try different prompts like:
 * - "Create a simple Express server with a /hello endpoint"
 * - "Create a React button component with TypeScript"
 * - "Create a utility function to format dates"
 * - "Create a simple TODO list API with CRUD operations"
 */
async function main() {
  // Example 1: Simple code generation
  const prompt = `Enhance the Lovable Clone web interface with advanced features.

IMPORTANT: Update the existing files in public/index.html and public/app.js

Required Features to Add:

1. FILE PREVIEW PANEL:
   - Split-screen layout: left side for input/results, right side for file preview
   - Tabbed interface showing all generated files
   - Syntax highlighting using Prism.js or similar (use CDN)
   - File type icons for each tab
   - Copy button for each file
   - Expandable/collapsible panel

2. DOWNLOAD FILES:
   - Download button to get all files as a zip
   - Use JSZip library (CDN)
   - Download individual files
   - Show file count and total size

3. PROJECT HISTORY:
   - Save generations to localStorage
   - Sidebar or modal showing past projects
   - Click to restore previous generation
   - Delete history items
   - Show timestamp and prompt preview
   - Limit to last 10 projects

4. LIVE CODE EDITOR:
   - Click "Edit" button on any file to open editor
   - Use CodeMirror or Monaco Editor (CDN)
   - Save edited content
   - Show edited indicator
   - Line numbers and syntax highlighting

DESIGN REQUIREMENTS:
- Keep the beautiful gradient background
- Use glass morphism for new panels
- Smooth animations and transitions
- Mobile responsive
- Dark theme to match current design
- All buttons match the existing style

Update public/index.html with new HTML structure and CSS.
Update public/app.js with all the new functionality.

Make it look professional and polished like a real product.`;


  const result = await generateCode(prompt, {
    permissionMode: "acceptEdits", // Auto-approve file changes
    verbose: true, // Show agent's reasoning
  });

  if (result.success) {
    console.log("\n✨ Success! Check your directory for the generated code.");
  } else {
    console.error(`\n❌ Failed: ${result.error}`);
    process.exit(1);
  }
}

// Run the example
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
