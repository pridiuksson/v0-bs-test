"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import ImageUploadSlot from "./image-upload-slot"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Info, AlertCircle, Lock } from "lucide-react"
import { useLogs } from "@/context/log-context"
import { useAuth } from "@/context/auth-context"
import { SupabaseService } from "@/lib/supabase-service"

export default function NinePictureGrid() {
  const [images, setImages] = useState<string[]>(Array(9).fill(""))
  const [text, setText] = useState("")
  const [zoomedImage, setZoomedImage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const { addLog } = useLogs()
  const { user } = useAuth()

  // Create a ref for the Supabase service - initialize it immediately to avoid conditional hooks
  const supabaseService = useRef<SupabaseService>(new SupabaseService())

  // Initialize the logger after component mount
  useEffect(() => {
    // Set the logger after the component has mounted
    supabaseService.current.setLogger(addLog)

    // Log component mount
    addLog("NinePictureGrid component mounted", "info")

    // Log browser and environment information for debugging
    const browserInfo = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      cookiesEnabled: navigator.cookieEnabled,
      screenSize: `${window.screen.width}x${window.screen.height}`,
      windowSize: `${window.innerWidth}x${window.innerHeight}`,
    }

    addLog("Browser information", "info", browserInfo)

    // Load images from Supabase
    loadImagesFromSupabase()

    return () => {
      addLog("NinePictureGrid component unmounted", "info")
    }
  }, [addLog])

  // Reload images when user authentication state changes
  useEffect(() => {
    if (user) {
      addLog("User authenticated, loading images", "info", { userId: user.id })
      loadImagesFromSupabase()
    }
  }, [user, addLog])

  const loadImagesFromSupabase = async () => {
    try {
      setIsLoading(true)
      setError(null)
      addLog("Loading images from Supabase", "info")

      // Ensure bucket exists
      const bucketExists = await supabaseService.current.ensureBucketExists()

      if (!bucketExists) {
        throw new Error("Failed to ensure bucket exists")
      }

      // Get images from Supabase
      const slotImages = await supabaseService.current.getGridImages()

      // Update state with loaded images
      const newImages = [...images]

      Object.entries(slotImages).forEach(([slotStr, imageUrl]) => {
        const slot = Number.parseInt(slotStr, 10)
        if (!isNaN(slot) && slot >= 0 && slot < 9) {
          newImages[slot] = imageUrl
        }
      })

      setImages(newImages)
      addLog("Images loaded successfully from Supabase", "success", {
        imageCount: Object.keys(slotImages).length,
      })
    } catch (error) {
      addLog("Error loading images from Supabase", "error", error)
      setError("Failed to load images. Check the Debug tab for details.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleImageUpload = async (index: number, imageDataUrl: string) => {
    try {
      // Check if user is authenticated
      if (!user) {
        addLog("Upload attempted without authentication", "error")
        setError("You must be signed in to upload images. Please go to the Account tab to sign in.")
        return
      }

      addLog(`Uploading image to slot ${index + 1}`, "info")

      // Upload image to Supabase
      const imageUrl = await supabaseService.current.uploadImage(imageDataUrl, index)

      if (!imageUrl) {
        throw new Error("Failed to upload image to Supabase")
      }

      // Update state with the new image URL
      const newImages = [...images]
      newImages[index] = imageUrl
      setImages(newImages)

      addLog(`Image uploaded to slot ${index + 1} successfully`, "success", { imageUrl })
    } catch (error) {
      addLog(`Error uploading image to slot ${index + 1}`, "error", error)

      // Check if error is due to authentication
      if (error instanceof Error && error.message.includes("auth")) {
        setError("Authentication error: Please sign in again to upload images.")
      } else {
        setError("Failed to upload image. Check the Debug tab for details.")
      }
    }
  }

  const handleImageRemove = async (index: number) => {
    try {
      // Check if user is authenticated
      if (!user) {
        addLog("Image removal attempted without authentication", "error")
        setError("You must be signed in to remove images. Please go to the Account tab to sign in.")
        return
      }

      addLog(`Removing image from slot ${index + 1}`, "info")

      // Delete image from Supabase
      await supabaseService.current.deleteImage(index)

      // Update state
      const newImages = [...images]
      newImages[index] = ""
      setImages(newImages)

      addLog(`Image removed from slot ${index + 1} successfully`, "success")
    } catch (error) {
      addLog(`Error removing image from slot ${index + 1}`, "error", error)
      setError("Failed to remove image. Check the Debug tab for details.")
    }
  }

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value)
  }

  const handleSave = () => {
    try {
      // Check if user is authenticated
      if (!user) {
        addLog("Save attempted without authentication", "error")
        setError("You must be signed in to save the grid. Please go to the Account tab to sign in.")
        return
      }

      addLog("Saving grid data", "info")
      // In a real application, you might save this data to a database
      // or generate a shareable link
      alert("Your grid has been saved!")
      addLog("Grid data saved successfully", "success")
    } catch (error) {
      addLog("Error saving grid data", "error", error)
    }
  }

  const handleReset = async () => {
    try {
      // Check if user is authenticated
      if (!user) {
        addLog("Reset attempted without authentication", "error")
        setError("You must be signed in to reset the grid. Please go to the Account tab to sign in.")
        return
      }

      addLog("Resetting grid", "info")

      // Clear all images
      for (let i = 0; i < 9; i++) {
        if (images[i]) {
          await supabaseService.current.deleteImage(i)
        }
      }

      setImages(Array(9).fill(""))
      setText("")

      addLog("Grid reset successfully", "success")
    } catch (error) {
      addLog("Error resetting grid", "error", error)
      setError("Failed to reset grid. Check the Debug tab for details.")
    }
  }

  const handleImageZoom = (imageUrl: string) => {
    try {
      addLog("Zooming image", "info")
      setZoomedImage(imageUrl)
    } catch (error) {
      addLog("Error zooming image", "error", error)
    }
  }

  const handleZoomEnd = () => {
    try {
      addLog("Ending image zoom", "info")
      setZoomedImage(null)
    } catch (error) {
      addLog("Error ending image zoom", "error", error)
    }
  }

  const handleRefresh = () => {
    loadImagesFromSupabase()
  }

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4 flex items-start gap-3">
        <Info className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-blue-700">
          <p>
            Click and hold on any uploaded image to zoom in and view it over the entire grid. Images are automatically
            cropped to square format when uploaded.
          </p>
          <p className="mt-1 font-medium">Having issues? Check the Debug tab for detailed error logs.</p>
        </div>
      </div>

      {!user && (
        <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mb-4 flex items-start gap-3">
          <Lock className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-amber-700">
            <p className="font-medium">Authentication Required</p>
            <p>
              You need to sign in or create an account to upload and manage images. Please go to the Account tab to sign
              in or sign up.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-red-700">
            <p>{error}</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={handleRefresh}>
              Try Again
            </Button>
          </div>
        </div>
      )}

      <div className="relative">
        {isLoading ? (
          <div className="h-96 flex items-center justify-center">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 border-4 border-t-primary border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
              <p className="mt-4 text-gray-500">Loading images...</p>
            </div>
          </div>
        ) : (
          <div ref={gridRef} className="grid grid-cols-3 gap-4 relative">
            {Array.from({ length: 9 }).map((_, index) => (
              <ImageUploadSlot
                key={`image-slot-${index}`}
                imageUrl={images[index]}
                onImageUpload={(imageUrl) => handleImageUpload(index, imageUrl)}
                onImageRemove={() => handleImageRemove(index)}
                onImageZoom={handleImageZoom}
                onZoomEnd={handleZoomEnd}
                isAuthenticated={!!user}
              />
            ))}
          </div>
        )}

        {/* Zoomed Image Overlay */}
        {zoomedImage && (
          <div
            className="absolute inset-0 bg-black/50 flex items-center justify-center z-50 cursor-zoom-out"
            onMouseUp={handleZoomEnd}
            onMouseLeave={handleZoomEnd}
          >
            <div className="w-full h-full p-4 flex items-center justify-center">
              <div className="aspect-square w-full h-full max-w-full max-h-full relative">
                <img
                  src={zoomedImage || "/placeholder.svg"}
                  alt="Zoomed image"
                  className="w-full h-full object-cover rounded-md shadow-xl animate-in fade-in zoom-in-95"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6">
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
          Description
        </label>
        <Textarea
          id="description"
          placeholder="Add a description for your image grid..."
          value={text}
          onChange={handleTextChange}
          className="min-h-[120px]"
        />
      </div>

      <div className="flex justify-end space-x-4 mt-6">
        <Button variant="outline" onClick={handleReset} disabled={!user}>
          Reset
        </Button>
        <Button onClick={handleSave} disabled={!user}>
          Save Grid
        </Button>
      </div>
    </div>
  )
}

