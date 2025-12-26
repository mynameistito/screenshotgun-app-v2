import { useState, useRef, useEffect } from 'react'
import confetti from 'canvas-confetti'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Download, Camera, AlertCircle, CheckCircle, Loader2, Settings, ChevronDown } from 'lucide-react'
import ScreenshotgunLogo from '@/lib/screenshotgun-logo.svg'
import ProfileImage from '@/lib/pfp.jpg'

interface ScreenshotSection {
  dataUrl: string
  index: number
}

interface ScreenshotState {
  isLoading: boolean
  sections: ScreenshotSection[]
  error: string | null
  success: string | null
}

interface ScreenshotOptions {
  format: 'png' | 'jpeg' | 'webp' | 'pdf' | 'gif' | 'mp4'
  fullPage: boolean
  viewportWidth: string
  viewportHeight: string
  devicePreset: string
  blockAds: boolean
  blockCookieBanners: boolean
  timeout: string
  cache: boolean
  deviceScaleFactor: string
  delay: string
  enableAnimatedCapture: boolean
  animationDuration: string
  scrollDelay: string
  waitUntil: string
  preScroll: boolean
  scrollStrategy: 'simple' | 'progressive' | 'custom'
  progressiveScrollSteps: string
  customScrollScript: string
}

const DEVICE_PRESETS = [
  { value: 'custom', label: 'Custom viewport' },
  { value: 'ipad_pro', label: 'iPad Pro (Desktop-like)' },
  { value: 'ipad_pro_landscape', label: 'iPad Pro Landscape' },
  { value: 'ipad', label: 'iPad' },
  { value: 'ipad_landscape', label: 'iPad Landscape' },
  { value: 'iphone_15_pro', label: 'iPhone 15 Pro' },
  { value: 'iphone_15_pro_landscape', label: 'iPhone 15 Pro Landscape' },
  { value: 'iphone_14', label: 'iPhone 14' },
  { value: 'iphone_14_landscape', label: 'iPhone 14 Landscape' },
  { value: 'galaxy_s8', label: 'Galaxy S8' },
  { value: 'galaxy_s8_landscape', label: 'Galaxy S8 Landscape' },
  { value: 'pixel_5', label: 'Pixel 5' },
  { value: 'pixel_5_landscape', label: 'Pixel 5 Landscape' },
]

function App() {
  const [url, setUrl] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [options, setOptions] = useState<ScreenshotOptions>({
    format: 'png',
    fullPage: true,
    viewportWidth: '1920',
    viewportHeight: '1080',
    devicePreset: 'custom',
    blockAds: false,
    blockCookieBanners: false,
    timeout: '60',
    cache: false,
    deviceScaleFactor: '1',
    delay: '0',
    enableAnimatedCapture: false,
    animationDuration: '5',
    scrollDelay: '500',
    waitUntil: 'load',
    preScroll: false,
    scrollStrategy: 'simple',
    progressiveScrollSteps: '10',
    customScrollScript: ''
  })
  const [screenshot, setScreenshot] = useState<ScreenshotState>({
    isLoading: false,
    sections: [],
    error: null,
    success: null
  })
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Load API key from localStorage on mount
  useEffect(() => {
    const savedApiKey = localStorage.getItem('screenshotgun-api-key')
    if (savedApiKey) {
      setApiKey(savedApiKey)
    } else {
      // Fallback to env variable if no saved key
      setApiKey(import.meta.env.VITE_SCREENSHOT_API_KEY || '')
    }
  }, [])

  // Save API key to localStorage whenever it changes
  const handleApiKeyChange = (value: string) => {
    setApiKey(value)
    if (value.trim()) {
      localStorage.setItem('screenshotgun-api-key', value)
    } else {
      localStorage.removeItem('screenshotgun-api-key')
    }
  }

  // Trigger confetti animation
  const triggerConfetti = () => {
    const duration = 3000
    const animationEnd = Date.now() + duration
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 }

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min
    }

    const interval = setInterval(function() {
      const timeLeft = animationEnd - Date.now()

      if (timeLeft <= 0) {
        return clearInterval(interval)
      }

      const particleCount = 50 * (timeLeft / duration)
      
      // Left side
      confetti(Object.assign({}, defaults, {
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
      }))
      
      // Right side  
      confetti(Object.assign({}, defaults, {
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
      }))
    }, 250)
  }

  // Validate URL format
  const isValidUrl = (urlString: string): boolean => {
    try {
      const urlObj = new URL(urlString.startsWith('http') ? urlString : `https://${urlString}`)
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:'
    } catch {
      return false
    }
  }

  // Extract root domain from URL for file naming
  const extractRootDomain = (urlString: string): string => {
    try {
      const urlObj = new URL(urlString.startsWith('http') ? urlString : `https://${urlString}`)
      return urlObj.hostname.replace(/^www\./, '')
    } catch {
      return 'website'
    }
  }

  // Format current date as DD-MM-YYYY
  const getCurrentDate = (): string => {
    const now = new Date()
    const day = now.getDate().toString().padStart(2, '0')
    const month = (now.getMonth() + 1).toString().padStart(2, '0')
    const year = now.getFullYear()
    return `${day}-${month}-${year}`
  }

  // Split image into sections with max height of 4096px
  const splitImage = (img: HTMLImageElement): ScreenshotSection[] => {
    const canvas = canvasRef.current
    if (!canvas) return []

    const ctx = canvas.getContext('2d')
    if (!ctx) return []

    const maxHeight = 4096
    const sections: ScreenshotSection[] = []
    const totalSections = Math.ceil(img.height / maxHeight)

    for (let i = 0; i < totalSections; i++) {
      const startY = i * maxHeight
      const sectionHeight = Math.min(maxHeight, img.height - startY)

      // Set canvas dimensions for this section
      canvas.width = img.width
      canvas.height = sectionHeight

      // Clear canvas and draw the section
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(
        img,
        0, startY, img.width, sectionHeight, // source
        0, 0, img.width, sectionHeight       // destination
      )

      // Convert to data URL
      const dataUrl = canvas.toDataURL('image/png', 1.0)
      sections.push({ dataUrl, index: i + 1 })
    }

    return sections
  }

  // Download a single file
  const downloadFile = (dataUrl: string, filename: string) => {
    const link = document.createElement('a')
    link.href = dataUrl
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Download all sections
  const downloadAllSections = () => {
    if (screenshot.sections.length === 0) return

    const rootDomain = extractRootDomain(url)
    const date = getCurrentDate()
    const extension = options.format === 'jpeg' ? 'jpg' : options.format

    screenshot.sections.forEach((section) => {
      const filename = `${rootDomain}-${date}-section-${section.index}.${extension}`
      downloadFile(section.dataUrl, filename)
    })

    setScreenshot(prev => ({
      ...prev,
      success: `Downloaded ${screenshot.sections.length} sections successfully!`
    }))

    // Clear success message after 3 seconds
    setTimeout(() => {
      setScreenshot(prev => ({ ...prev, success: null }))
    }, 3000)
  }

  // Update options
  const updateOption = <K extends keyof ScreenshotOptions>(key: K, value: ScreenshotOptions[K]) => {
    setOptions(prev => ({ ...prev, [key]: value }))
    
    // Reset viewport when device preset is selected
    if (key === 'devicePreset' && value) {
      // For actual device presets, the API handles the viewport automatically
      // For 'custom', keep the current viewport values
      // No need to manually set viewport dimensions for real device presets
    }
  }

  // Take screenshot using ScreenshotOne API
  const takeScreenshot = async () => {
    if (!isValidUrl(url)) {
      setScreenshot(prev => ({
        ...prev,
        error: 'Please enter a valid URL (e.g., https://example.com or example.com)'
      }))
      return
    }

    if (!apiKey.trim()) {
      setScreenshot(prev => ({
        ...prev,
        error: 'Please enter your ScreenshotOne API key'
      }))
      return
    }

    setScreenshot({
      isLoading: true,
      sections: [],
      error: null,
      success: null
    })

    try {
      // Prepare URL - add https if not present
      const fullUrl = url.startsWith('http') ? url : `https://${url}`
      
      // Build API URL
      const apiUrl = new URL('https://api.screenshotone.com/take')
      apiUrl.searchParams.set('access_key', apiKey)
      apiUrl.searchParams.set('url', fullUrl)
      apiUrl.searchParams.set('format', options.format)
      apiUrl.searchParams.set('full_page', options.fullPage.toString())
      
      // Device preset or custom viewport
      if (options.devicePreset && options.devicePreset !== 'custom') {
        apiUrl.searchParams.set('viewport_device', options.devicePreset)
      } else {
        apiUrl.searchParams.set('viewport_width', options.viewportWidth)
        if (options.viewportHeight) {
          apiUrl.searchParams.set('viewport_height', options.viewportHeight)
        }
      }
      
      // Device scale factor
      if (options.deviceScaleFactor !== '1') {
        apiUrl.searchParams.set('device_scale_factor', options.deviceScaleFactor)
      }
      
      // Content blocking options
      if (options.blockAds) {
        apiUrl.searchParams.set('block_ads', 'true')
      }
      if (options.blockCookieBanners) {
        apiUrl.searchParams.set('block_cookie_banners', 'true')
      }
      
      // Rendering options
      if (options.timeout !== '60') {
        apiUrl.searchParams.set('timeout', options.timeout)
      }
      apiUrl.searchParams.set('cache', options.cache.toString())
      
      // Animation and scroll handling
      if (options.delay !== '0') {
        const delayValue = Math.min(parseInt(options.delay), 30)
        apiUrl.searchParams.set('delay', delayValue.toString())
      }
      
      // Wait conditions for better animation handling
      if (options.waitUntil !== 'load') {
        apiUrl.searchParams.set('scripts_wait_until', options.waitUntil)
      }
      
      // Advanced scroll handling based on strategy
      if (options.preScroll) {
        let scrollScript = '';
        
        if (options.scrollStrategy === 'simple') {
          scrollScript = `
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
        } else if (options.scrollStrategy === 'progressive') {
          const steps = parseInt(options.progressiveScrollSteps) || 10;
          scrollScript = `
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
        } else if (options.scrollStrategy === 'custom' && options.customScrollScript) {
          scrollScript = options.customScrollScript;
        }
        
        if (scrollScript) {
          apiUrl.searchParams.set('scripts', scrollScript.replace(/\s+/g, ' ').trim())
        }
      }
      
      // For GIF format, use basic parameters only
      if (options.format === 'gif') {
        // Only use parameters that are definitely supported for GIF
        if (options.enableAnimatedCapture) {
          // Add any valid GIF-specific parameters here when confirmed
        }
      }

      // Debug logging (remove in production)
      console.log('API Request URL:', apiUrl.toString().replace(apiKey, 'HIDDEN_API_KEY'))
      console.log('Target URL:', fullUrl)
      console.log('Options:', options)

      const response = await fetch(apiUrl.toString())
      
      if (!response.ok) {
        // Try to get more detailed error information
        let errorMessage = `API error: ${response.status} ${response.statusText}`
        try {
          const errorText = await response.text()
          if (errorText) {
            errorMessage += ` - ${errorText}`
          }
        } catch {
          // If we can't read the error text, use the basic message
        }
        
        // Add helpful hints for common errors
        if (response.status === 400) {
          errorMessage += '. Common causes: Invalid API key (use access key, not secret key), invalid URL format, or missing required parameters.'
        } else if (response.status === 401) {
          errorMessage += '. This usually means your API key is invalid or expired.'
        } else if (response.status === 403) {
          errorMessage += '. This usually means you\'ve exceeded your API quota or the API key doesn\'t have permission.'
        }
        
        throw new Error(errorMessage)
      }

      const blob = await response.blob()
      const imageUrl = URL.createObjectURL(blob)

      // For PNG format, split into sections; for other formats, show as single download
      if (options.format === 'png' && options.fullPage) {
        // Load image and split it
        const img = new Image()
        img.onload = () => {
          try {
            const sections = splitImage(img)
            setScreenshot({
              isLoading: false,
              sections,
              error: null,
              success: sections.length > 1 
                ? `Screenshot captured and split into ${sections.length} sections!`
                : 'Screenshot captured successfully!'
            })
            // Trigger confetti animation
            triggerConfetti()
            URL.revokeObjectURL(imageUrl)
          } catch (error) {
            setScreenshot({
              isLoading: false,
              sections: [],
              error: 'Failed to process the screenshot image',
              success: null
            })
            URL.revokeObjectURL(imageUrl)
          }
        }
        img.onerror = () => {
          setScreenshot({
            isLoading: false,
            sections: [],
            error: 'Failed to load the screenshot image',
            success: null
          })
          URL.revokeObjectURL(imageUrl)
        }
        img.src = imageUrl
      } else {
        // For non-PNG formats or single page, create a single download
        const rootDomain = extractRootDomain(url)
        const date = getCurrentDate()
        const extension = options.format === 'jpeg' ? 'jpg' : options.format
        const filename = `${rootDomain}-${date}.${extension}`
        
        setScreenshot({
          isLoading: false,
          sections: [{ dataUrl: imageUrl, index: 1 }],
          error: null,
          success: `Screenshot captured successfully! Click to download ${options.format.toUpperCase()} file.`
        })
        // Trigger confetti animation
        triggerConfetti()
        
        // Auto-download for non-image formats
        if (options.format === 'pdf') {
          downloadFile(imageUrl, filename)
        }
      }

    } catch (error) {
      setScreenshot({
        isLoading: false,
        sections: [],
        error: error instanceof Error ? error.message : 'Failed to take screenshot',
        success: null
      })
    }
  }

  // Clear error/success messages when user starts typing
  const handleUrlChange = (value: string) => {
    setUrl(value)
    if (screenshot.error || screenshot.success) {
      setScreenshot(prev => ({ ...prev, error: null, success: null }))
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex flex-col items-center mb-4">
            <img src={ScreenshotgunLogo} alt="Screenshotgun" className="h-24 w-24 mb-3 animate-in slide-in-from-top duration-1500" />
            <h1 className="text-[24px] font-semibold text-foreground animate-in slide-in-from-top duration-1500 delay-150">Screenshotgun</h1>
          </div>
          <p className="text-muted-foreground mx-auto leading-relaxed mb-8 animate-in slide-in-from-top duration-1500 delay-300" style={{ maxWidth: '48ch' }}>
            Figma screenshot compression getting you down? This handy tool will screenshot a website into 4096px tall blocks, which you can then use vertical auto-layout to stack ontop of one another — compression be gone!
          </p>
          
          <div className="flex justify-center mb-6 animate-in slide-in-from-top duration-1500 delay-450">
            <a 
              href="https://x.com/thecoppinger" 
              target="_blank" 
              rel="noopener noreferrer"
              className="border h-fit p-2 pr-6 rounded-full border-neutral-200 flex items-center gap-2 hover:border-neutral-300 transition-colors cursor-pointer"
            >
              <div className="rounded-full overflow-hidden w-16">
                <img src={ProfileImage} alt="Charlie Coppinger" className="w-full h-full object-cover" />
              </div>
              <div className="flex flex-col items-start">
                <p className="font-bold text-foreground">Charlie Coppinger</p>
                <p className="text-muted-foreground">@thecoppinger</p>
              </div>
            </a>
          </div>
          
          <p className="text-sm text-muted-foreground text-center mx-auto leading-relaxed animate-in slide-in-from-top duration-1500 delay-600" style={{ maxWidth: '48ch' }}>
            Made for free, with love, by Charlie 👨 & Claude 🤖. Have an idea/feedback?{' '}
            <a 
              href="https://x.com/thecoppinger" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-foreground underline underline-offset-4 font-medium hover:opacity-80 transition-opacity"
            >
              Message me on X
            </a>
            {' '}or make a pull request on GitHub!
          </p>
        </div>

        {/* Main Card */}
        <Card className="mb-12 shadow-xl border p-8 sm:p-16 rounded-3xl border-neutral-200 animate-in slide-in-from-bottom duration-1200 delay-300">
          <CardContent className="space-y-8 p-0">
            {/* API Key Input */}
            <div className="space-y-3">
              <Label htmlFor="api-key" className="text-base font-medium">
                ScreenshotOne API Key
              </Label>
              <Input
                id="api-key"
                type="password"
                placeholder="Enter your ScreenshotOne API key"
                value={apiKey}
                onChange={(e) => handleApiKeyChange(e.target.value)}
                className="h-12 text-base"
              />
              <p className="text-sm text-muted-foreground leading-relaxed">
                Get your free API key at{' '}
                <a 
                  href="https://screenshotone.com/?via=charles" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary underline underline-offset-4 font-medium hover:opacity-80 transition-opacity"
                >
                  screenshotone.com
                </a>
                <br />
                <strong>Use your "Access Key" (not the Secret Key)</strong> from the API section of your dashboard.
              </p>
            </div>

            {/* URL Input */}
            <div className="space-y-3">
              <Label htmlFor="url" className="text-base font-medium">
                Website URL
              </Label>
              <div className="flex flex-col sm:flex-row gap-3">
                <Input
                  id="url"
                  type="url"
                  placeholder="Enter website URL (e.g., example.com or https://example.com)"
                  value={url}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !screenshot.isLoading && takeScreenshot()}
                  disabled={screenshot.isLoading}
                  className="h-12 text-base flex-1"
                />
                <Button 
                  onClick={takeScreenshot} 
                  disabled={screenshot.isLoading || !url.trim() || !apiKey.trim()}
                  className="sm:shrink-0 h-12 px-6 w-full sm:w-auto"
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
            <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full h-12 text-base">
                  <Settings className="mr-3 h-4 w-4" />
                  Advanced Options
                  <ChevronDown className={`ml-3 h-4 w-4 transition-transform ${advancedOpen ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-10 mt-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Format Selection */}
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Output Format</Label>
                    <Select value={options.format} onValueChange={(value: 'png' | 'jpeg' | 'webp' | 'pdf' | 'gif' | 'mp4') => updateOption('format', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="png">PNG (Best quality)</SelectItem>
                        <SelectItem value="jpeg">JPEG (Smaller size)</SelectItem>
                        <SelectItem value="webp">WebP (Modern format)</SelectItem>
                        <SelectItem value="pdf">PDF (Document)</SelectItem>
                        <SelectItem value="gif">GIF (Animated)</SelectItem>
                        <SelectItem value="mp4">MP4 (Video)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Device Preset */}
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Device Preset</Label>
                    <Select value={options.devicePreset} onValueChange={(value) => updateOption('devicePreset', value)}>
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
                    <Label className="text-sm font-medium mb-2 block">Scale Factor</Label>
                    <Select value={options.deviceScaleFactor} onValueChange={(value) => updateOption('deviceScaleFactor', value)}>
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
                {options.devicePreset === 'custom' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="viewport-width" className="text-sm font-medium mb-2 block">
                        Viewport Width (px)
                      </Label>
                      <Input
                        id="viewport-width"
                        type="number"
                        value={options.viewportWidth}
                        onChange={(e) => updateOption('viewportWidth', e.target.value)}
                        placeholder="1920"
                      />
                    </div>
                    <div>
                      <Label htmlFor="viewport-height" className="text-sm font-medium mb-2 block">
                        Viewport Height (px)
                      </Label>
                      <Input
                        id="viewport-height"
                        type="number"
                        value={options.viewportHeight}
                        onChange={(e) => updateOption('viewportHeight', e.target.value)}
                        placeholder="1080"
                      />
                    </div>
                  </div>
                )}

                {/* Toggles */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="full-page"
                      checked={options.fullPage}
                      onCheckedChange={(checked) => updateOption('fullPage', checked)}
                    />
                    <Label htmlFor="full-page">Capture full page</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="block-ads"
                      checked={options.blockAds}
                      onCheckedChange={(checked) => updateOption('blockAds', checked)}
                    />
                    <Label htmlFor="block-ads">Block advertisements</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="block-cookies"
                      checked={options.blockCookieBanners}
                      onCheckedChange={(checked) => updateOption('blockCookieBanners', checked)}
                    />
                    <Label htmlFor="block-cookies">Block cookie banners</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="cache"
                      checked={options.cache}
                      onCheckedChange={(checked) => updateOption('cache', checked)}
                    />
                    <Label htmlFor="cache">Cache screenshot</Label>
                  </div>
                </div>

                {/* Animation & Timing Settings */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="pre-scroll"
                      checked={options.preScroll}
                      onCheckedChange={(checked) => updateOption('preScroll', checked)}
                    />
                    <Label htmlFor="pre-scroll">Pre-scroll to trigger animations</Label>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="delay" className="text-sm font-medium mb-2 block">
                        Initial Delay (seconds)
                      </Label>
                      <Input
                        id="delay"
                        type="number"
                        value={options.delay}
                        onChange={(e) => updateOption('delay', e.target.value)}
                        placeholder="3"
                        min="0"
                        max="30"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Wait time before taking screenshot (0-30 seconds)
                      </p>
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium mb-2 block">Wait Until</Label>
                      <Select value={options.waitUntil} onValueChange={(value) => updateOption('waitUntil', value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="load">Page Load</SelectItem>
                          <SelectItem value="domcontentloaded">DOM Ready</SelectItem>
                          <SelectItem value="networkidle0">Network Idle (0 requests)</SelectItem>
                          <SelectItem value="networkidle2">Network Idle (≤2 requests)</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-1">
                        Condition to wait for before capturing
                      </p>
                    </div>
                  </div>
                  
                  {options.preScroll && (
                    <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                      <div>
                        <Label className="text-sm font-medium mb-2 block">Scroll Strategy</Label>
                        <Select value={options.scrollStrategy} onValueChange={(value: 'simple' | 'progressive' | 'custom') => updateOption('scrollStrategy', value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="simple">Simple (Basic scroll through)</SelectItem>
                            <SelectItem value="progressive">Progressive (For scroll-driven content)</SelectItem>
                            <SelectItem value="custom">Custom Script</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {options.scrollStrategy === 'progressive' && (
                        <div>
                          <Label htmlFor="progressive-steps" className="text-sm font-medium mb-2 block">
                            Scroll Steps
                          </Label>
                          <Input
                            id="progressive-steps"
                            type="number"
                            value={options.progressiveScrollSteps}
                            onChange={(e) => updateOption('progressiveScrollSteps', e.target.value)}
                            placeholder="10"
                            min="5"
                            max="50"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Number of scroll positions to pause at (5-50). More steps = better for complex scroll-driven content.
                          </p>
                        </div>
                      )}
                      
                      {options.scrollStrategy === 'custom' && (
                        <div>
                          <Label htmlFor="custom-script" className="text-sm font-medium mb-2 block">
                            Custom Scroll Script
                          </Label>
                          <textarea
                            id="custom-script"
                            value={options.customScrollScript}
                            onChange={(e) => updateOption('customScrollScript', e.target.value)}
                            placeholder="// Custom JavaScript to execute before screenshot&#10;// Example: window.scrollTo(0, 1000); await new Promise(r => setTimeout(r, 1000));"
                            className="w-full h-24 px-3 py-2 text-sm border rounded-md resize-none"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Custom JavaScript to execute. Use await for delays.
                          </p>
                        </div>
                      )}
                      
                      <div className="text-sm text-muted-foreground">
                        <strong>Selected strategy:</strong> {
                          options.scrollStrategy === 'simple' ? 'Basic scroll through page to trigger animations' :
                          options.scrollStrategy === 'progressive' ? 'Slower scroll with pauses at key positions - ideal for scroll-driven content carousels' :
                          'Custom JavaScript execution'
                        }
                      </div>
                    </div>
                  )}
                </div>

                {/* Animated Capture Options */}
                  {(options.format === 'gif' || options.format === 'mp4') && (
                    <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                      <h4 className="text-sm font-semibold">Animated Capture Settings</h4>
                      
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="enable-animated-capture"
                          checked={options.enableAnimatedCapture}
                          onCheckedChange={(checked) => updateOption('enableAnimatedCapture', checked)}
                        />
                        <Label htmlFor="enable-animated-capture">Enable scroll animation</Label>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="animation-duration" className="text-sm font-medium mb-2 block">
                            Animation Duration (seconds)
                          </Label>
                          <Input
                            id="animation-duration"
                            type="number"
                            value={options.animationDuration}
                            onChange={(e) => updateOption('animationDuration', e.target.value)}
                            placeholder="5"
                            min="1"
                            max="30"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Total length of animation (1-30 seconds)
                          </p>
                        </div>
                        
                        {options.enableAnimatedCapture && (
                          <div>
                            <Label htmlFor="scroll-delay" className="text-sm font-medium mb-2 block">
                              Scroll Delay (ms)
                            </Label>
                            <Input
                              id="scroll-delay"
                              type="number"
                              value={options.scrollDelay}
                              onChange={(e) => updateOption('scrollDelay', e.target.value)}
                              placeholder="500"
                              min="100"
                              max="2000"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              Pause between scroll steps (100-2000ms)
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                {/* Timeout */}
                <div>
                  <Label htmlFor="timeout" className="text-sm font-medium mb-2 block">
                    Timeout (seconds)
                  </Label>
                  <Input
                    id="timeout"
                    type="number"
                    value={options.timeout}
                    onChange={(e) => updateOption('timeout', e.target.value)}
                    placeholder="60"
                    min="1"
                    max="300"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
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
                <Button onClick={downloadAllSections} size="lg" className="h-12 px-8 text-base">
                  <Download className="mr-3 h-4 w-4" />
                  {screenshot.sections.length > 1 
                    ? `Download All Sections (${screenshot.sections.length})`
                    : `Download ${options.format.toUpperCase()}`
                  }
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Screenshot Sections Display */}
        {screenshot.sections.length > 0 && options.format === 'png' && (
          <div className="space-y-8 animate-in slide-in-from-bottom duration-1000 delay-1000">
            <h2 className="text-2xl font-semibold text-center">Screenshot Sections</h2>
            <div className="grid gap-8 md:grid-cols-1 lg:grid-cols-2">
              {screenshot.sections.map((section) => (
                <Card key={section.index} className="overflow-hidden border-0 shadow-md">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg">Section {section.index}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="relative group">
                      <img
                        src={section.dataUrl}
                        alt={`Screenshot section ${section.index}`}
                        className="w-full h-auto rounded border shadow-sm transition-transform group-hover:scale-[1.02]"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <Button
                          size="sm"
                          onClick={() => {
                            const rootDomain = extractRootDomain(url)
                            const date = getCurrentDate()
                            const extension = options.format === 'jpeg' ? 'jpg' : options.format
                            const filename = `${rootDomain}-${date}-section-${section.index}.${extension}`
                            downloadFile(section.dataUrl, filename)
                          }}
                          className="bg-background/90 text-foreground hover:bg-background"
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
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {/* Footer */}
        <div className="text-center mt-20 pt-8 border-t border-border/50 space-y-4 animate-in slide-in-from-bottom duration-1500 delay-1000">
          <p className="text-sm text-muted-foreground">
            🔨🔧 with 💛 by{' '}
            <a 
              href="https://x.com/thecoppinger" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-foreground underline underline-offset-4 font-medium hover:opacity-80 transition-opacity"
            >
              Charlie
            </a>
            {' '}👨 & Claude 🤖
          </p>
          <p className="text-muted-foreground">
            Powered by{' '}
            <a 
              href="https://screenshotone.com/?via=charles" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-4 font-medium hover:opacity-80 transition-opacity"
            >
              ScreenshotOne API
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default App