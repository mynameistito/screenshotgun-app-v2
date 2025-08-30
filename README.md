# Screenshotgun 🔫📸

A modern React-based web tool for capturing full-page website screenshots and automatically splitting them into downloadable sections.

## Features

- **Full-page screenshots** using the ScreenshotOne API
- **Automatic image splitting** into sections with max 4096px height
- **Bulk download** functionality with smart file naming
- **Responsive design** with dark mode support
- **Modern UI** built with shadcn/ui components
- **Error handling** and loading states
- **URL validation** and domain extraction

## Setup

1. **Clone and install dependencies:**
   ```bash
   npm install
   ```

2. **Get a ScreenshotOne API key:**
   - Visit [screenshotone.com](https://screenshotone.com/)
   - Sign up for a free account
   - Get your API key from the dashboard

3. **Configure your API key:**
   - Copy `.env.example` to `.env`
   - Add your API key to the `.env` file:
     ```
     VITE_SCREENSHOT_API_KEY=your_api_key_here
     ```
   - Or enter it directly in the app interface

4. **Start the development server:**
   ```bash
   npm run dev
   ```

## Usage

1. **Enter your ScreenshotOne API key** (if not set in environment)
2. **Enter a website URL** (e.g., `example.com` or `https://example.com`)
3. **Click "Take Screenshot"** to capture the full page
4. **Download sections individually** or use "Download All" for bulk download

## File Naming

Downloaded files follow this format:
- `[rootdomain]-[DD-MM-YYYY]-section-[N].png`
- Example: `example-29-06-2025-section-1.png`

## Tech Stack

- **React 19** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **shadcn/ui** for UI components
- **ScreenshotOne API** for screenshot capture
- **HTML5 Canvas** for image processing

## API Usage

The app uses the ScreenshotOne API with these parameters:
- `full_page=true` - Capture entire page
- `viewport_width=1920` - Standard desktop width
- `format=png` - High-quality PNG output
- `cache=false` - Fresh screenshots

## Contributing

Feel free to submit issues and enhancement requests!