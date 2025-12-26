import confetti from "canvas-confetti";
import {
  AlertCircle,
  Camera,
  CheckCircle,
  ChevronDown,
  Download,
  Loader2,
  Settings,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import ProfileImage from "@/lib/pfp.jpg";
import ScreenshotgunLogo from "@/lib/screenshotgun-logo.svg";

interface ScreenshotSection {
  dataUrl: string;
  index: number;
}

interface ScreenshotState {
  isLoading: boolean;
  sections: ScreenshotSection[];
  error: string | null;
  success: string | null;
}

interface ScreenshotOptions {
  format: "png" | "jpeg" | "webp" | "pdf" | "gif" | "mp4";
  fullPage: boolean;
  viewportWidth: string;
  viewportHeight: string;
  devicePreset: string;
  blockAds: boolean;
  blockCookieBanners: boolean;
  timeout: string;
  cache: boolean;
  deviceScaleFactor: string;
  delay: string;
  enableAnimatedCapture: boolean;
  animationDuration: string;
  scrollDelay: string;
  waitUntil: string;
  preScroll: boolean;
  scrollStrategy: "simple" | "progressive" | "custom";
  progressiveScrollSteps: string;
  customScrollScript: string;
}

const DEVICE_PRESETS = [
  { value: "custom", label: "Custom viewport" },
  { value: "ipad_pro", label: "iPad Pro (Desktop-like)" },
  { value: "ipad_pro_landscape", label: "iPad Pro Landscape" },
  { value: "ipad", label: "iPad" },
  { value: "ipad_landscape", label: "iPad Landscape" },
  { value: "iphone_15_pro", label: "iPhone 15 Pro" },
  { value: "iphone_15_pro_landscape", label: "iPhone 15 Pro Landscape" },
  { value: "iphone_14", label: "iPhone 14" },
  { value: "iphone_14_landscape", label: "iPhone 14 Landscape" },
  { value: "galaxy_s8", label: "Galaxy S8" },
  { value: "galaxy_s8_landscape", label: "Galaxy S8 Landscape" },
  { value: "pixel_5", label: "Pixel 5" },
  { value: "pixel_5_landscape", label: "Pixel 5 Landscape" },
];

// Top-level regex for better performance
const WWW_REGEX = /^www\./;

function App() {
  const [url, setUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [options, setOptions] = useState<ScreenshotOptions>({
    format: "png",
    fullPage: true,
    viewportWidth: "1920",
    viewportHeight: "1080",
    devicePreset: "custom",
    blockAds: false,
    blockCookieBanners: false,
    timeout: "60",
    cache: false,
    deviceScaleFactor: "1",
    delay: "0",
    enableAnimatedCapture: false,
    animationDuration: "5",
    scrollDelay: "500",
    waitUntil: "load",
    preScroll: false,
    scrollStrategy: "simple",
    progressiveScrollSteps: "10",
    customScrollScript: "",
  });
  const [screenshot, setScreenshot] = useState<ScreenshotState>({
    isLoading: false,
    sections: [],
    error: null,
    success: null,
  });
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Load API key from localStorage on mount
  useEffect(() => {
    const savedApiKey = localStorage.getItem("screenshotgun-api-key");
    if (savedApiKey) {
      setApiKey(savedApiKey);
    } else {
      // Fallback to env variable if no saved key
      setApiKey(import.meta.env.VITE_SCREENSHOT_API_KEY || "");
    }
  }, []);

  // Save API key to localStorage whenever it changes
  const handleApiKeyChange = (value: string) => {
    setApiKey(value);
    if (value.trim()) {
      localStorage.setItem("screenshotgun-api-key", value);
    } else {
      localStorage.removeItem("screenshotgun-api-key");
    }
  };

  // Trigger confetti animation
  const triggerConfetti = () => {
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);

      // Left side
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      });

      // Right side
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      });
    }, 250);
  };

  // Validate URL format
  const isValidUrl = (urlString: string): boolean => {
    try {
      const urlObj = new URL(
        urlString.startsWith("http") ? urlString : `https://${urlString}`
      );
      return urlObj.protocol === "http:" || urlObj.protocol === "https:";
    } catch {
      return false;
    }
  };

  // Extract root domain from URL for file naming
  const extractRootDomain = (urlString: string): string => {
    try {
      const urlObj = new URL(
        urlString.startsWith("http") ? urlString : `https://${urlString}`
      );
      return urlObj.hostname.replace(WWW_REGEX, "");
    } catch {
      return "website";
    }
  };

  // Format current date as DD-MM-YYYY
  const getCurrentDate = (): string => {
    const now = new Date();
    const day = now.getDate().toString().padStart(2, "0");
    const month = (now.getMonth() + 1).toString().padStart(2, "0");
    const year = now.getFullYear();
    return `${day}-${month}-${year}`;
  };

  // Split image into sections with max height of 4096px
  const splitImage = (img: HTMLImageElement): ScreenshotSection[] => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return [];
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return [];
    }

    const maxHeight = 4096;
    const sections: ScreenshotSection[] = [];
    const totalSections = Math.ceil(img.height / maxHeight);

    for (let i = 0; i < totalSections; i++) {
      const startY = i * maxHeight;
      const sectionHeight = Math.min(maxHeight, img.height - startY);

      // Set canvas dimensions for this section
      canvas.width = img.width;
      canvas.height = sectionHeight;

      // Clear canvas and draw the section
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(
        img,
        0,
        startY,
        img.width,
        sectionHeight, // source
        0,
        0,
        img.width,
        sectionHeight // destination
      );

      // Convert to data URL
      const dataUrl = canvas.toDataURL("image/png", 1.0);
      sections.push({ dataUrl, index: i + 1 });
    }

    return sections;
  };

  // Download a single file
  const downloadFile = (dataUrl: string, filename: string) => {
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Download all sections
  const downloadAllSections = () => {
    if (screenshot.sections.length === 0) {
      return;
    }

    const rootDomain = extractRootDomain(url);
    const date = getCurrentDate();
    const extension = options.format === "jpeg" ? "jpg" : options.format;

    for (const section of screenshot.sections) {
      const filename = `${rootDomain}-${date}-section-${section.index}.${extension}`;
      downloadFile(section.dataUrl, filename);
    }

    setScreenshot((prev) => ({
      ...prev,
      success: `Downloaded ${screenshot.sections.length} sections successfully!`,
    }));

    // Clear success message after 3 seconds
    setTimeout(() => {
      setScreenshot((prev) => ({ ...prev, success: null }));
    }, 3000);
  };

  // Update options
  const updateOption = <K extends keyof ScreenshotOptions>(
    key: K,
    value: ScreenshotOptions[K]
  ) => {
    setOptions((prev) => ({ ...prev, [key]: value }));

    // Reset viewport when device preset is selected
    if (key === "devicePreset" && value) {
      // For actual device presets, the API handles the viewport automatically
      // For 'custom', keep the current viewport values
      // No need to manually set viewport dimensions for real device presets
    }
  };

  // Generate scroll script based on strategy
  const generateScrollScript = (scrollOptions: ScreenshotOptions): string => {
    if (!scrollOptions.preScroll) {
      return "";
    }

    if (scrollOptions.scrollStrategy === "simple") {
      return `
        // Simple scroll through page
        const scrollHeight = document.documentElement.scrollHeight;
        const viewportHeight = window.innerHeight;
        const scrollSteps = Math.ceil(scrollHeight / viewportHeight);
        
        for (let i = 0; i < scrollSteps; i++) {
          window.scrollTo(0, i * viewportHeight);
          await new Promise(resolve => setTimeout(resolve, 300));
        }
        
        window.scrollTo(0, 0);
        await new Promise(resolve => setTimeout(resolve, 1000));
      `;
    }

    if (scrollOptions.scrollStrategy === "progressive") {
      const steps =
        Number.parseInt(scrollOptions.progressiveScrollSteps, 10) || 10;
      return `
        // Progressive scroll with multiple pause points for scroll-driven content
        const scrollHeight = document.documentElement.scrollHeight;
        const viewportHeight = window.innerHeight;
        const totalSteps = ${steps};
        
        // Scroll down progressively with longer pauses
        for (let i = 0; i <= totalSteps; i++) {
          const scrollPosition = (scrollHeight * i) / totalSteps;
          window.scrollTo(0, scrollPosition);
          
          // Longer pause at each step to let scroll-driven animations complete
          await new Promise(resolve => setTimeout(resolve, 800));
          
          // Extra pause at quarter, half, three-quarter, and full scroll positions
          if (i === Math.floor(totalSteps * 0.25) || 
              i === Math.floor(totalSteps * 0.5) || 
              i === Math.floor(totalSteps * 0.75) || 
              i === totalSteps) {
            await new Promise(resolve => setTimeout(resolve, 1500));
          }
        }
        
        // Go back to top and wait for final state
        window.scrollTo(0, 0);
        await new Promise(resolve => setTimeout(resolve, 2000));
      `;
    }

    if (
      scrollOptions.scrollStrategy === "custom" &&
      scrollOptions.customScrollScript
    ) {
      return scrollOptions.customScrollScript;
    }

    return "";
  };

  // Set viewport parameters
  const setViewportParams = (
    apiUrl: URL,
    screenshotOptions: ScreenshotOptions
  ) => {
    if (
      screenshotOptions.devicePreset &&
      screenshotOptions.devicePreset !== "custom"
    ) {
      apiUrl.searchParams.set(
        "viewport_device",
        screenshotOptions.devicePreset
      );
    } else {
      apiUrl.searchParams.set(
        "viewport_width",
        screenshotOptions.viewportWidth
      );
      if (screenshotOptions.viewportHeight) {
        apiUrl.searchParams.set(
          "viewport_height",
          screenshotOptions.viewportHeight
        );
      }
    }
  };

  // Set content blocking parameters
  const setContentBlockingParams = (
    apiUrl: URL,
    screenshotOptions: ScreenshotOptions
  ) => {
    if (screenshotOptions.blockAds) {
      apiUrl.searchParams.set("block_ads", "true");
    }
    if (screenshotOptions.blockCookieBanners) {
      apiUrl.searchParams.set("block_cookie_banners", "true");
    }
  };

  // Set rendering parameters
  const setRenderingParams = (
    apiUrl: URL,
    screenshotOptions: ScreenshotOptions
  ) => {
    if (screenshotOptions.deviceScaleFactor !== "1") {
      apiUrl.searchParams.set(
        "device_scale_factor",
        screenshotOptions.deviceScaleFactor
      );
    }
    if (screenshotOptions.timeout !== "60") {
      apiUrl.searchParams.set("timeout", screenshotOptions.timeout);
    }
    apiUrl.searchParams.set("cache", screenshotOptions.cache.toString());
  };

  // Set animation and scroll parameters
  const setAnimationParams = (
    apiUrl: URL,
    screenshotOptions: ScreenshotOptions
  ) => {
    if (screenshotOptions.delay !== "0") {
      const delayValue = Math.min(
        Number.parseInt(screenshotOptions.delay, 10),
        30
      );
      apiUrl.searchParams.set("delay", delayValue.toString());
    }
    if (screenshotOptions.waitUntil !== "load") {
      apiUrl.searchParams.set(
        "scripts_wait_until",
        screenshotOptions.waitUntil
      );
    }
    const scrollScript = generateScrollScript(screenshotOptions);
    if (scrollScript) {
      apiUrl.searchParams.set(
        "scripts",
        scrollScript.replace(/\s+/g, " ").trim()
      );
    }
  };

  // Build API URL with all parameters
  const buildApiUrl = (
    fullUrl: string,
    apiKeyValue: string,
    screenshotOptions: ScreenshotOptions
  ): URL => {
    const apiUrl = new URL("https://api.screenshotone.com/take");
    apiUrl.searchParams.set("access_key", apiKeyValue);
    apiUrl.searchParams.set("url", fullUrl);
    apiUrl.searchParams.set("format", screenshotOptions.format);
    apiUrl.searchParams.set("full_page", screenshotOptions.fullPage.toString());

    setViewportParams(apiUrl, screenshotOptions);
    setContentBlockingParams(apiUrl, screenshotOptions);
    setRenderingParams(apiUrl, screenshotOptions);
    setAnimationParams(apiUrl, screenshotOptions);

    // For GIF format, use basic parameters only
    if (
      screenshotOptions.format === "gif" &&
      screenshotOptions.enableAnimatedCapture
    ) {
      // Add any valid GIF-specific parameters here when confirmed
    }

    return apiUrl;
  };

  // Handle API error response
  const handleApiError = async (response: Response): Promise<string> => {
    let errorMessage = `API error: ${response.status} ${response.statusText}`;
    try {
      const errorText = await response.text();
      if (errorText) {
        errorMessage += ` - ${errorText}`;
      }
    } catch {
      // If we can't read the error text, use the basic message
    }

    // Add helpful hints for common errors
    if (response.status === 400) {
      errorMessage +=
        ". Common causes: Invalid API key (use access key, not secret key), invalid URL format, or missing required parameters.";
    } else if (response.status === 401) {
      errorMessage +=
        ". This usually means your API key is invalid or expired.";
    } else if (response.status === 403) {
      errorMessage +=
        ". This usually means you've exceeded your API quota or the API key doesn't have permission.";
    }

    return errorMessage;
  };

  // Process screenshot response
  const processScreenshotResponse = (
    imageUrl: string,
    screenshotOptions: ScreenshotOptions
  ) => {
    // For PNG format, split into sections; for other formats, show as single download
    if (screenshotOptions.format === "png" && screenshotOptions.fullPage) {
      // Load image and split it
      const img = new Image();
      img.onload = () => {
        try {
          const sections = splitImage(img);
          setScreenshot({
            isLoading: false,
            sections,
            error: null,
            success:
              sections.length > 1
                ? `Screenshot captured and split into ${sections.length} sections!`
                : "Screenshot captured successfully!",
          });
          // Trigger confetti animation
          triggerConfetti();
          URL.revokeObjectURL(imageUrl);
        } catch {
          setScreenshot({
            isLoading: false,
            sections: [],
            error: "Failed to process the screenshot image",
            success: null,
          });
          URL.revokeObjectURL(imageUrl);
        }
      };
      img.onerror = () => {
        setScreenshot({
          isLoading: false,
          sections: [],
          error: "Failed to load the screenshot image",
          success: null,
        });
        URL.revokeObjectURL(imageUrl);
      };
      img.src = imageUrl;
    } else {
      // For non-PNG formats or single page, create a single download
      const rootDomain = extractRootDomain(url);
      const date = getCurrentDate();
      const extension =
        screenshotOptions.format === "jpeg" ? "jpg" : screenshotOptions.format;
      const filename = `${rootDomain}-${date}.${extension}`;

      setScreenshot({
        isLoading: false,
        sections: [{ dataUrl: imageUrl, index: 1 }],
        error: null,
        success: `Screenshot captured successfully! Click to download ${screenshotOptions.format.toUpperCase()} file.`,
      });
      // Trigger confetti animation
      triggerConfetti();

      // Auto-download for non-image formats
      if (screenshotOptions.format === "pdf") {
        downloadFile(imageUrl, filename);
      }
    }
  };

  // Take screenshot using ScreenshotOne API
  const takeScreenshot = async () => {
    if (!isValidUrl(url)) {
      setScreenshot((prev) => ({
        ...prev,
        error:
          "Please enter a valid URL (e.g., https://example.com or example.com)",
      }));
      return;
    }

    if (!apiKey.trim()) {
      setScreenshot((prev) => ({
        ...prev,
        error: "Please enter your ScreenshotOne API key",
      }));
      return;
    }

    setScreenshot({
      isLoading: true,
      sections: [],
      error: null,
      success: null,
    });

    try {
      // Prepare URL - add https if not present
      const fullUrl = url.startsWith("http") ? url : `https://${url}`;

      // Build API URL with all parameters
      const apiUrl = buildApiUrl(fullUrl, apiKey, options);

      // Debug logging (remove in production)
      console.log(
        "API Request URL:",
        apiUrl.toString().replace(apiKey, "HIDDEN_API_KEY")
      );
      console.log("Target URL:", fullUrl);
      console.log("Options:", options);

      const response = await fetch(apiUrl.toString());

      if (!response.ok) {
        const errorMessage = await handleApiError(response);
        throw new Error(errorMessage);
      }

      const blob = await response.blob();
      const imageUrl = URL.createObjectURL(blob);

      // Process the screenshot response
      processScreenshotResponse(imageUrl, options);
    } catch (error) {
      setScreenshot({
        isLoading: false,
        sections: [],
        error:
          error instanceof Error ? error.message : "Failed to take screenshot",
        success: null,
      });
    }
  };

  // Clear error/success messages when user starts typing
  const handleUrlChange = (value: string) => {
    setUrl(value);
    if (screenshot.error || screenshot.success) {
      setScreenshot((prev) => ({ ...prev, error: null, success: null }));
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-6 py-12">
        {/* Header */}
        <div className="relative mb-16 text-center">
          <div className="absolute top-0 right-0">
            <ThemeToggle />
          </div>
          <div className="mb-4 flex flex-col items-center">
            <img
              alt="Screenshotgun"
              className="slide-in-from-top mb-3 h-24 w-24 animate-in duration-1500"
              height={96}
              src={ScreenshotgunLogo}
              width={96}
            />
            <h1 className="slide-in-from-top animate-in font-semibold text-[24px] text-foreground delay-150 duration-1500">
              Screenshotgun
            </h1>
          </div>
          <p
            className="slide-in-from-top mx-auto mb-8 animate-in text-muted-foreground leading-relaxed delay-300 duration-1500"
            style={{ maxWidth: "48ch" }}
          >
            Figma screenshot compression getting you down? This handy tool will
            screenshot a website into 4096px tall blocks, which you can then use
            vertical auto-layout to stack ontop of one another — compression be
            gone!
          </p>

          <div className="slide-in-from-top mb-6 flex animate-in justify-center delay-450 duration-1500">
            <a
              className="flex h-fit cursor-pointer items-center gap-2 rounded-full border border-neutral-200 p-2 pr-6 transition-colors hover:border-neutral-300"
              href="https://x.com/thecoppinger"
              rel="noopener noreferrer"
              target="_blank"
            >
              <div className="w-16 overflow-hidden rounded-full">
                <img
                  alt="Charlie Coppinger"
                  className="h-full w-full object-cover"
                  height={64}
                  src={ProfileImage}
                  width={64}
                />
              </div>
              <div className="flex flex-col items-start">
                <p className="font-bold text-foreground">Charlie Coppinger</p>
                <p className="text-muted-foreground">@thecoppinger</p>
              </div>
            </a>
          </div>

          <p
            className="slide-in-from-top mx-auto animate-in text-center text-muted-foreground text-sm leading-relaxed delay-600 duration-1500"
            style={{ maxWidth: "48ch" }}
          >
            Made for free, with love, by Charlie 👨 & Claude 🤖. Have an
            idea/feedback?{" "}
            <a
              className="font-medium text-foreground underline underline-offset-4 transition-opacity hover:opacity-80"
              href="https://x.com/thecoppinger"
              rel="noopener noreferrer"
              target="_blank"
            >
              Message me on X
            </a>{" "}
            or make a pull request on GitHub!
          </p>
        </div>

        {/* Main Card */}
        <Card className="slide-in-from-bottom mb-12 animate-in rounded-3xl border border-neutral-200 p-8 shadow-xl transition-none delay-300 duration-1200 sm:p-16">
          <CardContent className="space-y-8 p-0">
            {/* API Key Input */}
            <div className="space-y-3">
              <Label className="font-medium text-base" htmlFor="api-key">
                ScreenshotOne API Key
              </Label>
              <Input
                className="h-12 text-base"
                id="api-key"
                onChange={(e) => handleApiKeyChange(e.target.value)}
                placeholder="Enter your ScreenshotOne API key"
                type="password"
                value={apiKey}
              />
              <p className="text-muted-foreground text-sm leading-relaxed">
                Get your free API key at{" "}
                <a
                  className="font-medium text-primary underline underline-offset-4 transition-opacity hover:opacity-80"
                  href="https://screenshotone.com/?via=charles"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  screenshotone.com
                </a>
                <br />
                <strong>Use your "Access Key" (not the Secret Key)</strong> from
                the API section of your dashboard.
              </p>
            </div>

            {/* URL Input */}
            <div className="space-y-3">
              <Label className="font-medium text-base" htmlFor="url">
                Website URL
              </Label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Input
                  className="h-12 flex-1 text-base"
                  disabled={screenshot.isLoading}
                  id="url"
                  onChange={(e) => handleUrlChange(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" &&
                    !screenshot.isLoading &&
                    takeScreenshot()
                  }
                  placeholder="Enter website URL (e.g., example.com or https://example.com)"
                  type="url"
                  value={url}
                />
                <Button
                  className="h-12 w-full px-6 sm:w-auto sm:shrink-0"
                  disabled={
                    screenshot.isLoading || !url.trim() || !apiKey.trim()
                  }
                  onClick={takeScreenshot}
                  size="lg"
                >
                  {screenshot.isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Camera className="mr-2 h-4 w-4" />
                      Take Screenshot
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Advanced Options */}
            <Collapsible onOpenChange={setAdvancedOpen} open={advancedOpen}>
              <CollapsibleTrigger asChild>
                <Button className="h-12 w-full text-base" variant="outline">
                  <Settings className="mr-3 h-4 w-4" />
                  Advanced Options
                  <ChevronDown
                    className={`ml-3 h-4 w-4 transition-transform ${advancedOpen ? "rotate-180" : ""}`}
                  />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-8 space-y-10">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {/* Format Selection */}
                  <div>
                    <Label className="mb-2 block font-medium text-sm">
                      Output Format
                    </Label>
                    <Select
                      onValueChange={(
                        value: "png" | "jpeg" | "webp" | "pdf" | "gif" | "mp4"
                      ) => updateOption("format", value)}
                      value={options.format}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="png">PNG (Best quality)</SelectItem>
                        <SelectItem value="jpeg">
                          JPEG (Smaller size)
                        </SelectItem>
                        <SelectItem value="webp">
                          WebP (Modern format)
                        </SelectItem>
                        <SelectItem value="pdf">PDF (Document)</SelectItem>
                        <SelectItem value="gif">GIF (Animated)</SelectItem>
                        <SelectItem value="mp4">MP4 (Video)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Device Preset */}
                  <div>
                    <Label className="mb-2 block font-medium text-sm">
                      Device Preset
                    </Label>
                    <Select
                      onValueChange={(value) =>
                        updateOption("devicePreset", value)
                      }
                      value={options.devicePreset}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select device preset" />
                      </SelectTrigger>
                      <SelectContent>
                        {DEVICE_PRESETS.map((preset) => (
                          <SelectItem key={preset.value} value={preset.value}>
                            {preset.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Scale Factor */}
                  <div>
                    <Label className="mb-2 block font-medium text-sm">
                      Scale Factor
                    </Label>
                    <Select
                      onValueChange={(value) =>
                        updateOption("deviceScaleFactor", value)
                      }
                      value={options.deviceScaleFactor}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1x (Standard)</SelectItem>
                        <SelectItem value="2">2x (Retina)</SelectItem>
                        <SelectItem value="3">3x (High DPI)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Custom Viewport */}
                {options.devicePreset === "custom" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label
                        className="mb-2 block font-medium text-sm"
                        htmlFor="viewport-width"
                      >
                        Viewport Width (px)
                      </Label>
                      <Input
                        id="viewport-width"
                        onChange={(e) =>
                          updateOption("viewportWidth", e.target.value)
                        }
                        placeholder="1920"
                        type="number"
                        value={options.viewportWidth}
                      />
                    </div>
                    <div>
                      <Label
                        className="mb-2 block font-medium text-sm"
                        htmlFor="viewport-height"
                      >
                        Viewport Height (px)
                      </Label>
                      <Input
                        id="viewport-height"
                        onChange={(e) =>
                          updateOption("viewportHeight", e.target.value)
                        }
                        placeholder="1080"
                        type="number"
                        value={options.viewportHeight}
                      />
                    </div>
                  </div>
                )}

                {/* Toggles */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={options.fullPage}
                      id="full-page"
                      onCheckedChange={(checked) =>
                        updateOption("fullPage", checked)
                      }
                    />
                    <Label htmlFor="full-page">Capture full page</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={options.blockAds}
                      id="block-ads"
                      onCheckedChange={(checked) =>
                        updateOption("blockAds", checked)
                      }
                    />
                    <Label htmlFor="block-ads">Block advertisements</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={options.blockCookieBanners}
                      id="block-cookies"
                      onCheckedChange={(checked) =>
                        updateOption("blockCookieBanners", checked)
                      }
                    />
                    <Label htmlFor="block-cookies">Block cookie banners</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={options.cache}
                      id="cache"
                      onCheckedChange={(checked) =>
                        updateOption("cache", checked)
                      }
                    />
                    <Label htmlFor="cache">Cache screenshot</Label>
                  </div>
                </div>

                {/* Animation & Timing Settings */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={options.preScroll}
                      id="pre-scroll"
                      onCheckedChange={(checked) =>
                        updateOption("preScroll", checked)
                      }
                    />
                    <Label htmlFor="pre-scroll">
                      Pre-scroll to trigger animations
                    </Label>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <Label
                        className="mb-2 block font-medium text-sm"
                        htmlFor="delay"
                      >
                        Initial Delay (seconds)
                      </Label>
                      <Input
                        id="delay"
                        max="30"
                        min="0"
                        onChange={(e) => updateOption("delay", e.target.value)}
                        placeholder="3"
                        type="number"
                        value={options.delay}
                      />
                      <p className="mt-1 text-muted-foreground text-xs">
                        Wait time before taking screenshot (0-30 seconds)
                      </p>
                    </div>

                    <div>
                      <Label className="mb-2 block font-medium text-sm">
                        Wait Until
                      </Label>
                      <Select
                        onValueChange={(value) =>
                          updateOption("waitUntil", value)
                        }
                        value={options.waitUntil}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="load">Page Load</SelectItem>
                          <SelectItem value="domcontentloaded">
                            DOM Ready
                          </SelectItem>
                          <SelectItem value="networkidle0">
                            Network Idle (0 requests)
                          </SelectItem>
                          <SelectItem value="networkidle2">
                            Network Idle (≤2 requests)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="mt-1 text-muted-foreground text-xs">
                        Condition to wait for before capturing
                      </p>
                    </div>
                  </div>

                  {options.preScroll && (
                    <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
                      <div>
                        <Label className="mb-2 block font-medium text-sm">
                          Scroll Strategy
                        </Label>
                        <Select
                          onValueChange={(
                            value: "simple" | "progressive" | "custom"
                          ) => updateOption("scrollStrategy", value)}
                          value={options.scrollStrategy}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="simple">
                              Simple (Basic scroll through)
                            </SelectItem>
                            <SelectItem value="progressive">
                              Progressive (For scroll-driven content)
                            </SelectItem>
                            <SelectItem value="custom">
                              Custom Script
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {options.scrollStrategy === "progressive" && (
                        <div>
                          <Label
                            className="mb-2 block font-medium text-sm"
                            htmlFor="progressive-steps"
                          >
                            Scroll Steps
                          </Label>
                          <Input
                            id="progressive-steps"
                            max="50"
                            min="5"
                            onChange={(e) =>
                              updateOption(
                                "progressiveScrollSteps",
                                e.target.value
                              )
                            }
                            placeholder="10"
                            type="number"
                            value={options.progressiveScrollSteps}
                          />
                          <p className="mt-1 text-muted-foreground text-xs">
                            Number of scroll positions to pause at (5-50). More
                            steps = better for complex scroll-driven content.
                          </p>
                        </div>
                      )}

                      {options.scrollStrategy === "custom" && (
                        <div>
                          <Label
                            className="mb-2 block font-medium text-sm"
                            htmlFor="custom-script"
                          >
                            Custom Scroll Script
                          </Label>
                          <textarea
                            className="h-24 w-full resize-none rounded-md border px-3 py-2 text-sm"
                            id="custom-script"
                            onChange={(e) =>
                              updateOption("customScrollScript", e.target.value)
                            }
                            placeholder="// Custom JavaScript to execute before screenshot&#10;// Example: window.scrollTo(0, 1000); await new Promise(r => setTimeout(r, 1000));"
                            value={options.customScrollScript}
                          />
                          <p className="mt-1 text-muted-foreground text-xs">
                            Custom JavaScript to execute. Use await for delays.
                          </p>
                        </div>
                      )}

                      <div className="text-muted-foreground text-sm">
                        <strong>Selected strategy:</strong> {(() => {
                          if (options.scrollStrategy === "simple") {
                            return "Basic scroll through page to trigger animations";
                          }
                          if (options.scrollStrategy === "progressive") {
                            return "Slower scroll with pauses at key positions - ideal for scroll-driven content carousels";
                          }
                          return "Custom JavaScript execution";
                        })()}
                      </div>
                    </div>
                  )}
                </div>

                {/* Animated Capture Options */}
                {(options.format === "gif" || options.format === "mp4") && (
                  <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
                    <h4 className="font-semibold text-sm">
                      Animated Capture Settings
                    </h4>

                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={options.enableAnimatedCapture}
                        id="enable-animated-capture"
                        onCheckedChange={(checked) =>
                          updateOption("enableAnimatedCapture", checked)
                        }
                      />
                      <Label htmlFor="enable-animated-capture">
                        Enable scroll animation
                      </Label>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <Label
                          className="mb-2 block font-medium text-sm"
                          htmlFor="animation-duration"
                        >
                          Animation Duration (seconds)
                        </Label>
                        <Input
                          id="animation-duration"
                          max="30"
                          min="1"
                          onChange={(e) =>
                            updateOption("animationDuration", e.target.value)
                          }
                          placeholder="5"
                          type="number"
                          value={options.animationDuration}
                        />
                        <p className="mt-1 text-muted-foreground text-xs">
                          Total length of animation (1-30 seconds)
                        </p>
                      </div>

                      {options.enableAnimatedCapture && (
                        <div>
                          <Label
                            className="mb-2 block font-medium text-sm"
                            htmlFor="scroll-delay"
                          >
                            Scroll Delay (ms)
                          </Label>
                          <Input
                            id="scroll-delay"
                            max="2000"
                            min="100"
                            onChange={(e) =>
                              updateOption("scrollDelay", e.target.value)
                            }
                            placeholder="500"
                            type="number"
                            value={options.scrollDelay}
                          />
                          <p className="mt-1 text-muted-foreground text-xs">
                            Pause between scroll steps (100-2000ms)
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Timeout */}
                <div>
                  <Label
                    className="mb-2 block font-medium text-sm"
                    htmlFor="timeout"
                  >
                    Timeout (seconds)
                  </Label>
                  <Input
                    id="timeout"
                    max="300"
                    min="1"
                    onChange={(e) => updateOption("timeout", e.target.value)}
                    placeholder="60"
                    type="number"
                    value={options.timeout}
                  />
                  <p className="mt-1 text-muted-foreground text-xs">
                    Maximum time to wait for page to load (1-300 seconds)
                  </p>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Status Messages */}
            {screenshot.error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{screenshot.error}</AlertDescription>
              </Alert>
            )}

            {screenshot.success && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>{screenshot.success}</AlertDescription>
              </Alert>
            )}

            {/* Download All Button */}
            {screenshot.sections.length > 0 && (
              <div className="flex justify-center pt-8">
                <Button
                  className="h-12 px-8 text-base"
                  onClick={downloadAllSections}
                  size="lg"
                >
                  <Download className="mr-3 h-4 w-4" />
                  {screenshot.sections.length > 1
                    ? `Download All Sections (${screenshot.sections.length})`
                    : `Download ${options.format.toUpperCase()}`}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Screenshot Sections Display */}
        {screenshot.sections.length > 0 && options.format === "png" && (
          <div className="slide-in-from-bottom animate-in space-y-8 delay-1000 duration-1000">
            <h2 className="text-center font-semibold text-2xl">
              Screenshot Sections
            </h2>
            <div className="grid gap-8 md:grid-cols-1 lg:grid-cols-2">
              {screenshot.sections.map((section) => (
                <Card
                  className="overflow-hidden border-0 shadow-md"
                  key={section.index}
                >
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg">
                      Section {section.index}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="group relative">
                      <img
                        alt={`Screenshot section ${section.index}`}
                        className="h-auto w-full rounded border shadow-sm transition-transform group-hover:scale-[1.02]"
                        height={4096}
                        src={section.dataUrl}
                        width={1920}
                      />
                      <div className="absolute inset-0 flex items-center justify-center rounded bg-black/0 opacity-0 transition-colors group-hover:bg-black/10 group-hover:opacity-100">
                        <Button
                          className="bg-background/90 text-foreground hover:bg-background"
                          onClick={() => {
                            const rootDomain = extractRootDomain(url);
                            const date = getCurrentDate();
                            const extension =
                              options.format === "jpeg"
                                ? "jpg"
                                : options.format;
                            const filename = `${rootDomain}-${date}-section-${section.index}.${extension}`;
                            downloadFile(section.dataUrl, filename);
                          }}
                          size="sm"
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Hidden canvas for image processing */}
        <canvas ref={canvasRef} style={{ display: "none" }} />

        {/* Footer */}
        <div className="slide-in-from-bottom mt-20 animate-in space-y-4 border-border/50 border-t pt-8 text-center delay-1000 duration-1500">
          <p className="text-muted-foreground text-sm">
            🔨🔧 with 💛 by{" "}
            <a
              className="font-medium text-foreground underline underline-offset-4 transition-opacity hover:opacity-80"
              href="https://x.com/thecoppinger"
              rel="noopener noreferrer"
              target="_blank"
            >
              Charlie
            </a>{" "}
            👨 & Claude 🤖
          </p>
          <p className="text-muted-foreground">
            Powered by{" "}
            <a
              className="font-medium text-primary underline underline-offset-4 transition-opacity hover:opacity-80"
              href="https://screenshotone.com/?via=charles"
              rel="noopener noreferrer"
              target="_blank"
            >
              ScreenshotOne API
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
